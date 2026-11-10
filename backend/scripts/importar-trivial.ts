/**
 * Publica el banco del trivial online (F-51) en Supabase desde docs/datos/trivial/todas-las-preguntas.csv.
 *
 *   npm run trivial:importar -w backend               comprueba y publica
 *   npm run trivial:importar -w backend -- --probar   solo comprueba, sin tocar la base
 *
 * Publica una versión nueva solo si el CSV ha cambiado, y de una vez (en una transacción): si hay un solo
 * error no publica nada y la versión anterior sigue activa. Las versiones viejas se quedan, porque las
 * partidas, invitaciones y búsquedas que ya existen siguen usando la suya (CA-10).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { leerBanco, TEMAS } from "../src/trivial/banco.js";
import { CATEGORIAS } from "../src/trivial/tablero.js";
import { datos } from "./datos-csv.js";

const probar = process.argv.includes("--probar");
const archivo = join(datos, "trivial", "todas-las-preguntas.csv");
const informe = leerBanco(readFileSync(archivo, "utf8"));

console.log(`${archivo}`);
console.log(`Preguntas válidas: ${informe.preguntas.length}`);
for (const c of CATEGORIAS) console.log(`  ${c.nombre.padEnd(28)} ${informe.porCategoria[c.id]}`);
const sinExplicacion = informe.preguntas.filter((p) => !p.explicacion).length;
if (sinExplicacion) console.log(`Sin explicación (se admite): ${sinExplicacion}`);
for (const a of informe.avisos) console.log(`Aviso: ${a}`);
for (const e of informe.errores) console.log(`Error: ${e}`);
if (informe.errores.length) {
  console.log(`\n${informe.errores.length} errores: no se publica nada; sigue activa la versión anterior.`);
  process.exit(1);
}
if (probar) {
  console.log("\nSin errores. (--probar: no se publica)");
  process.exit(0);
}

process.loadEnvFile(new URL("../.env", import.meta.url));
const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("Falta SUPABASE_DB_URL en backend/.env");
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  const activa = await db.query("select version, huella from trivial_banco where activa");
  if (activa.rows[0]?.huella === informe.huella) {
    console.log(`\nEl CSV no ha cambiado: sigue activa la versión ${activa.rows[0].version}.`);
    process.exit(0);
  }
  await db.query("begin");
  const { rows } = await db.query("select coalesce(max(version), 0) + 1 as v from trivial_banco");
  const version = rows[0].v as number;
  const categorias = CATEGORIAS.map((c) => ({ id: c.id, nombre: c.nombre, temas: TEMAS[c.id], preguntas: informe.porCategoria[c.id] }));
  await db.query("update trivial_banco set activa = false where activa");
  await db.query(
    "insert into trivial_banco (version, titulo, categorias, huella, preguntas, activa) values ($1, $2, $3, $4, $5, true)",
    [version, "Banco de Cofradar", JSON.stringify(categorias), informe.huella, informe.preguntas.length],
  );
  // De 200 en 200, en una sola consulta cada tanda
  for (let i = 0; i < informe.preguntas.length; i += 200) {
    const tanda = informe.preguntas.slice(i, i + 200);
    const valores: unknown[] = [];
    const filas = tanda.map((p, j) => {
      valores.push(version, p.id, p.categoria, p.tema, p.hermandad, p.dificultad, p.lote, p.enunciado, JSON.stringify(p.opciones), p.correcta, p.explicacion, p.fuente);
      return `(${Array.from({ length: 12 }, (_, k) => `$${j * 12 + k + 1}`).join(", ")})`;
    });
    await db.query(
      `insert into trivial_pregunta (banco_version, id, categoria, tema, hermandad, dificultad, lote, enunciado, opciones, correcta, explicacion, fuente) values ${filas.join(", ")}`,
      valores,
    );
  }
  await db.query("commit");
  console.log(`\nPublicada la versión ${version} con ${informe.preguntas.length} preguntas. Las partidas que ya existen siguen con la suya.`);
} catch (e) {
  await db.query("rollback").catch(() => undefined);
  console.error("\nNo se ha publicado nada:", e);
  process.exitCode = 1;
} finally {
  await db.end();
}

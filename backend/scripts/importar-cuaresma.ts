/**
 * Carga el calendario de la pregunta del día (F-55) desde docs/datos/trivial/cuaresma-AAAA.csv.
 *
 *   npm run cuaresma:importar -w backend -- 2027             comprueba y carga
 *   npm run cuaresma:importar -w backend -- 2027 --probar    solo comprueba
 *
 * Columnas: dia, fecha, pregunta_id, hermandad, pregunta. Las dos últimas son para leerlo a ojo, y se
 * comprueba que cuadran con el banco: si una pregunta cambia de id, no se carga nada. Comprueba también
 * que los días son seguidos, del 1 al último, sin repetir pregunta ni hermandad.
 *
 * Reemplaza el calendario de ese año entero de una vez. Las respuestas ya dadas se quedan.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import pg from "pg";
import { leerBanco } from "../src/trivial/banco.js";
import { sumarDias } from "../src/dia/cirio.js";
import { datos } from "./datos-csv.js";

const anio = process.argv.slice(2).find((a) => /^\d{4}$/.test(a));
if (!anio) {
  console.log("Uso: npm run cuaresma:importar -w backend -- 2027 [--probar]");
  process.exit(1);
}
const probar = process.argv.includes("--probar");
const archivo = join(datos, "trivial", `cuaresma-${anio}.csv`);
const filas = parse(readFileSync(archivo, "utf8"), { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[];
const banco = new Map(leerBanco(readFileSync(join(datos, "trivial", "todas-las-preguntas.csv"), "utf8")).preguntas.map((p) => [p.id, p]));

const errores: string[] = [];
const ids = new Set<number>();
const hermandades = new Set<string>();
filas.forEach((f, i) => {
  const donde = `fila ${i + 2} (día ${f.dia})`;
  const dia = Number(f.dia);
  const id = Number(f.pregunta_id);
  if (dia !== i + 1) errores.push(`${donde}: los días tienen que ir seguidos desde el 1`);
  if (!f.fecha?.startsWith(anio)) errores.push(`${donde}: la fecha no es de ${anio}`);
  if (i > 0 && f.fecha !== sumarDias(filas[i - 1]!.fecha!, 1)) errores.push(`${donde}: la fecha no sigue a la anterior`);
  const p = banco.get(id);
  if (!p) errores.push(`${donde}: la pregunta ${f.pregunta_id} no está en el banco`);
  else {
    if (p.enunciado !== f.pregunta?.trim()) errores.push(`${donde}: el texto no cuadra con la pregunta ${id} del banco`);
    if (p.hermandad !== f.hermandad?.trim()) errores.push(`${donde}: la hermandad no cuadra con la pregunta ${id} del banco`);
  }
  if (ids.has(id)) errores.push(`${donde}: pregunta repetida`);
  if (hermandades.has(f.hermandad ?? "")) errores.push(`${donde}: hermandad repetida`);
  ids.add(id);
  hermandades.add(f.hermandad ?? "");
});

console.log(`${archivo}: ${filas.length} días, del ${filas[0]?.fecha} al ${filas.at(-1)?.fecha}`);
for (const e of errores) console.log(`Error: ${e}`);
if (errores.length) {
  console.log(`\n${errores.length} errores: no se carga nada.`);
  process.exit(1);
}
if (probar) {
  console.log("Sin errores. (--probar: no se carga)");
  process.exit(0);
}

process.loadEnvFile(new URL("../.env", import.meta.url));
const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("Falta SUPABASE_DB_URL en backend/.env");
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  // Que la pregunta esté publicada en el banco de la base, no solo en el CSV
  const { rows } = await db.query<{ id: number }>("select distinct id from trivial_pregunta where id = any($1)", [[...ids]]);
  const publicadas = new Set(rows.map((r) => r.id));
  const faltan = [...ids].filter((id) => !publicadas.has(id));
  if (faltan.length) {
    console.log(`Error: sin publicar en la base (npm run trivial:importar -w backend): ${faltan.join(", ")}`);
    process.exit(1);
  }
  await db.query("begin");
  await db.query("delete from dia_pregunta where extract(year from fecha) = $1", [Number(anio)]);
  for (const f of filas) await db.query("insert into dia_pregunta (fecha, dia, pregunta_id) values ($1, $2, $3)", [f.fecha, Number(f.dia), Number(f.pregunta_id)]);
  await db.query("commit");
  console.log(`Cargado: ${filas.length} días.`);
} catch (e) {
  await db.query("rollback").catch(() => undefined);
  throw e;
} finally {
  await db.end();
}

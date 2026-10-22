/**
 * Carga en Supabase los datos base de docs/datos/: los ocho CSV del modelo y el recorrido de cada salida.
 *
 * Primero crea las tablas que falten (supabase/esquema.sql). Después, en una sola transacción, vacía las
 * tablas y las vuelve a llenar: se puede repetir cada vez que cambien los CSV. Si algo falla, no se
 * cambia nada. Al final cuenta las filas de cada tabla y las compara con los CSV.
 *
 * Desde el 22/10/2026 (5.3) manda Supabase: los datos se corrigen en el panel y los CSV son su copia
 * (exportar-supabase.ts). Por eso, si Supabase tiene algo que no está en los CSV (una corrección hecha
 * en el panel y no exportada), la carga se niega: se perdería. Para cargar igualmente (empezar un año
 * nuevo, por ejemplo), `-- --pisar`.
 *
 * Uso: npm run cargar:datos -w backend [-- --pisar]   (lee SUPABASE_DB_URL de backend/.env)
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { datos, exportar, leerCsv, raiz, TABLAS, valor } from "./datos-csv.js";

process.loadEnvFile(join(raiz, ".env"));
const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("Falta SUPABASE_DB_URL en backend/.env");
const pisar = process.argv.includes("--pisar");

async function insertar(db: pg.Client, tabla: string, columnas: string[], filas: unknown[][]) {
  // Por bloques, para no pasar del límite de parámetros de Postgres
  for (let i = 0; i < filas.length; i += 500) {
    const bloque = filas.slice(i, i + 500);
    const huecos = bloque.map((_, f) => `(${columnas.map((_, c) => `$${f * columnas.length + c + 1}`).join(", ")})`);
    await db.query(`insert into ${tabla} (${columnas.join(", ")}) values ${huecos.join(", ")}`, bloque.flat());
  }
}

/** Los recorridos de cada año, con el id de su salida en properties.salida_procesional_id */
function leerRecorridos(): unknown[][] {
  const filas: unknown[][] = [];
  const carpeta = join(datos, "itinerarios");
  for (const anio of readdirSync(carpeta).filter((a) => /^\d{4}$/.test(a))) {
    for (const fichero of readdirSync(join(carpeta, anio)).filter((f) => f.endsWith(".geojson"))) {
      const geojson = JSON.parse(readFileSync(join(carpeta, anio, fichero), "utf-8"));
      const props = geojson.features?.[0]?.properties ?? {};
      if (!props.salida_procesional_id) throw new Error(`${anio}/${fichero} no lleva salida_procesional_id`);
      filas.push([props.salida_procesional_id, JSON.stringify(geojson), props.metros ?? null, props.provisional !== false]);
    }
  }
  return filas;
}

const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  await db.query(readFileSync(join(raiz, "supabase", "esquema.sql"), "utf-8"));

  // ¿Hay en Supabase algo que no está en los CSV? Con las tablas vacías (primera carga), nada que perder
  const { rows: hay } = await db.query<{ n: string }>("select count(*) as n from hermandad");
  if (Number(hay[0]?.n) > 0 && !pisar) {
    const distintas = [...(await exportar(db))].filter(([tabla, texto]) => readFileSync(join(datos, `${tabla}.csv`), "utf-8") !== texto);
    if (distintas.length) {
      console.error(
        `Supabase tiene cambios que no están en los CSV (${distintas.map(([t]) => t).join(", ")}).\n` +
          "Probablemente son correcciones hechas en el panel: cargar los CSV las borraría.\n" +
          "· Para guardarlas: npm run exportar:datos -w backend, revisar con git diff docs/datos y subirlas.\n" +
          "· Para cargar los CSV igualmente y perderlas: npm run cargar:datos -w backend -- --pisar",
      );
      process.exitCode = 1;
      throw new Error("Carga cancelada: no se ha cambiado nada");
    }
  }

  const esperado: Record<string, number> = {};
  await db.query("begin");
  await db.query(`truncate recorrido, ${TABLAS.map(([t]) => t).reverse().join(", ")}`);
  for (const [tabla, tipos] of TABLAS) {
    const columnas = Object.keys(tipos);
    const filas = leerCsv(tabla).map((f) => columnas.map((c) => valor(f[c], tipos[c]!)));
    await insertar(db, tabla, columnas, filas);
    esperado[tabla] = filas.length;
  }
  const recorridos = leerRecorridos();
  await insertar(db, "recorrido", ["salida_procesional_id", "geojson", "metros", "provisional"], recorridos);
  esperado.recorrido = recorridos.length;
  await db.query("commit");

  let bien = true;
  for (const [tabla, n] of Object.entries(esperado)) {
    const { rows } = await db.query<{ n: string }>(`select count(*) as n from ${tabla}`);
    const hay = Number(rows[0]?.n);
    bien &&= hay === n;
    console.log(`${hay === n ? "✓" : "✗"} ${tabla.padEnd(20)} ${hay}${hay === n ? "" : ` (el CSV tiene ${n})`}`);
  }
  if (!bien) process.exitCode = 1;
} catch (e) {
  await db.query("rollback").catch(() => {});
  throw e;
} finally {
  await db.end();
}

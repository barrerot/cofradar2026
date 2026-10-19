/**
 * Carga en Supabase los datos base de docs/datos/: los ocho CSV del modelo y el recorrido de cada salida.
 *
 * Primero crea las tablas que falten (supabase/esquema.sql). Después, en una sola transacción, vacía las
 * tablas y las vuelve a llenar: se puede repetir cada vez que cambien los CSV. Si algo falla, no se
 * cambia nada. Al final cuenta las filas de cada tabla y las compara con los CSV.
 *
 * Uso: npm run cargar:datos -w backend   (lee SUPABASE_DB_URL de backend/.env)
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import pg from "pg";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const datos = join(raiz, "..", "docs", "datos");
process.loadEnvFile(join(raiz, ".env"));
const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("Falta SUPABASE_DB_URL en backend/.env");

type Fila = Record<string, string>;
type Tipo = "texto" | "entero" | "decimal" | "fecha" | "sino";

// Tablas en orden de carga (cada una después de aquellas a las que apunta) y el tipo de cada columna
const TABLAS: [string, Record<string, Tipo>][] = [
  ["punto_geografico", { id: "entero", nombre: "texto", tipo: "texto", latitud: "decimal", longitud: "decimal" }],
  ["templo", { id: "entero", nombre: "texto", direccion: "texto", punto_geografico_id: "entero" }],
  ["hermandad", {
    id: "entero", nombre: "texto", nombre_oficial: "texto", templo_id: "entero", escudo: "texto", web: "texto",
    historia: "texto", fundacion: "texto", numero_hermanos: "entero", numero_nazarenos: "entero", duracion_cortejo: "entero",
  }],
  ["paso", {
    id: "entero", hermandad_id: "entero", nombre: "texto", orden: "entero", autor: "texto", capataz: "texto",
    musica: "texto", fotografia: "texto",
  }],
  ["edicion", { id: "entero", anio: "entero" }],
  ["jornada", { id: "entero", nombre: "texto", orden: "entero" }],
  ["salida_procesional", { id: "entero", hermandad_id: "entero", edicion_id: "entero", jornada_id: "entero", estado: "texto" }],
  ["punto_itinerario", {
    id: "entero", salida_procesional_id: "entero", punto_geografico_id: "entero", referencia: "texto",
    fecha_hora: "fecha", hora_publicada: "sino", orden: "entero",
  }],
];

function valor(v: string | undefined, tipo: Tipo): string | number | boolean | null {
  const t = (v ?? "").trim();
  if (t === "") return null;
  if (tipo === "entero") return Number.parseInt(t, 10);
  if (tipo === "decimal") return Number.parseFloat(t);
  if (tipo === "sino") return t === "si";
  return t;
}

function leerCsv(tabla: string): Fila[] {
  return parse(readFileSync(join(datos, `${tabla}.csv`), "utf-8"), { columns: true, skip_empty_lines: true });
}

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

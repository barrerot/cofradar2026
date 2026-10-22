/**
 * Lo común a cargar (cargar-supabase.ts) y exportar (exportar-supabase.ts) los datos base: las ocho
 * tablas del modelo con sus columnas y tipos, y cómo se escribe cada valor en el CSV.
 *
 * Desde el 22/10/2026 (5.3) manda Supabase: los datos se corrigen en el panel y los CSV de docs/datos/
 * son la copia que se guarda en el repositorio. Exportar escribe los CSV exactamente como están
 * (mismo orden de columnas, LF, comillas solo cuando hacen falta), así que sin cambios no hay diferencia.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import type pg from "pg";

export const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
export const datos = join(raiz, "..", "docs", "datos");

export type Fila = Record<string, string>;
export type Tipo = "texto" | "entero" | "decimal" | "fecha" | "sino";

// Tablas en orden de carga (cada una después de aquellas a las que apunta) y el tipo de cada columna
export const TABLAS: [string, Record<string, Tipo>][] = [
  ["punto_geografico", { id: "entero", nombre: "texto", tipo: "texto", latitud: "decimal", longitud: "decimal" }],
  // Los lugares de la ciudad que importan, en orden (5.4): la carrera oficial y otros
  ["hito", { id: "entero", punto_geografico_id: "entero", orden: "entero", carrera_oficial: "sino" }],
  ["templo", { id: "entero", nombre: "texto", direccion: "texto", punto_geografico_id: "entero" }],
  ["hermandad", {
    id: "entero", nombre: "texto", nombre_oficial: "texto", templo_id: "entero", escudo: "texto", web: "texto",
    historia: "texto", fundacion: "texto", numero_hermanos: "entero", numero_nazarenos: "entero", duracion_cortejo: "entero",
  }],
  // Los tipos de elemento del cortejo, con su nombre cofrade y en llano (5.4)
  ["elemento", { id: "entero", nombre: "texto", llano: "texto", orden: "entero", clave: "texto" }],
  ["paso", {
    id: "entero", hermandad_id: "entero", nombre: "texto", orden: "entero", autor: "texto", capataz: "texto",
    musica: "texto", fotografia: "texto", elemento_id: "entero",
  }],
  ["edicion", { id: "entero", anio: "entero" }],
  ["jornada", { id: "entero", nombre: "texto", orden: "entero" }],
  ["salida_procesional", { id: "entero", hermandad_id: "entero", edicion_id: "entero", jornada_id: "entero", estado: "texto" }],
  ["punto_itinerario", {
    id: "entero", salida_procesional_id: "entero", punto_geografico_id: "entero", referencia: "texto",
    fecha_hora: "fecha", hora_publicada: "sino", orden: "entero",
  }],
];

export function valor(v: string | undefined, tipo: Tipo): string | number | boolean | null {
  const t = (v ?? "").trim();
  if (t === "") return null;
  if (tipo === "entero") return Number.parseInt(t, 10);
  if (tipo === "decimal") return Number.parseFloat(t);
  if (tipo === "sino") return t === "si";
  return t;
}

export function leerCsv(tabla: string): Fila[] {
  return parse(readFileSync(join(datos, `${tabla}.csv`), "utf-8"), { columns: true, skip_empty_lines: true });
}

/** Un valor de Postgres tal como va en el CSV. */
function enCsv(v: unknown, tipo: Tipo): string {
  if (v === null || v === undefined) return "";
  if (tipo === "decimal") return Number(v).toFixed(5);
  if (tipo === "sino") return v ? "si" : "no";
  // timestamp sin zona: pg lo da como texto «2026-03-27 17:30:00» (ver tipos más abajo)
  if (tipo === "fecha") return String(v).replace(" ", "T").slice(0, 16);
  const t = String(v);
  return /[",\n\r]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
}

/** Cada tabla de Supabase como el texto de su CSV, ordenada por id. */
export async function exportar(db: pg.Client): Promise<Map<string, string>> {
  const res = new Map<string, string>();
  for (const [tabla, tipos] of TABLAS) {
    const columnas = Object.keys(tipos);
    // Los timestamp, como texto: así no pasan por la zona horaria de Node
    const select = columnas.map((c) => (tipos[c] === "fecha" ? `${c}::text as ${c}` : c)).join(", ");
    const { rows } = await db.query(`select ${select} from ${tabla} order by id`);
    const lineas = [columnas.join(","), ...rows.map((r) => columnas.map((c) => enCsv(r[c], tipos[c]!)).join(","))];
    res.set(tabla, lineas.join("\n") + "\n");
  }
  return res;
}

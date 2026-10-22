/**
 * Escribe en docs/datos/ los ocho CSV del modelo con lo que hay en Supabase (5.3): la copia en el
 * repositorio de lo que se ha corregido en el panel. Después, revisar con `git diff docs/datos` y subir.
 *
 * Uso: npm run exportar:datos -w backend   (lee SUPABASE_DB_URL de backend/.env)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { datos, exportar, raiz } from "./datos-csv.js";

process.loadEnvFile(join(raiz, ".env"));
const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("Falta SUPABASE_DB_URL en backend/.env");

const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  for (const [tabla, texto] of await exportar(db)) {
    const fichero = join(datos, `${tabla}.csv`);
    const igual = readFileSync(fichero, "utf-8") === texto;
    if (!igual) writeFileSync(fichero, texto);
    console.log(`${igual ? "  sin cambios" : "✎ actualizado"}  ${tabla}.csv`);
  }
} finally {
  await db.end();
}

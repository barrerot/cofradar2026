/**
 * Crea en Supabase las tablas que falten (supabase/esquema.sql), SIN tocar los datos.
 * Para cuando se añade una tabla nueva y no hace falta recargar todo.
 *
 * Uso: npm run esquema -w backend   (lee SUPABASE_DB_URL de backend/.env)
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = new URL("../.env", import.meta.url);
process.loadEnvFile(env);
const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("Falta SUPABASE_DB_URL en backend/.env");

const cliente = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await cliente.connect();
try {
  await cliente.query(readFileSync(new URL("../supabase/esquema.sql", import.meta.url), "utf8"));
  const { rows } = await cliente.query("select table_name from information_schema.tables where table_schema = 'public' order by 1");
  console.log("Tablas:", rows.map((r) => r.table_name).join(", "));
} finally {
  await cliente.end();
}

import pg from "pg";

/**
 * Conexión directa a Postgres (SUPABASE_DB_URL), para lo que necesita transacciones de verdad: el trivial
 * online bloquea la partida (select … for update) mientras aplica una jugada, y así una respuesta, un
 * vencimiento y una rendición que llegan a la vez no se pisan (PRD v1.1, apartado 7). El resto de la API
 * sigue usando el cliente de Supabase (supabase.ts).
 */
let pool: pg.Pool | undefined;

function conexion(): pg.Pool {
  if (pool) return pool;
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("Falta SUPABASE_DB_URL en backend/.env");
  pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 });
  pool.on("error", (e) => console.error("bd:", e.message));
  return pool;
}

export type Cliente = pg.PoolClient;

/** Ejecuta `fn` en una transacción: si lanza, se deshace todo. */
export async function enTransaccion<T>(fn: (bd: Cliente) => Promise<T>): Promise<T> {
  const bd = await conexion().connect();
  try {
    await bd.query("begin");
    const r = await fn(bd);
    await bd.query("commit");
    return r;
  } catch (e) {
    await bd.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    bd.release();
  }
}

export function consulta<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, valores?: unknown[]) {
  return conexion().query<T>(sql, valores);
}

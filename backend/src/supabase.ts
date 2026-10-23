import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

/**
 * Cliente de Supabase del servidor, con la clave secreta. Solo vive aquí: el frontend nunca la ve.
 * Las tablas tienen RLS sin políticas, así que sin esta clave no se lee nada.
 */
let cliente: SupabaseClient | undefined;

export function supabase(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) throw new Error("Faltan SUPABASE_URL y SUPABASE_SECRET_KEY en backend/.env");
  cliente = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Node 20 no trae WebSocket y el cliente lo pide aunque no usemos tiempo real
    realtime: { transport: ws as never },
  });
  return cliente;
}

/**
 * Todas las filas de una consulta. Supabase (PostgREST) no devuelve más de 1.000 de una vez, y lo que
 * pasa de ahí se pierde SIN AVISO: en la prueba de carga (BUL-212), con 20.000 «Dar fe» en la Madrugá,
 * el motor solo veía 1.000. Aquí se piden de 1.000 en 1.000: la primera dice cuántas hay y las demás
 * van a la vez. `pagina` recibe el rango y debe ordenar por algo estable (si no, se repiten o se saltan).
 */
const PAGINA = 1000;
type Pagina<T> = PromiseLike<{ data: T[] | null; error: unknown; count?: number | null }>;
export async function todas<T>(pagina: (desde: number, hasta: number) => Pagina<T>): Promise<T[]> {
  const primera = await pagina(0, PAGINA - 1);
  if (primera.error) throw primera.error;
  const filas = primera.data ?? [];
  const total = primera.count ?? filas.length;
  const resto = [];
  for (let desde = PAGINA; desde < total; desde += PAGINA) resto.push(pagina(desde, desde + PAGINA - 1));
  for (const r of await Promise.all(resto)) {
    if (r.error) throw r.error;
    filas.push(...(r.data ?? []));
  }
  return filas;
}

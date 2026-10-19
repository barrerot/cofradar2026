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

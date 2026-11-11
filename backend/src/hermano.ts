import { consulta, type Cliente } from "./bd.js";

/**
 * Número de hermano (F-54): cada cuenta, el suyo por orden de llegada, como la antigüedad en una hermandad
 * («hermano nº 214 de Cofradar»). Lo da la base al darse de alta (disparador en supabase/esquema.sql); si
 * aquello fallara, se da aquí la primera vez que se pide. No se reutiliza nunca. Las cuentas de prueba
 * (@cofradar.invalid) no tienen.
 */
export type Hermano = { numero: number; desde: string };

export async function hermanoDe(usuario: string): Promise<Hermano | null> {
  // El insert y la lectura van en la misma sentencia: devuelve una sola fila, la nueva o la que ya había
  const { rows } = await consulta<{ numero: number; desde: Date }>(
    `with nuevo as (
       insert into hermano (usuario_id, desde)
       select id, created_at from auth.users
       where id = $1 and coalesce(email, '') not like '%@cofradar.invalid'
         and not exists (select 1 from hermano where usuario_id = $1)
       on conflict (usuario_id) do nothing
       returning numero, desde
     )
     select numero, desde from nuevo
     union all
     select numero, desde from hermano where usuario_id = $1`,
    [usuario],
  );
  const h = rows[0];
  return h ? { numero: h.numero, desde: new Date(h.desde).toISOString() } : null;
}

/** El número de varios, para enseñarlo junto a su alias. Dentro de una transacción, con su conexión. */
export async function numerosDe(ids: string[], bd?: Cliente): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const sql = "select usuario_id, numero from hermano where usuario_id = any($1)";
  const { rows } = bd ? await bd.query<{ usuario_id: string; numero: number }>(sql, [ids]) : await consulta<{ usuario_id: string; numero: number }>(sql, [ids]);
  return new Map(rows.map((r) => [r.usuario_id, r.numero]));
}

import type { Cliente } from "../bd.js";
import { consulta } from "../bd.js";
import { hermandadesPorJornada, slug } from "../rutas/cofradias.js";

/**
 * El álbum de estampas (F-56, P-35). Cada hermandad, su estampa, con tres grados:
 *   la conoces    5 preguntas suyas distintas acertadas con sesión: en solitario (trivial_acierto), online
 *                 (trivial_jugada) o en la pregunta del día (dia_respuesta);
 *   la has visto  la tienes en Mi colección (vista), con sus años;
 *   has dado fe   una aportación suya ayudó a situarla (resultado «consolidada»), con sus años.
 * De por vida y sin puntos (R1). Lo que no tienes va en blanco: nunca se dice cuántas preguntas faltan (R5).
 */

export const PARA_CONOCER = 5;

type Bd = Cliente | typeof consulta;
const leer = <T extends Record<string, unknown>>(bd: Bd, sql: string, valores: unknown[]) =>
  typeof bd === "function" ? bd<T>(sql, valores) : bd.query<T>(sql, valores);

export class ErrorAlbum extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

// De qué hermandad es cada pregunta. El banco cambia pocas veces al año: se recuerda un minuto.
let deQuien: { cuando: number; mapa: Promise<Map<number, number>> } | null = null;
function hermandadDePregunta(): Promise<Map<number, number>> {
  if (deQuien && Date.now() - deQuien.cuando < 60_000) return deQuien.mapa;
  const mapa = (async () => {
    const [{ rows }, lista] = await Promise.all([
      consulta<{ id: number; hermandad: string }>("select distinct on (id) id, hermandad from trivial_pregunta order by id, banco_version desc"),
      hermandadesPorJornada(),
    ]);
    const porSlug = new Map(lista.map((h) => [h.cofradia, h.hermandadId]));
    const m = new Map<number, number>();
    for (const r of rows) {
      const h = porSlug.get(slug(r.hermandad));
      if (h !== undefined) m.set(r.id, h);
    }
    return m;
  })();
  deQuien = { cuando: Date.now(), mapa };
  mapa.catch(() => (deQuien = null));
  return mapa;
}

/** Las preguntas distintas que ha acertado, de las tres fuentes. */
async function aciertosDe(bd: Bd, usuario: string): Promise<Set<number>> {
  const { rows } = await leer<{ id: number }>(
    bd,
    `select pregunta_id as id from trivial_acierto where usuario_id = $1
     union
     select pregunta_id from dia_respuesta where usuario_id = $1 and acierto
     union
     select j.pregunta_id from trivial_jugada j join trivial_partida p on p.id = j.partida_id
     where j.acierto and (p.jugador_0 = $1 or p.jugador_1 = $1)
       and ((j.puesto = 0 and p.jugador_0 = $1) or (j.puesto = 1 and p.jugador_1 = $1))`,
    [usuario],
  );
  return new Set(rows.map((r) => r.id));
}

function porHermandad(aciertos: Set<number>, mapa: Map<number, number>): Map<number, number> {
  const n = new Map<number, number>();
  for (const id of aciertos) {
    const h = mapa.get(id);
    if (h !== undefined) n.set(h, (n.get(h) ?? 0) + 1);
  }
  return n;
}

export type Nueva = { cofradia: string; nombre: string };

/**
 * Apunta aciertos (`apuntar`) y dice qué estampas acaban de llegar a «la conoces». Lo de antes se mira
 * antes de apuntar, con la misma conexión: dentro de la transacción de la jugada, si la hay.
 */
export async function conocerTras(bd: Bd, usuario: string, apuntar: () => Promise<unknown>): Promise<Nueva[]> {
  const mapa = await hermandadDePregunta();
  const antes = porHermandad(await aciertosDe(bd, usuario), mapa);
  await apuntar();
  const despues = porHermandad(await aciertosDe(bd, usuario), mapa);
  const nuevas = [...despues].filter(([h, n]) => n >= PARA_CONOCER && (antes.get(h) ?? 0) < PARA_CONOCER).map(([h]) => h);
  if (!nuevas.length) return [];
  const lista = await hermandadesPorJornada();
  return lista.filter((h) => nuevas.includes(h.hermandadId)).map((h) => ({ cofradia: h.cofradia, nombre: h.nombre }));
}

/** Los aciertos del trivial en solitario: el teléfono dice la pregunta y el texto que eligió. */
export async function apuntarSolitario(usuario: string, cuerpo: { aciertos?: unknown }): Promise<{ apuntados: number; nuevas: Nueva[] }> {
  const lista = Array.isArray(cuerpo.aciertos) ? cuerpo.aciertos.slice(0, 50) : null;
  if (!lista) throw new ErrorAlbum(400, "Faltan los aciertos");
  const pedidos = lista
    .map((a) => a as { id?: unknown; respuesta?: unknown })
    .filter((a) => Number.isInteger(a.id) && typeof a.respuesta === "string")
    .map((a) => ({ id: a.id as number, respuesta: a.respuesta as string }));
  if (!pedidos.length) return { apuntados: 0, nuevas: [] };
  // Solo cuenta si es la buena: se mira en el banco (la última versión que tenga cada pregunta)
  const { rows } = await consulta<{ id: number; buena: string }>(
    `select distinct on (id) id, (select o->>'texto' from jsonb_array_elements(opciones) o where o->>'id' = correcta) as buena
     from trivial_pregunta where id = any($1) order by id, banco_version desc`,
    [pedidos.map((p) => p.id)],
  );
  const buena = new Map(rows.map((r) => [r.id, r.buena]));
  const ids = [...new Set(pedidos.filter((p) => buena.get(p.id) === p.respuesta).map((p) => p.id))];
  if (!ids.length) return { apuntados: 0, nuevas: [] };
  let apuntados = 0;
  const nuevas = await conocerTras(consulta, usuario, async () => {
    const r = await consulta(
      "insert into trivial_acierto (usuario_id, pregunta_id) select $1, unnest($2::int[]) on conflict do nothing",
      [usuario, ids],
    );
    apuntados = r.rowCount ?? 0;
  });
  return { apuntados, nuevas };
}

export type Estampa = {
  cofradia: string;
  nombre: string;
  conoces: boolean;
  /** Los años en que la viste (Mi colección), de menor a mayor */
  vista: number[];
  /** Los años en que una aportación tuya ayudó a situarla */
  fe: number[];
};

export type Album = {
  /** Las que tienen algún grado */
  estampas: number;
  jornadas: { id: number; nombre: string; orden: number; estampas: Estampa[] }[];
};

export async function verAlbum(usuario: string): Promise<Album> {
  const [lista, mapa, aciertos, vistas, fe] = await Promise.all([
    hermandadesPorJornada(),
    hermandadDePregunta(),
    aciertosDe(consulta, usuario),
    consulta<{ hermandad_id: number; anio: number }>("select hermandad_id, anio from vista where usuario_id = $1 order by anio", [usuario]),
    consulta<{ hermandad_id: number; anio: number }>(
      `select hermandad_id, extract(year from observada at time zone 'Europe/Madrid')::int as anio from aportacion
       where usuario_id = $1 and resultado = 'consolidada' group by 1, 2 order by 2`,
      [usuario],
    ),
  ]);
  const conoce = porHermandad(aciertos, mapa);
  const anios = (filas: { hermandad_id: number; anio: number }[]) => {
    const m = new Map<number, number[]>();
    for (const f of filas) m.set(f.hermandad_id, [...(m.get(f.hermandad_id) ?? []), f.anio]);
    return m;
  };
  const vistasDe = anios(vistas.rows);
  const feDe = anios(fe.rows);
  const jornadas = new Map<number, Album["jornadas"][number]>();
  let estampas = 0;
  for (const h of lista) {
    const e: Estampa = {
      cofradia: h.cofradia,
      nombre: h.nombre,
      conoces: (conoce.get(h.hermandadId) ?? 0) >= PARA_CONOCER,
      vista: vistasDe.get(h.hermandadId) ?? [],
      fe: feDe.get(h.hermandadId) ?? [],
    };
    if (e.conoces || e.vista.length || e.fe.length) estampas++;
    let j = jornadas.get(h.jornada.id);
    if (!j) jornadas.set(h.jornada.id, (j = { ...h.jornada, estampas: [] }));
    j.estampas.push(e);
  }
  return { estampas, jornadas: [...jornadas.values()] };
}

/** Para «Descargar mis datos» (F-35): los aciertos del trivial en solitario. */
export async function datosDe(usuario: string) {
  const { rows } = await consulta<{ pregunta_id: number; creado: Date }>(
    "select pregunta_id, creado from trivial_acierto where usuario_id = $1 order by creado",
    [usuario],
  );
  return rows.map((r) => ({ pregunta: r.pregunta_id, acertada: r.creado }));
}

import type { Cliente } from "../bd.js";
import { consulta } from "../bd.js";
import { diaDeMadrid } from "../dia/cirio.js";
import { CASA_DIA, CASA_PARTIDA, CASA_POR_DIA, cargoDe, NIVELES, repartirCasa, type Cargo, type EventoCasa } from "./cargo.js";

/**
 * Los puntos de cada uno, de la base de datos (F-58):
 *   la calle  la base y el bonus de sus aportaciones;
 *   la casa   las partidas online que ganó por estrellas (5) y las preguntas del día que contestó (2), hasta
 *             10 por día de Madrid. La rendición del rival no cuenta: si contara, bastaría con dos cuentas y
 *             rendirse en el primer turno. Las del día cuentan en el día de la pregunta.
 * Los puntos de la casa nunca entran en la reputación ni en el motor (R4): solo suben el cargo.
 */

type Bd = Cliente | typeof consulta;
const leer = <T extends Record<string, unknown>>(bd: Bd, sql: string, valores: unknown[]) =>
  typeof bd === "function" ? bd<T>(sql, valores) : bd.query<T>(sql, valores);

export const clavePartida = (id: string) => `partida:${id}`;
export const claveDia = (fecha: string, dePrueba: boolean) => `dia:${dePrueba ? "prueba:" : ""}${fecha}`;

async function eventosCasa(bd: Bd, usuario: string): Promise<EventoCasa[]> {
  const [ganadas, dias] = await Promise.all([
    leer<{ id: string; terminada: Date }>(
      bd,
      `select id, terminada from trivial_partida
       where estado = 'finalizada' and motivo = 'estrellas' and terminada is not null
         and ((jugador_0 = $1 and ganador = 0) or (jugador_1 = $1 and ganador = 1))`,
      [usuario],
    ),
    leer<{ fecha: string; de_prueba: boolean; creada: Date }>(
      bd,
      "select to_char(fecha, 'YYYY-MM-DD') as fecha, de_prueba, creada from dia_respuesta where usuario_id = $1",
      [usuario],
    ),
  ]);
  return [
    ...ganadas.rows.map((g) => ({ clave: clavePartida(g.id), dia: diaDeMadrid(new Date(g.terminada)), cuando: new Date(g.terminada).getTime(), valor: CASA_PARTIDA })),
    ...dias.rows.map((d) => ({ clave: claveDia(d.fecha, d.de_prueba), dia: d.fecha, cuando: new Date(d.creada).getTime(), valor: CASA_DIA })),
  ];
}

export type Puntos = { cargo: Cargo; dio: Map<string, number>; porDia: Map<string, number> };

export async function puntosDe(usuario: string, bd: Bd = consulta): Promise<Puntos> {
  const [calle, eventos] = await Promise.all([
    leer<{ puntos: number }>(bd, "select coalesce(sum(puntos_base + bonus), 0)::int as puntos from aportacion where usuario_id = $1", [usuario]),
    eventosCasa(bd, usuario),
  ]);
  const casa = repartirCasa(eventos);
  return { cargo: cargoDe(calle.rows[0]!.puntos, casa.total), dio: casa.dio, porDia: casa.porDia };
}

/**
 * Lo que dio a tu cargo una cosa de la casa (una partida, la pregunta de un día), para la línea pequeña
 * de su pantalla: «+5 puntos para tu cargo» o, si ya no cabía, «Hoy ya has sumado los 10 puntos de la casa».
 */
export type LineaCasa = { puntos: number; tope: boolean };
export function lineaCasa(p: Puntos, clave: string, dia: string): LineaCasa | null {
  const dio = p.dio.get(clave);
  if (dio === undefined) return null;
  return { puntos: dio, tope: dio === 0 && (p.porDia.get(dia) ?? 0) >= CASA_POR_DIA };
}

/** Para GET /api/yo/cargo: el cargo, la escalera y lo que llevas hoy de la casa. */
export async function verCargo(usuario: string, ahora: Date) {
  const p = await puntosDe(usuario);
  return {
    ...p.cargo,
    hoyCasa: p.porDia.get(diaDeMadrid(ahora)) ?? 0,
    niveles: NIVELES.map((n) => ({ nombre: n.nombre, desde: n.desde })),
  };
}

import { CASILLAS, CATEGORIAS, SALIDA, destinos, type Categoria } from "./tablero.js";

/**
 * Las reglas del trivial online (PRD v1.1, RF-03 a RF-08), sin base de datos: reciben el estado de la
 * partida y devuelven el siguiente. La persistencia (partidas.ts) las llama dentro de una transacción con
 * la partida bloqueada, y pone lo que necesita la base (la pregunta elegida, la hora del servidor).
 */
export const REGLAS = "online-1";
export const PLAZO_TURNO_MS = 48 * 3600_000;
export const ESTRELLAS_PARA_GANAR = CATEGORIAS.length;

export type Puesto = 0 | 1;
export type Fase = "tirar" | "mover" | "responder";
export type Motivo = "estrellas" | "rendicion" | "inactividad";

export type PreguntaPendiente = {
  /** Número de la jugada (trivial_jugada.n) */
  jugada: number;
  id: number;
  categoria: Categoria;
  casilla: string;
  estrella: boolean;
  /** Las cuatro opciones en el orden en que se enseñan, fijado al asignarla */
  opciones: { id: string; texto: string }[];
};

export type Estado = {
  estado: "activa" | "finalizada";
  motivo: Motivo | null;
  ganador: Puesto | null;
  posiciones: [string, string];
  estrellas: [Categoria[], Categoria[]];
  turno: Puesto;
  turno_n: number;
  turno_desde: Date;
  turno_vence: Date;
  fase: Fase;
  tirada: number | null;
  destinos: string[] | null;
  pregunta: PreguntaPendiente | null;
  vencimientos_seguidos: number;
};

export class JugadaNoValida extends Error {}

const otro = (p: Puesto): Puesto => (p === 0 ? 1 : 0);
const mas48 = (d: Date) => new Date(d.getTime() + PLAZO_TURNO_MS);

/** RF-03: las dos fichas en la Salida; empieza quien diga el sorteo. */
export function empezar(ahora: Date, empieza: Puesto): Estado {
  return {
    estado: "activa",
    motivo: null,
    ganador: null,
    posiciones: [SALIDA, SALIDA],
    estrellas: [[], []],
    turno: empieza,
    turno_n: 1,
    turno_desde: ahora,
    turno_vence: mas48(ahora),
    fase: "tirar",
    tirada: null,
    destinos: null,
    pregunta: null,
    vencimientos_seguidos: 0,
  };
}

/**
 * RF-07: los turnos vencidos hasta `ahora`. Cada vencimiento cierra la pregunta pendiente como no
 * contestada y da el turno al rival con su plazo, contado desde el vencimiento anterior (aunque esto se
 * procese tarde). Dos vencimientos seguidos sin ninguna jugada entre medias cierran por inactividad.
 * Devuelve las jugadas que han quedado vencidas, para apuntarlas.
 */
export function vencer(e: Estado, ahora: Date): { estado: Estado; vencidas: number[] } {
  let s = e;
  const vencidas: number[] = [];
  while (s.estado === "activa" && ahora.getTime() >= s.turno_vence.getTime()) {
    if (s.pregunta) vencidas.push(s.pregunta.jugada);
    const seguidos = s.vencimientos_seguidos + 1;
    const desde = s.turno_vence;
    s = {
      ...s,
      turno: otro(s.turno),
      turno_n: s.turno_n + 1,
      turno_desde: desde,
      turno_vence: mas48(desde),
      fase: "tirar",
      tirada: null,
      destinos: null,
      pregunta: null,
      vencimientos_seguidos: seguidos,
    };
    if (seguidos >= 2) s = { ...s, estado: "finalizada", motivo: "inactividad", ganador: null };
  }
  return { estado: s, vencidas };
}

function exigir(e: Estado, puesto: Puesto, fase: Fase) {
  if (e.estado !== "activa") throw new JugadaNoValida("La partida ya ha terminado");
  if (e.turno !== puesto) throw new JugadaNoValida("No es tu turno");
  if (e.fase !== fase) throw new JugadaNoValida("Ahora no toca eso");
}

/** RF-04: tirar. El valor lo pone el servidor (1 a 6). */
export function tirar(e: Estado, puesto: Puesto, valor: number): Estado {
  exigir(e, puesto, "tirar");
  if (!Number.isInteger(valor) || valor < 1 || valor > 6) throw new Error(`Tirada imposible: ${valor}`);
  const posibles = destinos(e.posiciones[puesto], valor);
  if (posibles.length === 0) throw new Error(`El tablero no da destino desde ${e.posiciones[puesto]} con ${valor}`);
  return { ...e, fase: "mover", tirada: valor, destinos: posibles, vencimientos_seguidos: 0 };
}

/** La categoría de la pregunta en una casilla (RF-05). En la Salida se sortea con `azar` (0 a 1). */
export function categoriaDe(casilla: string, azar: number): Categoria {
  const c = CASILLAS.get(casilla);
  if (!c) throw new Error(`No existe la casilla ${casilla}`);
  return c.categoria ?? CATEGORIAS[Math.min(5, Math.floor(azar * 6))]!.id;
}

/** RF-04 y RF-05: mover a uno de los destinos; la pregunta la elige la persistencia y llega ya montada. */
export function mover(e: Estado, puesto: Puesto, destino: string, pregunta: PreguntaPendiente): Estado {
  exigir(e, puesto, "mover");
  if (!e.destinos?.includes(destino)) throw new JugadaNoValida("No puedes ir a esa casilla con esa tirada");
  const posiciones: [string, string] = [...e.posiciones];
  posiciones[puesto] = destino;
  return { ...e, posiciones, fase: "responder", pregunta, vencimientos_seguidos: 0 };
}

/**
 * RF-06: responder. Acierto: sigue tirando (y gana la estrella si la casilla lo es y no la tenía; con la
 * sexta, gana la partida). Fallo: la ficha se queda y el turno pasa al rival con su plazo.
 */
export function responder(e: Estado, puesto: Puesto, acierto: boolean, ahora: Date): { estado: Estado; estrella: Categoria | null } {
  exigir(e, puesto, "responder");
  const p = e.pregunta;
  if (!p) throw new Error("Fase responder sin pregunta");
  const base = { ...e, pregunta: null, tirada: null, destinos: null, vencimientos_seguidos: 0 };
  if (!acierto) {
    return {
      estado: { ...base, fase: "tirar", turno: otro(puesto), turno_n: e.turno_n + 1, turno_desde: ahora, turno_vence: mas48(ahora) },
      estrella: null,
    };
  }
  let estrella: Categoria | null = null;
  const estrellas: [Categoria[], Categoria[]] = [[...e.estrellas[0]], [...e.estrellas[1]]];
  if (p.estrella && !estrellas[puesto].includes(p.categoria)) {
    estrellas[puesto].push(p.categoria);
    estrella = p.categoria;
  }
  if (estrellas[puesto].length >= ESTRELLAS_PARA_GANAR) {
    return { estado: { ...base, estrellas, fase: "tirar", estado: "finalizada", motivo: "estrellas", ganador: puesto }, estrella };
  }
  // Sigue el mismo turno y el mismo plazo (RF-07: el plazo no se reinicia al encadenar aciertos)
  return { estado: { ...base, estrellas, fase: "tirar" }, estrella };
}

/** RF-08: rendirse. Gana el rival. */
export function rendirse(e: Estado, puesto: Puesto): Estado {
  if (e.estado !== "activa") throw new JugadaNoValida("La partida ya ha terminado");
  return { ...e, estado: "finalizada", motivo: "rendicion", ganador: otro(puesto), pregunta: null, tirada: null, destinos: null };
}

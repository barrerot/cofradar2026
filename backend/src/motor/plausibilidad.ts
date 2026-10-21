import type { Coord } from "../geo.js";

/**
 * Los cuatro controles del momento en que llega un «Dar fe» (4.7, BUL-186; PRD, «Plausibilidad en el
 * momento»). Baratos, síncronos y SIN GPS: ninguno mira dónde dice estar la persona. Juzgan si su
 * propia historia se sostiene:
 *
 *   repetición       la misma cofradía y el mismo elemento otra vez, a los pocos minutos
 *   teletransporte   dos cofradías seguidas que estaban demasiado lejos una de otra para ese rato
 *                    (lejos según dónde va CADA COFRADÍA, no según el teléfono)
 *   ritmo humano     demasiadas en muy poco tiempo
 *   ventana          la cofradía no estaba en la calle a esa hora, ni de lejos
 *
 * Superarlos da los puntos base. No superarlos NO es «rechazada»: se guarda igual, sin puntos base, y
 * nunca se le dice nada a la persona (F-27). Cifras candidatas a calibrar.
 */
const MIN = 60_000;
export const PUNTOS_BASE = 10; // BUL-220
export const REPETICION = 3 * MIN;
/** Andando entre bulla no se pasa de unos 6 km/h; se da margen de sobra. */
export const VELOCIDAD_MAXIMA = 3; // m/s
/** Por debajo de esto, dos cofradías están «al lado» y se puede ir de una a otra. */
export const DISTANCIA_LIBRE = 400;
export const RITMO = { cuantas: 6, en: 10 * MIN };
/** Antes de salir puede verse la cruz en la puerta; y con lluvia o retrasos, entrar mucho más tarde. */
export const VENTANA = { antes: 60 * MIN, despues: 2 * 60 * MIN };

export type Hecho = {
  hermandadId: number;
  elemento: number | null;
  /** Hora de la observación, en ms reales. */
  t: number;
  /** Por dónde iba ESA cofradía a esa hora (sus elementos, o su templo si no había salido). */
  zona: Coord[];
};

export type Juicio = { plausible: true } | { plausible: false; motivo: "repeticion" | "teletransporte" | "ritmo" | "ventana" };

const M_LON = 111_320 * Math.cos((37.39 * Math.PI) / 180);
const M_LAT = 110_540;
const distancia = (a: Coord, b: Coord) => Math.hypot((a[0] - b[0]) * M_LON, (a[1] - b[1]) * M_LAT);

/** La menor distancia entre dos cortejos (de cualquier elemento de uno a cualquiera del otro). */
export function separacion(a: Coord[], b: Coord[]): number | null {
  if (!a.length || !b.length) return null;
  let min = Infinity;
  for (const p of a) for (const q of b) min = Math.min(min, distancia(p, q));
  return min;
}

/**
 * @param nueva    la que acaba de llegar
 * @param previas  las de la misma persona en la última media hora larga, de cualquier cofradía
 * @param ventana  salida y entrada de esa cofradía según el horario (ms reales), si se saben
 */
export function juzgar(nueva: Hecho, previas: Hecho[], ventana: { sale: number; entra: number } | null): Juicio {
  if (previas.some((p) => p.hermandadId === nueva.hermandadId && p.elemento === nueva.elemento && Math.abs(nueva.t - p.t) < REPETICION)) {
    return { plausible: false, motivo: "repeticion" };
  }
  if (previas.filter((p) => nueva.t - p.t >= 0 && nueva.t - p.t < RITMO.en).length >= RITMO.cuantas) {
    return { plausible: false, motivo: "ritmo" };
  }
  if (ventana && (nueva.t < ventana.sale - VENTANA.antes || nueva.t > ventana.entra + VENTANA.despues)) {
    return { plausible: false, motivo: "ventana" };
  }
  for (const p of previas) {
    if (p.hermandadId === nueva.hermandadId) continue;
    const d = separacion(p.zona, nueva.zona);
    const segundos = Math.abs(nueva.t - p.t) / 1000;
    if (d !== null && d > DISTANCIA_LIBRE && (segundos === 0 || (d - DISTANCIA_LIBRE) / segundos > VELOCIDAD_MAXIMA)) {
      return { plausible: false, motivo: "teletransporte" };
    }
  }
  return { plausible: true };
}

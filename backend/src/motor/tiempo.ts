/**
 * El reloj del motor.
 *
 * El motor no trabaja con la hora real, sino con la HORA DEL PROGRAMA: la hora de Sevilla tal como la
 * escribe el programa de la edición cargada («2026-04-03T02:40»), leída como si fuera UTC para que la
 * cuenta no dependa de la zona del servidor (que está en UTC) ni del cambio de hora.
 *
 * Como Cofradar mira a la PRÓXIMA Semana Santa, «ahora» se lleva al programa por su distancia al Domingo
 * de Resurrección, igual que hace la web (frontend/src/datos/fechas.ts): el Viernes Santo de 2027 a las
 * 02:40 es, en el programa de 2026, el 3 de abril a las 02:40. Fuera de temporada, «ahora» cae meses
 * antes de la primera salida y todo está `prevista`.
 */
const DIA_MS = 86_400_000;

const reloj = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** La hora de pared de Sevilla de un instante, como milisegundos «UTC ingenuos». */
export function paredSevilla(instante: Date): number {
  return Date.parse(`${reloj.format(instante).replace(" ", "T")}Z`);
}

/** Una hora del programa («2026-04-03T02:40») en milisegundos ingenuos. */
export const msPrograma = (hora: string): number => Date.parse(`${hora.slice(0, 16)}:00Z`);

/** Domingo de Pascua (algoritmo de Meeus), a medianoche, en milisegundos ingenuos. */
export function pascua(anio: number): number {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(anio, mes - 1, dia);
}

/** El año de la próxima Semana Santa: pasado el Domingo de Resurrección (todo él), la del año siguiente. */
export function anioProximo(pared: number): number {
  const anio = new Date(pared).getUTCFullYear();
  return pared >= pascua(anio) + DIA_MS ? anio + 1 : anio;
}

/** «Ahora» llevado al programa de la edición `anioEdicion`. */
export function ahoraEnPrograma(instante: Date, anioEdicion: number): number {
  const pared = paredSevilla(instante);
  return pared - (pascua(anioProximo(pared)) - pascua(anioEdicion));
}

/** Y de vuelta: el instante real de una hora del programa, sabiendo cuánto vale «ahora» en los dos relojes. */
export function aReal(programa: number, ahoraPrograma: number, instante: Date): Date {
  return new Date(instante.getTime() + (programa - ahoraPrograma));
}

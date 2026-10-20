/**
 * Fechas de la Semana Santa, que se mueve con la Pascua.
 *
 * Los horarios de los datos son de la última edición publicada (hoy, 2026),
 * pero Cofradar mira a la PRÓXIMA Semana Santa. El día de cada jornada se
 * lleva de una a otra con su distancia al Domingo de Resurrección: el Sábado
 * Santo de 2026 (4 de abril) es el de 2027 (27 de marzo).
 */
const DIA_MS = 86_400_000;

/** El día de la próxima Semana Santa que corresponde a `fecha` («2026-04-04»), a mediodía. */
export function diaProximo(fecha: string, hoy = new Date()): Date {
  const dato = new Date(`${fecha}T12:00`);
  const desfase = Math.round((dato.getTime() - pascua(dato.getFullYear()).getTime()) / DIA_MS);
  let anio = hoy.getFullYear();
  // Pasado el Domingo de Resurrección, la próxima es la del año que viene
  if (hoy.getTime() > pascua(anio).getTime() + DIA_MS) anio += 1;
  return new Date(pascua(anio).getTime() + desfase * DIA_MS);
}

/** El año de la próxima Semana Santa. */
export function anioProximo(hoy = new Date()): number {
  return hoy.getTime() > pascua(hoy.getFullYear()).getTime() + DIA_MS ? hoy.getFullYear() + 1 : hoy.getFullYear();
}

/** Domingo de Pascua (algoritmo de Meeus), a mediodía. */
export function pascua(anio: number): Date {
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
  return new Date(anio, mes - 1, dia, 12);
}

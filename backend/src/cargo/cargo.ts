/**
 * El cargo: la calle y la casa (F-58). Cálculo puro, sin base de datos.
 *
 * Los doce cargos de una hermandad, siempre «en Cofradar» (BUL-219). Los puntos vienen de dos sitios:
 *   la calle  dar fe (base y bonus), sin tope;
 *   la casa   ganar una partida online, 5; contestar la pregunta del día, 2. Hasta 10 al día (de Madrid).
 * Desde Diputado de tramo, al menos la mitad tiene que venir de la calle.
 *
 * La regla se aplica recortando lo que cuenta de la casa, nunca quitando un cargo: la casa cuenta entera
 * hasta 999 (Contraguía) y, por encima, solo hasta lo que haya de la calle. Así sumar más de la casa nunca
 * baja a nadie de cargo (R6): con 600 de la calle y 400 de la casa se es Diputado de tramo, y con 600 y
 * 700 se sigue siéndolo (cuentan 600 + 600 = 1.200), aunque la mitad ya no venga de la calle.
 */

export const NIVELES: readonly { nombre: string; desde: number; frase: string }[] = [
  { nombre: "Monaguillo", desde: 0, frase: "Los monaguillos, los más pequeños de la hermandad, acompañan al cortejo." },
  { nombre: "Nazareno de cirio", desde: 50, frase: "Los nazarenos de cirio alumbran el camino de la cofradía durante la estación de penitencia." },
  { nombre: "Nazareno de insignia", desde: 120, frase: "Los nazarenos de insignia llevan las banderas, los estandartes y el resto de insignias de la hermandad." },
  { nombre: "Acólito", desde: 250, frase: "Los acólitos acompañan a los pasos con los ciriales y los incensarios." },
  { nombre: "Costalero", desde: 450, frase: "Los costaleros llevan el paso sobre la nuca, debajo de las trabajaderas." },
  { nombre: "Contraguía", desde: 700, frase: "Los contraguías ayudan al capataz a gobernar el paso, sobre todo en las vueltas y en las calles estrechas." },
  { nombre: "Diputado de tramo", desde: 1000, frase: "El diputado de tramo cuida de un tramo de nazarenos durante la estación de penitencia." },
  { nombre: "Fiscal de cruz", desde: 1500, frase: "El fiscal de cruz va con la cruz de guía y cuida de que la cofradía cumpla su horario." },
  { nombre: "Fiscal de paso", desde: 2200, frase: "El fiscal de paso va delante de su paso y lo coordina con el resto de la cofradía." },
  { nombre: "Diputado mayor de gobierno", desde: 3000, frase: "El diputado mayor de gobierno dirige la cofradía en la calle, de la cruz de guía al último paso." },
  { nombre: "Capataz", desde: 4000, frase: "El capataz manda el paso: llama, levanta y guía a su cuadrilla de costaleros." },
  { nombre: "Hermano Mayor", desde: 5500, frase: "El hermano mayor preside la hermandad durante todo el año." },
];

/** Desde aquí, al menos la mitad de la calle (Diputado de tramo). */
export const MITAD_DESDE = 1000;
export const CASA_POR_DIA = 10;
export const CASA_PARTIDA = 5;
export const CASA_DIA = 2;

export type Cargo = {
  puntos: number;
  calle: number;
  casa: number;
  numero: number;
  nombre: string;
  frase: string;
  desde: number;
  /** El siguiente y cuánto falta. `faltan` es null cuando lo frena la regla de la calle. */
  siguiente: { nombre: string; desde: number; faltan: number | null } | null;
  /** Hay puntos de la casa que no cuentan: lo que frena es la regla de la calle, no los puntos. */
  tope: boolean;
};

export function cargoDe(calle: number, casa: number): Cargo {
  const cuentaCasa = Math.min(casa, Math.max(calle, MITAD_DESDE - 1 - calle));
  const cuentan = calle + cuentaCasa;
  let i = 0;
  while (i + 1 < NIVELES.length && cuentan >= NIVELES[i + 1]!.desde) i++;
  const n = NIVELES[i]!;
  const sig = NIVELES[i + 1];
  const tope = cuentaCasa < casa;
  return {
    puntos: calle + casa,
    calle,
    casa,
    numero: i + 1,
    nombre: n.nombre,
    frase: n.frase,
    desde: n.desde,
    siguiente: sig ? { nombre: sig.nombre, desde: sig.desde, faltan: tope ? null : sig.desde - cuentan } : null,
    tope,
  };
}

export type EventoCasa = { clave: string; dia: string; cuando: number; valor: number };

/**
 * Reparte el tope diario por orden de llegada: cada evento da lo suyo mientras quede hasta 10 ese día.
 * Devuelve lo que dio cada uno (por su clave) y el total.
 */
export function repartirCasa(eventos: EventoCasa[]): { total: number; dio: Map<string, number>; porDia: Map<string, number> } {
  const orden = [...eventos].sort((a, b) => a.cuando - b.cuando || a.clave.localeCompare(b.clave));
  const porDia = new Map<string, number>();
  const dio = new Map<string, number>();
  let total = 0;
  for (const e of orden) {
    const ya = porDia.get(e.dia) ?? 0;
    const da = Math.max(0, Math.min(e.valor, CASA_POR_DIA - ya));
    porDia.set(e.dia, ya + da);
    dio.set(e.clave, da);
    total += da;
  }
  return { total, dio, porDia };
}

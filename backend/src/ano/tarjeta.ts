import { diaDeMadrid, sumarDias } from "../dia/cirio.js";

/**
 * «Tu Semana Santa» (F-59): la tarjeta del año, sin base de datos. El año cofrade va de un Domingo de
 * Resurrección al siguiente: lo que pasa el lunes de Pascua de 2027 ya cuenta para la tarjeta de 2028. Las
 * cofradías vistas van por el año que marcaste en Mi colección. La tarjeta sale el Domingo de Resurrección.
 *
 * Solo lo que hizo, nunca lo que no (R5): una línea sin nada no sale, y un año sin ninguna no tiene tarjeta.
 * Nunca las horas en la calle ni por dónde anduvo nadie: Cofradar no lo guarda.
 */

/** El Domingo de Resurrección de un año («AAAA-MM-DD»), por el cálculo gregoriano de siempre. */
export function resurreccion(anio: number): string {
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
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** A qué tarjeta va un día de Madrid: la de su año, o la del siguiente si es después de Resurrección. */
export function anioDeDia(dia: string): number {
  const anio = Number(dia.slice(0, 4));
  return dia > resurreccion(anio) ? anio + 1 : anio;
}
export const anioDe = (t: Date) => anioDeDia(diaDeMadrid(t));

/** La primera Semana Santa de Cofradar: lo de antes (Mi colección deja marcar 2026) no tiene tarjeta. */
export const PRIMER_ANIO = 2027;

/** La última tarjeta que ya ha salido en `hoy`: la de este año desde su Domingo de Resurrección. */
export const ultimoAnio = (hoy: string) => (hoy >= resurreccion(Number(hoy.slice(0, 4))) ? Number(hoy.slice(0, 4)) : Number(hoy.slice(0, 4)) - 1);

/** El primer día que ya no cuenta para la tarjeta de `anio`. */
export const finDe = (anio: number) => sumarDias(resurreccion(anio), 1);

export type Cuenta = {
  vistas: number;
  fe: number;
  ayudaron: number;
  /** Preguntas del día contestadas, y si contestó todos los días de esa Cuaresma (cuántos tuvo) */
  contestadas: number;
  diasCuaresma: number;
  partidas: number;
  ganadas: number;
  estampas: number;
};

export const vacia = (): Cuenta => ({ vistas: 0, fe: 0, ayudaron: 0, contestadas: 0, diasCuaresma: 0, partidas: 0, ganadas: 0, estampas: 0 });

export type Clave = "vistas" | "fe" | "cirio" | "preguntas" | "partidas" | "estampas";
export type Linea = { clave: Clave; texto: string };

/** «1.873»: con punto también en las de cuatro cifras, como en el resto de la app */
const cifra = (x: number) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const n = (x: number, uno: string, varios: string) => `${cifra(x)} ${x === 1 ? uno : varios}`;

/** Las líneas de la tarjeta, en el orden de la tarjeta. Sin nada, ninguna. */
export function lineasDe(c: Cuenta): Linea[] {
  const l: Linea[] = [];
  if (c.vistas) l.push({ clave: "vistas", texto: `Viste ${n(c.vistas, "cofradía", "cofradías")}` });
  if (c.fe) {
    const ayuda = !c.ayudaron ? "" : c.fe === 1 ? " · ayudó a situar un paso" : ` · ${cifra(c.ayudaron)} ${c.ayudaron === 1 ? "ayudó" : "ayudaron"} a situar un paso`;
    l.push({ clave: "fe", texto: `Diste fe ${n(c.fe, "vez", "veces")}${ayuda}` });
  }
  if (c.contestadas && c.diasCuaresma && c.contestadas >= c.diasCuaresma)
    l.push({ clave: "cirio", texto: `Mantuviste el cirio encendido los ${c.diasCuaresma} días de la Cuaresma` });
  else if (c.contestadas) l.push({ clave: "preguntas", texto: `Contestaste ${n(c.contestadas, "pregunta del día", "preguntas del día")}` });
  if (c.partidas) {
    const texto = !c.ganadas
      ? `Jugaste ${n(c.partidas, "partida", "partidas")}`
      : c.partidas === 1
        ? "Ganaste tu partida"
        : `Ganaste ${cifra(c.ganadas)} de ${cifra(c.partidas)} partidas`;
    l.push({ clave: "partidas", texto });
  }
  if (c.estampas) l.push({ clave: "estampas", texto: `${n(c.estampas, "estampa nueva", "estampas nuevas")} en tu álbum` });
  return l;
}

/**
 * El año en que cada hermandad entró en el álbum: el primero de sus tres grados. «La conoces» llega con
 * la quinta pregunta distinta acertada (`aciertos`: cuándo acertó cada pregunta por primera vez).
 */
export function entradasAlbum(
  aciertos: { hermandad: number; cuando: Date }[],
  vistas: { hermandad: number; anio: number }[],
  fe: { hermandad: number; cuando: Date }[],
  paraConocer: number,
): Map<number, number> {
  const primero = new Map<number, number>();
  const anotar = (h: number, anio: number) => primero.set(h, Math.min(anio, primero.get(h) ?? Infinity));
  const porHermandad = new Map<number, number[]>();
  for (const a of aciertos) porHermandad.set(a.hermandad, [...(porHermandad.get(a.hermandad) ?? []), a.cuando.getTime()]);
  for (const [h, t] of porHermandad) {
    if (t.length < paraConocer) continue;
    t.sort((x, y) => x - y);
    anotar(h, anioDe(new Date(t[paraConocer - 1]!)));
  }
  for (const v of vistas) anotar(v.hermandad, v.anio);
  for (const f of fe) anotar(f.hermandad, anioDe(f.cuando));
  return primero;
}

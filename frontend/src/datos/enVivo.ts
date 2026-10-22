import { useMemo } from "react";
import { aHoy } from "./actividad";
import { useEstadoJornada, useMapaJornada } from "./estadoJornada";
import type { Jornada } from "./jornada";
import type { CofradiaMapa, ElementoEstado, EstadoCofradia, EstadoJornadaMotor, HoraSituada } from "./mapa";
import type { Posicion } from "./ubicacion";

/**
 * El estado en vivo para Inicio, la ficha y el recorrido (4.16): lo que dice el motor de cada cofradía
 * (GET /api/jornadas/:id/estado, cada 30 s) junto con su recorrido y sus horas del programa situadas
 * en él (GET /api/jornadas/:id/mapa).
 *
 * Con eso se responde, en llano:
 *   - dónde va cada parte del cortejo: «en La Campana», «camino de La Campana», «entre la Plaza del
 *     Duque y La Campana» (`dondeVa`);
 *   - a qué hora pasará por cada lugar: la del programa más el retraso que lleve (`horaEstimada`);
 *   - cuál es el próximo punto que le sirve a quien mira (BUL-221, `proximoPunto`).
 */
export type EnVivo = { estado: EstadoCofradia; mapa: CofradiaMapa };

export function useEnVivo(jornada: Jornada | null | undefined): {
  cofradias: EnVivo[] | null;
  instante: Date | null;
  /** Avisos de toda la jornada (lluvia…), publicados desde el panel. */
  contexto: EstadoJornadaMotor["contexto"];
} {
  const estado = useEstadoJornada(jornada?.id);
  const mapa = useMapaJornada(jornada?.id);
  const cofradias = useMemo(() => {
    if (!jornada || !estado.datos || !mapa.datos) return null;
    const porId = new Map(mapa.datos.map((c) => [c.id, c]));
    return estado.datos.cofradias.flatMap((e) => {
      const m = porId.get(e.id);
      return m ? [{ estado: e, mapa: m }] : [];
    });
  }, [jornada, estado.datos, mapa.datos]);
  return { cofradias, instante: estado.instante, contexto: (jornada && estado.datos?.contexto) || [] };
}

/** Si está en la calle (o entrando): lo que se puede ir a ver. */
export const enLaCalle = (e: EstadoCofradia) => e.fase.valor === "en_calle" || e.fase.valor === "proxima_entrada";

/** El retraso de la cofradía para lo que no es un elemento en la calle (la salida, las filas sin elemento). */
export function retrasoDe(e: EstadoCofradia, orden?: number): number {
  const el = orden === undefined ? undefined : e.elementos.find((x) => x.orden === orden);
  if (el) return el.retrasoMin;
  const a = e.alteraciones.find((x) => x.tipo !== "incidencia");
  return a?.minutos === undefined ? 0 : a.tipo === "retraso" ? a.minutos : -a.minutos;
}

/** La hora a la que se espera que pase por un lugar: la del programa, hoy, más el retraso. */
export function horaEstimada(hora: string, jornada: Jornada, retrasoMin: number): Date | null {
  const d = aHoy(hora, jornada);
  return d ? new Date(d.getTime() + retrasoMin * 60_000) : null;
}

/** Las horas del programa de la referencia que le toca a un elemento: la cruz las suyas; los pasos, las del último. */
function referencia(c: CofradiaMapa, el: ElementoEstado): HoraSituada[] {
  const propias = el.orden === 0 ? c.cruzGuia : c.ultimoPaso;
  return propias.filter((h) => h.m !== null);
}

/** Lo bastante cerca de un lugar como para decir que está «en» él. */
const EN_EL_LUGAR = 80;

/** «en La Campana», «camino de La Campana», «entre la Plaza del Duque y La Campana». */
export function dondeVa(c: CofradiaMapa, el: ElementoEstado): string {
  const puntos = referencia(c, el);
  const cerca = puntos.find((h) => Math.abs(h.m! - el.m) <= EN_EL_LUGAR);
  if (cerca) return `en ${cerca.lugar}`;
  const siguiente = puntos.find((h) => h.m! > el.m);
  const anterior = [...puntos].reverse().find((h) => h.m! < el.m);
  // Los pasos de en medio no tienen hora propia: se dice entre qué dos lugares va
  if (el.orden !== 0 && el.orden < c.pasos && anterior && siguiente) return `entre ${anterior.lugar} y ${siguiente.lugar}`;
  if (siguiente) return `camino de ${siguiente.lugar}`;
  return "llegando a su templo";
}

/** El próximo lugar por el que pasará un elemento, con su hora estimada; null si ya no le queda ninguno. */
export function siguienteLugar(c: CofradiaMapa, el: ElementoEstado, jornada: Jornada): { lugar: string; hora: Date } | null {
  const h = referencia(c, el).find((x) => x.m! > el.m + EN_EL_LUGAR);
  const hora = h ? horaEstimada(h.hora, jornada, el.retrasoMin) : null;
  return h && hora ? { lugar: h.lugar, hora } : null;
}

// ── Distancias ──────────────────────────────────────────────────────────────────────────────────────
const M_LON = 111_320 * Math.cos((37.39 * Math.PI) / 180);
const M_LAT = 110_540;
const metros = (p: Posicion, [lon, lat]: [number, number]) => Math.hypot((lon - p.longitud) * M_LON, (lat - p.latitud) * M_LAT);

/** A cuántos metros te queda la parte más cercana del cortejo (o su templo, si aún no ha salido). */
export function distancia(p: Posicion, v: EnVivo): number | null {
  const puntos = v.estado.elementos.length ? v.estado.elementos.map((x) => x.punto) : v.mapa.linea.length ? [v.mapa.linea[0]!] : [];
  return puntos.length ? Math.min(...puntos.map((x) => metros(p, x))) : null;
}

/** «A unos 300 m», «A 1,2 km». Siempre aproximada: sin tiempos a pie (BUL-221). */
export function distanciaEnLlano(m: number): string {
  if (m < 1000) return `A unos ${Math.max(50, Math.round(m / 50) * 50)} m`;
  return `A ${(Math.round(m / 100) / 10).toLocaleString("es-ES")} km`;
}

/**
 * El próximo punto (BUL-221): el lugar que le queda por delante a la cofradía y que te sirve a ti.
 *   - Con ubicación, el más cercano a ti de los que aún no ha pasado la cruz.
 *   - Sin ella, el siguiente del programa.
 *   - Se salta el que está a menos de 5 minutos: no da tiempo a llegar.
 * Lo pasa la cruz de guía; si ya entró, el último paso.
 */
export function proximoPunto(v: EnVivo, jornada: Jornada, ahora: Date, posicion: Posicion | null): { lugar: string; hora: Date } | null {
  const el = v.estado.elementos.find((x) => x.orden === 0) ?? v.estado.elementos[v.estado.elementos.length - 1];
  if (!el) return null;
  const linea = v.mapa.linea;
  const acum = [0];
  for (let i = 1; i < linea.length; i++) acum.push(acum[i - 1]! + metros({ latitud: linea[i - 1]![1], longitud: linea[i - 1]![0], precision: 0 }, linea[i]!));
  const enLinea = (m: number): [number, number] => {
    const i = Math.max(1, acum.findIndex((x) => x >= m));
    return linea[Math.min(i, linea.length - 1)]!;
  };
  const candidatos = referencia(v.mapa, el)
    .filter((h) => h.m! > el.m + EN_EL_LUGAR)
    .map((h) => ({ lugar: h.lugar, hora: horaEstimada(h.hora, jornada, el.retrasoMin), m: h.m! }))
    .filter((x): x is { lugar: string; hora: Date; m: number } => !!x.hora && x.hora.getTime() - ahora.getTime() >= 5 * 60_000);
  if (!candidatos.length) return null;
  const elegido = posicion ? candidatos.reduce((a, b) => (metros(posicion, enLinea(b.m)) < metros(posicion, enLinea(a.m)) ? b : a)) : candidatos[0]!;
  return { lugar: elegido.lugar, hora: elegido.hora };
}

// ── El mapa de una cofradía (4.5) ───────────────────────────────────────────────────────────────────
export type Hito = { titulo: string; prevista: Date; estimada: Date; retrasoMin: number; confianza: ElementoEstado["confianza"] };

/**
 * Los tres hitos de la hoja del mapa de una cofradía (3-mapa/mapa-2): por dónde va o adónde llega
 * ahora la cruz de guía, el final de la carrera oficial (la Catedral) si aún le queda, y la entrada del
 * último paso. Cada uno con la hora prevista y, debajo, la real o la estimada.
 */
export function hitosDe(v: EnVivo, jornada: Jornada): Hito[] {
  const res: Hito[] = [];
  const hito = (titulo: string, hora: string, el: ElementoEstado | undefined, orden: number) => {
    const prevista = aHoy(hora, jornada);
    const retraso = el?.retrasoMin ?? retrasoDe(v.estado, orden);
    if (prevista) res.push({ titulo, prevista, estimada: new Date(prevista.getTime() + retraso * 60_000), retrasoMin: retraso, confianza: el?.confianza ?? "estimado" });
  };
  const cruz = v.estado.elementos.find((x) => x.orden === 0);
  if (cruz) {
    const puntos = referencia(v.mapa, cruz);
    const actual = puntos.find((h) => Math.abs(h.m! - cruz.m) <= EN_EL_LUGAR) ?? puntos.find((h) => h.m! > cruz.m);
    if (actual) hito(actual.lugar, actual.hora, cruz, 0);
    // El final de la carrera oficial: su último lugar en el recorrido (hitos de la ciudad, 5.4). Se nombra
    // por el sitio («Catedral», de «Catedral · Puerta de los Palos»), y si ya va por él no se repite
    const sitio = (lugar: string) => lugar.split(" · ")[0]!;
    const fin = puntos.filter((h) => h.carrera).at(-1);
    if (fin && fin.m! > cruz.m + EN_EL_LUGAR && !(actual && sitio(actual.lugar) === sitio(fin.lugar))) hito(sitio(fin.lugar), fin.hora, cruz, 0);
  }
  const n = Math.max(1, v.mapa.pasos);
  const entrada = v.mapa.ultimoPaso[v.mapa.ultimoPaso.length - 1];
  if (entrada) hito("Entrada", entrada.hora, v.estado.elementos.find((x) => x.orden === n), n);
  return res;
}

/** El recorrido partido por la cabeza del cortejo: lo hecho (hasta la cruz) y lo que le queda. */
export function partirRecorrido(v: EnVivo): { hecho: [number, number][]; pendiente: [number, number][] } {
  const linea = v.mapa.linea;
  if (linea.length < 2) return { hecho: [], pendiente: [] };
  const acum = [0];
  for (let i = 1; i < linea.length; i++) acum.push(acum[i - 1]! + metros({ latitud: linea[i - 1]![1], longitud: linea[i - 1]![0], precision: 0 }, linea[i]!));
  const total = acum[acum.length - 1]!;
  const cabeza = enLaCalle(v.estado) ? Math.min(v.estado.progreso?.m ?? 0, total) : v.estado.fase.valor === "finalizada" ? total : 0;
  const i = acum.findIndex((x) => x >= cabeza);
  if (i <= 0) return cabeza <= 0 ? { hecho: [], pendiente: linea } : { hecho: linea, pendiente: [] };
  const [a, b] = [linea[i - 1]!, linea[i]!];
  const t = acum[i] === acum[i - 1] ? 0 : (cabeza - acum[i - 1]!) / (acum[i]! - acum[i - 1]!);
  const corte: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return { hecho: [...linea.slice(0, i), corte], pendiente: [corte, ...linea.slice(i)] };
}

/**
 * La hora que acompaña a «dónde va» un elemento: si está EN un lugar, la hora a la que está allí (la del
 * programa con su retraso); si va de camino, la de llegada al siguiente. Los pasos de en medio, sin hora
 * propia mientras nadie los vea: null.
 */
export function horaDelElemento(c: CofradiaMapa, el: ElementoEstado, jornada: Jornada): Date | null {
  const intermedio = el.orden > 0 && el.orden < Math.max(1, c.pasos);
  if (intermedio && el.confianza === "estimado") return null;
  const donde = dondeVa(c, el);
  const actual = donde.startsWith("en ") ? referencia(c, el).find((h) => `en ${h.lugar}` === donde) : undefined;
  return actual ? horaEstimada(actual.hora, jornada, el.retrasoMin) : (siguienteLugar(c, el, jornada)?.hora ?? null);
}

/** «Cruz de guía», «Primer paso»… */
export function nombreElemento(c: CofradiaMapa, orden: number): string {
  return orden === 0 ? "Cruz de guía" : (c.nombresPasos[orden - 1] ?? `Paso ${orden}`);
}

import { aHoy } from "./actividad";
import type { Jornada } from "./jornada";

/**
 * Dónde debería ir cada elemento del cortejo SEGÚN EL HORARIO (4.4, sin motor).
 *
 * El servidor (GET /api/jornadas/:id/mapa) da el recorrido de cada salida y
 * sus horas de cruz de guía y último paso ya situadas sobre la línea, en
 * metros desde la salida. Aquí se interpola por la hora: a las 02:40, entre
 * «La Campana 02:24, m 1.633» y «Plaza 03:04, m 2.131», la cruz va por el
 * metro 1.832. Los pasos de en medio no tienen hora en el programa: se reparten
 * entre la cruz y el último paso, como dice el diseño («sin hora propia: se
 * estima entre la cruz y el palio»).
 *
 * Todo es ESTIMADO: el motor (fase 4) lo sustituirá con lo que la gente ve.
 */
export type HoraSituada = { hora: string; publicada: boolean; lugar: string; m: number | null };
export type CofradiaMapa = {
  id: string;
  nombre: string;
  pasos: number;
  metros: number;
  provisional: boolean;
  linea: [number, number][];
  cruzGuia: HoraSituada[];
  ultimoPaso: HoraSituada[];
};

export type Elemento = {
  tipo: "cruz" | "paso";
  /** 1, 2, 3 para los pasos, en el orden del cortejo. */
  orden: number;
  nombre: string;
  m: number;
  punto: [number, number];
};

export type Situacion =
  | { fase: "inminente"; sale: Date; punto: [number, number] }
  | { fase: "en_calle"; elementos: Elemento[]; tramo: [number, number][] }
  | { fase: "fuera" };

/** Los 30 minutos de «inminente» (BUL-226). */
export const VENTANA_INMINENTE_MS = 30 * 60_000;

/** El metro del recorrido por el que va una referencia (cruz o último paso) a esa hora; null si aún no ha salido o ya entró. */
function metroA(horas: HoraSituada[], jornada: Jornada, t: number): number | null {
  const puntos = horas
    .map((h) => ({ t: aHoy(h.hora, jornada)?.getTime() ?? NaN, m: h.m }))
    .filter((p): p is { t: number; m: number } => !Number.isNaN(p.t) && p.m !== null);
  if (puntos.length < 2 || t < puntos[0]!.t || t > puntos[puntos.length - 1]!.t) return null;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]!;
    const b = puntos[i]!;
    if (t <= b.t) return b.t === a.t ? b.m : a.m + ((b.m - a.m) * (t - a.t)) / (b.t - a.t);
  }
  return puntos[puntos.length - 1]!.m;
}

/** Metros acumulados de una línea (la misma cuenta que el servidor, en plano). */
function acumulados(linea: [number, number][]): number[] {
  const kx = 111_320 * Math.cos((37.39 * Math.PI) / 180);
  const res = [0];
  for (let i = 1; i < linea.length; i++) {
    const [a, b] = [linea[i - 1]!, linea[i]!];
    res.push(res[i - 1]! + Math.hypot((b[0] - a[0]) * kx, (b[1] - a[1]) * 110_540));
  }
  return res;
}

/** El punto de la línea a `m` metros del principio. */
function puntoEn(linea: [number, number][], acum: number[], m: number): [number, number] {
  const i = Math.max(1, acum.findIndex((x) => x >= m));
  if (i <= 0 || i >= linea.length) return linea[linea.length - 1]!;
  const [a, b] = [linea[i - 1]!, linea[i]!];
  const tramo = acum[i]! - acum[i - 1]!;
  const t = tramo === 0 ? 0 : (m - acum[i - 1]!) / tramo;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** El trozo de línea entre dos metros, para dibujar el cortejo. */
function trozo(linea: [number, number][], acum: number[], desde: number, hasta: number): [number, number][] {
  const res: [number, number][] = [puntoEn(linea, acum, desde)];
  for (let i = 0; i < linea.length; i++) if (acum[i]! > desde && acum[i]! < hasta) res.push(linea[i]!);
  res.push(puntoEn(linea, acum, hasta));
  return res;
}

export function situar(c: CofradiaMapa, jornada: Jornada, ahora: Date): Situacion {
  if (c.linea.length < 2) return { fase: "fuera" };
  const t = ahora.getTime();
  const acum = acumulados(c.linea);
  const mCruz = metroA(c.cruzGuia, jornada, t);
  const mUltimo = metroA(c.ultimoPaso, jornada, t);

  if (mCruz === null && mUltimo === null) {
    const sale = aHoy(c.cruzGuia[0]?.hora ?? null, jornada);
    if (sale && sale.getTime() > t && sale.getTime() - t <= VENTANA_INMINENTE_MS) {
      return { fase: "inminente", sale, punto: c.linea[0]! };
    }
    return { fase: "fuera" };
  }

  // Antes de que salga el último paso, el final del cortejo está en el templo; cuando la cruz ya ha
  // entrado, la cabeza está en el templo de llegada
  const cabeza = mCruz ?? c.metros;
  const cola = mUltimo ?? 0;
  const elementos: Elemento[] = [];
  if (mCruz !== null) {
    elementos.push({ tipo: "cruz", orden: 0, nombre: "Cruz de guía", m: mCruz, punto: puntoEn(c.linea, acum, mCruz) });
  }
  const n = Math.max(1, c.pasos);
  for (let k = 1; k <= n; k++) {
    // El último paso va por su hora; los demás, repartidos entre la cruz y él
    const m = k === n ? mUltimo : cola + ((cabeza - cola) * (n - k)) / n;
    if (m === null || (k === n && mUltimo === null)) continue;
    if (mCruz === null && k < n) continue; // la cruz ya entró: los de en medio, también
    elementos.push({ tipo: "paso", orden: k, nombre: n === 1 ? "Paso" : `Paso ${k}`, m, punto: puntoEn(c.linea, acum, m) });
  }
  return { fase: "en_calle", elementos, tramo: trozo(c.linea, acum, Math.min(cola, cabeza), Math.max(cola, cabeza)) };
}

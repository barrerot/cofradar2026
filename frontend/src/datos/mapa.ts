/**
 * Lo que necesita el mapa, en dos pedidos al servidor:
 *
 * - GET /api/jornadas/:id/mapa: lo que no cambia en toda la noche, el recorrido de cada cofradía y sus
 *   horas del programa situadas sobre la línea. Se pide de vez en cuando.
 * - GET /api/jornadas/:id/estado: lo que da el motor (4.1-4.3) cada 30 segundos, fase y confianza de
 *   cada cofradía y dónde va cada elemento, en metros del recorrido y en coordenadas.
 *
 * Aquí no se calcula ninguna posición: solo se dibuja el trozo de recorrido entre la cabeza y la cola.
 */
export type HoraSituada = { hora: string; publicada: boolean; lugar: string; m: number | null };
export type CofradiaMapa = {
  id: string;
  nombre: string;
  pasos: number;
  metros: number;
  provisional: boolean;
  /** Los nombres de los pasos, en el orden del cortejo («Primer paso», «Paso»…). */
  nombresPasos: string[];
  linea: [number, number][];
  cruzGuia: HoraSituada[];
  ultimoPaso: HoraSituada[];
};

export type Confianza = "confirmado" | "estimado" | "desactualizado";
export type Fase = "prevista" | "inminente" | "en_calle" | "proxima_entrada" | "finalizada" | "cancelada" | "no_procesiona";

export type ElementoEstado = {
  tipo: "cruz" | "paso";
  orden: number;
  nombre: string;
  m: number;
  punto: [number, number];
  confianza: Confianza;
  haceMin: number | null;
  /** Minutos de retraso respecto al programa (negativo: adelanto). */
  retrasoMin: number;
};

export type EstadoCofradia = {
  id: string;
  nombre: string;
  fase: { valor: Fase; confianza: Confianza; haceMin: number | null };
  sale: string | null;
  entra: string | null;
  alteraciones: { tipo: "retraso" | "adelanto"; minutos: number }[];
  progreso: { m: number; total: number } | null;
  elementos: ElementoEstado[];
};

export type EstadoJornadaMotor = {
  jornada: number;
  sincronizacion: string;
  procedencia: "motor";
  contexto: unknown[];
  cofradias: EstadoCofradia[];
};

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

function puntoEn(linea: [number, number][], acum: number[], m: number): [number, number] {
  if (m <= 0) return linea[0]!;
  const i = acum.findIndex((x) => x >= m);
  if (i <= 0) return linea[linea.length - 1]!;
  const [a, b] = [linea[i - 1]!, linea[i]!];
  const tramo = acum[i]! - acum[i - 1]!;
  const t = tramo === 0 ? 0 : (m - acum[i - 1]!) / tramo;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * El trozo de recorrido que ocupa el cortejo: de la cola a la cabeza. Si el último paso aún no ha
 * salido, la cola está en el templo; si la cruz ya ha entrado, la cabeza está en el de llegada.
 */
export function tramoCortejo(c: CofradiaMapa, e: EstadoCofradia): [number, number][] {
  if (c.linea.length < 2 || !e.elementos.length) return [];
  const acum = acumulados(c.linea);
  const total = acum[acum.length - 1]!;
  const ms = e.elementos.map((x) => x.m);
  const cruzFuera = !e.elementos.some((x) => x.orden === 0);
  const ultimoDentro = !e.elementos.some((x) => x.orden === c.pasos);
  const desde = ultimoDentro && !cruzFuera ? 0 : Math.min(...ms);
  const hasta = cruzFuera ? total : Math.max(...ms);
  const res: [number, number][] = [puntoEn(c.linea, acum, desde)];
  for (let i = 0; i < c.linea.length; i++) if (acum[i]! > desde && acum[i]! < hasta) res.push(c.linea[i]!);
  res.push(puntoEn(c.linea, acum, hasta));
  return res;
}

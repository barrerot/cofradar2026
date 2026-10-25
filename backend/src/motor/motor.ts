import { acumulados, distancia, pasadas, puntoEn, type Coord } from "../geo.js";

/**
 * El motor de Cofradar (4.1 y 4.2): dónde va cada elemento del cortejo, en qué fase está cada cofradía
 * y cuánto puede fiarse uno de ello.
 *
 * Funciones puras, sin base de datos ni reloj: reciben la salida, las aportaciones de «Dar fe» y la hora
 * (todas las horas en HORA DEL PROGRAMA, ver tiempo.ts) y devuelven el estado. Así se prueban solas
 * (motor.test.ts) y el servidor solo tiene que llamarlas.
 *
 * ── La idea: todo es un RETRASO por elemento ──────────────────────────────────────────────────────────
 * El programa dice dónde debería ir la cruz de guía y el último paso a cada hora (sus horas, ya situadas
 * en metros sobre el recorrido). Los pasos de en medio se reparten entre los dos. Eso es el HORARIO de
 * cada elemento: H(t) = metro en el que debería estar a la hora t.
 *
 * Una aportación consolidada («el paso de Cristo, en mitad de Sierpes, a las 03:30») dice que ese
 * elemento está en el metro en el que el horario lo ponía a las 02:50: va 40 minutos tarde. Con ese
 * retraso, su posición AHORA es H(ahora − 40 min). Es decir: sigue el mismo ritmo que el programa, pero
 * desplazado. Si nadie dice nada más, la estimación sigue avanzando sola, que es lo que hace un cortejo.
 *
 * Un elemento sin aportaciones propias toma el retraso de los que tiene alrededor (si el palio va 40
 * minutos tarde, el paso de delante seguramente también). Y nadie adelanta al de delante.
 *
 * ── Qué hace falta para mover el dato público ─────────────────────────────────────────────────────────
 * «Ninguna aportación confirma nada por sí sola» (PRD). Un retraso se da por bueno cuando al menos
 * MINIMO_INDEPENDIENTES personas distintas, en un rato corto, dicen cosas compatibles entre sí (el mismo
 * retraso, con TOLERANCIA de margen). Una sola queda «sin resolver»: no mueve nada, pero tampoco se
 * descarta, y si llega otra que la corrobora, consolida. La estimación orienta pero no veta: lo que se
 * compara son las aportaciones ENTRE SÍ, nunca contra lo que el motor creía.
 *
 * ── Las otras alteraciones (4.15) ─────────────────────────────────────────────────────────────────────
 * Con la misma regla (nada con una sola persona):
 * - INTERRUMPIDA: el mismo elemento, visto en el mismo sitio en dos momentos separados al menos PARADA,
 *   cuando el programa ya lo ponía más adelante. Mientras dure, se queda ahí (no se estima que avance).
 * - CAMBIO DE RECORRIDO: varias personas, a la vez, en un mismo sitio fuera del recorrido. Dura hasta que
 *   vuelve a consolidar un elemento en el recorrido (BUL-217: lo pendiente, «previsto, sin confirmar»).
 * - REGRESO ANTICIPADO: aparece de golpe al menos SALTO más adelante de lo que tocaba (respecto al
 *   programa o a lo que se sabía antes). Eso no es ir deprisa: es haber acortado.
 * Nada se borra en silencio: cada cofradía lleva el HISTORIAL de la jornada, con lo que tuvo y cuándo
 * (sale de volver a mirar las aportaciones del día; no se guarda nada).
 *
 * Todas las cifras de aquí son candidatas a calibrar con datos reales (PRD, «Integridad»).
 */

// ── Umbrales (candidatos) ───────────────────────────────────────────────────────────────────────────
const MIN = 60_000;
/** BUL-226: «inminente» es la media hora antes de salir. La misma ventana marca «próxima a entrar». */
export const VENTANA_INMINENTE = 30 * MIN;
/** BUL-227: una posición con aportaciones es vigente 10 minutos, desactualizada hasta 30; luego ya no se afirma. */
export const VIGENTE = 10 * MIN;
export const DESACTUALIZADO = 30 * MIN;
/** Cuántas personas distintas hacen falta para que un dato consolide. */
export const MINIMO_INDEPENDIENTES = 2;
/** Dos aportaciones dicen lo mismo si el retraso que implican difiere menos de esto… */
export const TOLERANCIA = 8 * MIN;
/** …y se hicieron con menos de esto de diferencia. */
export const SIMULTANEAS = 15 * MIN;
/** Las aportaciones más antiguas ya no cuentan para nada. */
export const MEMORIA = 2 * 60 * MIN;
/** Más lejos de esto del recorrido, la ubicación no encaja con el itinerario (incompatible). */
export const DISTANCIA_MAXIMA = 60;
/** Un retraso o adelanto se publica como alteración a partir de aquí. */
export const ALTERACION_MINIMA = 10 * MIN;
/** Y se publica de 5 en 5 minutos, para que no baile (11, 12, 13… es el mismo retraso). */
export const REDONDEO = 5 * MIN;
/** Interrumpida: sigue en el mismo sitio (a menos de MISMO_SITIO metros) al menos este rato. */
export const PARADA = 15 * MIN;
export const MISMO_SITIO = 50;
/** Cambio de recorrido: las aportaciones de fuera del recorrido, a menos de esto unas de otras. */
export const CERCA_FUERA = 100;
/** Regreso anticipado: aparece de golpe al menos esto más adelante de lo que tocaba. */
export const SALTO = 30 * MIN;

// ── Tipos ───────────────────────────────────────────────────────────────────────────────────────────
/** Horas del programa de una referencia (cruz de guía o último paso) situadas en el recorrido. */
export type Horario = { t: number; m: number }[];

export type SalidaMotor = {
  id: string;
  /** Los pasos, en el orden del cortejo (el último es el que lleva hora en el programa). */
  pasos: string[];
  linea: Coord[];
  /** Lo que dice el programa, solo con los lugares que se han podido situar en la línea. */
  cruz: Horario;
  ultimo: Horario;
  /** Primera hora de la cruz y última del último paso, aunque su lugar no esté situado. */
  salida: number | null;
  entrada: number | null;
  /** `salida_procesional.estado`: lo que marca la administración. */
  estadoAdmin: string | null;
};

export type Aportacion = {
  id: string;
  usuario: string;
  /** Hora de la observación (no la de llegada al servidor), en hora del programa. */
  t: number;
  /** 0 la cruz de guía, 1..n los pasos; null es «Estoy viendo la cofradía». */
  elemento: number | null;
  /** Dónde estaba quien dio fe, si se sabe de forma fiable. */
  punto: Coord | null;
};

export type Confianza = "confirmado" | "estimado" | "desactualizado";
export type Fase = "prevista" | "inminente" | "en_calle" | "proxima_entrada" | "finalizada" | "cancelada" | "no_procesiona";
/** Interno: nunca sale a la interfaz (F-27). */
export type Resultado = "consolidada" | "sin_resolver" | "contradicha" | "fuera_del_calculo";

export type ElementoEstado = {
  tipo: "cruz" | "paso";
  /** 0 la cruz, 1..n los pasos. */
  orden: number;
  nombre: string;
  m: number;
  punto: Coord;
  confianza: Confianza;
  /** Minutos desde la última aportación consolidada de este elemento (null si nunca la hubo). */
  haceMin: number | null;
  /** Cuánto va tarde (negativo: adelantado) respecto al programa, en minutos: con esto se estima la
   *  hora a la que pasará por cada lugar que le queda. */
  retrasoMin: number;
};

export type TipoAlteracion = "retraso" | "adelanto" | "interrumpida" | "cambio_recorrido" | "regreso_anticipado";

export type Alteracion = {
  tipo: TipoAlteracion;
  /** Retraso y adelanto: los minutos, de 5 en 5. */
  minutos?: number;
  /** Desde cuándo (hora del programa), si se sabe. */
  desde?: number;
  /** Cambio de recorrido: dónde la han visto fuera, y el metro desde el que no se sabe por dónde va. */
  fuera?: Coord;
  mDesde?: number;
};

/** Lo que ha tenido en la jornada. `hasta` null: sigue. `mHasta`: dónde volvió al recorrido. */
export type EntradaHistorial = Alteracion & { desde: number; hasta: number | null; mHasta?: number };

export type EstadoCofradia = {
  id: string;
  fase: { valor: Fase; confianza: Confianza; haceMin: number | null };
  /** Hora prevista de salida y de entrada, con el retraso que se sepa (hora del programa). */
  sale: number | null;
  entra: number | null;
  alteraciones: Alteracion[];
  historial: EntradaHistorial[];
  progreso: { m: number; total: number } | null;
  /** Solo los que están en la calle ahora. */
  elementos: ElementoEstado[];
  /** Qué ha hecho el motor con cada aportación: interno, nunca para mostrar (F-27). */
  resultados: Record<string, Resultado>;
  /** El bonus de las que consolidan (ver BONUS). */
  bonus: Record<string, number>;
};

// ── El horario de cada elemento ─────────────────────────────────────────────────────────────────────
/** Metro de una referencia a la hora t: en el templo antes de salir, en el de llegada después de entrar. */
function enHorario(h: Horario, total: number, t: number): number {
  if (h.length < 2) return 0;
  if (t <= h[0]!.t) return h[0]!.m;
  for (let i = 1; i < h.length; i++) {
    const [a, b] = [h[i - 1]!, h[i]!];
    if (t <= b.t) return b.t === a.t ? b.m : a.m + ((b.m - a.m) * (t - a.t)) / (b.t - a.t);
  }
  return Math.max(h[h.length - 1]!.m, total);
}

type Cortejo = { s: SalidaMotor; acum: number[]; total: number; n: number; tMin: number; tMax: number };

function cortejo(s: SalidaMotor): Cortejo {
  const acum = acumulados(s.linea);
  const ts = [...s.cruz, ...s.ultimo].map((p) => p.t);
  return { s, acum, total: acum[acum.length - 1] ?? 0, n: Math.max(1, s.pasos.length), tMin: Math.min(...ts), tMax: Math.max(...ts) };
}

/** H_k(t): dónde debería estar el elemento k según el programa. */
function horarioDe(c: Cortejo, k: number, t: number): number {
  const cabeza = enHorario(c.s.cruz, c.total, t);
  if (k === 0) return cabeza;
  const cola = enHorario(c.s.ultimo, c.total, t);
  return cola + ((cabeza - cola) * (c.n - k)) / c.n;
}

/**
 * La inversa: a qué hora debería pasar el elemento k por el metro m, visto a la hora `cuando` (por
 * bisección: H_k no retrocede). Si el programa lo tiene un rato en ese metro (el último paso, dentro del
 * templo hasta que sale), cualquier hora de ese rato vale: la más cercana a `cuando`. Con la primera,
 * el palio de La Macarena saliendo a su hora daba 112 min de retraso (BUL-215).
 */
function horaDe(c: Cortejo, k: number, m: number, cuando: number): number {
  // Desde cuándo y hasta cuándo está ahí: la primera hora en que llega a m y la última en que no ha pasado
  const primera = (() => {
    let [lo, hi] = [c.tMin, c.tMax];
    if (m <= horarioDe(c, k, lo)) return lo;
    if (m > horarioDe(c, k, hi)) return hi;
    while (hi - lo > 1000) {
      const mid = (lo + hi) / 2;
      if (horarioDe(c, k, mid) < m) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  })();
  const ultima = (() => {
    let [lo, hi] = [c.tMin, c.tMax];
    // Unos metros antes del arranque (el GPS) es como estar en el arranque: hasta que sale
    const mm = Math.max(m, horarioDe(c, k, lo));
    if (mm >= horarioDe(c, k, hi)) return hi;
    while (hi - lo > 1000) {
      const mid = (lo + hi) / 2;
      if (horarioDe(c, k, mid) <= mm) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  })();
  return Math.min(Math.max(cuando, primera), Math.max(primera, ultima));
}

// ── Elegibilidad ────────────────────────────────────────────────────────────────────────────────────
type Observacion = { a: Aportacion; k: number; retraso: number; m: number };

/**
 * Cada aportación con elemento y ubicación, situada en el recorrido: de qué pasada se trata (si la calle
 * se repite, la que el programa pone más cerca de esa hora) y qué retraso implica. Las que no se pueden
 * situar quedan fuera del cálculo de la posición, sin más (MODELO.md, «GPS social»): siguen contando
 * como presencia para la fase.
 */
type Situadas = { obs: Observacion[]; fuera: Aportacion[]; desviadas: Aportacion[] };

/** Una aportación, situada: su observación, o fuera del cálculo (y si es por estar lejos del recorrido). */
type Situada = { obs: Observacion | null; desviada: boolean };

function situar(c: Cortejo, a: Aportacion): Situada {
  const usable = c.s.linea.length >= 2 && c.s.cruz.length >= 2 && c.s.ultimo.length >= 2;
  if (a.punto === null || !usable) return { obs: null, desviada: false };
  const candidatas = pasadas(c.s.linea, c.acum, a.punto, DISTANCIA_MAXIMA);
  // Con ubicación pero lejos del recorrido: candidata a cambio de recorrido (también «Estoy viendo…»)
  if (!candidatas.length) return { obs: null, desviada: true };
  if (a.elemento === null || a.elemento > c.n) return { obs: null, desviada: false };
  const k = a.elemento;
  const elegida = candidatas
    .map((p) => ({ m: p.m, hora: horaDe(c, k, p.m, a.t) }))
    .reduce((x, y) => (Math.abs(y.hora - a.t) < Math.abs(x.hora - a.t) ? y : x));
  return { obs: { a, k, retraso: a.t - elegida.hora, m: elegida.m }, desviada: false };
}

function observaciones(aportaciones: Aportacion[], situada: (a: Aportacion) => Situada): Situadas {
  const obs: Observacion[] = [];
  const fuera: Aportacion[] = [];
  const desviadas: Aportacion[] = [];
  for (const a of aportaciones) {
    const x = situada(a);
    if (x.obs) obs.push(x.obs);
    else fuera.push(a);
    if (x.desviada) desviadas.push(a);
  }
  return { obs, fuera, desviadas };
}

// ── Consolidación ───────────────────────────────────────────────────────────────────────────────────
const mediana = (xs: number[]) => {
  const o = [...xs].sort((a, b) => a - b);
  const i = Math.floor(o.length / 2);
  return o.length % 2 ? o[i]! : (o[i - 1]! + o[i]!) / 2;
};

/** Un grupo que consolida: el retraso que dice, dónde (metro), y de cuándo a cuándo son sus aportaciones. */
type Ancla = { retraso: number; t: number; desde: number; m: number };

/**
 * El bonus de las aportaciones que consolidan (BUL-220, 4.13). Los puntos base no cambian nunca; el bonus
 * premia la utilidad, y vale más cuanto menos sabía Cofradar de ese elemento justo antes:
 *
 *   BONUS.base      consolida: ayudó a situarlo                                          +5
 *   BONUS.escasez   además, nadie lo había situado en la última media hora               +10
 *   BONUS.obsoleta  además, la estimación de antes se había quedado vieja: el retraso
 *                   cambia 10 minutos o más («detectar que una estimación se ha quedado
 *                   obsoleta es la aportación más valiosa que existe», PRD)               +20
 *
 * Lo de «antes» se mira con las aportaciones anteriores al grupo, nunca con las posteriores: el bonus
 * no baja porque luego llegue más gente.
 */
export const BONUS = { base: 5, escasez: 10, obsoleta: 20 };

// ── Rapidez (BUL-212) ───────────────────────────────────────────────────────────────────────────────
// En la Madrugá hay miles de aportaciones y el historial vuelve a mirar la situación muchas veces. Para
// no recorrerlas todas en cada mirada, las listas se ordenan UNA vez, de la más reciente a la más antigua
// (orden estable: a igual hora, el de llegada), y de ellas se toman tramos: las de las últimas dos horas,
// las anteriores a un grupo… Un grupo solo puede juntar aportaciones de SIMULTANEAS minutos alrededor,
// así que cada una se compara con las de su rato, no con todas. Lo que sale es lo mismo que comparando
// todas con todas (lo comprueba el banco de pruebas de backend/carga/).

/** Una lista ordenada de la más reciente a la más antigua, sin tocar la original. */
const masRecientesPrimero = <T,>(xs: T[], hora: (x: T) => number) => [...xs].sort((x, y) => hora(y) - hora(x));

/** En una lista de la más reciente a la más antigua, el primer índice desde `ini` en el que se cumple `cumple` (que, una vez se cumple, se sigue cumpliendo). */
function primero<T>(xs: T[], cumple: (x: T) => boolean, ini = 0): number {
  let lo = ini;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumple(xs[mid]!)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** El tramo [ini, fin) de las que están en memoria a la hora t (hechas en las MEMORIA anteriores). */
function enMemoria<T>(xs: T[], hora: (x: T) => number, t: number): [number, number] {
  const ini = primero(xs, (x) => hora(x) <= t);
  return [ini, primero(xs, (x) => !(t - hora(x) <= MEMORIA), ini)];
}

/** Hasta dónde ha mirado una búsqueda: si nunca llegó a `fin`, sale lo mismo con cualquier `fin` mayor que `leido`. */
type Alcance = { leido: number; llegoAlFin: boolean };

/**
 * El grupo más reciente del tramo [ini, fin) de una lista de la más reciente a la más antigua: el de la
 * primera que, con las de su rato (SIMULTANEAS) que `casan` con ella, junta a personas distintas.
 */
function primerGrupo<T extends { usuario: string; t: number }, O>(
  xs: O[],
  ini: number,
  fin: number,
  ap: (o: O) => T,
  casan: (p: O, o: O) => boolean,
  alcance: Alcance = { leido: 0, llegoAlFin: false },
): O[] | null {
  let lo = ini;
  let hi = ini;
  alcance.llegoAlFin = true;
  for (let i = ini; i < fin; i++) {
    const o = xs[i]!;
    const t = ap(o).t;
    while (Math.abs(ap(xs[lo]!).t - t) > SIMULTANEAS) lo++;
    if (hi < i) hi = i;
    while (hi + 1 < fin && Math.abs(ap(xs[hi + 1]!).t - t) <= SIMULTANEAS) hi++;
    alcance.leido = Math.min(hi + 2, fin);
    alcance.llegoAlFin = hi + 1 >= fin;
    const grupo: O[] = [];
    const quienes = new Set<string>();
    for (let j = lo; j <= hi; j++) {
      const p = xs[j]!;
      if (casan(p, o)) {
        grupo.push(p);
        quienes.add(ap(p).usuario);
      }
    }
    if (quienes.size >= MINIMO_INDEPENDIENTES) return grupo;
  }
  alcance.llegoAlFin = true;
  return null;
}

/** El grupo MÁS RECIENTE de aportaciones de personas distintas, hechas casi a la vez y que dicen lo mismo. */
function grupoMasReciente(recientes: Observacion[], ini = 0, fin = recientes.length, alcance?: Alcance): Observacion[] | null {
  return primerGrupo(recientes, ini, fin, (o) => o.a, (p, o) => Math.abs(p.retraso - o.retraso) <= TOLERANCIA, alcance);
}

const anclaDe = (grupo: Observacion[]): Ancla => ({
  retraso: mediana(grupo.map((p) => p.retraso)),
  t: Math.max(...grupo.map((p) => p.a.t)),
  desde: Math.min(...grupo.map((p) => p.a.t)),
  m: mediana(grupo.map((p) => p.m)),
});

/**
 * Un paso de `grupos`: el grupo que se encuentra empezando en un índice, y desde dónde se sigue buscando.
 * El historial mira la situación muchas veces seguidas y casi todos los grupos son los de la vez anterior:
 * se recuerdan, y valen mientras la búsqueda no dependa de dónde acaba el tramo (ver Alcance).
 */
type Paso = { ancla: Ancla | null; siguiente: number; fin: number } & Alcance;
const vale = (p: Paso, fin: number) => (p.llegoAlFin ? fin === p.fin : fin >= p.leido);

/** Todos los grupos que consolidan en el tramo [ini, fin), del más reciente al más antiguo (cada uno, anterior al siguiente). */
function grupos(recientes: Observacion[], ini: number, fin: number, recordados?: Map<number, Paso>): Ancla[] {
  const res: Ancla[] = [];
  let resto = ini;
  for (;;) {
    let paso = recordados?.get(resto);
    if (!paso || !vale(paso, fin)) {
      const alcance: Alcance = { leido: 0, llegoAlFin: false };
      const g = grupoMasReciente(recientes, resto, fin, alcance);
      const ancla = g && anclaDe(g);
      // Las anteriores al grupo
      paso = { ancla, siguiente: ancla ? primero(recientes, (p) => p.a.t < ancla.desde, resto) : fin, fin, ...alcance };
      recordados?.set(resto, paso);
    }
    if (!paso.ancla) return res;
    res.push(paso.ancla);
    resto = paso.siguiente;
  }
}

/**
 * El retraso consolidado de un elemento (el grupo más reciente). Las de ese rato que no casan con el
 * grupo quedan contradichas; las demás, sin resolver. Y el bonus de las del grupo.
 */
function consolidar(obs: Observacion[], resultados: Record<string, Resultado>, bonus: Record<string, number>): Ancla | null {
  const recientes = masRecientesPrimero(obs, (p) => p.a.t);
  const grupo = grupoMasReciente(recientes);
  if (!grupo) return null;
  const ancla = anclaDe(grupo);
  for (const p of grupo) resultados[p.a.id] = "consolidada";
  for (const p of obs) if (!resultados[p.a.id] && Math.abs(p.a.t - ancla.t) <= SIMULTANEAS) resultados[p.a.id] = "contradicha";

  // Qué se sabía justo antes de este grupo
  const desde = Math.min(...grupo.map((p) => p.a.t));
  const previo = grupoMasReciente(recientes, primero(recientes, (p) => p.a.t < desde));
  const antes = previo ? anclaDe(previo) : null;
  let valor = BONUS.base;
  if (!antes || desde - antes.t > DESACTUALIZADO) valor = BONUS.escasez;
  if (Math.abs(ancla.retraso - (antes?.retraso ?? 0)) >= ALTERACION_MINIMA) valor = BONUS.obsoleta;
  for (const p of grupo) bonus[p.a.id] = valor;
  return ancla;
}

function confianzaPorEdad(edad: number): Confianza {
  return edad <= VIGENTE ? "confirmado" : edad <= DESACTUALIZADO ? "desactualizado" : "estimado";
}

// ── La situación a una hora ─────────────────────────────────────────────────────────────────────────
type Situacion = {
  anclas: (Ancla | null)[];
  retrasos: number[];
  fase: EstadoCofradia["fase"];
  sale: number | null;
  entra: number | null;
  /** Las que están en pie a esa hora. */
  alteraciones: Alteracion[];
  /** Un cambio de recorrido que ya ha terminado (volvió al recorrido), para cerrarlo en el historial. */
  cerradas: EntradaHistorial[];
};

/** Interrumpida: sus últimos grupos, en el mismo sitio, durante PARADA o más, y el programa ya lo ponía más adelante. */
function parada(g: Ancla[], t: number, programa: number): { desde: number; m: number } | null {
  const ultimo = g[0];
  if (!ultimo || t - ultimo.t > DESACTUALIZADO) return null;
  // Si el programa también lo tiene ahí (hay tramos en que apenas avanza), no está parado: va a su paso.
  // Sin esto, el error del GPS sobre un tramo lento cambiaba el retraso y salía «interrumpida» (BUL-215)
  if (programa - ultimo.m <= MISMO_SITIO) return null;
  let i = 1;
  while (i < g.length && Math.abs(g[i]!.m - ultimo.m) <= MISMO_SITIO) i++;
  const primero = g[i - 1]!;
  if (i < 2 || ultimo.t - primero.desde < PARADA || ultimo.retraso - primero.retraso < ALTERACION_MINIMA) return null;
  return { desde: primero.desde, m: ultimo.m };
}

/** Varias personas a la vez en un mismo sitio fuera del recorrido: el corrillo más reciente del tramo [ini, fin). */
function corrilloFuera(recientes: Aportacion[], ini: number, fin: number): Aportacion[] | null {
  return primerGrupo(recientes, ini, fin, (a) => a, (p, o) => distancia(p.punto!, o.punto!) <= CERCA_FUERA);
}

const redondeo = (ms: number) => Math.round(Math.abs(ms) / REDONDEO) * (REDONDEO / MIN);

/** Las listas que usa `situacion`, ordenadas una vez de la más reciente a la más antigua (ver «Rapidez»). */
type Indice = { aportaciones: Aportacion[]; porElemento: Observacion[][]; desviadas: Aportacion[]; recordados: Map<number, Paso>[] };

function indice(c: Cortejo, sit: Situadas, aportaciones: Aportacion[]): Indice {
  const obs = masRecientesPrimero(sit.obs, (o) => o.a.t);
  return {
    aportaciones: masRecientesPrimero(aportaciones, (a) => a.t),
    porElemento: Array.from({ length: c.n + 1 }, (_, k) => obs.filter((o) => o.k === k)),
    desviadas: masRecientesPrimero(sit.desviadas, (a) => a.t),
    recordados: Array.from({ length: c.n + 1 }, () => new Map()),
  };
}

function situacion(c: Cortejo, ind: Indice, t: number): Situacion {
  const s = c.s;
  const [ini, fin] = enMemoria(ind.aportaciones, (a) => a.t, t);
  const gruposPor = ind.porElemento.map((obs, k) => grupos(obs, ...enMemoria(obs, (o) => o.a.t, t), ind.recordados[k]));
  const anclas = gruposPor.map((g) => g[0] ?? null);
  // Parado, salvo que después se haya visto algo del cortejo más adelante
  const paradas = gruposPor.map((g, k) => {
    const p = parada(g, t, horarioDe(c, k, t));
    return p && !gruposPor.flat().some((a) => a.desde > g[0]!.t && a.m > p.m + MISMO_SITIO) ? p : null;
  });

  // 1. El retraso de cada elemento: el suyo, si consolida (si está parado, el que va acumulando ahí);
  //    si no, el de los de alrededor
  const propios = anclas.map((a, k) => {
    if (!a) return null;
    const p = paradas[k];
    return p ? Math.max(a.retraso, t - horaDe(c, k, p.m, t)) : a.retraso;
  });
  const retrasos = propios.map((r, k) => {
    if (r !== null) return r;
    let delante = k - 1;
    while (delante >= 0 && propios[delante] === null) delante--;
    let detras = k + 1;
    while (detras <= c.n && propios[detras] === null) detras++;
    const rd = delante >= 0 ? propios[delante]! : null;
    const rt = detras <= c.n ? propios[detras]! : null;
    if (rd !== null && rt !== null) return rd + ((rt - rd) * (k - delante)) / (detras - delante);
    return rd ?? rt ?? 0;
  });

  // 2. La fase, conducida por el horario (con el retraso que se sepa)
  const sale = s.salida === null ? null : s.salida + retrasos[0]!;
  const entra = s.entrada === null ? null : s.entrada + retrasos[c.n]!;
  // La presencia: cualquier aportación, también sin elemento ni ubicación, cuenta para la fase
  const presencia = (desde: number) => {
    const quienes = new Set<string>();
    for (let i = ini; i < fin && t - ind.aportaciones[i]!.t <= desde; i++) quienes.add(ind.aportaciones[i]!.usuario);
    return quienes.size >= MINIMO_INDEPENDIENTES;
  };
  const ultimaPresencia = ini < fin ? ind.aportaciones[ini]!.t : -Infinity;

  let valor: Fase;
  if (s.estadoAdmin && /cancelad|suspendid/i.test(s.estadoAdmin)) valor = "cancelada";
  else if (s.estadoAdmin && /no.procesiona/i.test(s.estadoAdmin)) valor = "no_procesiona";
  else if (sale === null || entra === null) valor = "prevista";
  else if (t < sale - VENTANA_INMINENTE) valor = "prevista";
  else if (t < sale) valor = "inminente";
  else if (t < entra - VENTANA_INMINENTE) valor = "en_calle";
  else if (t < entra) valor = "proxima_entrada";
  else valor = "finalizada";

  let fase: EstadoCofradia["fase"];
  if (valor === "cancelada" || valor === "no_procesiona") fase = { valor, confianza: "confirmado", haceMin: null };
  else if (presencia(VIGENTE)) {
    // La gente la está viendo: está en la calle, diga lo que diga el horario
    if (valor === "prevista" || valor === "inminente") valor = "en_calle";
    if (valor === "finalizada") valor = "proxima_entrada";
    fase = { valor, confianza: "confirmado", haceMin: Math.round((t - ultimaPresencia) / MIN) };
  } else if (valor === "prevista") fase = { valor, confianza: "confirmado", haceMin: null };
  else if (presencia(DESACTUALIZADO) && valor !== "finalizada") fase = { valor, confianza: "desactualizado", haceMin: Math.round((t - ultimaPresencia) / MIN) };
  else fase = { valor, confianza: "estimado", haceMin: null };

  // 3. Las alteraciones
  const enCalle = fase.valor === "en_calle" || fase.valor === "proxima_entrada";
  const alteraciones: Alteracion[] = [];
  const cerradas: EntradaHistorial[] = [];
  const todos = gruposPor.flat();

  // Interrumpida: algún elemento parado (desde que se le vio parado el primero)
  const paradasEnPie = paradas.filter((p): p is { desde: number; m: number } => p !== null);
  if (enCalle && paradasEnPie.length) alteraciones.push({ tipo: "interrumpida", desde: Math.min(...paradasEnPie.map((p) => p.desde)) });

  // Regreso anticipado: un grupo SALTO o más adelantado al programa, o a lo que se sabía justo antes
  // (para cada grupo basta el mayor retraso de los anteriores: por orden de hora, el máximo acumulado)
  const porHora = [...todos].sort((x, y) => x.t - y.t);
  const maxHasta: number[] = [];
  for (const x of porHora) maxHasta.push(Math.max(maxHasta[maxHasta.length - 1] ?? -Infinity, x.retraso));
  const maxAntesDe = (desde: number) => {
    let lo = 0;
    let hi = porHora.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (porHora[mid]!.t < desde) lo = mid + 1;
      else hi = mid;
    }
    return lo ? maxHasta[lo - 1]! : -Infinity;
  };
  const saltos = todos.filter((a) => a.retraso <= -SALTO || maxAntesDe(a.desde) - a.retraso >= SALTO);
  const regreso = enCalle && saltos.length > 0;
  if (regreso) alteraciones.push({ tipo: "regreso_anticipado", desde: Math.min(...saltos.map((a) => a.desde)) });

  // Cambio de recorrido: hasta que algún elemento vuelve a consolidar en el recorrido
  const corrillo = corrilloFuera(ind.desviadas, ...enMemoria(ind.desviadas, (a) => a.t, t));
  if (corrillo) {
    const desde = Math.min(...corrillo.map((a) => a.t));
    const hasta = Math.max(...corrillo.map((a) => a.t));
    const fuera: Coord = [
      corrillo.reduce((x, a) => x + a.punto![0], 0) / corrillo.length,
      corrillo.reduce((x, a) => x + a.punto![1], 0) / corrillo.length,
    ];
    const antes = todos.filter((a) => a.t < desde);
    const mDesde = antes.length ? Math.max(...antes.map((a) => a.m)) : 0;
    const despues = todos.filter((a) => a.desde > hasta);
    if (despues.length) {
      const vuelta = despues.reduce((x, a) => (a.desde < x.desde ? a : x));
      cerradas.push({ tipo: "cambio_recorrido", desde, hasta: vuelta.desde, fuera, mDesde, mHasta: vuelta.m });
    } else if (enCalle) alteraciones.push({ tipo: "cambio_recorrido", desde, fuera, mDesde });
  }

  // Retraso o adelanto: el del dato consolidado más reciente (si es un salto, ya es regreso anticipado)
  const masReciente = anclas.reduce<Ancla | null>((x, a) => (a && (!x || a.t > x.t) ? a : x), null);
  if (masReciente && Math.abs(masReciente.retraso) >= ALTERACION_MINIMA && t - masReciente.t <= DESACTUALIZADO) {
    if (masReciente.retraso > 0) alteraciones.push({ tipo: "retraso", minutos: redondeo(masReciente.retraso) });
    else if (!saltos.length) alteraciones.push({ tipo: "adelanto", minutos: redondeo(masReciente.retraso) });
  }

  return { anclas, retrasos, fase, sale, entra, alteraciones, cerradas };
}

// ── El historial ────────────────────────────────────────────────────────────────────────────────────
/**
 * Cada cuánto se vuelve a mirar la jornada para el historial: cada minuto en punto (y ahora). Antes se
 * miraba en cada aportación, y en la Madrugá eso son cientos de veces por minuto (BUL-212). La app
 * muestra las horas al minuto, así que el historial dice lo mismo; lo que dura menos de un minuto (un
 * dato que aparece y se desmiente enseguida) no llega al historial.
 */
const PASO_HISTORIAL = MIN;

/**
 * Lo que ha tenido la cofradía en la jornada: se vuelve a mirar la situación a lo largo del día (cada
 * PASO_HISTORIAL) y se juntan los ratos seguidos de cada alteración. Una que deja de estar en pie (se
 * desmiente o termina) se cierra con su hora; no desaparece.
 */
function historial(aportaciones: Aportacion[], ahora: number, mirar: (t: number) => Situacion): EntradaHistorial[] {
  let primera = Infinity;
  for (const a of aportaciones) if (a.t <= ahora && a.t < primera) primera = a.t;
  if (primera === Infinity) return [];
  // En minutos en punto, para que de un cálculo al siguiente sean las mismas horas (y valga lo recordado)
  const muestras: number[] = [];
  for (let t = Math.ceil(primera / PASO_HISTORIAL) * PASO_HISTORIAL; t < ahora; t += PASO_HISTORIAL) muestras.push(t);
  muestras.push(ahora);

  const res: EntradaHistorial[] = [];
  const abiertas = new Map<TipoAlteracion, EntradaHistorial>();
  for (const t of muestras) {
    const s = mirar(t);
    for (const a of s.alteraciones) {
      const e = abiertas.get(a.tipo);
      if (e) Object.assign(e, { ...a, desde: Math.min(e.desde, a.desde ?? e.desde), hasta: null });
      else {
        const nueva: EntradaHistorial = { ...a, desde: a.desde ?? t, hasta: null };
        abiertas.set(a.tipo, nueva);
        res.push(nueva);
      }
    }
    const enPie = new Set(s.alteraciones.map((a) => a.tipo));
    for (const [tipo, e] of abiertas) {
      if (enPie.has(tipo)) continue;
      const cerrada = s.cerradas.find((x) => x.tipo === tipo && x.desde === e.desde);
      e.hasta = cerrada?.hasta ?? t;
      if (cerrada?.mHasta !== undefined) e.mHasta = cerrada.mHasta;
      abiertas.delete(tipo);
    }
    // Un cambio que empezó y terminó entre dos miradas
    for (const x of s.cerradas) if (!res.some((e) => e.tipo === x.tipo && e.desde === x.desde)) res.push({ ...x });
  }
  return res.sort((a, b) => a.desde - b.desde);
}

// ── Lo ya calculado ─────────────────────────────────────────────────────────────────────────────────
/**
 * El servidor pide el estado cada 30 segundos, y entre una vez y otra casi todo es igual: las mismas
 * aportaciones y unas pocas nuevas. Se recuerda, por cofradía, cómo se situó cada aportación y la
 * situación a cada hora del historial. La situación a una hora solo depende de la salida y de las
 * aportaciones hechas hasta esa hora; así que vale lo recordado de antes de la primera aportación que
 * haya cambiado (una nueva, una que llega tarde porque el teléfono estaba sin conexión, una que ya no
 * cuenta…). Lo de después se vuelve a calcular. El resultado es el mismo que calculándolo todo de nuevo.
 */
type Recuerdo = { firma: string; lista: Aportacion[]; situadas: Map<string, { a: Aportacion; x: Situada }>; situaciones: Map<number, Situacion> };
const recuerdos = new Map<string, Recuerdo>();

const mismaAportacion = (a: Aportacion, b: Aportacion) =>
  a.id === b.id && a.usuario === b.usuario && a.t === b.t && a.elemento === b.elemento && a.punto?.[0] === b.punto?.[0] && a.punto?.[1] === b.punto?.[1];

/** Para las pruebas: olvidar todo lo calculado. */
export function olvidarCalculado() {
  recuerdos.clear();
}

// ── El estado ───────────────────────────────────────────────────────────────────────────────────────
export function estadoCofradia(s: SalidaMotor, aportaciones: Aportacion[], ahora: number): EstadoCofradia {
  const c = cortejo(s);
  const resultados: Record<string, Resultado> = {};
  const bonus: Record<string, number> = {};
  const delDia = aportaciones.filter((a) => a.t <= ahora);

  // Lo recordado de la vez anterior, si la salida es la misma
  const firma = JSON.stringify(s);
  const antes = recuerdos.get(s.id);
  const recuerdo: Recuerdo = { firma, lista: [...delDia].sort((x, y) => x.t - y.t), situadas: new Map(), situaciones: new Map() };
  let valeHasta = -Infinity;
  if (antes?.firma === firma) {
    // Hasta la primera diferencia, por orden de hora
    const [x, y] = [antes.lista, recuerdo.lista];
    let i = 0;
    while (i < x.length && i < y.length && mismaAportacion(x[i]!, y[i]!)) i++;
    valeHasta = Math.min(x[i]?.t ?? Infinity, y[i]?.t ?? Infinity);
  }
  if (recuerdos.size > 500) recuerdos.clear();
  recuerdos.set(s.id, recuerdo);

  const sit = observaciones(delDia, (a) => {
    const viejo = antes?.firma === firma ? antes.situadas.get(a.id) : undefined;
    const x = viejo && mismaAportacion(viejo.a, a) ? viejo.x : situar(c, a);
    recuerdo.situadas.set(a.id, { a: viejo && x === viejo.x ? viejo.a : a, x });
    return x;
  });
  const ind = indice(c, sit, delDia);
  const mirar = (t: number) => {
    let x = recuerdo.situaciones.get(t) ?? (t < valeHasta ? antes!.situaciones.get(t) : undefined);
    if (!x) x = situacion(c, ind, t);
    recuerdo.situaciones.set(t, x);
    return x;
  };

  // Qué ha hecho el motor con cada aportación de ahora (para los puntos y la reputación)
  const vivasObs = sit.obs.filter((o) => ahora - o.a.t <= MEMORIA);
  for (const a of sit.fuera) if (ahora - a.t <= MEMORIA) resultados[a.id] = "fuera_del_calculo";
  for (let k = 0; k <= c.n; k++) consolidar(vivasObs.filter((o) => o.k === k), resultados, bonus);
  for (const o of vivasObs) resultados[o.a.id] ??= "sin_resolver";

  const actual = mirar(ahora);
  const { anclas, retrasos, fase, sale, entra, alteraciones } = actual;

  // 4. Dónde va cada elemento: su horario, desplazado por su retraso; nadie adelanta al de delante
  const elementos: ElementoEstado[] = [];
  let progreso: EstadoCofradia["progreso"] = null;
  const enCalle = fase.valor === "en_calle" || fase.valor === "proxima_entrada";
  if (enCalle && s.linea.length >= 2 && s.cruz.length >= 2 && s.ultimo.length >= 2) {
    let delante = Infinity;
    for (let k = 0; k <= c.n; k++) {
      const m = Math.min(horarioDe(c, k, ahora - retrasos[k]!), delante);
      delante = m;
      // Aún en el templo, o ya dentro
      if (m <= 1 || m >= c.total - 1) continue;
      const ancla = anclas[k];
      const edad = ancla ? ahora - ancla.t : null;
      elementos.push({
        tipo: k === 0 ? "cruz" : "paso",
        orden: k,
        nombre: k === 0 ? "Cruz de guía" : (s.pasos[k - 1] ?? (c.n === 1 ? "Paso" : `Paso ${k}`)),
        m: Math.round(m),
        punto: puntoEn(s.linea, c.acum, m),
        confianza: edad === null ? "estimado" : confianzaPorEdad(edad),
        haceMin: edad === null ? null : Math.round(edad / MIN),
        retrasoMin: Math.round(retrasos[k]! / MIN),
      });
    }
    const cabeza = Math.min(horarioDe(c, 0, ahora - retrasos[0]!), c.total);
    progreso = { m: Math.round(cabeza), total: Math.round(c.total) };
  }

  return {
    id: s.id,
    fase,
    sale,
    entra,
    alteraciones,
    historial: historial(delDia, ahora, mirar),
    progreso,
    elementos,
    resultados,
    bonus,
  };
}

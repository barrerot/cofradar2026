import { acumulados, pasadas, puntoEn, type Coord } from "../geo.js";

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
};

export type EstadoCofradia = {
  id: string;
  fase: { valor: Fase; confianza: Confianza; haceMin: number | null };
  /** Hora prevista de salida y de entrada, con el retraso que se sepa (hora del programa). */
  sale: number | null;
  entra: number | null;
  alteraciones: { tipo: "retraso" | "adelanto"; minutos: number }[];
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

type Cortejo = { s: SalidaMotor; acum: number[]; total: number; n: number };

function cortejo(s: SalidaMotor): Cortejo {
  const acum = acumulados(s.linea);
  return { s, acum, total: acum[acum.length - 1] ?? 0, n: Math.max(1, s.pasos.length) };
}

/** H_k(t): dónde debería estar el elemento k según el programa. */
function horarioDe(c: Cortejo, k: number, t: number): number {
  const cabeza = enHorario(c.s.cruz, c.total, t);
  if (k === 0) return cabeza;
  const cola = enHorario(c.s.ultimo, c.total, t);
  return cola + ((cabeza - cola) * (c.n - k)) / c.n;
}

/** La inversa: a qué hora debería pasar el elemento k por el metro m (por bisección: H_k no retrocede). */
function horaDe(c: Cortejo, k: number, m: number): number {
  const ts = [...c.s.cruz, ...c.s.ultimo].map((p) => p.t);
  let lo = Math.min(...ts);
  let hi = Math.max(...ts);
  if (m <= horarioDe(c, k, lo)) return lo;
  if (m >= horarioDe(c, k, hi)) return hi;
  while (hi - lo > 1000) {
    const mid = (lo + hi) / 2;
    if (horarioDe(c, k, mid) < m) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ── Elegibilidad ────────────────────────────────────────────────────────────────────────────────────
type Observacion = { a: Aportacion; k: number; retraso: number };

/**
 * Cada aportación con elemento y ubicación, situada en el recorrido: de qué pasada se trata (si la calle
 * se repite, la que el programa pone más cerca de esa hora) y qué retraso implica. Las que no se pueden
 * situar quedan fuera del cálculo de la posición, sin más (MODELO.md, «GPS social»): siguen contando
 * como presencia para la fase.
 */
function observaciones(c: Cortejo, aportaciones: Aportacion[]): { obs: Observacion[]; fuera: Aportacion[] } {
  const obs: Observacion[] = [];
  const fuera: Aportacion[] = [];
  for (const a of aportaciones) {
    if (a.elemento === null || a.punto === null || a.elemento > c.n || c.s.cruz.length < 2 || c.s.ultimo.length < 2) {
      fuera.push(a);
      continue;
    }
    const candidatas = pasadas(c.s.linea, c.acum, a.punto, DISTANCIA_MAXIMA);
    if (!candidatas.length) {
      fuera.push(a);
      continue;
    }
    const k = a.elemento;
    const hora = candidatas
      .map((p) => horaDe(c, k, p.m))
      .reduce((x, y) => (Math.abs(y - a.t) < Math.abs(x - a.t) ? y : x));
    obs.push({ a, k, retraso: a.t - hora });
  }
  return { obs, fuera };
}

// ── Consolidación ───────────────────────────────────────────────────────────────────────────────────
const mediana = (xs: number[]) => {
  const o = [...xs].sort((a, b) => a - b);
  const i = Math.floor(o.length / 2);
  return o.length % 2 ? o[i]! : (o[i - 1]! + o[i]!) / 2;
};

type Ancla = { retraso: number; t: number };

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

/** El grupo MÁS RECIENTE de aportaciones de personas distintas, hechas casi a la vez y que dicen lo mismo. */
function grupoMasReciente(obs: Observacion[]): Observacion[] | null {
  const recientes = [...obs].sort((x, y) => y.a.t - x.a.t);
  for (const o of recientes) {
    const grupo = recientes.filter((p) => Math.abs(p.a.t - o.a.t) <= SIMULTANEAS && Math.abs(p.retraso - o.retraso) <= TOLERANCIA);
    if (new Set(grupo.map((p) => p.a.usuario)).size >= MINIMO_INDEPENDIENTES) return grupo;
  }
  return null;
}

const anclaDe = (grupo: Observacion[]): Ancla => ({ retraso: mediana(grupo.map((p) => p.retraso)), t: Math.max(...grupo.map((p) => p.a.t)) });

/**
 * El retraso consolidado de un elemento (el grupo más reciente). Las de ese rato que no casan con el
 * grupo quedan contradichas; las demás, sin resolver. Y el bonus de las del grupo.
 */
function consolidar(obs: Observacion[], resultados: Record<string, Resultado>, bonus: Record<string, number>): Ancla | null {
  const grupo = grupoMasReciente(obs);
  if (!grupo) return null;
  const ancla = anclaDe(grupo);
  for (const p of grupo) resultados[p.a.id] = "consolidada";
  for (const p of obs) if (!resultados[p.a.id] && Math.abs(p.a.t - ancla.t) <= SIMULTANEAS) resultados[p.a.id] = "contradicha";

  // Qué se sabía justo antes de este grupo
  const desde = Math.min(...grupo.map((p) => p.a.t));
  const previo = grupoMasReciente(obs.filter((p) => p.a.t < desde));
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

// ── El estado ───────────────────────────────────────────────────────────────────────────────────────
export function estadoCofradia(s: SalidaMotor, aportaciones: Aportacion[], ahora: number): EstadoCofradia {
  const c = cortejo(s);
  const resultados: Record<string, Resultado> = {};
  const bonus: Record<string, number> = {};
  const vivas = aportaciones.filter((a) => a.t <= ahora && ahora - a.t <= MEMORIA);
  const { obs, fuera } = observaciones(c, vivas);
  for (const a of fuera) resultados[a.id] = "fuera_del_calculo";

  // 1. El retraso de cada elemento: el suyo, si consolida; si no, el de los de alrededor
  const anclas: (Ancla | null)[] = [];
  for (let k = 0; k <= c.n; k++) anclas.push(consolidar(obs.filter((o) => o.k === k), resultados, bonus));
  for (const o of obs) resultados[o.a.id] ??= "sin_resolver";
  const retrasos = anclas.map((a, k) => {
    if (a) return a.retraso;
    let delante = k - 1;
    while (delante >= 0 && !anclas[delante]) delante--;
    let detras = k + 1;
    while (detras <= c.n && !anclas[detras]) detras++;
    const rd = delante >= 0 ? anclas[delante]!.retraso : null;
    const rt = detras <= c.n ? anclas[detras]!.retraso : null;
    if (rd !== null && rt !== null) return rd + ((rt - rd) * (k - delante)) / (detras - delante);
    return rd ?? rt ?? 0;
  });
  const masReciente = anclas.reduce<{ a: Ancla; k: number } | null>((x, a, k) => (a && (!x || a.t > x.a.t) ? { a, k } : x), null);

  // 2. La fase, conducida por el horario (con el retraso que se sepa)
  const sale = s.salida === null ? null : s.salida + retrasos[0]!;
  const entra = s.entrada === null ? null : s.entrada + retrasos[c.n]!;
  // La presencia: cualquier aportación, también sin elemento ni ubicación, cuenta para la fase
  const presencia = (desde: number) => new Set(vivas.filter((a) => ahora - a.t <= desde).map((a) => a.usuario)).size >= MINIMO_INDEPENDIENTES;
  const ultimaPresencia = Math.max(...vivas.map((a) => a.t));

  let valor: Fase;
  if (s.estadoAdmin && /cancelad|suspendid/i.test(s.estadoAdmin)) valor = "cancelada";
  else if (s.estadoAdmin && /no.procesiona/i.test(s.estadoAdmin)) valor = "no_procesiona";
  else if (sale === null || entra === null) valor = "prevista";
  else if (ahora < sale - VENTANA_INMINENTE) valor = "prevista";
  else if (ahora < sale) valor = "inminente";
  else if (ahora < entra - VENTANA_INMINENTE) valor = "en_calle";
  else if (ahora < entra) valor = "proxima_entrada";
  else valor = "finalizada";

  let fase: EstadoCofradia["fase"];
  if (valor === "cancelada" || valor === "no_procesiona") fase = { valor, confianza: "confirmado", haceMin: null };
  else if (presencia(VIGENTE)) {
    // La gente la está viendo: está en la calle, diga lo que diga el horario
    if (valor === "prevista" || valor === "inminente") valor = "en_calle";
    if (valor === "finalizada") valor = "proxima_entrada";
    fase = { valor, confianza: "confirmado", haceMin: Math.round((ahora - ultimaPresencia) / MIN) };
  } else if (valor === "prevista") fase = { valor, confianza: "confirmado", haceMin: null };
  else if (presencia(DESACTUALIZADO) && valor !== "finalizada") fase = { valor, confianza: "desactualizado", haceMin: Math.round((ahora - ultimaPresencia) / MIN) };
  else fase = { valor, confianza: "estimado", haceMin: null };

  // 3. Las alteraciones: el retraso o adelanto del dato consolidado más reciente
  const alteraciones: EstadoCofradia["alteraciones"] = [];
  if (masReciente && Math.abs(masReciente.a.retraso) >= ALTERACION_MINIMA && ahora - masReciente.a.t <= DESACTUALIZADO) {
    const minutos = Math.round(Math.abs(masReciente.a.retraso) / (5 * MIN)) * 5;
    alteraciones.push({ tipo: masReciente.a.retraso > 0 ? "retraso" : "adelanto", minutos });
  }

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
      });
    }
    const cabeza = Math.min(horarioDe(c, 0, ahora - retrasos[0]!), c.total);
    progreso = { m: Math.round(cabeza), total: Math.round(c.total) };
  }

  return { id: s.id, fase, sale, entra, alteraciones, progreso, elementos, resultados, bonus };
}

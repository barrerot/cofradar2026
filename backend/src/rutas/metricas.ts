import { Router, type Request, type Response } from "express";
import { exigirAdmin } from "../admin.js";
import { ahoraEnPrograma, anioProximo, paredSevilla, pascua } from "../motor/tiempo.js";
import { registro, vigente } from "../panel.js";
import { supabase, todas } from "../supabase.js";
import { desfaseDe } from "./aportaciones.js";
import { hermandadesYEdicion, mapa } from "./cofradias.js";
import { salidaMotor } from "./estado.js";

/**
 * Las cuatro métricas de la edición (BUL-213; PRD, «Cómo sabremos si funciona»). En 2027 solo se miden,
 * sin cifras objetivo. Todo por jornada y sin seguir a nadie:
 *
 *   ¿Lo entienden?        de quienes abren Cofradar esa jornada, cuántas personas dan fe
 *   ¿Colaboran bien?      de los «Dar fe», cuántos ayudaron a situar una cofradía (resultado «consolidada»)
 *   ¿Les resulta útil?    de quienes la abren esa jornada, cuántos ya la habían abierto otra
 *   ¿Llegamos a todas?    cada hora, de las cofradías en la calle, cuántas tienen alguna posición confirmada
 *
 *   POST /api/metricas/apertura   { jornada, vuelve }   el teléfono, una vez por jornada (sin sesión) → 204
 *   GET  /api/admin/metricas?anio=                      las cuatro, para el panel (P-32)
 *
 * Las aperturas se suman en memoria y se escriben cada minuto en `metrica_apertura`, una escritura por
 * jornada: en la Madrugá serían miles de avisos (BUL-212). Si el servidor se para, se pierde como mucho
 * el último minuto, que para medir sin objetivos da igual.
 *
 * Reloj de prueba: como en el resto del panel, `?desfase=` al leer y `X-Reloj-Desfase` al avisar; lo
 * hecho así va aparte (`de_prueba`) y solo se ve con el reloj de prueba.
 */
export const routerMetricas = Router();

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

const ruta = (fn: (peticion: Request, respuesta: Response) => Promise<void>) => (peticion: Request, respuesta: Response) =>
  fn(peticion, respuesta).catch((e: unknown) => {
    console.error(e);
    respuesta.status(500).json({ error: "No se ha podido completar" });
  });

// ---------------------------------------------------------------- aperturas

type Suma = { anio: number; jornada: number; prueba: boolean; abiertas: number; vuelven: number };
let pendientes = new Map<string, Suma>();

export function anotarApertura(anio: number, jornada: number, prueba: boolean, vuelve: boolean) {
  const clave = `${anio} ${jornada} ${prueba}`;
  const s = pendientes.get(clave) ?? { anio, jornada, prueba, abiertas: 0, vuelven: 0 };
  s.abiertas++;
  if (vuelve) s.vuelven++;
  pendientes.set(clave, s);
}

/** Escribe lo sumado. Lo que falla vuelve a la cuenta y sale en la siguiente vuelta. */
export async function escribirAperturas() {
  const lote = [...pendientes.values()];
  pendientes = new Map();
  for (const s of lote) {
    const { error } = await supabase().rpc("sumar_aperturas", {
      p_anio: s.anio,
      p_jornada: s.jornada,
      p_prueba: s.prueba,
      p_abiertas: s.abiertas,
      p_vuelven: s.vuelven,
    });
    if (error) {
      console.error(error);
      for (let i = 0; i < s.abiertas; i++) anotarApertura(s.anio, s.jornada, s.prueba, i < s.vuelven);
    }
  }
}
setInterval(() => void escribirAperturas(), MIN).unref();

routerMetricas.post("/metricas/apertura", async (peticion, respuesta) => {
  const b = (peticion.body ?? {}) as { jornada?: unknown; vuelve?: unknown };
  const jornada = Number(b.jornada);
  try {
    if (!Number.isInteger(jornada) || !(await idsDeJornadas()).includes(jornada)) {
      respuesta.status(400).json({ error: "Esa jornada no existe" });
      return;
    }
  } catch (e) {
    console.error(e);
    respuesta.status(500).json({ error: "No se ha podido completar" });
    return;
  }
  const desfase = desfaseDe(peticion);
  anotarApertura(anioProximo(paredSevilla(new Date(Date.now() + desfase))), jornada, desfase !== 0, b.vuelve === true);
  respuesta.status(204).end();
});

// ---------------------------------------------------------------- las cuatro, para el panel

type Jornada = { id: number; nombre: string; orden: number };
let jornadasGuardadas: { hasta: number; datos: Promise<Jornada[]> } | null = null;
function jornadas(): Promise<Jornada[]> {
  if (!jornadasGuardadas || jornadasGuardadas.hasta < Date.now()) {
    const datos = (async () => {
      const { data, error } = await supabase().from("jornada").select("id, nombre, orden").order("orden");
      if (error) throw error;
      return (data ?? []) as Jornada[];
    })();
    jornadasGuardadas = { hasta: Date.now() + 10 * MIN, datos };
    datos.catch(() => (jornadasGuardadas = null));
  }
  return jornadasGuardadas.datos;
}
async function idsDeJornadas() {
  return (await jornadas()).map((j) => j.id);
}

export type Hora = { hora: string; enLaCalle: number; confirmadas: number };
export type MetricasJornada = {
  id: number;
  nombre: string;
  abiertas: number;
  vuelven: number;
  /** Personas distintas (con cuenta) que dieron fe en alguna cofradía de esa jornada. */
  danFe: number;
  aportaciones: number;
  consolidadas: number;
  horas: Hora[];
};

/** Los «Dar fe» que cuentan: [hermandad, usuario, hora real (ms), consolidada]. */
export type Fe = { hermandad: number; usuario: string; t: number; consolidada: boolean };

/**
 * «¿Llegamos a todas?», hora a hora, en la hora del programa: en la calle es entre la salida de la
 * cruz de guía y la entrada del último paso según el horario, salvo las canceladas; confirmada es que
 * alguno de sus «Dar fe» de esa hora ayudó a situarla.
 */
export function porHoras(cofradias: { id: string; salida: number | null; entrada: number | null }[], confirmadas: Map<string, number[]>): Hora[] {
  const conHorario = cofradias.filter((c): c is { id: string; salida: number; entrada: number } => c.salida !== null && c.entrada !== null && c.entrada > c.salida);
  if (!conHorario.length) return [];
  const desde = Math.floor(Math.min(...conHorario.map((c) => c.salida)) / HORA) * HORA;
  const hasta = Math.max(...conHorario.map((c) => c.entrada));
  const horas: Hora[] = [];
  for (let h = desde; h < hasta; h += HORA) {
    const enLaCalle = conHorario.filter((c) => c.salida < h + HORA && c.entrada > h);
    horas.push({
      hora: new Date(h).toISOString().slice(11, 16),
      enLaCalle: enLaCalle.length,
      confirmadas: enLaCalle.filter((c) => (confirmadas.get(c.id) ?? []).some((t) => t >= h && t < h + HORA)).length,
    });
  }
  return horas;
}

export async function calcular(anio: number, conPruebas: boolean): Promise<MetricasJornada[]> {
  const db = supabase();
  const { porSlug } = await hermandadesYEdicion();
  // La Semana Santa de ese año, con margen: del Viernes de Dolores (y algo antes) al lunes de Pascua
  const desde = new Date(pascua(anio) - 10 * DIA).toISOString();
  const hasta = new Date(pascua(anio) + 2 * DIA).toISOString();

  const [lista, aperturas, filas] = await Promise.all([
    jornadas(),
    (async () => {
      const { data, error } = await db.from("metrica_apertura").select("jornada_id, de_prueba, abiertas, vuelven").eq("anio", anio);
      if (error) throw error;
      return data ?? [];
    })(),
    todas((d, h) => {
      let consulta = db
        .from("aportacion")
        .select("id, hermandad_id, usuario_id, observada, resultado", { count: "exact" })
        .gte("observada", desde)
        .lte("observada", hasta);
      if (!conPruebas) consulta = consulta.eq("de_prueba", false);
      return consulta.order("id").range(d, h);
    }),
  ]);
  const fes = new Map<number, Fe[]>();
  for (const f of filas) {
    fes.set(f.hermandad_id, [
      ...(fes.get(f.hermandad_id) ?? []),
      { hermandad: f.hermandad_id, usuario: f.usuario_id, t: Date.parse(f.observada), consolidada: f.resultado === "consolidada" },
    ]);
  }

  return Promise.all(
    lista.map(async (j) => {
      const cofradias = await mapa(j.id);
      const canceladas = vigente(await registro(j.id, anio, conPruebas)).canceladas;
      const deLaJornada: Fe[] = [];
      const confirmadas = new Map<string, number[]>();
      const enCalle = [];
      for (const c of cofradias) {
        const hermandad = porSlug.get(c.id);
        const suyas = hermandad === undefined ? [] : (fes.get(hermandad) ?? []);
        deLaJornada.push(...suyas);
        // A la hora del programa, como el motor (tiempo.ts)
        confirmadas.set(c.id, suyas.filter((f) => f.consolidada).map((f) => ahoraEnPrograma(new Date(f.t), c.anio)));
        if (!canceladas.has(c.id)) {
          const s = salidaMotor(c);
          enCalle.push({ id: c.id, salida: s.salida, entrada: s.entrada });
        }
      }
      const ap = aperturas.filter((a) => a.jornada_id === j.id && (conPruebas || !a.de_prueba));
      return {
        id: j.id,
        nombre: j.nombre,
        abiertas: ap.reduce((n, a) => n + a.abiertas, 0),
        vuelven: ap.reduce((n, a) => n + a.vuelven, 0),
        danFe: new Set(deLaJornada.map((f) => f.usuario)).size,
        aportaciones: deLaJornada.length,
        consolidadas: deLaJornada.filter((f) => f.consolidada).length,
        horas: porHoras(enCalle, confirmadas),
      };
    }),
  );
}

/** El año que se enseña si no se pide otro: la Semana Santa en curso o, si aún no ha empezado, la anterior. */
export function anioPorDefecto(pared: number): number {
  const anio = anioProximo(pared);
  return pared < pascua(anio) - 10 * DIA ? anio - 1 : anio;
}

const memoria = new Map<string, { hasta: number; datos: Promise<MetricasJornada[]> }>();
routerMetricas.get(
  "/admin/metricas",
  exigirAdmin,
  ruta(async (peticion, respuesta) => {
    const desfase = Number(peticion.query.desfase ?? 0) || 0;
    const conPruebas = desfase !== 0;
    const pared = paredSevilla(new Date(Date.now() + desfase));
    const pedido = Number(peticion.query.anio);
    const anio = Number.isInteger(pedido) && pedido >= 2026 && pedido <= anioProximo(pared) ? pedido : anioPorDefecto(pared);
    // Las aperturas de este último minuto, ya contadas
    await escribirAperturas();
    const clave = `${anio} ${conPruebas}`;
    let m = memoria.get(clave);
    if (!m || m.hasta < Date.now()) {
      m = { hasta: Date.now() + MIN, datos: calcular(anio, conPruebas) };
      memoria.set(clave, m);
      m.datos.catch(() => memoria.delete(clave));
    }
    const anios = [];
    for (let a = 2026; a <= anioProximo(pared); a++) anios.push(a);
    respuesta.set("Cache-Control", "no-store").json({ anio, anios, jornadas: await m.datos });
  }),
);

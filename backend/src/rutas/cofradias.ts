import { Router, type Request, type Response } from "express";
import { acumulados, situarEnOrden, type Coord } from "../geo.js";
import { supabase } from "../supabase.js";

/**
 * Datos base de las cofradías, leídos de Supabase (tablas de docs/datos/MODELO.md).
 *
 * Son los del programa oficial: dónde y a qué hora está previsto cada paso por cada lugar. El estado en
 * vivo (en calle, retrasos, confianza) es del motor, en la fase 4; aquí no hay nada de eso.
 *
 * El `id` de una cofradía es su nombre en minúsculas y con guiones («la-borriquita»). Las horas van como
 * en el programa, hora de Sevilla sin zona: «2026-03-29T15:35». Sin `?anio=`, se usa la última edición.
 */
export const routerCofradias = Router();

type Lugar = { id: number; nombre: string; tipo: string; latitud: number | null; longitud: number | null };
type Templo = { nombre: string; direccion: string | null; punto_geografico: Lugar };
type PuntoItinerario = {
  referencia: "cruz_guia" | "ultimo_paso";
  orden: number;
  fecha_hora: string;
  hora_publicada: boolean;
  punto_geografico: Lugar;
};
type Hermandad = {
  id: number;
  nombre: string;
  nombre_oficial: string;
  escudo: string | null;
  web: string | null;
  historia: string | null;
  fundacion: string | null;
  numero_hermanos: number | null;
  numero_nazarenos: number | null;
  duracion_cortejo: number | null;
  templo: Templo;
  paso: { orden: number; nombre: string; autor: string | null; capataz: string | null; musica: string | null; fotografia: string | null }[];
};
type Salida = {
  id: number;
  estado: string | null;
  edicion: { anio: number };
  jornada: { id: number; nombre: string; orden: number };
  hermandad: Hermandad;
  punto_itinerario: PuntoItinerario[];
};

export function slug(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** El nombre por el que se ordena, sin el artículo: «El Gran Poder» → «Gran Poder». */
function nombreOrden(nombre: string): string {
  return nombre.replace(/^(El|La|Los|Las) /, "");
}

const hora = (fecha: string) => fecha.slice(0, 16);

function lugar(l: Lugar) {
  return { id: l.id, nombre: l.nombre, tipo: l.tipo, latitud: l.latitud, longitud: l.longitud };
}

function templo(t: Templo) {
  return { nombre: t.nombre, direccion: t.direccion, latitud: t.punto_geografico.latitud, longitud: t.punto_geografico.longitud };
}

function horario(puntos: PuntoItinerario[], referencia: PuntoItinerario["referencia"]) {
  return puntos
    .filter((p) => p.referencia === referencia)
    .sort((a, b) => a.orden - b.orden)
    .map((p) => ({ orden: p.orden, lugar: lugar(p.punto_geografico), hora: hora(p.fecha_hora), publicada: p.hora_publicada }));
}

/** Hora de salida (primera de la cruz de guía) y de entrada (última del último paso). */
function salidaYEntrada(puntos: PuntoItinerario[]) {
  const cruz = horario(puntos, "cruz_guia");
  const paso = horario(puntos, "ultimo_paso");
  return { horaSalida: cruz[0]?.hora ?? null, horaEntrada: paso[paso.length - 1]?.hora ?? null };
}

const SELECT_SALIDA = `
  id, estado, edicion!inner(anio), jornada(id, nombre, orden),
  hermandad(id, nombre, nombre_oficial, escudo, web, historia, fundacion, numero_hermanos, numero_nazarenos,
            duracion_cortejo, templo(nombre, direccion, punto_geografico(id, nombre, tipo, latitud, longitud)),
            paso(orden, nombre, autor, capataz, musica, fotografia)),
  punto_itinerario(referencia, orden, fecha_hora, hora_publicada, punto_geografico(id, nombre, tipo, latitud, longitud))`;

/**
 * Los datos base cambian solo al recargar Supabase (npm run cargar:datos), y leer las salidas con sus
 * horarios cuesta: se guardan 5 minutos en memoria. Una recarga se ve, como mucho, 5 minutos después.
 */
const MEMORIA_MS = 5 * 60_000;
const memoria = new Map<string, { hasta: number; salidas: Promise<Salida[]> }>();

/** Las salidas de una edición (la última si no se pide año), con todo lo necesario para las rutas. */
async function salidas(anio?: number): Promise<Salida[]> {
  const clave = String(anio ?? "ultima");
  const guardada = memoria.get(clave);
  if (guardada && guardada.hasta > Date.now()) return guardada.salidas;
  const pedidas = leerSalidas(anio);
  memoria.set(clave, { hasta: Date.now() + MEMORIA_MS, salidas: pedidas });
  // Si falla, no se guarda el fallo: la siguiente petición lo vuelve a intentar
  pedidas.catch(() => memoria.delete(clave));
  return pedidas;
}

async function leerSalidas(anio?: number): Promise<Salida[]> {
  const db = supabase();
  if (anio === undefined) {
    const { data, error } = await db.from("edicion").select("anio").order("anio", { ascending: false }).limit(1).single();
    if (error) throw error;
    anio = data.anio as number;
  }
  const { data, error } = await db.from("salida_procesional").select(SELECT_SALIDA).eq("edicion.anio", anio);
  if (error) throw error;
  return data as unknown as Salida[];
}

/**
 * Para lo personal (rutas/cuenta.ts): el id de cada hermandad por su `id` público, y el año de la
 * última edición, que es al que se refiere «La he visto».
 */
export async function hermandadesYEdicion(): Promise<{ porSlug: Map<string, number>; porId: Map<number, string>; anio: number }> {
  const lista = await salidas();
  const porSlug = new Map(lista.map((s) => [slug(s.hermandad.nombre), s.hermandad.id] as const));
  return { porSlug, porId: new Map([...porSlug].map(([k, v]) => [v, k])), anio: lista[0]?.edicion.anio ?? new Date().getFullYear() };
}

function anioPedido(peticion: Request): number | undefined {
  const a = Number(peticion.query.anio);
  return Number.isInteger(a) && a > 0 ? a : undefined;
}

function directorio(s: Salida) {
  return {
    id: slug(s.hermandad.nombre),
    nombre: s.hermandad.nombre,
    orden: nombreOrden(s.hermandad.nombre),
    jornada: s.jornada.nombre,
    jornadaId: s.jornada.id,
    templo: s.hermandad.templo.nombre,
    ...salidaYEntrada(s.punto_itinerario),
    // Para la Agenda: cuándo llega la cruz de guía a La Campana, el comienzo de la carrera oficial
    horaCampana: horario(s.punto_itinerario, "cruz_guia").find((p) => p.lugar.nombre === "La Campana")?.hora ?? null,
  };
}

async function buscar(peticion: Request, respuesta: Response): Promise<Salida | undefined> {
  const s = (await salidas(anioPedido(peticion))).find((x) => slug(x.hermandad.nombre) === peticion.params.id);
  if (!s) respuesta.status(404).json({ error: `No hay ninguna cofradía «${peticion.params.id}»` });
  return s;
}

/** Envuelve una ruta para que un fallo de Supabase dé 500 con mensaje, en vez de dejar la petición colgada. */
const ruta =
  (fn: (peticion: Request, respuesta: Response) => Promise<void>) => (peticion: Request, respuesta: Response) =>
    fn(peticion, respuesta).catch((e: unknown) => {
      console.error(e);
      respuesta.status(500).json({ error: "No se han podido leer los datos" });
    });

routerCofradias.get(
  "/jornadas",
  ruta(async (peticion, respuesta) => {
    const lista = await salidas(anioPedido(peticion));
    const { data, error } = await supabase().from("jornada").select("id, nombre, orden").order("orden");
    if (error) throw error;
    respuesta.json(
      data.map((j) => {
        const deLaJornada = lista.filter((s) => s.jornada.id === j.id);
        const salidasDelDia = deLaJornada.map((s) => salidaYEntrada(s.punto_itinerario).horaSalida).filter((h) => h !== null).sort();
        // La fecha es la de la primera salida del día (la Madrugá empieza pasada la medianoche)
        return { id: j.id, nombre: j.nombre, orden: j.orden, fecha: salidasDelDia[0]?.slice(0, 10) ?? null, cofradias: deLaJornada.length };
      }),
    );
  }),
);

routerCofradias.get(
  "/cofradias",
  ruta(async (peticion, respuesta) => {
    const jornada = Number(peticion.query.jornada);
    const lista = (await salidas(anioPedido(peticion)))
      .filter((s) => !peticion.query.jornada || s.jornada.id === jornada)
      .sort((a, b) => a.jornada.orden - b.jornada.orden || (salidaYEntrada(a.punto_itinerario).horaSalida ?? "").localeCompare(salidaYEntrada(b.punto_itinerario).horaSalida ?? ""));
    respuesta.json(lista.map(directorio));
  }),
);

routerCofradias.get(
  "/cofradias/:id",
  ruta(async (peticion, respuesta) => {
    const s = await buscar(peticion, respuesta);
    if (!s) return;
    const h = s.hermandad;
    const cruzGuia = horario(s.punto_itinerario, "cruz_guia");
    const { data: rec } = await supabase().from("recorrido").select("metros, provisional").eq("salida_procesional_id", s.id).maybeSingle();
    // El templo de salida es el primer lugar del itinerario: casi siempre la sede, pero no siempre (Cigarreras en 2026)
    const { data: salidaDe } = cruzGuia[0]
      ? await supabase().from("templo").select("nombre, direccion, punto_geografico(id, nombre, tipo, latitud, longitud)").eq("punto_geografico_id", cruzGuia[0].lugar.id).maybeSingle()
      : { data: null };
    respuesta.json({
      id: slug(h.nombre),
      nombre: h.nombre,
      nombreOficial: h.nombre_oficial,
      escudo: h.escudo,
      web: h.web,
      fundacion: h.fundacion,
      historia: h.historia,
      hermanos: h.numero_hermanos,
      nazarenos: h.numero_nazarenos,
      duracionCortejo: h.duracion_cortejo,
      sede: templo(h.templo),
      pasos: [...h.paso].sort((a, b) => a.orden - b.orden),
      salida: {
        id: s.id,
        anio: s.edicion.anio,
        jornada: { id: s.jornada.id, nombre: s.jornada.nombre },
        estado: s.estado,
        templo: salidaDe ? templo(salidaDe as unknown as Templo) : templo(h.templo),
        ...salidaYEntrada(s.punto_itinerario),
        cruzGuia,
        ultimoPaso: horario(s.punto_itinerario, "ultimo_paso"),
        recorrido: rec ? { metros: rec.metros, provisional: rec.provisional } : null,
      },
    });
  }),
);

routerCofradias.get(
  "/cofradias/:id/recorrido",
  ruta(async (peticion, respuesta) => {
    const s = await buscar(peticion, respuesta);
    if (!s) return;
    const { data, error } = await supabase().from("recorrido").select("geojson").eq("salida_procesional_id", s.id).maybeSingle();
    if (error) throw error;
    if (!data) {
      respuesta.status(404).json({ error: "Esta salida todavía no tiene recorrido" });
      return;
    }
    respuesta.type("application/geo+json").json(data.geojson);
  }),
);

/**
 * Lo que necesita el Mapa (4.4) de una jornada, en un solo pedido: cada cofradía con su recorrido y las
 * horas de la cruz de guía y del último paso SITUADAS SOBRE LA LÍNEA, en metros desde la salida. Con eso
 * el cliente sabe dónde debería ir cada elemento a cada minuto según el programa (BUL-234, la parte de
 * situar las horas). Los lugares sin coordenadas no se sitúan (`m: null`).
 *
 * Se guarda 5 minutos en memoria, como las salidas: los recorridos no cambian sin recargar los datos.
 */
const memoriaMapa = new Map<string, { hasta: number; datos: Promise<unknown> }>();

async function mapaDeJornada(jornada: number, anio?: number) {
  const lista = (await salidas(anio)).filter((s) => s.jornada.id === jornada);
  const { data, error } = await supabase()
    .from("recorrido")
    .select("salida_procesional_id, geojson, metros, provisional")
    .in("salida_procesional_id", lista.map((s) => s.id));
  if (error) throw error;
  const porSalida = new Map((data ?? []).map((r) => [r.salida_procesional_id as number, r]));

  return lista
    .map((s) => {
      const rec = porSalida.get(s.id);
      const geometria = rec?.geojson?.features?.[0]?.geometry ?? rec?.geojson?.geometry;
      const linea: Coord[] = geometria?.type === "LineString" ? geometria.coordinates : [];
      const acum = acumulados(linea);
      const situar = (ref: PuntoItinerario["referencia"]) => {
        const puntos = horario(s.punto_itinerario, ref);
        const t = puntos.map((p) => Date.parse(`${p.hora}:00Z`));
        const [t0, t1] = [t[0] ?? 0, t[t.length - 1] ?? 0];
        const ms = situarEnOrden(
          linea,
          puntos.map((p) => (p.lugar.latitud !== null && p.lugar.longitud !== null ? [Number(p.lugar.longitud), Number(p.lugar.latitud)] : null)),
          t.map((x) => (t1 > t0 ? (x - t0) / (t1 - t0) : 0)),
        );
        return puntos.map((p, i) => ({ hora: p.hora, publicada: p.publicada, lugar: p.lugar.nombre, m: ms[i] === null ? null : Math.round(ms[i]!) }));
      };
      return {
        id: slug(s.hermandad.nombre),
        nombre: s.hermandad.nombre,
        pasos: s.hermandad.paso.length,
        metros: Math.round(acum[acum.length - 1] ?? 0),
        provisional: rec?.provisional ?? true,
        linea,
        cruzGuia: situar("cruz_guia"),
        ultimoPaso: situar("ultimo_paso"),
      };
    })
    .sort((a, b) => (a.cruzGuia[0]?.hora ?? "").localeCompare(b.cruzGuia[0]?.hora ?? ""));
}

routerCofradias.get(
  "/jornadas/:id/mapa",
  ruta(async (peticion, respuesta) => {
    const jornada = Number(peticion.params.id);
    const anio = anioPedido(peticion);
    const clave = `${jornada}|${anio ?? "ultima"}`;
    let guardado = memoriaMapa.get(clave);
    if (!guardado || guardado.hasta < Date.now()) {
      guardado = { hasta: Date.now() + MEMORIA_MS, datos: mapaDeJornada(jornada, anio) };
      memoriaMapa.set(clave, guardado);
      guardado.datos.catch(() => memoriaMapa.delete(clave));
    }
    respuesta.json(await guardado.datos);
  }),
);

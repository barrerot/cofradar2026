import { Router, type Request, type Response } from "express";
import type { Coord } from "../geo.js";
import { estadoCofradia } from "../motor/motor.js";
import { juzgar, PUNTOS_BASE, type Hecho } from "../motor/plausibilidad.js";
import { ahoraEnPrograma, aReal } from "../motor/tiempo.js";
import { exigirSesion, type Usuario } from "../sesion.js";
import { supabase, todas } from "../supabase.js";
import { cofradiaMapa, hermandadesYEdicion, nombresDeHermandades, type CofradiaMapa } from "./cofradias.js";
import { salidaMotor } from "./estado.js";
import { crearHistorias, crearLotes, type Guardada } from "./recientes.js";

/**
 * «Dar fe» (4.7, BUL-186): recibirlo, juzgarlo en el momento y dar los puntos base.
 *
 *   POST /api/yo/aportaciones   { clienteId, cofradia, elemento, ubicacion, observada }
 *                               → 201 { id, puntos, observada }
 *   GET  /api/yo/aportaciones   las tuyas, de la más reciente a la más antigua, y tus puntos
 *
 * Se guarda SIEMPRE (PRD: «Registro siempre posible»), con o sin ubicación, pase o no los controles.
 * Lo único que cambia es si da puntos base. La respuesta nunca dice «rechazada».
 *
 * `clienteId` lo pone el teléfono: si la reenvía (se quedó sin cobertura, reintento), devuelve la que ya
 * había en vez de duplicarla. `observada` es cuándo la vio; si el reloj del teléfono va por delante del
 * servidor, se toma la hora de llegada (la del teléfono no se da por fiable sin más, F-26).
 *
 * Reloj de prueba: con RELOJ_DE_PRUEBA=1 en el servidor, la cabecera `X-Reloj-Desfase` (ms) hace que el
 * servidor viva en la hora que simula la web (?ahora=). Esas aportaciones van marcadas `de_prueba`.
 */
export const routerAportaciones = Router();

const MIN = 60_000;

type Cuerpo = {
  clienteId?: unknown;
  cofradia?: unknown;
  elemento?: unknown;
  ubicacion?: { latitud?: unknown; longitud?: unknown; precision?: unknown } | null;
  observada?: unknown;
};

const ruta =
  (fn: (peticion: Request, respuesta: Response, usuario: Usuario) => Promise<void>) =>
  (peticion: Request, respuesta: Response) =>
    fn(peticion, respuesta, respuesta.locals.usuario as Usuario).catch((e: unknown) => {
      console.error(e);
      respuesta.status(500).json({ error: "No se ha podido guardar" });
    });

export function desfaseDe(peticion: Request): number {
  if (process.env.RELOJ_DE_PRUEBA !== "1") return 0;
  const d = Number(peticion.get("X-Reloj-Desfase") ?? 0);
  return Number.isFinite(d) ? d : 0;
}

/**
 * Por dónde iba una cofradía a una hora real: sus elementos en la calle o, si no, su templo. Al minuto
 * (en un minuto un cortejo no avanza ni 100 m) y recordado: cada «Dar fe» mira toda la última hora de
 * esa persona, y calcularlo con el motor para cada una ahogaba el servidor en la prueba de carga (BUL-212).
 */
const zonas = new Map<string, Coord[]>();
function zona(c: CofradiaMapa, t: number): Coord[] {
  if (c.linea.length < 2) return [];
  const minuto = Math.round(t / MIN) * MIN;
  const clave = `${c.id} ${c.anio} ${minuto}`;
  let z = zonas.get(clave);
  if (!z) {
    const e = estadoCofradia(salidaMotor(c), [], ahoraEnPrograma(new Date(minuto), c.anio));
    z = e.elementos.length ? e.elementos.map((x) => x.punto) : [c.linea[0]!];
    if (zonas.size > 50_000) zonas.clear();
    zonas.set(clave, z);
  }
  return z;
}

type Fila = {
  usuario_id: string;
  cliente_id: string;
  hermandad_id: number;
  elemento: number | null;
  latitud: number | null;
  longitud: number | null;
  precision_m: number | null;
  observada: string;
  recibida: string;
  plausible: boolean;
  puntos_base: number;
  de_prueba: boolean;
};
const claveDe = (usuario: string, cliente: string) => `${usuario} ${cliente}`;

/** La historia de cada persona se lee de aquí la primera vez; después vive en memoria (recientes.ts). */
export const historias = crearHistorias(async (usuario, desde, hasta) => {
  const filas = await todas((d, h) => {
    let consulta = supabase()
      .from("aportacion")
      .select("id, cliente_id, hermandad_id, elemento, observada, puntos_base", { count: "exact" })
      .eq("usuario_id", usuario)
      .gte("observada", new Date(desde).toISOString());
    if (Number.isFinite(hasta)) consulta = consulta.lte("observada", new Date(hasta).toISOString());
    return consulta.order("id").range(d, h);
  });
  return filas.map((f) => ({
    clienteId: f.cliente_id,
    hermandadId: f.hermandad_id,
    elemento: f.elemento,
    t: Date.parse(f.observada),
    guardada: Promise.resolve({ id: f.id, puntos: f.puntos_base, observada: new Date(f.observada).toISOString() }),
  }));
});
setInterval(() => historias.limpiar(), 10 * MIN).unref();

/**
 * Un lote de una vez. Las que ya estaban (un reintento que llegó antes de tenerla en memoria) no se
 * duplican y se devuelve la que había. Si el lote entero falla por una sola fila (una cuenta borrada
 * entre medias), se escriben una a una para que no arrastre a las demás.
 */
async function escribirLote(filas: Fila[]): Promise<Map<string, Guardada>> {
  const db = supabase();
  const hechas = new Map<string, Guardada>();
  const { data, error } = await db
    .from("aportacion")
    .upsert(filas, { onConflict: "usuario_id,cliente_id", ignoreDuplicates: true })
    .select("id, usuario_id, cliente_id, puntos_base, observada");
  if (error?.code === "23503" && filas.length > 1) {
    for (const f of filas) for (const [k, g] of await escribirLote([f]).catch(() => new Map<string, Guardada>())) hechas.set(k, g);
    return hechas;
  }
  if (error) throw error;
  for (const f of data ?? []) hechas.set(claveDe(f.usuario_id, f.cliente_id), { id: f.id, puntos: f.puntos_base, observada: new Date(f.observada).toISOString() });
  const yaEstaban = filas.filter((f) => !hechas.has(claveDe(f.usuario_id, f.cliente_id)));
  if (yaEstaban.length) {
    const ya = await db
      .from("aportacion")
      .select("id, usuario_id, cliente_id, puntos_base, observada")
      .in("cliente_id", yaEstaban.map((f) => f.cliente_id))
      .in("usuario_id", [...new Set(yaEstaban.map((f) => f.usuario_id))]);
    if (ya.error) throw ya.error;
    for (const f of ya.data ?? []) {
      const k = claveDe(f.usuario_id, f.cliente_id);
      if (!hechas.has(k)) hechas.set(k, { id: f.id, puntos: f.puntos_base, observada: new Date(f.observada).toISOString() });
    }
  }
  return hechas;
}
const lotes = crearLotes(escribirLote, (f) => claveDe(f.usuario_id, f.cliente_id));

routerAportaciones.post(
  "/yo/aportaciones",
  exigirSesion,
  ruta(async (peticion, respuesta, usuario) => {
    const b = (peticion.body ?? {}) as Cuerpo;
    const desfase = desfaseDe(peticion);
    const ahora = Date.now() + desfase;

    // 1. Que venga bien formada
    const clienteId = typeof b.clienteId === "string" && b.clienteId.length <= 64 ? b.clienteId : null;
    const c = typeof b.cofradia === "string" ? await cofradiaMapa(b.cofradia) : undefined;
    const elemento = b.elemento === null ? null : Number.isInteger(b.elemento) ? (b.elemento as number) : undefined;
    const observadaPedida = typeof b.observada === "string" ? Date.parse(b.observada) : NaN;
    const u = b.ubicacion;
    const ubicacion =
      u && Number.isFinite(Number(u.latitud)) && Number.isFinite(Number(u.longitud))
        ? { latitud: Number(u.latitud), longitud: Number(u.longitud), precision: Number.isFinite(Number(u.precision)) ? Math.round(Number(u.precision)) : null }
        : null;
    if (!clienteId || !c || elemento === undefined || Number.isNaN(observadaPedida)) {
      respuesta.status(400).json({ error: "Falta la cofradía, el elemento o la hora" });
      return;
    }
    if (elemento !== null && (elemento < 0 || elemento > c.pasos)) {
      respuesta.status(400).json({ error: `${c.nombre} no tiene ese elemento` });
      return;
    }
    const { porSlug, porId } = await hermandadesYEdicion();
    const hermandadId = porSlug.get(c.id)!;

    // 2. Los cuatro controles, con su propia historia de la última hora (en memoria, recientes.ts)
    // Nadie ve algo en el futuro: si el reloj del teléfono va adelantado, la hora de llegada
    const observada = Math.min(observadaPedida, ahora);
    const historia = await historias.de(usuario.id, observada - 60 * MIN, observada + 60 * MIN);
    const mapas = new Map<number, CofradiaMapa | undefined>([[hermandadId, c]]);
    for (;;) {
      const faltan = [...new Set(historia.map((r) => r.hermandadId))].filter((h) => !mapas.has(h));
      if (!faltan.length) break;
      for (const h of faltan) mapas.set(h, await cofradiaMapa(porId.get(h) ?? ""));
    }
    // Desde aquí, sin ningún await hasta anotarla: dos «Dar fe» seguidos de la misma persona se ven uno a otro

    // Si ya llegó (reintento), la misma
    const ya = historia.find((r) => r.clienteId === clienteId);
    if (ya) {
      respuesta.status(200).json(await ya.guardada);
      return;
    }
    const previas = historia.filter((r) => Math.abs(r.t - observada) <= 60 * MIN);
    const hecho = (h: number, el: number | null, t: number): Hecho => {
      const cm = mapas.get(h);
      return { hermandadId: h, elemento: el, t, zona: cm ? zona(cm, t) : [] };
    };
    const s = salidaMotor(c);
    const prog = ahoraEnPrograma(new Date(observada), c.anio);
    const ventana =
      s.salida !== null && s.entrada !== null
        ? { sale: aReal(s.salida, prog, new Date(observada)).getTime(), entra: aReal(s.entrada, prog, new Date(observada)).getTime() }
        : null;
    const juicio = juzgar(
      hecho(hermandadId, elemento, observada),
      previas.map((p) => hecho(p.hermandadId, p.elemento, p.t)),
      ventana,
    );
    const puntos = juicio.plausible ? PUNTOS_BASE : 0;

    // 3. Se guarda siempre, en el siguiente lote
    const guardada = lotes.guardar({
      usuario_id: usuario.id,
      cliente_id: clienteId,
      hermandad_id: hermandadId,
      elemento,
      latitud: ubicacion?.latitud ?? null,
      longitud: ubicacion?.longitud ?? null,
      precision_m: ubicacion?.precision ?? null,
      observada: new Date(observada).toISOString(),
      recibida: new Date(ahora).toISOString(),
      plausible: juicio.plausible,
      puntos_base: puntos,
      de_prueba: desfase !== 0,
    });
    historias.anotar(usuario.id, { clienteId, hermandadId, elemento, t: observada, guardada });
    let g: Guardada;
    try {
      g = await guardada;
    } catch (e) {
      historias.quitar(usuario.id, clienteId);
      throw e;
    }
    if (!juicio.plausible) console.log(`aportación ${g.id} sin puntos base: ${juicio.motivo}`);
    respuesta.status(201).json(g);
  }),
);

routerAportaciones.get(
  "/yo/aportaciones",
  exigirSesion,
  ruta(async (_peticion, respuesta, usuario) => {
    const [{ porId }, nombres] = await Promise.all([hermandadesYEdicion(), nombresDeHermandades()]);
    const { data, error } = await supabase()
      .from("aportacion")
      .select("id, cliente_id, hermandad_id, elemento, observada, puntos_base, bonus, resultado")
      .eq("usuario_id", usuario.id)
      .order("observada", { ascending: false })
      .limit(500);
    if (error) throw error;
    const filas = data ?? [];
    respuesta.set("Cache-Control", "no-store").json({
      puntos: filas.reduce((n, f) => n + f.puntos_base + f.bonus, 0),
      aportaciones: filas.map((f) => ({
        id: f.id,
        clienteId: f.cliente_id,
        cofradia: porId.get(f.hermandad_id) ?? null,
        nombre: nombres.get(f.hermandad_id)?.nombre ?? null,
        jornada: nombres.get(f.hermandad_id)?.jornada ?? null,
        elemento: f.elemento,
        // «Cruz de guía», «Primer paso»… o «La cofradía» para «Estoy viendo la cofradía»
        etiqueta:
          f.elemento === null
            ? "La cofradía"
            : f.elemento === 0
              ? "Cruz de guía"
              : (nombres.get(f.hermandad_id)?.pasos[f.elemento - 1] ?? `Paso ${f.elemento}`),
        observada: f.observada,
        puntos: f.puntos_base,
        bonus: f.bonus,
        // Lo único del resultado que se enseña: lo bueno (F-27)
        contribuyo: f.resultado === "consolidada",
      })),
    });
  }),
);

import { Router, type Request, type Response } from "express";
import type { Coord } from "../geo.js";
import { estadoCofradia } from "../motor/motor.js";
import { juzgar, PUNTOS_BASE, type Hecho } from "../motor/plausibilidad.js";
import { ahoraEnPrograma, aReal } from "../motor/tiempo.js";
import { exigirSesion, type Usuario } from "../sesion.js";
import { supabase } from "../supabase.js";
import { cofradiaMapa, hermandadesYEdicion, nombresDeHermandades, type CofradiaMapa } from "./cofradias.js";
import { salidaMotor } from "./estado.js";

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

/** Por dónde iba una cofradía a una hora real: sus elementos en la calle o, si no, su templo. */
function zona(c: CofradiaMapa, t: number): Coord[] {
  if (c.linea.length < 2) return [];
  const e = estadoCofradia(salidaMotor(c), [], ahoraEnPrograma(new Date(t), c.anio));
  return e.elementos.length ? e.elementos.map((x) => x.punto) : [c.linea[0]!];
}

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
    const db = supabase();

    // 2. Los cuatro controles, con su propia historia de la última hora
    // Nadie ve algo en el futuro: si el reloj del teléfono va adelantado, la hora de llegada
    const observada = Math.min(observadaPedida, ahora);
    const previasBd = await db
      .from("aportacion")
      .select("hermandad_id, elemento, observada")
      .eq("usuario_id", usuario.id)
      .gte("observada", new Date(observada - 60 * MIN).toISOString())
      .lte("observada", new Date(observada + 60 * MIN).toISOString());
    if (previasBd.error) throw previasBd.error;
    const mapas = new Map<number, CofradiaMapa | undefined>([[hermandadId, c]]);
    for (const p of previasBd.data ?? []) {
      if (!mapas.has(p.hermandad_id)) mapas.set(p.hermandad_id, await cofradiaMapa(porId.get(p.hermandad_id) ?? ""));
    }
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
      (previasBd.data ?? []).map((p) => hecho(p.hermandad_id, p.elemento, Date.parse(p.observada))),
      ventana,
    );
    const puntos = juicio.plausible ? PUNTOS_BASE : 0;

    // 3. Se guarda siempre. Si ya llegó (reintento), (usuario_id, cliente_id) se repite y se devuelve la
    // que había: así no se pregunta antes en cada «Dar fe» (una consulta menos, BUL-212)
    const { data, error } = await db
      .from("aportacion")
      .insert({
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
      })
      .select("id")
      .single();
    if (error?.code === "23505") {
      const ya = await db.from("aportacion").select("id, puntos_base, observada").eq("usuario_id", usuario.id).eq("cliente_id", clienteId).single();
      if (ya.error) throw ya.error;
      respuesta.status(200).json({ id: ya.data.id, puntos: ya.data.puntos_base, observada: ya.data.observada });
      return;
    }
    if (error) throw error;
    if (!juicio.plausible) console.log(`aportación ${data.id} sin puntos base: ${juicio.motivo}`);
    respuesta.status(201).json({ id: data.id, puntos, observada: new Date(observada).toISOString() });
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

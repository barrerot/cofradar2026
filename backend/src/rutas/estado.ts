import { Router } from "express";
import { cuenta } from "../motor/reputacion.js";
import { estadoCofradia, MEMORIA, type Aportacion, type Resultado, type SalidaMotor } from "../motor/motor.js";
import { supabase } from "../supabase.js";
import { ahoraEnPrograma, aReal, msPrograma } from "../motor/tiempo.js";
import { hermandadesYEdicion, mapa, ruta, type CofradiaMapa } from "./cofradias.js";

/**
 * Estado de la jornada.
 *
 * /estado-jornada es el resumen que todavía lee el armazón de su fixture; se queda igual hasta 4.16.
 *
 * /jornadas/:id/estado (4.3) es lo que da el motor para cada cofradía de la jornada: fase y su
 * confianza, retraso o adelanto, progreso y dónde va cada elemento. La app lo pide cada 30 segundos, así
 * que es pequeño (sin las líneas del recorrido: esas las da /jornadas/:id/mapa, que no cambia) y se
 * calcula una vez cada 30 segundos para todos los que lo piden a la vez (la Madrugá es el pico).
 *
 * Para probar en plena Semana Santa: `?ahora=2027-03-26T01:40:00Z` simula una hora, y `?desfase=<ms>`
 * la desplaza respecto a la real, que es lo que manda la web con su reloj de prueba (datos/reloj.ts):
 * así la dirección no cambia en cada petición.
 */
export const routerEstado = Router();

routerEstado.get("/estado-jornada", (_peticion, respuesta) => {
  respuesta.json({
    activa: false,
    jornada: null,
    sincronizacion: new Date().toISOString(),
    // Marca explicita para que nadie confunda esto con un dato.
    procedencia: "sin-motor",
  });
});

/** Más imprecisa que esto, la ubicación del teléfono no sirve para situar un elemento (sí como presencia). */
const PRECISION_MAXIMA = 100;

/**
 * Las aportaciones de «Dar fe» de esas cofradías que le sirven al motor: las plausibles de las dos
 * últimas horas, con su hora llevada al programa (tiempo.ts). Las hechas con el reloj de prueba solo
 * cuentan cuando se mira con el reloj de prueba.
 */
async function aportaciones(lista: CofradiaMapa[], instante: Date, conPruebas: boolean): Promise<Map<string, Aportacion[]>> {
  const { porSlug, porId } = await hermandadesYEdicion();
  const ids = lista.map((c) => porSlug.get(c.id)).filter((x): x is number => x !== undefined);
  let consulta = supabase()
    .from("aportacion")
    .select("id, usuario_id, hermandad_id, elemento, latitud, longitud, precision_m, observada")
    .in("hermandad_id", ids)
    .eq("plausible", true)
    .gte("observada", new Date(instante.getTime() - MEMORIA).toISOString())
    .lte("observada", instante.toISOString());
  if (!conPruebas) consulta = consulta.eq("de_prueba", false);
  const { data, error } = await consulta;
  if (error) throw error;
  const anio = new Map(lista.map((c) => [c.id, c.anio]));
  const fiables = await quienesCuentan([...new Set((data ?? []).map((f) => f.usuario_id as string))]);
  const res = new Map<string, Aportacion[]>();
  for (const f of data ?? []) {
    const id = porId.get(f.hermandad_id);
    // Quien tiene un patrón de aportaciones contradichas no cuenta para consolidar (reputacion.ts)
    if (!id || !fiables.has(f.usuario_id)) continue;
    const fiable = f.latitud !== null && f.longitud !== null && (f.precision_m ?? 0) <= PRECISION_MAXIMA;
    const lista_ = res.get(id) ?? [];
    lista_.push({
      id: f.id,
      usuario: f.usuario_id,
      t: ahoraEnPrograma(new Date(f.observada), anio.get(id)!),
      elemento: f.elemento,
      punto: fiable ? [Number(f.longitud), Number(f.latitud)] : null,
    });
    res.set(id, lista_);
  }
  return res;
}

/** Reputación de cada persona, a partir de su historial; se recalcula cada 5 minutos como mucho. */
const reputaciones = new Map<string, { hasta: number; cuenta: boolean }>();
async function quienesCuentan(usuarios: string[]): Promise<Set<string>> {
  const ahora = Date.now();
  const faltan = usuarios.filter((u) => (reputaciones.get(u)?.hasta ?? 0) < ahora);
  if (faltan.length) {
    const { data, error } = await supabase()
      .from("aportacion")
      .select("usuario_id, resultado")
      .in("usuario_id", faltan)
      .in("resultado", ["consolidada", "contradicha"]);
    if (error) throw error;
    const historial = new Map(faltan.map((u) => [u, { consolidadas: 0, contradichas: 0 }]));
    for (const f of data ?? []) {
      const h = historial.get(f.usuario_id)!;
      if (f.resultado === "consolidada") h.consolidadas++;
      else h.contradichas++;
    }
    for (const [u, h] of historial) reputaciones.set(u, { hasta: ahora + 5 * 60_000, cuenta: cuenta(h) });
  }
  return new Set(usuarios.filter((u) => reputaciones.get(u)?.cuenta !== false));
}

/**
 * Lo que el motor ha hecho con cada aportación se apunta en ella: el resultado (para «contribuyó a la
 * posición» y la reputación) y el bonus (4.13). «Consolidada» ya no se quita y el bonus no baja: lo que
 * ayudó, ayudó.
 */
const anotados = new Map<string, Resultado>();
const bonusAnotado = new Map<string, number>();
async function anotarResultados(resultados: Record<string, Resultado>, bonus: Record<string, number>) {
  if (anotados.size > 50_000) anotados.clear();
  if (bonusAnotado.size > 50_000) bonusAnotado.clear();
  // El bonus solo sube: si ya tenía más, se queda
  for (const [id, valor] of Object.entries(bonus)) {
    if ((bonusAnotado.get(id) ?? 0) >= valor) continue;
    bonusAnotado.set(id, valor);
    const { error } = await supabase().from("aportacion").update({ bonus: valor }).eq("id", id).lt("bonus", valor);
    if (error) console.error(error);
  }
  const cambios = Object.entries(resultados).filter(([id, r]) => anotados.get(id) !== r && anotados.get(id) !== "consolidada");
  for (const [id, r] of cambios) {
    anotados.set(id, r);
    const consulta = supabase().from("aportacion").update({ resultado: r }).eq("id", id);
    const { error } = await (r === "consolidada" ? consulta : consulta.or("resultado.is.null,resultado.neq.consolidada"));
    if (error) console.error(error);
  }
}

const CADA_MS = 30_000;
const memoria = new Map<string, { hasta: number; datos: Promise<unknown> }>();

/** Una cofradía del mapa, como la quiere el motor (horas del programa). */
export function salidaMotor(c: CofradiaMapa): SalidaMotor {
  const situadas = (hs: CofradiaMapa["cruzGuia"]) => hs.filter((h) => h.m !== null).map((h) => ({ t: msPrograma(h.hora), m: h.m! }));
  return {
    id: c.id,
    pasos: c.nombresPasos,
    linea: c.linea,
    cruz: situadas(c.cruzGuia),
    ultimo: situadas(c.ultimoPaso),
    salida: c.cruzGuia[0] ? msPrograma(c.cruzGuia[0].hora) : null,
    entrada: c.ultimoPaso.length ? msPrograma(c.ultimoPaso[c.ultimoPaso.length - 1]!.hora) : null,
    estadoAdmin: c.estado,
  };
}

async function calcular(jornada: number, instante: Date, conPruebas: boolean) {
  const lista = await mapa(jornada);
  const porCofradia = await aportaciones(lista, instante, conPruebas);
  const cofradias = lista.map((c) => {
    const ahora = ahoraEnPrograma(instante, c.anio);
    const e = estadoCofradia(salidaMotor(c), porCofradia.get(c.id) ?? [], ahora);
    void anotarResultados(e.resultados, e.bonus);
    const real = (t: number | null) => (t === null ? null : aReal(t, ahora, instante).toISOString());
    // `resultados` es interno (para los puntos): no sale
    return {
      id: e.id,
      nombre: c.nombre,
      fase: e.fase,
      sale: real(e.sale),
      entra: real(e.entra),
      alteraciones: e.alteraciones,
      progreso: e.progreso,
      elementos: e.elementos,
    };
  });
  return {
    jornada,
    sincronizacion: instante.toISOString(),
    procedencia: "motor",
    // Lluvia e incidencias: las publica la administración (fase 5)
    contexto: [],
    cofradias,
  };
}

routerEstado.get(
  "/jornadas/:id/estado",
  ruta(async (peticion, respuesta) => {
    const jornada = Number(peticion.params.id);
    const desfase = Number(peticion.query.desfase ?? 0);
    const pedido = typeof peticion.query.ahora === "string" ? new Date(peticion.query.ahora) : new Date(Date.now() + desfase);
    if (Number.isNaN(pedido.getTime())) {
      respuesta.status(400).json({ error: "?ahora= o ?desfase= no valen" });
      return;
    }
    // Todos los que piden en los mismos 30 segundos comparten el cálculo
    const instante = new Date(Math.floor(pedido.getTime() / CADA_MS) * CADA_MS);
    const conPruebas = peticion.query.ahora !== undefined || peticion.query.desfase !== undefined;
    const clave = `${jornada}|${instante.getTime()}|${conPruebas}`;
    let guardado = memoria.get(clave);
    if (!guardado || guardado.hasta < Date.now()) {
      for (const [k, v] of memoria) if (v.hasta < Date.now()) memoria.delete(k);
      guardado = { hasta: Date.now() + CADA_MS, datos: calcular(jornada, instante, conPruebas) };
      memoria.set(clave, guardado);
      guardado.datos.catch(() => memoria.delete(clave));
    }
    respuesta.setHeader("Cache-Control", "public, max-age=30");
    respuesta.json(await guardado.datos);
  }),
);

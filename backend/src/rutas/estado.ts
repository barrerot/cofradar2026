import { Router } from "express";
import { estadoCofradia, type Aportacion } from "../motor/motor.js";
import { ahoraEnPrograma, aReal, msPrograma } from "../motor/tiempo.js";
import { mapa, ruta, type CofradiaMapa } from "./cofradias.js";

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

/**
 * Las aportaciones de «Dar fe» de esas salidas.
 *
 * TODAVÍA NO SE GUARDAN: la tabla de aportaciones es una entidad nueva y, como dice MODELO.md
 * («Abierto», 7), se propone a Carlos con su caso de uso antes de crearla. Hasta entonces el motor
 * funciona solo con el horario: todo sale `estimado`.
 */
async function aportaciones(_salidas: CofradiaMapa[]): Promise<Map<string, Aportacion[]>> {
  return new Map();
}

const CADA_MS = 30_000;
const memoria = new Map<string, { hasta: number; datos: Promise<unknown> }>();

async function calcular(jornada: number, instante: Date) {
  const lista = await mapa(jornada);
  const porCofradia = await aportaciones(lista);
  const cofradias = lista.map((c) => {
    const ahora = ahoraEnPrograma(instante, c.anio);
    const situadas = (hs: CofradiaMapa["cruzGuia"]) => hs.filter((h) => h.m !== null).map((h) => ({ t: msPrograma(h.hora), m: h.m! }));
    const e = estadoCofradia(
      {
        id: c.id,
        pasos: c.nombresPasos,
        linea: c.linea,
        cruz: situadas(c.cruzGuia),
        ultimo: situadas(c.ultimoPaso),
        salida: c.cruzGuia[0] ? msPrograma(c.cruzGuia[0].hora) : null,
        entrada: c.ultimoPaso.length ? msPrograma(c.ultimoPaso[c.ultimoPaso.length - 1]!.hora) : null,
        estadoAdmin: c.estado,
      },
      porCofradia.get(c.id) ?? [],
      ahora,
    );
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
    const clave = `${jornada}|${instante.getTime()}`;
    let guardado = memoria.get(clave);
    if (!guardado || guardado.hasta < Date.now()) {
      for (const [k, v] of memoria) if (v.hasta < Date.now()) memoria.delete(k);
      guardado = { hasta: Date.now() + CADA_MS, datos: calcular(jornada, instante) };
      memoria.set(clave, guardado);
      guardado.datos.catch(() => memoria.delete(clave));
    }
    respuesta.setHeader("Cache-Control", "public, max-age=30");
    respuesta.json(await guardado.datos);
  }),
);

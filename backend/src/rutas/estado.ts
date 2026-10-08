import { Router } from "express";

/**
 * Estado de la jornada.
 *
 * TODAVIA NO HAY MOTOR. Lo que devuelve esto es la misma forma que el
 * frontend ya consume de su fixture, para que cambiar de uno a otro sea
 * cambiar el origen y no el contrato.
 *
 * Cuando el hito 1 este, `activa` saldra del estado real de los elementos en
 * calle —no del calendario (§8.3)— y cada dato llevara su `fuente`, porque
 * los horarios salen de cuadrantes publicados por medios y no de una fuente
 * institucional.
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

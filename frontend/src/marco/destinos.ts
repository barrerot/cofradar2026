import type { NombreTrazo } from "./trazos";

/**
 * Los cinco destinos de la navegacion principal.
 *
 * El PRD fija la arquitectura mobile-first de cinco areas y design.md §8.1 lo
 * recoge en su nota de revision del 8 de octubre de 2026: «Ahora» se integra
 * en Inicio, «Jornada» pasa a Agenda, el listado de cofradias sale de ella
 * como area propia y «Mi tramo» pasa a Mi Cofradar. «Dar fe» es accion
 * transversal y NO es un destino: vive en la franja (ver FranjaAccion).
 *
 * El texto de §8.1/§8.2 que sigue describiendo cuatro destinos esta pendiente
 * de reescribirse con el resultado de B-05 · Armazon global movil. Las reglas
 * duras de §8.2 siguen vigentes y son las que implementa el marco.
 *
 * Reglas que esta lista respeta:
 *   · Icono + etiqueta de texto SIEMPRE visibles.
 *   · Posicion, nombre y significado estables todo el ano.
 *   · Sin hamburguesa ni menu lateral.
 */
export type Destino = {
  id: string;
  etiqueta: string;
  ruta: string;
  icono: NombreTrazo;
  /** Variante de relleno para el destino activo, si el export la trae. */
  iconoActivo?: NombreTrazo;
};

export const DESTINOS: readonly Destino[] = [
  { id: "inicio", etiqueta: "Inicio", ruta: "/", icono: "inicio", iconoActivo: "inicioRelleno" },
  { id: "mapa", etiqueta: "Mapa", ruta: "/mapa", icono: "mapa" },
  {
    id: "cofradias",
    etiqueta: "Cofradías",
    ruta: "/cofradias",
    icono: "cofradias",
    iconoActivo: "cofradiasRelleno",
  },
  { id: "agenda", etiqueta: "Agenda", ruta: "/agenda", icono: "agenda" },
  {
    id: "mi-cofradar",
    etiqueta: "Mi Cofradar",
    ruta: "/mi-cofradar",
    icono: "miCofradar",
    iconoActivo: "miCofradarRelleno",
  },
] as const;

/**
 * PENDIENTE DE DECISION · el export es inconsistente aqui.
 *
 * En las capturas de 1-marco, el destino activo cambia a icono de relleno en
 * Inicio, Cofradias y Mi Cofradar, pero NO en Mapa ni en Agenda, que repiten
 * el mismo trazo en activo e inactivo. Tres de cinco es casi seguro un
 * descuido del export, no una decision.
 *
 * Mientras no se confirme, esto va en `false`: el estado activo se marca solo
 * con color + la linea de 2px que .cf-nav ya pinta via aria-current, que es
 * consistente en los cinco. Ponerlo en `true` sin los trazos de relleno de
 * Mapa y Agenda produciria una barra con tres iconos rellenos y dos no.
 */
export const RELLENO_EN_DESTINO_ACTIVO = false;

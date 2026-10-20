import type { Relacion } from "../componentes";

/**
 * Tu relación con cada cofradía (seguida o vista), por su id.
 *
 * Es de la cuenta, no del teléfono (decisión del 20/10/2026): sin sesión no
 * hay ninguna. Seguir y marcar como vista llegan con la ficha (3.2), que es
 * donde se hacen; hasta entonces la cuenta tampoco tiene ninguna y el mapa
 * está vacío. Las pantallas ya la leen de aquí para no cambiar cuando llegue.
 */
const NINGUNA: ReadonlyMap<string, Relacion> = new Map();

export function useRelaciones(): ReadonlyMap<string, Relacion> {
  return NINGUNA;
}

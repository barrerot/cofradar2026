import { Marco } from "../marco";
import type { EstadoJornada } from "../fixture";
import { CabeceraRaiz } from "./CabeceraRaiz";
import { Relleno } from "./Relleno";

/**
 * Mi Cofradar · la capa personal.
 *
 * Lo que antes era «Mi tramo». No cambia de posicion en la navegacion segun
 * la intensidad (§8.3): fuera de temporada gana protagonismo, no sitio.
 *
 * Sin franja de accion: «Dar fe» es contextual y aqui no hay contexto donde
 * dar fe de nada.
 *
 * SUPUESTO · la cabecera lleva el selector de jornada porque asi lo pintan
 * las capturas 06-10 de 1-marco. Pero §8.2 asigna ese selector a Ahora y
 * Jornada en concreto, y esas capturas existen para ensenar el estado activo
 * de la barra, no para fijar la cabecera de cada area. Si al cerrar B-05 la
 * capa personal no lleva selector, se cambia aqui y en ningun otro sitio.
 */
export function MiCofradar({ estado }: { estado: EstadoJornada }) {
  return (
    <Marco cabecera={<CabeceraRaiz estado={estado} />}>
      <Relleno>Mi Cofradar · capa personal</Relleno>
    </Marco>
  );
}

import { Marco } from "../marco";
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
 * La cabecera lleva la jornada consultada como todas las areas: §8.2 dice
 * que «ningun area es excepcion» (D35).
 */
export function MiCofradar() {
  return (
    <Marco cabecera={<CabeceraRaiz />}>
      <Relleno>Mi Cofradar · capa personal</Relleno>
    </Marco>
  );
}

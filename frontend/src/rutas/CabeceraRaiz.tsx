import { Cabecera } from "../marco";
import { SelectorJornada } from "./SelectorJornada";

/**
 * La cabecera de las áreas raíz (Inicio, Agenda, Mi Cofradar): la jornada
 * consultada y la sincronización, y nada más (§8.2, D35). Sin selector de
 * ciudad ni búsqueda global: en 2027 solo se busca por nombre dentro de
 * Cofradías.
 *
 * Vive en rutas/, no en marco/: cada ruta compone la suya y las que necesitan
 * una segunda fila (selector de día, búsqueda, filtros) la añaden.
 */
export function CabeceraRaiz() {
  return <Cabecera principal={<SelectorJornada />} />;
}

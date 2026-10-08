import { Marco } from "../marco";
import type { EstadoJornada } from "../fixture";
import { CabeceraRaiz } from "./CabeceraRaiz";
import { DarFe } from "./DarFe";
import { Relleno } from "./Relleno";

/**
 * Agenda · «¿Que hay programado?»
 *
 * Lo que antes era «Jornada». Todo lo del dia sin priorizar, con cambio de
 * dia. El selector de dia es `.cf-days` del design system y entra con el
 * contenido de esta area, no con el marco.
 */
export function Agenda({ estado }: { estado: EstadoJornada }) {
  return (
    <Marco
      cabecera={<CabeceraRaiz estado={estado} />}
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <Relleno>Agenda · jornada completa sin priorizar</Relleno>
    </Marco>
  );
}

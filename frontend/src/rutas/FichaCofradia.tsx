import { useParams } from "react-router-dom";
import { Boton, Icono, PantallaSecundaria } from "../marco";
import { COFRADIAS_FIXTURE, type EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { Relleno } from "./Relleno";

/**
 * Ficha de cofradia · pantalla secundaria (1-marco/04).
 *
 * Existe para comprobar el marco secundario: vuelta nombrada, titulo en serif
 * y la navegacion inferior intacta. El contenido de la ficha es de otro hito.
 *
 * Registro EDITORIAL (§3): la ficha de hermandad esta en la lista de lo
 * editorial, asi que la paleta se va a cera y el aire sube. No es decoracion:
 * es la separacion entre capa operativa y capa de identidad.
 */
export function FichaCofradia({ estado }: { estado: EstadoJornada }) {
  const { id } = useParams();
  const cofradia = COFRADIAS_FIXTURE.find((c) => c.id === id);

  return (
    <PantallaSecundaria
      registro="editorial"
      titulo={cofradia?.nombre ?? "Cofradía"}
      vuelta={{ etiqueta: "Cofradías", ruta: "/cofradias" }}
      sincronizacion={estado.sincronizacion}
      accion={estado.activa ? <DarFe /> : undefined}
      acciones={
        <Boton variante="terciario" tamano="36">
          <Icono nombre="buscar" tamano={16} />
          <span>Buscar</span>
        </Boton>
      }
    >
      <Relleno>Ficha de cofradía</Relleno>
    </PantallaSecundaria>
  );
}

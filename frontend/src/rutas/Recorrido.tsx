import { useParams } from "react-router-dom";
import { PantallaSecundaria } from "../marco";
import { Relleno } from "./Relleno";

/** P-12 Recorrido y horarios. Andamio hasta la 3.3: la ficha ya enlaza aquí. */
export function Recorrido() {
  const { id = "" } = useParams();
  return (
    <PantallaSecundaria titulo="Recorrido y horarios" vuelta={{ etiqueta: "Ficha", ruta: `/cofradias/${id}` }}>
      <Relleno>Recorrido y horarios · llega en la 3.3</Relleno>
    </PantallaSecundaria>
  );
}

import { PantallaSecundaria } from "../marco";
import { Relleno } from "./Relleno";

/** Andamio para las subpantallas de Mi Cofradar que aún no existen: dice cuál es y cuándo llega. */
export function Pendiente({ titulo, llega }: { titulo: string; llega: string }) {
  return (
    <PantallaSecundaria titulo={titulo} vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }}>
      <Relleno>{`${titulo} · llega con la ${llega}`}</Relleno>
    </PantallaSecundaria>
  );
}

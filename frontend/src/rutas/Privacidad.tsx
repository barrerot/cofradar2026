import { PantallaSecundaria } from "../marco";
import { Relleno } from "./Relleno";

/**
 * Política de privacidad, desde Ajustes · ANDAMIO.
 *
 * El texto legal no está escrito: lo tiene que redactar (o validar) quien
 * responda de Cofradar. Hasta entonces la fila de Ajustes lleva aquí y no a
 * un texto inventado.
 */
export function Privacidad() {
  return (
    <PantallaSecundaria titulo="Política de privacidad" vuelta={{ etiqueta: "Ajustes", ruta: "/mi-cofradar/ajustes" }}>
      <Relleno>Política de privacidad · texto pendiente de redactar</Relleno>
    </PantallaSecundaria>
  );
}

import { PantallaSecundaria } from "../marco";
import { Relleno } from "./Relleno";

/** Las dos pantallas desde las que se llega a los textos legales. */
export type Origen = "ajustes" | "ayuda";

const VUELTA: Record<Origen, { etiqueta: string; ruta: string }> = {
  ajustes: { etiqueta: "Ajustes", ruta: "/mi-cofradar/ajustes" },
  ayuda: { etiqueta: "Ayuda y fuentes", ruta: "/mi-cofradar/ayuda" },
};

/**
 * Política de privacidad, desde Ajustes y desde Ayuda y fuentes · ANDAMIO.
 *
 * El texto legal no está escrito: lo tiene que redactar (o validar) quien
 * responda de Cofradar. Hasta entonces las filas llevan aquí y no a un texto
 * inventado.
 */
export function Privacidad({ desde }: { desde: Origen }) {
  return (
    <PantallaSecundaria titulo="Política de privacidad" vuelta={VUELTA[desde]}>
      <Relleno>Política de privacidad · texto pendiente de redactar</Relleno>
    </PantallaSecundaria>
  );
}

/** Aviso legal, desde Ayuda y fuentes · ANDAMIO, por lo mismo que la privacidad. */
export function AvisoLegal() {
  return (
    <PantallaSecundaria titulo="Aviso legal" vuelta={VUELTA.ayuda}>
      <Relleno>Aviso legal · texto pendiente de redactar</Relleno>
    </PantallaSecundaria>
  );
}

import { useId } from "react";
import { LOGOTIPO } from "./logotipo";

/**
 * El logotipo de Cofradar (logotipo D, «El tramo con nazareno»).
 *
 *   horizontal  símbolo y palabra en línea: encabezados y documentos
 *   vertical    símbolo encima de la palabra: intro, arranque y portadas
 *   simbolo     solo el símbolo. Por debajo de 40 px usa solo la versión
 *               pequeña, en la que las tres rayas se unen en un trazo
 *
 * Va en currentColor: hereda la tinta del texto (tinta en claro, cera en
 * oscuro). Nunca granate ni colores de estado. Los recortes del nazareno son
 * máscaras SVG, así que vale sobre cualquier fondo; cada uso lleva sus propios
 * id de máscara para poder repetirlo en la misma página.
 *
 * `alto` en px. Sin `titulo` es decorativo (aria-hidden); con él, una imagen
 * con ese nombre.
 */
export type VarianteLogo = "horizontal" | "vertical" | "simbolo";

export function Logo({ variante, alto, titulo }: { variante: VarianteLogo; alto: number; titulo?: string }) {
  const id = `cf-logo${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const dibujo =
    variante === "simbolo" ? LOGOTIPO[alto < 40 ? "simboloPequeno" : "simbolo"] : LOGOTIPO[variante];

  return (
    <svg
      className="cf-logo"
      viewBox={dibujo.viewBox}
      width={Math.round(alto * dibujo.proporcion * 100) / 100}
      height={alto}
      {...(titulo ? { role: "img", "aria-label": titulo } : { "aria-hidden": true })}
      dangerouslySetInnerHTML={{ __html: dibujo.cuerpo.replaceAll("__ID__", id) }}
    />
  );
}

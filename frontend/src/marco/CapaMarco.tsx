import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * La capa del marco: un sitio encima del contenido donde una ruta puede abrir
 * una hoja desde cualquier parte, por ejemplo desde un botón de la cabecera.
 *
 * Hace falta porque la hoja se coloca respecto al marco entero (justo encima
 * de la navegación, con su capa oscura), y la cabecera es sticky: una hoja
 * pintada dentro de ella quedaría atrapada en su caja. El marco ofrece el
 * sitio y no sabe qué se pinta en él.
 */
export const CapaMarco = createContext<HTMLElement | null>(null);

export function EnCapaDelMarco({ children }: { children: ReactNode }) {
  const capa = useContext(CapaMarco);
  return capa ? createPortal(children, capa) : null;
}

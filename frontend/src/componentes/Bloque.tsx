import type { ReactNode } from "react";

/**
 * Un bloque priorizado de Inicio: `.cf-ahora-bloque`.
 *
 * Regla dura del area: un bloque VACIO no se pinta —ni encabezado, ni hueco,
 * ni mensaje, ni invitacion—. Aqui se cumple devolviendo `null`, no
 * ocultandolo por CSS: si se ocultara, el hueco del `gap` de la pila seguiria
 * ahi y la pantalla quedaria con un salto sin explicacion.
 */
export function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  const vacio =
    children === null ||
    children === undefined ||
    children === false ||
    (Array.isArray(children) && children.filter(Boolean).length === 0);

  if (vacio) return null;

  return (
    <section className="cf-ahora-bloque">
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}

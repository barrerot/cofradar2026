import type { ReactNode } from "react";

/**
 * Franja de accion contextual (§9.12, §8.2).
 *
 * Separada de la navegacion y POR ENCIMA de ella: la navegacion es estable y
 * la accion es contextual, son cosas distintas y se comportan distinto.
 *
 * «Dar fe» es la accion transversal del producto y NO es un destino, por eso
 * vive aqui y no en la barra.
 *
 * Aparece «solo cuando hay algo que hacer», y eso depende del estado REAL de
 * la jornada, no del calendario (§8.3): puede ser Martes Santo a las cinco y
 * no haber nada en la calle. Esa decision no se toma aqui: si no hay hijos,
 * la franja no se pinta y no deja hueco.
 */
export function FranjaAccion({
  children,
  etiqueta = "Acción contextual",
}: {
  children?: ReactNode;
  etiqueta?: string;
}) {
  if (!children) return null;

  return (
    <div className="cf-actionbar" aria-label={etiqueta}>
      {children}
    </div>
  );
}

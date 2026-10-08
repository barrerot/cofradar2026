import { Boton } from "../marco";

/**
 * Vía rápida de «Dar fe» en la franja de accion.
 *
 * Solo aparece cuando la jornada esta activa de verdad (§8.3). El flujo que
 * abre no esta implementado: es el hito de «Dar fe», no el del marco.
 */
export function DarFe() {
  return (
    <Boton variante="primario" tamano="36">
      <span>Dar fe</span>
    </Boton>
  );
}

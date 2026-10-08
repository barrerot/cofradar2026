/**
 * El contorno de chips, alteraciones y procedencias: `.cf-outline`.
 *
 * No es decoracion. Es el mecanismo con el que el design system dibuja el
 * borde de estas piezas: un `<rect>` SVG posicionado en absoluto cuyo trazo
 * toma el color base del estado (`--line`) y pasa a discontinuo
 * (`--cf-dash-pattern`) cuando el contenedor lleva `data-confianza="estimado"`
 * o `"desactualizado"`, o `data-procedencia="usuarios"`.
 *
 * Se dibuja en SVG y no con `border` porque un borde CSS discontinuo no puede
 * seguir el radio ni afinarse a 1,5px de forma consistente.
 *
 * Va SIEMPRE como primer hijo: el `rect` no lleva atributos porque todas sus
 * medidas las pone el CSS del bundle.
 */
export function Contorno() {
  return (
    <svg className="cf-outline" aria-hidden="true">
      <rect />
    </svg>
  );
}

import { TRAZOS, type NombreTrazo } from "./trazos";

/**
 * Icono del sistema. Lienzo 0 0 256 256 y `currentColor`, como en el export:
 * el color lo pone siempre el contexto, nunca el icono.
 *
 * Decorativo por defecto (`aria-hidden`), porque en todo el marco el icono
 * acompana a una etiqueta de texto visible. Si alguna vez va solo, se le pasa
 * `etiqueta` y pasa a ser `role="img"` con nombre accesible.
 *
 * `cf-ph` NO es decorativa y es obligatoria: bundle.css la usa para alinear
 * el icono (`flex:none`, `vertical-align:middle`) y, sobre todo, para darle
 * el color que le toca segun donde caiga —`.cf-chip > .cf-ph` toma el color
 * del estado, `.cf-band > .cf-ph` el de informacion, `.cf-notice > .cf-ph` y
 * `.cf-alt > .cf-ph` el de su linea—. Sin ella el icono hereda el color del
 * texto y el estado deja de leerse.
 *
 * Del `class="ph cf-ph"` del export se deja solo `cf-ph`: `ph` es la clase
 * marcadora de Phosphor y el bundle no la estiliza.
 */
export function Icono({
  nombre,
  tamano = 24,
  etiqueta,
}: {
  nombre: NombreTrazo;
  /** Los del export: 16 y 24 en el marco, 20 en bandas, 40 en el centro de
      los estados que ocupan la pantalla (0-sistema/estados/6 y 8). */
  tamano?: 16 | 20 | 24 | 40;
  etiqueta?: string;
}) {
  return (
    <svg
      className="cf-ph"
      width={tamano}
      height={tamano}
      viewBox="0 0 256 256"
      fill="currentColor"
      focusable="false"
      {...(etiqueta ? { role: "img", "aria-label": etiqueta } : { "aria-hidden": true })}
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

import type { CSSProperties } from "react";

/**
 * El símbolo del logotipo D, animado una vez (estilos/logo-animado.css).
 * Marcado portado tal cual de intro-animada/intro.html:
 *
 *   0,10 s  se dibuja el tramo sólido (confirmado)
 *   0,85 s  se levanta el nazareno (la cabeza del cortejo, ahora)
 *   1,00 s  anillo de radar desde la cabeza
 *   1,25 s  las tres rayas de lo previsto, una a una (según horario)
 *
 * Aquí los recortes del nazareno se pintan con el color de fondo y no con
 * máscaras, como en la referencia: solo va sobre el fondo de la pantalla
 * (--cf-bg). Para el logotipo estático sobre cualquier fondo, <Logo>.
 *
 * La copia en HTML de index.html (arranque, P-01) tiene que seguir igual.
 */
const retardo = (s: number): CSSProperties => ({ animationDelay: `calc(${s}s - var(--t, 0s))` });

const CABEZA =
  "M12.18 -4.43L13.57 2.05C14.58 3.73 16.02 5.65 16.38 7.57L12.18 9.97L7.98 7.57C8.34 5.65 9.78 3.73 10.79 2.05Z";
const TUNICA = "M8.94 6.13L15.42 6.13L17.10 19.57L7.26 19.57Z";

export function SimboloAnimado({ lado }: { lado: number }) {
  const tinta = "var(--cf-text)";
  const fondo = "var(--cf-bg)";
  return (
    <svg className="cf-simbolo-animado" width={lado} height={lado} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M35.49 33.64A15 15 0 0 1 9.90 18.87" pathLength={1} fill="none" stroke={tinta} strokeWidth={6} strokeLinecap="round" className="cf-a cf-draw" style={retardo(0.1)} />
      <path d="M16.50 11.01A15 15 0 0 1 21.01 9.30" pathLength={1} fill="none" stroke={tinta} strokeWidth={6} strokeLinecap="butt" className="cf-a cf-dash" style={retardo(1.25)} />
      <path d="M24.19 9.00A15 15 0 0 1 28.95 9.84" pathLength={1} fill="none" stroke={tinta} strokeWidth={6} strokeLinecap="butt" className="cf-a cf-dash" style={retardo(1.41)} />
      <path d="M31.83 11.21A15 15 0 0 1 35.49 14.36" pathLength={1} fill="none" stroke={tinta} strokeWidth={6} strokeLinecap="butt" className="cf-a cf-dash" style={retardo(1.57)} />
      <circle cx="12.18" cy="14.77" r="5" fill="none" stroke={tinta} strokeWidth={1.4} className="cf-a cf-ping" style={retardo(1.0)} />
      <g className="cf-a cf-rise" style={retardo(0.85)}>
        <path d={CABEZA + TUNICA} fill={fondo} stroke={fondo} strokeWidth={5} strokeLinejoin="round" />
        <path d={TUNICA} fill={tinta} stroke={tinta} strokeWidth={0.8} strokeLinejoin="round" />
        <path d={CABEZA} fill={tinta} stroke={fondo} strokeWidth={1.32} strokeLinejoin="round" paintOrder="stroke" />
      </g>
    </svg>
  );
}

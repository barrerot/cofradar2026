import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { guardar } from "../datos/almacen";
import { quitarArranque } from "../datos/arranque";
import { SimboloAnimado } from "../marco";

/**
 * P-02 Introducción (logotipo D, docs/design/intro_logos/cofradar-logotipo-d/
 * intro-animada/intro.html y pantallas/2-introduccion-*). F-02.
 *
 * Solo la primera vez que se abre Cofradar por la portada: App.tsx manda aquí
 * mientras no esté guardado `introduccion-vista`. Un enlace directo a una
 * cofradía no la impone. No pide nada: ni cuenta ni ubicación.
 *
 * La primera vez el arranque (P-01) solo se ve mientras llega el JavaScript:
 * al montar esta pantalla se quita, porque empieza con la misma animación.
 *
 * La animación (2,8 s, una sola vez) es la de la referencia, portada sin
 * rediseñar. Un toque en cualquier parte mientras dura la salta al estado
 * final; «Empezar» funciona en cuanto se ve. Con «reducir movimiento» se ve
 * directamente el final (estilos/logo-animado.css).
 */

/** Leyenda del logotipo. PENDIENTE DE DECIDIR: el texto se cambia aquí. */
const LEYENDA = { confirmado: "Confirmado", previsto: "Según horario", ahora: "Ahora" };

const IDEAS: { icono: ReactNode; titulo: string; texto: string }[] = [
  {
    icono: (
      <>
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="6" r="2" />
        <path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6" />
      </>
    ),
    titulo: "Por dónde va de verdad cada cofradía",
    texto: "La cruz de guía y cada paso, y cuánto puedes fiarte de cada dato.",
  },
  {
    icono: (
      <>
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    titulo: "Dar fe",
    texto: "Si la estás viendo, dilo con un toque: ayudas a todos.",
  },
  {
    icono: (
      <>
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.25" />
      </>
    ),
    titulo: "Tu ubicación es opcional",
    texto: "Sin ella, Cofradar funciona igual.",
  },
];

/** Lo que dura la animación entera: hasta aquí, un toque la salta. */
const DURACION_MS = 2850;

const retardo = (s: number): CSSProperties => ({ animationDelay: `calc(${s}s - var(--t, 0s))` });

export function Introduccion() {
  const navegar = useNavigate();
  const [animando, setAnimando] = useState(true);
  const [saltada, setSaltada] = useState(false);

  useEffect(() => {
    // La introducción empieza con la misma animación del logotipo: el arranque
    // se quita ya para que no se vea dos veces seguidas
    quitarArranque();
    const fin = window.setTimeout(() => setAnimando(false), DURACION_MS);
    return () => window.clearTimeout(fin);
  }, []);

  return (
    <main
      className="cf-introduccion"
      data-register="editorial"
      {...(saltada ? { "data-saltar": "" } : {})}
      onPointerDown={animando ? () => setSaltada(true) : undefined}
    >
      <div className="cf-introduccion-cuerpo">
        <div className="cf-introduccion-logo">
          <SimboloAnimado lado={176} />
          <div className="cf-introduccion-palabra">
            <h1 className="cf-palabra cf-a cf-up" style={retardo(1.1)}>
              Cofradar
            </h1>
          </div>
          <div className="cf-introduccion-leyenda cf-a cf-in" style={retardo(1.75)}>
            <span>
              <svg width="20" height="6" aria-hidden="true">
                <path d="M2 3H18" stroke="var(--cf-text)" strokeWidth="4" strokeLinecap="round" />
              </svg>
              {LEYENDA.confirmado}
            </span>
            <span>
              <svg width="22" height="6" aria-hidden="true">
                <path d="M0 3H22" stroke="var(--cf-text)" strokeWidth="4" strokeDasharray="6 4" />
              </svg>
              {LEYENDA.previsto}
            </span>
            <span>
              <svg width="12" height="18" viewBox="0 0 12 18" aria-hidden="true">
                <path d="M3.71 7.98L8.29 7.98L9.48 17.50L2.52 17.50Z" fill="var(--cf-text)" stroke="var(--cf-text)" strokeWidth="0.8" strokeLinejoin="round" />
                <path d="M6.00 0.50L6.99 5.09C7.70 6.28 8.72 7.64 8.97 9.00L6.00 10.70L3.03 9.00C3.28 7.64 4.30 6.28 5.01 5.09Z" fill="var(--cf-text)" stroke="var(--cf-bg)" strokeWidth="1.20" strokeLinejoin="round" paintOrder="stroke" />
              </svg>
              {LEYENDA.ahora}
            </span>
          </div>
        </div>

        <ul className="cf-introduccion-ideas">
          {IDEAS.map((idea, i) => (
            <li key={idea.titulo} className="cf-a cf-in" style={retardo(1.95 + i * 0.12)}>
              <span className="cf-introduccion-icono" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cf-text)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  {idea.icono}
                </svg>
              </span>
              <div>
                <h2>{idea.titulo}</h2>
                <p>{idea.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="cf-introduccion-pie cf-a cf-in" style={retardo(2.4)}>
        <button
          type="button"
          className="cf-introduccion-empezar"
          onClick={() => {
            guardar("introduccion-vista", true);
            navegar("/", { replace: true });
          }}
        >
          Empezar
        </button>
      </div>
    </main>
  );
}

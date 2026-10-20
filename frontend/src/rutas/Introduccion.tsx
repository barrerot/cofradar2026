import { useNavigate } from "react-router-dom";
import { guardar } from "../datos/almacen";
import { Boton, Icono } from "../marco";
import type { NombreTrazo } from "../marco";

/**
 * P-02 Introducción (8-acceso/acceso-2-introduccion, F-02).
 *
 * Solo la primera vez que se abre Cofradar por la portada: tras el arranque
 * (P-01), App.tsx manda aquí mientras no esté guardado `introduccion-vista`.
 * Un enlace directo a una cofradía no la impone.
 *
 * Una sola pantalla editorial con tres ideas y un único botón, «Empezar». Sin
 * «Saltar» (diseño aprobado en BUL-198): con una sola pantalla, «Empezar» ya
 * es saltar. No pide nada: ni cuenta ni ubicación.
 */
const IDEAS: { icono: NombreTrazo; titulo: string; texto: string }[] = [
  {
    icono: "enCalle",
    titulo: "Por dónde va de verdad cada cofradía",
    texto: "La cruz de guía y cada paso, y cuánto puedes fiarte de cada dato.",
  },
  { icono: "ojo", titulo: "Dar fe", texto: "Si la estás viendo, dilo con un toque: ayudas a todos." },
  { icono: "ubicacion", titulo: "Tu ubicación es opcional", texto: "Sin ella, Cofradar funciona igual." },
];

export function Introduccion() {
  const navegar = useNavigate();

  return (
    <main className="cf-introduccion" data-register="editorial">
      <h1 className="cf-introduccion-marca">Cofradar</h1>
      <ul className="cf-introduccion-ideas">
        {IDEAS.map((idea) => (
          <li key={idea.titulo}>
            <span className="cf-introduccion-icono">
              <Icono nombre={idea.icono} tamano={20} />
            </span>
            <div>
              <h2>{idea.titulo}</h2>
              <p>{idea.texto}</p>
            </div>
          </li>
        ))}
      </ul>
      <Boton
        variante="primario"
        tamano="52"
        onClick={() => {
          guardar("introduccion-vista", true);
          navegar("/", { replace: true });
        }}
      >
        Empezar
      </Boton>
    </main>
  );
}

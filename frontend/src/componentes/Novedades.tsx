import { MarcaRelacion, type Relacion, type Verificacion } from "./MarcaRelacion";

/**
 * «Mientras no estabas»: `.cf-info` con `.cf-ahora-novedades`.
 *
 * Elemento TRANSITORIO. Va tras los bloques y desaparece cuando no hay
 * novedades: no se queda como seccion vacia ni dice «nada nuevo».
 *
 * Que las novedades ocurrieran «mientras no estabas» es el encuadre de la
 * pantalla; los hechos salen del dato, no de aqui.
 */

/**
 * La linea de una novedad va en trozos, no en una cadena, porque dentro de
 * una frase corriente hay tres tipografias distintas: el nombre de la
 * cofradia en serif, las cifras en tabulares y los puntos en color de marca.
 * Partirlo asi deja el fixture (y luego el backend) libre de JSX.
 */
export type ParteNovedad =
  | { tipo: "texto"; valor: string }
  | { tipo: "nombre"; valor: string }
  | { tipo: "cifra"; valor: string }
  | { tipo: "puntos"; valor: string };

export type Novedad = {
  id: string;
  partes: readonly ParteNovedad[];
  /** Marca de relacion que la encabeza, si la novedad viene de una relacion. */
  relacion?: Relacion;
  verificacion?: Verificacion;
};

function Parte({ parte }: { parte: ParteNovedad }) {
  switch (parte.tipo) {
    case "nombre":
      return <span className="nm">{parte.valor}</span>;
    case "cifra":
      return <span className="cf-num">{parte.valor}</span>;
    case "puntos":
      return <span className="pts">{parte.valor}</span>;
    case "texto":
      return <>{parte.valor}</>;
  }
}

export function Novedades({ novedades }: { novedades: readonly Novedad[] }) {
  if (novedades.length === 0) return null;

  return (
    <div className="cf-info cf-ahora-novedades" aria-label="Mientras no estabas">
      <span className="ey">Mientras no estabas</span>
      <ul>
        {novedades.map((n) => (
          <li key={n.id}>
            {/* El hueco del icono se pinta siempre: es la primera columna de
                la rejilla y sin el la linea se desalinea del resto. */}
            <span className="ico" data-acento={n.relacion ? undefined : "no"}>
              {n.relacion ? (
                <MarcaRelacion relacion={n.relacion} verificacion={n.verificacion} />
              ) : null}
            </span>
            <span>
              {n.partes.map((p, i) => (
                <Parte key={`${n.id}-${i}`} parte={p} />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

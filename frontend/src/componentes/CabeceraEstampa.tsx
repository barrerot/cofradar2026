import { useId, useState } from "react";
import { TINTAS, TUNICAS, type Color } from "../datos/tunicas";
import { LOGOTIPO } from "../marco/logotipo";

/**
 * La cabecera de la ficha con su estampa (repaso visual de Claude Design, aprobado el 13/11/2026, B): la
 * estampa a lo ancho, con la banda y el filete de la túnica, la jornada, el titular a grabado en su arco, el
 * escudo en su medallón, el nombre y el titular. Siempre en papel, también con la app en oscuro.
 *
 * Sin grabado, el escudo grande dentro del arco; sin ninguno de los dos, el arco en papel.
 */
const TINTA = "#1D1A16";
const PAPEL = "#FDF9F1";

const blanco = (c: Color | undefined) => c === "blanco" || c === "marfil";

/** Banda (6 px), aire (4) y filete (2), de fuera a dentro: [color, grosor]. */
function capas(cofradia: string): [string, number][] {
  const [banda, filete] = TUNICAS[cofradia] ?? [];
  const r: [string, number][] = [];
  if (!banda) r.push([TINTA, 1.5]);
  else if (blanco(banda)) r.push([TINTA, 1.5], [banda === "marfil" ? TINTAS.marfil : PAPEL, 3], [TINTA, 1.5]);
  else r.push([TINTAS[banda], 6]);
  r.push([PAPEL, 4]);
  if (filete === "blanco") r.push([TINTA, 1], [PAPEL, 1], [TINTA, 1]);
  else if (filete) r.push([TINTAS[filete], 2]);
  else r.push([!banda || blanco(banda) ? TINTA : TINTAS[banda], 1]);
  return r;
}

export function CabeceraEstampa({
  cofradia,
  nombre,
  titular,
  jornada,
  escudo,
}: {
  cofradia: string;
  nombre: string;
  titular?: string | null;
  jornada?: string | null;
  escudo?: string | null;
}) {
  const id = `cf-cab${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [fallo, setFallo] = useState({ grabado: false, escudo: false });
  const conEscudo = !!escudo && !fallo.escudo;
  const conGrabado = !fallo.grabado;
  const simbolo = LOGOTIPO.simboloPequeno;

  const interior = (
    <div className="cf-cabecera-estampa-papel">
      {jornada ? <span className="cf-cabecera-estampa-jornada">{jornada}</span> : null}
      <span className="cf-cabecera-estampa-arco">
        <span className="cf-cabecera-estampa-ventana">
          {conGrabado ? (
            <img
              src={`/api/grabados/${cofradia}.svg`}
              alt={titular ? `Grabado de ${titular}` : ""}
              decoding="async"
              onError={() => setFallo((f) => ({ ...f, grabado: true }))}
            />
          ) : conEscudo ? (
            <img className="escudo" src={escudo!} alt="" onError={() => setFallo((f) => ({ ...f, escudo: true }))} />
          ) : null}
        </span>
        {conGrabado && conEscudo ? (
          <span className="cf-cabecera-estampa-medallon" aria-hidden="true">
            <img src={escudo!} alt="" onError={() => setFallo((f) => ({ ...f, escudo: true }))} />
          </span>
        ) : null}
      </span>
      <h1 className="cf-cabecera-estampa-nombre" data-medallon={conGrabado && conEscudo ? "" : undefined}>
        {nombre}
      </h1>
      {titular ? <p className="cf-cabecera-estampa-titular">{titular}</p> : null}
      <svg
        className="cf-cabecera-estampa-logo"
        width={16}
        height={16}
        viewBox={simbolo.viewBox}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: simbolo.cuerpo.replaceAll("__ID__", id) }}
      />
    </div>
  );

  return (
    <div className="cf-cabecera-estampa">
      {capas(cofradia).reduceRight(
        (dentro, [color, grosor], i) => (
          <div key={i} style={{ padding: grosor, background: color }}>
            {dentro}
          </div>
        ),
        interior,
      )}
    </div>
  );
}

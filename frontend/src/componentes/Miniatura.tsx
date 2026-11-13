import { useState, type ReactElement } from "react";
import { TINTAS, TUNICAS, type Color } from "../datos/tunicas";

/**
 * La miniatura de hermandad (repaso visual de Claude Design, aprobado el 13/11/2026, «Cofradar · Repaso
 * visual», A1): la ventana con arco de la estampa, en pequeño, con el titular a grabado tal cual dentro.
 *
 *   De fuera a dentro  marco en cera · papel · banda (color de la túnica) · papel · filete · ventana.
 *   Blanco             no se pinta: papel entre dos hilos de tinta. En el filete, a 40 y 56, un hilo de tinta.
 *   Un solo color      el filete es un hilo fino del mismo color (en tinta si la banda es blanca).
 *   40 px              la banda baja a 2 px y el papel entre banda y filete desaparece.
 *   216 px             la ventana grande de la portada: la de 72 al 300 %.
 *   Sin grabado        el escudo en la ventana; sin escudo, la ventana en papel.
 *
 * Siempre sobre papel, también en oscuro: es una pequeña estampa. Los colores de la túnica solo viven
 * aquí, nunca en texto ni en fondos. Acompaña al nombre; nunca sustituye a un chip de estado ni a la hora.
 */
export type TamanoMiniatura = 40 | 56 | 72 | 216;

const TINTA = "#1D1A16";
const PAPEL = "#FDF9F1";
const CERA_2 = "#C9B896";

const MEDIDAS: Record<TamanoMiniatura, { ancho: number; alto: number; banda: number; aire: boolean; k?: number }> = {
  /** La ventana grande de la portada fuera de temporada: la de 72 al 300 % */
  216: { ancho: 192, alto: 216, banda: 3, aire: true, k: 3 },
  72: { ancho: 64, alto: 72, banda: 3, aire: true },
  56: { ancho: 50, alto: 56, banda: 3, aire: true },
  40: { ancho: 36, alto: 40, banda: 2, aire: false },
};

const blanco = (c: Color | undefined) => c === "blanco" || c === "marfil";

/** Las capas del marco, de fuera a dentro: [color, grosor en px]. */
function capas(cofradia: string, tamano: TamanoMiniatura): [string, number][] {
  const { banda: g, aire, k = 1 } = MEDIDAS[tamano];
  const [banda, filete] = TUNICAS[cofradia] ?? [];
  const r: [string, number][] = [[CERA_2, 1], [PAPEL, 1]];
  if (!banda) r.push([TINTA, 1]);
  else if (blanco(banda)) r.push([TINTA, 1], [banda === "marfil" ? TINTAS.marfil : PAPEL, 1], [TINTA, 1]);
  else r.push([TINTAS[banda], g]);
  // A 40 el aire desaparece, salvo tras una banda blanca: sin él, sus hilos se juntarían con el filete
  if (aire || blanco(banda)) r.push([PAPEL, 1]);
  if (filete === "blanco" && tamano >= 72) r.push([TINTA, 1], [PAPEL, 1], [TINTA, 1]);
  else if (filete && filete !== "blanco") r.push([TINTAS[filete], 1]);
  else if (filete === "blanco" || !banda || blanco(banda)) r.push([TINTA, 1]);
  else r.push([TINTAS[banda], 1]);
  return r.map(([c, n]) => [c, n * k]);
}

export function Miniatura({
  cofradia,
  escudo,
  tamano = 56,
  nombre,
}: {
  /** El id de la hermandad: «la-macarena». */
  cofradia: string;
  escudo?: string | null;
  tamano?: TamanoMiniatura;
  /** Con nombre, la miniatura se anuncia («Grabado de La Macarena»); sin él, es decoración. */
  nombre?: string;
}) {
  const [fallo, setFallo] = useState({ grabado: false, escudo: false });
  const { ancho, alto } = MEDIDAS[tamano];
  const imagen = !fallo.grabado ? (
    <img
      src={`/api/grabados/${cofradia}.svg`}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFallo((f) => ({ ...f, grabado: true }))}
    />
  ) : escudo && !fallo.escudo ? (
    <img
      className="cf-miniatura-escudo"
      src={escudo}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFallo((f) => ({ ...f, escudo: true }))}
    />
  ) : null;

  const contenido = capas(cofradia, tamano).reduceRight<ReactElement>(
    (dentro, [color, grosor], i) => (
      <span className="cf-miniatura-capa" style={{ padding: grosor, background: color }} data-borde={i === 0 ? "" : undefined}>
        {dentro}
      </span>
    ),
    <span className="cf-miniatura-ventana">{imagen}</span>,
  );

  return (
    <span
      className="cf-miniatura"
      style={{ width: ancho, height: alto }}
      {...(nombre ? { role: "img", "aria-label": `Grabado de ${nombre}` } : { "aria-hidden": true })}
    >
      {contenido}
    </span>
  );
}

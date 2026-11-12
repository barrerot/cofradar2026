import { useId } from "react";
import type { Estampa as DatosEstampa } from "../datos/album";
import { TINTAS, TUNICAS, type Color } from "../datos/tunicas";
import { LOGOTIPO } from "../marco/logotipo";
import { TRAZOS } from "../marco/trazos";

/**
 * La estampa del álbum (F-56), con el sistema de Claude Design aprobado el 12/11/2026
 * («Cofradar · Las estampas», docs/design/prompts/29-estampas-ilustradas.txt). Un SVG de 200 × 300 u
 * que se escala entero: igual a 110 px en el álbum que a 300 en la hoja.
 *
 *   Siempre    papel, marco en cera, la jornada, la ventana con arco, el nombre y el símbolo de Cofradar.
 *   En blanco  el escudo grande en gris muy suave dentro del arco. Es una estampa entera, no un hueco.
 *   La conoces entra el titular a grabado (docs/design/estampas/grabado.py) y el escudo baja a su
 *              medallión. Sin grabado todavía, el escudo se queda grande, ya en color, y el arco en tinta.
 *   La has visto el marco toma los colores de la túnica (datos/tunicas.ts).
 *   Has dado fe el sello granate en la esquina, el icono de dar fe.
 * Siempre en claro, también con la app en oscuro, como la tarjeta del año. Sin candados ni contadores (R5).
 */

const TINTA = "#1D1A16";
const TINTA_2 = "#4A443C";
const PAPEL = "#FDF9F1";
const PAPEL_2 = "#F7F1E6";
const CERA = "#DFD3BE";
const CERA_2 = "#C9B896";
const GRANATE = "#6E1C2F";
const VENTANA = "M22 206V114A78 78 0 0 1 178 114V206Z";

/** El nombre en una línea o en dos, partido por donde queden más parejas; si aún no cabe, más pequeño. */
function lineas(nombre: string): { texto: string[]; tamano: number } {
  if (nombre.length <= 15) return { texto: [nombre], tamano: 18 };
  const p = nombre.split(" ");
  let mejor = [nombre];
  for (let i = 1; i < p.length; i++) {
    const dos = [p.slice(0, i).join(" "), p.slice(i).join(" ")];
    if (mejor.length === 1 || Math.max(...dos.map((l) => l.length)) < Math.max(...mejor.map((l) => l.length))) mejor = dos;
  }
  const largo = Math.max(...mejor.map((l) => l.length));
  return { texto: mejor, tamano: Math.min(18, Math.round((18 * 14.5 * 10) / largo) / 10) };
}

function Banda({ color }: { color: Color | undefined }) {
  const r = { x: 8, y: 8, width: 184, height: 284, fill: "none" };
  if (!color) return <rect {...r} stroke={CERA_2} strokeWidth={4} />;
  // El blanco (y el marfil, que casi no se ve sobre el papel) va entre dos hilos de tinta
  if (color === "blanco" || color === "marfil")
    return (
      <>
        <rect {...r} stroke={TINTA} strokeWidth={5.6} />
        <rect {...r} stroke={TINTAS[color]} strokeWidth={4} />
      </>
    );
  return <rect {...r} stroke={TINTAS[color]} strokeWidth={4} />;
}

function Filete({ banda, filete }: { banda: Color | undefined; filete: Color | undefined }) {
  const r = { x: 13.5, y: 13.5, width: 173, height: 273, fill: "none" };
  if (filete === "blanco")
    return (
      <>
        <rect {...r} stroke={TINTA} strokeWidth={2.8} />
        <rect {...r} stroke={PAPEL} strokeWidth={1.2} />
      </>
    );
  if (filete) return <rect {...r} stroke={TINTAS[filete]} strokeWidth={1.2} />;
  // Un solo color: hilo fino del de la banda (en tinta si la banda es blanca o no hay datos)
  return <rect {...r} stroke={banda && banda !== "blanco" && banda !== "marfil" ? TINTAS[banda] : TINTA} strokeWidth={0.6} />;
}

export function Estampa({ e, jornada, tamano = "normal" }: { e: DatosEstampa; jornada: string; tamano?: "normal" | "grande" }) {
  const id = `cf-estampa${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const vista = e.vista.length > 0;
  const fe = e.fe.length > 0;
  const alguno = e.conoces || vista || fe;
  const dibujo = e.conoces && e.grabado;
  const [banda, filete] = TUNICAS[e.cofradia] ?? [];
  const nombre = lineas(e.nombre);
  const simbolo = LOGOTIPO.simboloPequeno;

  return (
    <svg className="cf-estampa-svg" data-tamano={tamano} viewBox="0 0 200 300" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${id}-v`}>
          <path d={VENTANA} />
        </clipPath>
        <filter id={`${id}-g`}>
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect x={0.5} y={0.5} width={199} height={299} rx={3} fill={PAPEL} stroke={CERA_2} />
      {vista ? (
        <>
          <Banda color={banda} />
          <Filete banda={banda} filete={filete} />
        </>
      ) : (
        <>
          <rect x={8} y={8} width={184} height={284} fill="none" stroke={CERA} strokeWidth={4} />
          <rect x={13.5} y={13.5} width={173} height={273} fill="none" stroke={alguno ? CERA_2 : CERA} strokeWidth={0.8} />
        </>
      )}
      <text
        x={100}
        y={29}
        textAnchor="middle"
        fontSize={8.5}
        fontWeight={600}
        letterSpacing={1.4}
        fill={alguno ? TINTA : TINTA_2}
        style={{ fontFamily: "var(--cf-font-sans, Inter, system-ui, sans-serif)" }}
      >
        {jornada.toLocaleUpperCase("es")}
      </text>

      {e.conoces ? (
        <>
          <path d={VENTANA} fill={PAPEL} />
          {dibujo ? (
            <image href={e.grabado!} x={22} y={36} width={156} height={170} clipPath={`url(#${id}-v)`} preserveAspectRatio="xMidYMid slice" />
          ) : e.escudo ? (
            <image href={e.escudo} x={58} y={92} width={84} height={84} preserveAspectRatio="xMidYMid meet" style={{ mixBlendMode: "multiply" }} />
          ) : null}
          <path d={VENTANA} fill="none" stroke={TINTA} strokeWidth={1.2} />
          {dibujo ? (
            <>
              <circle cx={100} cy={206} r={22} fill={PAPEL} stroke={TINTA} strokeWidth={1} />
              <circle cx={100} cy={206} r={19.2} fill="none" stroke={CERA_2} strokeWidth={0.6} />
              {e.escudo ? <image href={e.escudo} x={83} y={189} width={34} height={34} preserveAspectRatio="xMidYMid meet" style={{ mixBlendMode: "multiply" }} /> : null}
            </>
          ) : null}
        </>
      ) : (
        <>
          <path d={VENTANA} fill={PAPEL_2} stroke={alguno ? CERA_2 : CERA} strokeWidth={0.9} />
          {e.escudo ? (
            <image
              href={e.escudo}
              x={58}
              y={92}
              width={84}
              height={84}
              preserveAspectRatio="xMidYMid meet"
              style={{ mixBlendMode: "multiply" }}
              {...(alguno ? {} : { filter: `url(#${id}-g)`, opacity: 0.32 })}
            />
          ) : null}
        </>
      )}

      <text
        x={100}
        y={nombre.texto.length === 1 ? 250 : 241}
        textAnchor="middle"
        fontSize={nombre.tamano}
        fontWeight={600}
        fill={TINTA}
        style={{ fontFamily: "var(--cf-font-serif, Newsreader, Georgia, serif)" }}
      >
        {nombre.texto.map((l, i) => (
          <tspan key={i} x={100} dy={i ? 19 : 0}>
            {l}
          </tspan>
        ))}
      </text>
      <svg
        x={93}
        y={270}
        width={14}
        height={14}
        viewBox={simbolo.viewBox}
        color={TINTA}
        dangerouslySetInnerHTML={{ __html: simbolo.cuerpo.replaceAll("__ID__", `${id}-l`) }}
      />
      {fe ? (
        <g transform="translate(160 256) scale(0.135)">
          <circle cx={128} cy={128} r={138} fill={PAPEL} />
          <path d={TRAZOS.darFeVerificada} fill={GRANATE} />
        </g>
      ) : null}
    </svg>
  );
}

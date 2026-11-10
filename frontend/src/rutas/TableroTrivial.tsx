import { Icono, TRAZOS, type NombreTrazo } from "../marco";
import { ALTO, ANCHO, CASILLAS, CATEGORIAS, ESTRELLAS, ORDEN, PORID, SALIDA, type CasillaDibujo } from "../datos/tableroTrivial";
import type { Categoria } from "../datos/trivialOnline";

/**
 * El tablero cofrade (11-trivial-online/06, 07): el anillo con sus seis estrellas, las tres calles y la
 * Salida en el centro, las dos fichas y, al elegir destino, los destinos numerados. Es un dibujo: lo que
 * se puede pulsar va siempre también en texto debajo (los botones de destino), nunca solo aquí.
 */
type Ficha = { casilla: string; letras: string; tuya: boolean };

const LADO = 28;

function IconoSvg({ nombre, x, y, tam, clase }: { nombre: NombreTrazo; x: number; y: number; tam: number; clase?: string }) {
  return <path className={clase} d={TRAZOS[nombre]} transform={`translate(${x - tam / 2} ${y - tam / 2}) scale(${tam / 256})`} />;
}

/** Dónde va el rótulo de cada estrella, por dentro del anillo. */
const ROTULOS: Record<string, { x: number; y: number; ancla: "start" | "end" | "middle"; lineas: string[]; cat: string[] }> = {
  A0: { x: 192, y: 60, ancla: "start", lineas: ["La Campana"], cat: ["Historia"] },
  A6: { x: 62, y: 98, ancla: "start", lineas: ["Sierpes"], cat: ["Imágenes"] },
  A12: { x: 56, y: 332, ancla: "start", lineas: ["Plaza de", "San Francisco"], cat: ["Patrimonio y", "símbolos"] },
  A18: { x: 179, y: 444, ancla: "middle", lineas: ["Avenida de la Constitución"], cat: ["Jornadas y sedes"] },
  A24: { x: 302, y: 332, ancla: "end", lineas: ["Puerta de", "los Palos"], cat: ["Música y", "literatura"] },
  A30: { x: 302, y: 98, ancla: "end", lineas: ["Puerta de", "San Miguel"], cat: ["Tradiciones y", "curiosidades"] },
};

function Casilla({ c, destino }: { c: CasillaDibujo; destino?: number }) {
  if (c.id === "S") {
    return (
      <g>
        <circle cx={c.x} cy={c.y} r={30} className="cf-tablero-salida" />
        <text x={c.x} y={c.y + 22} textAnchor="middle" className="cf-tablero-salida-texto">
          Salida
        </text>
        {destino ? <Numero x={c.x + 26} y={c.y - 26} n={destino} /> : null}
      </g>
    );
  }
  const cat = c.categoria!;
  const meta = CATEGORIAS[cat];
  if (c.estrella) {
    return (
      <g>
        <circle cx={c.x} cy={c.y} r={19} className="cf-tablero-estrella" data-cat={cat} data-destino={destino ? "" : undefined} />
        <IconoSvg nombre={meta.icono} x={c.x} y={c.y} tam={20} clase={meta.clara ? "cf-tablero-icono-tinta" : "cf-tablero-icono-claro"} />
        <circle cx={c.x + 14} cy={c.y - 14} r={8} className="cf-tablero-insignia" />
        <IconoSvg nombre="estrella" x={c.x + 14} y={c.y - 14} tam={10} clase="cf-tablero-icono-tinta" />
        {destino ? <Numero x={c.x - 16} y={c.y + 16} n={destino} /> : null}
      </g>
    );
  }
  return (
    <g>
      <rect x={c.x - LADO / 2} y={c.y - LADO / 2} width={LADO} height={LADO} rx={6} className="cf-tablero-casilla" data-cat={cat} data-destino={destino ? "" : undefined} />
      <IconoSvg nombre={meta.icono} x={c.x} y={c.y} tam={16} clase={meta.clara ? "cf-tablero-icono-tinta" : "cf-tablero-icono-claro"} />
      {destino ? <Numero x={c.x + 14} y={c.y - 14} n={destino} /> : null}
    </g>
  );
}

function Numero({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={9} className="cf-tablero-numero" />
      <text x={x} y={y + 4} textAnchor="middle" className="cf-tablero-numero-texto">
        {n}
      </text>
    </g>
  );
}

function FichaSvg({ f, x, y, r = 15 }: { f: Ficha; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} className="cf-tablero-ficha" data-tuya={f.tuya ? "" : undefined} />
      <text x={x} y={y + 4} textAnchor="middle" className="cf-tablero-ficha-texto">
        {f.letras}
      </text>
    </g>
  );
}

export function TableroTrivial({ fichas, destinos = [], etiqueta }: { fichas: Ficha[]; destinos?: string[]; etiqueta: string }) {
  const calles = [0, 12, 24].map((i) => PORID.get(`A${i}`)!);
  const juntas = fichas.length === 2 && fichas[0]!.casilla === fichas[1]!.casilla;
  return (
    <div className="cf-tablero">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO + 36}`} role="img" aria-label={etiqueta}>
        <rect x={IZQ0} y={ARR0} width={ANCHO - 2 * IZQ0} height={ALTO - 2 * ARR0 - 1} rx={18} className="cf-tablero-calle" />
        <rect x={IZQ0 + 34} y={ARR0 + 34} width={ANCHO - 2 * IZQ0 - 68} height={ALTO - 2 * ARR0 - 69} rx={6} className="cf-tablero-plaza" />
        {calles.map((a) => (
          <line key={a.id} x1={a.x} y1={a.y} x2={SALIDA.x} y2={SALIDA.y} className="cf-tablero-calle-linea" />
        ))}
        {ESTRELLAS.map((e) => {
          const r = ROTULOS[e.id]!;
          return (
            <text key={`r${e.id}`} x={r.x} y={r.y} textAnchor={r.ancla} className="cf-tablero-rotulo">
              {r.lineas.map((l, i) => (
                <tspan key={l} x={r.x} dy={i === 0 ? 0 : 15}>
                  {l}
                </tspan>
              ))}
              {r.cat.map((l) => (
                <tspan key={l} x={r.x} dy={15} className="cf-tablero-rotulo-cat">
                  {l}
                </tspan>
              ))}
            </text>
          );
        })}
        {CASILLAS.map((c) => (
          <Casilla key={c.id} c={c} destino={destinos.includes(c.id) ? destinos.indexOf(c.id) + 1 : undefined} />
        ))}
        {fichas.map((f, i) => {
          const c = PORID.get(f.casilla);
          if (!c) return null;
          // En la Salida van encima del rótulo; juntas, una al lado de la otra
          const enSalida = c.id === "S";
          const dx = juntas ? (i === 0 ? -1 : 1) * (enSalida ? 12 : 9) : 0;
          return <FichaSvg key={i} f={f} x={c.x + dx} y={c.y + (enSalida ? -9 : 0)} r={enSalida && juntas ? 12 : 15} />;
        })}
      </svg>
    </div>
  );
}

const IZQ0 = 6;
const ARR0 = 6;

/** Los seis huecos de estrella de un jugador (06, marcador). */
export function Estrellas({ tiene }: { tiene: Categoria[] }) {
  return (
    <ul className="cf-estrellas" aria-label={`${tiene.length} de 6 estrellas`}>
      {ORDEN.map((c) => {
        const si = tiene.includes(c);
        return (
          <li key={c} className="cf-estrellas-hueco" data-cat={c} data-tiene={si ? "" : undefined} title={CATEGORIAS[c].nombre}>
            <Icono nombre={CATEGORIAS[c].icono} tamano={20} />
            <span className="cf-oculto-visual">
              {CATEGORIAS[c].nombre}: {si ? "conseguida" : "falta"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

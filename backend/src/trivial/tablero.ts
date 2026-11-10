/**
 * El tablero cofrade del trivial online (F-51; diseño 11-trivial-online/, aprobado el 10/11/2026).
 *
 * 43 casillas:
 * - Un anillo de 36 (A0…A35) con una estrella cada 6: La Campana (A0), Sierpes (A6), Plaza de San
 *   Francisco (A12), Avenida de la Constitución (A18), Puerta de los Palos (A24) y Puerta de San Miguel (A30).
 *   Tras cada estrella vienen las otras cinco categorías, por orden.
 * - La Salida (S) en el centro, con tres calles de dos casillas hacia La Campana, Plaza de San Francisco y
 *   Puerta de los Palos: C0-1 junto a la Salida y C0-2 junto a La Campana, y así con C12 y C24.
 *
 * Desde cualquier casilla y con cualquier tirada hay al menos dos destinos (tablero.test.ts).
 */
export const TABLERO = "cofrade-1";

export const CATEGORIAS = [
  { id: "historia", nombre: "Historia" },
  { id: "imagenes", nombre: "Imágenes" },
  { id: "patrimonio_simbolos", nombre: "Patrimonio y símbolos" },
  { id: "jornadas_sedes", nombre: "Jornadas y sedes" },
  { id: "musica_literatura", nombre: "Música y literatura" },
  { id: "tradiciones_curiosidades", nombre: "Tradiciones y curiosidades" },
] as const;
export type Categoria = (typeof CATEGORIAS)[number]["id"];

export type Casilla = {
  id: string;
  /** null en la Salida: cuando se cae en ella durante la partida, la categoría se sortea */
  categoria: Categoria | null;
  /** El lugar, solo en las estrellas */
  lugar?: string;
  estrella: boolean;
};

const LUGARES = [
  "La Campana",
  "Sierpes",
  "Plaza de San Francisco",
  "Avenida de la Constitución",
  "Puerta de los Palos",
  "Puerta de San Miguel",
];

const cat = (i: number): Categoria => CATEGORIAS[((i % 6) + 6) % 6]!.id;

function construir() {
  const casillas = new Map<string, Casilla>();
  const vecinos = new Map<string, string[]>();
  const unir = (a: string, b: string) => {
    vecinos.set(a, [...(vecinos.get(a) ?? []), b]);
    vecinos.set(b, [...(vecinos.get(b) ?? []), a]);
  };
  for (let i = 0; i < 36; i++) {
    const k = Math.floor(i / 6);
    const j = i % 6;
    casillas.set(`A${i}`, j === 0 ? { id: `A${i}`, categoria: cat(k), lugar: LUGARES[k], estrella: true } : { id: `A${i}`, categoria: cat(k + j), estrella: false });
    unir(`A${i}`, `A${(i + 1) % 36}`);
  }
  casillas.set("S", { id: "S", categoria: null, estrella: false });
  // Calles: de la estrella hacia la Salida, la categoría de enfrente (k+3) y la siguiente (k+4)
  for (const k of [0, 2, 4]) {
    casillas.set(`C${6 * k}-2`, { id: `C${6 * k}-2`, categoria: cat(k + 3), estrella: false });
    casillas.set(`C${6 * k}-1`, { id: `C${6 * k}-1`, categoria: cat(k + 4), estrella: false });
    unir("S", `C${6 * k}-1`);
    unir(`C${6 * k}-1`, `C${6 * k}-2`);
    unir(`C${6 * k}-2`, `A${6 * k}`);
  }
  return { casillas, vecinos };
}

export const { casillas: CASILLAS, vecinos: VECINOS } = construir();
export const SALIDA = "S";

/** Las casillas a las que se llega con exactamente `pasos`, sin pisar dos veces la misma en el recorrido. */
export function destinos(desde: string, pasos: number): string[] {
  const res = new Set<string>();
  const ir = (c: string, pisadas: Set<string>, quedan: number) => {
    if (quedan === 0) {
      res.add(c);
      return;
    }
    for (const v of VECINOS.get(c) ?? []) {
      if (pisadas.has(v)) continue;
      pisadas.add(v);
      ir(v, pisadas, quedan - 1);
      pisadas.delete(v);
    }
  };
  ir(desde, new Set([desde]), pasos);
  return [...res].sort(ordenCasillas);
}

/** Orden estable para enseñar los destinos: anillo, calles, salida. */
function ordenCasillas(a: string, b: string): number {
  const clave = (c: string) => (c[0] === "A" ? Number(c.slice(1)) : c[0] === "C" ? 100 + Number(c.slice(1).replace("-", ".")) : 200);
  return clave(a) - clave(b);
}

/** Cómo se dice una casilla en texto: «Sierpes · estrella de Imágenes», «Jornadas y sedes, entre Puerta de San Miguel y La Campana». */
export function describir(id: string): string {
  const c = CASILLAS.get(id);
  if (!c) return id;
  const nombre = (cat: Categoria | null) => CATEGORIAS.find((x) => x.id === cat)?.nombre ?? "";
  if (id === SALIDA) return "Salida";
  if (c.estrella) return `${c.lugar} · estrella de ${nombre(c.categoria)}`;
  if (id[0] === "A") {
    const i = Number(id.slice(1));
    const k = Math.floor(i / 6);
    return `${nombre(c.categoria)}, entre ${LUGARES[k]} y ${LUGARES[(k + 1) % 6]}`;
  }
  const k = Number(id.slice(1).split("-")[0]) / 6;
  return `${nombre(c.categoria)}, en la calle de ${LUGARES[k]} a la Salida`;
}

import type { NombreTrazo } from "../marco";
import type { Categoria } from "./trivialOnline";

/**
 * El tablero cofrade para pintarlo (11-trivial-online/06 y 07). Las casillas, sus categorías y sus
 * uniones son las de backend/src/trivial/tablero.ts, que es quien manda en el juego; si allí cambia
 * el tablero, aquí hay que cambiar el dibujo (y TABLERO, la versión).
 *
 * Coordenadas en un lienzo de 358 × 430, como el del diseño: un anillo rectangular de 36 casillas
 * (9 arriba, 9 a cada lado y 9 abajo) con La Campana arriba en el centro, y la Salida en medio.
 */
export const TABLERO = "cofrade-1";

export const CATEGORIAS: Record<Categoria, { nombre: string; icono: NombreTrazo; clara?: boolean }> = {
  historia: { nombre: "Historia", icono: "catHistoria" },
  imagenes: { nombre: "Imágenes", icono: "catImagenes" },
  patrimonio_simbolos: { nombre: "Patrimonio y símbolos", icono: "catPatrimonio" },
  jornadas_sedes: { nombre: "Jornadas y sedes", icono: "catJornadas" },
  musica_literatura: { nombre: "Música y literatura", icono: "catMusica", clara: true },
  tradiciones_curiosidades: { nombre: "Tradiciones y curiosidades", icono: "catTradiciones", clara: true },
};
export const ORDEN: Categoria[] = ["historia", "imagenes", "patrimonio_simbolos", "jornadas_sedes", "musica_literatura", "tradiciones_curiosidades"];

/** La categoría jugable de cada tema del banco: la misma tabla que backend/src/trivial/banco.ts (TEMAS). */
const DE_TEMA: Record<string, Categoria> = {
  historia: "historia",
  imágenes: "imagenes",
  patrimonio: "patrimonio_simbolos",
  símbolos: "patrimonio_simbolos",
  jornada: "jornadas_sedes",
  sede: "jornadas_sedes",
  música: "musica_literatura",
  literatura: "musica_literatura",
  hábito: "tradiciones_curiosidades",
  curiosidades: "tradiciones_curiosidades",
  cultos: "tradiciones_curiosidades",
};
export const categoriaDeTema = (tema: string): Categoria | null => DE_TEMA[tema] ?? null;

const LUGARES = ["La Campana", "Sierpes", "Plaza de San Francisco", "Avenida de la Constitución", "Puerta de los Palos", "Puerta de San Miguel"];

export type CasillaDibujo = { id: string; x: number; y: number; categoria: Categoria | null; estrella: boolean; lugar?: string };

export const ANCHO = 358;
export const ALTO = 430;
const IZQ = 24;
const DER = 334;
const ARR = 24;
const ABA = 405;
const PASO_X = (DER - IZQ) / 8;
const PASO_Y = (ABA - ARR) / 10;
export const SALIDA = { x: 179, y: 214 };

const cat = (i: number) => ORDEN[((i % 6) + 6) % 6]!;

/** Dónde va cada casilla del anillo: arriba de A4 a A32 pasando por A0; la izquierda baja de A5 a A13… */
function lugarEnAnillo(i: number): { x: number; y: number } {
  // Arriba, de izquierda a derecha: A4 A3 A2 A1 A0 A35 A34 A33 A32
  const arriba = [4, 3, 2, 1, 0, 35, 34, 33, 32];
  if (arriba.includes(i)) return { x: IZQ + arriba.indexOf(i) * PASO_X, y: ARR };
  if (i >= 5 && i <= 13) return { x: IZQ, y: ARR + (i - 4) * PASO_Y };
  if (i >= 14 && i <= 22) return { x: IZQ + (i - 14) * PASO_X, y: ABA };
  // Derecha, de abajo arriba: A23 … A31
  return { x: DER, y: ABA - (i - 22) * PASO_Y };
}

function construir(): CasillaDibujo[] {
  const lista: CasillaDibujo[] = [];
  for (let i = 0; i < 36; i++) {
    const k = Math.floor(i / 6);
    const { x, y } = lugarEnAnillo(i);
    lista.push(i % 6 === 0 ? { id: `A${i}`, x, y, categoria: cat(k), estrella: true, lugar: LUGARES[k] } : { id: `A${i}`, x, y, categoria: cat(k + (i % 6)), estrella: false });
  }
  lista.push({ id: "S", ...SALIDA, categoria: null, estrella: false });
  for (const k of [0, 2, 4]) {
    const a = lugarEnAnillo(6 * k);
    const en = (t: number) => ({ x: a.x + (SALIDA.x - a.x) * t, y: a.y + (SALIDA.y - a.y) * t });
    lista.push({ id: `C${6 * k}-2`, ...en(0.37), categoria: cat(k + 3), estrella: false });
    lista.push({ id: `C${6 * k}-1`, ...en(0.63), categoria: cat(k + 4), estrella: false });
  }
  return lista;
}

export const CASILLAS = construir();
export const PORID = new Map(CASILLAS.map((c) => [c.id, c]));
export const ESTRELLAS = CASILLAS.filter((c) => c.estrella);

/** Igual que describir() del servidor: «Sierpes · estrella de Imágenes», «… entre La Campana y Sierpes». */
export function describir(id: string): string {
  const c = PORID.get(id);
  if (!c) return id;
  if (id === "S") return "la Salida";
  const nombre = c.categoria ? CATEGORIAS[c.categoria].nombre : "";
  if (c.estrella) return `${c.lugar} · estrella de ${nombre}`;
  if (id[0] === "A") {
    const k = Math.floor(Number(id.slice(1)) / 6);
    return `una casilla de ${nombre}, entre ${LUGARES[k]} y ${LUGARES[(k + 1) % 6]}`;
  }
  const k = Number(id.slice(1).split("-")[0]) / 6;
  return `una casilla de ${nombre}, en la calle de ${LUGARES[k]} a la Salida`;
}

/** Las dos letras de la ficha: «CI» de Cirio_de_San_Lorenzo; si coinciden con las del rival, la primera y la última. */
export function iniciales(alias: string, rival: string): string {
  const dos = (s: string) => s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  const a = dos(alias);
  if (a !== dos(rival)) return a;
  const limpio = alias.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/g, "");
  return (limpio.charAt(0) + limpio.charAt(limpio.length - 1)).toUpperCase();
}

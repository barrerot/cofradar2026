import { createHash, randomBytes } from "node:crypto";
import { parse } from "csv-parse/sync";
import { CATEGORIAS, type Categoria } from "./tablero.js";

/**
 * El banco de preguntas del trivial online (PRD v1.1, apartado 6), a partir de
 * docs/datos/trivial/todas-las-preguntas.csv. Aquí solo se lee y se comprueba; publicarlo en la base es
 * cosa de scripts/importar-trivial.ts, que no publica nada si hay un solo error.
 */

/** Qué temas del CSV van a cada categoría del tablero. Un tema que no esté aquí es un error. */
export const TEMAS: Record<Categoria, string[]> = {
  historia: ["historia"],
  imagenes: ["imágenes"],
  patrimonio_simbolos: ["patrimonio", "símbolos"],
  jornadas_sedes: ["jornada", "sede"],
  musica_literatura: ["música", "literatura"],
  tradiciones_curiosidades: ["hábito", "curiosidades", "cultos"],
};

/** Por debajo de esto se avisa: en una partida larga se repetirían preguntas. */
const POCAS = 40;

const COLUMNAS = ["id", "hermandad", "tema", "dificultad", "pregunta", "correcta", "incorrecta_1", "incorrecta_2", "incorrecta_3", "fuente"] as const;

export type PreguntaBanco = {
  id: number;
  categoria: Categoria;
  tema: string;
  hermandad: string;
  dificultad: string;
  lote: number | null;
  enunciado: string;
  opciones: { id: string; texto: string }[];
  correcta: string;
  explicacion: string;
  fuente: string;
};

export type Informe = {
  preguntas: PreguntaBanco[];
  errores: string[];
  avisos: string[];
  porCategoria: Record<Categoria, number>;
  huella: string;
};

const normal = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase("es");

/** Un id de opción que no dice nada: ni la columna de origen ni si es la buena. */
const idOpaco = () => randomBytes(4).toString("hex");

function barajar<T>(lista: T[]): T[] {
  const c = [...lista];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j] as T, c[i] as T];
  }
  return c;
}

export function leerBanco(csv: string): Informe {
  const huella = createHash("sha256").update(csv).digest("hex");
  const errores: string[] = [];
  const avisos: string[] = [];
  const porCategoria = Object.fromEntries(CATEGORIAS.map((c) => [c.id, 0])) as Record<Categoria, number>;
  const deTema = new Map(Object.entries(TEMAS).flatMap(([cat, temas]) => temas.map((t) => [t, cat as Categoria])));

  let filas: Record<string, string>[];
  try {
    filas = parse(csv, { columns: true, skip_empty_lines: true, bom: true });
  } catch (e) {
    return { preguntas: [], errores: [`El CSV no se puede leer: ${(e as Error).message}`], avisos, porCategoria, huella };
  }
  const cabecera = Object.keys(filas[0] ?? {});
  const faltan = COLUMNAS.filter((c) => !cabecera.includes(c));
  if (faltan.length) return { preguntas: [], errores: [`Faltan columnas: ${faltan.join(", ")}`], avisos, porCategoria, huella };

  const preguntas: PreguntaBanco[] = [];
  const ids = new Set<number>();
  const enunciados = new Set<string>();
  filas.forEach((f, i) => {
    const donde = `fila ${i + 2}${f.id ? ` (id ${f.id})` : ""}`;
    const malas: string[] = [];
    const id = Number(f.id);
    if (!Number.isInteger(id) || id <= 0) malas.push("id no válido");
    else if (ids.has(id)) malas.push("id repetido");
    for (const c of COLUMNAS) if (!(f[c] ?? "").trim()) malas.push(`falta «${c}»`);
    const tema = (f.tema ?? "").trim();
    const categoria = deTema.get(tema);
    if (tema && !categoria) malas.push(`tema sin categoría: «${tema}»`);
    const jugable = (f.categoria_jugable ?? "").trim();
    if (categoria && jugable && jugable !== categoria) malas.push(`categoria_jugable «${jugable}» no cuadra con el tema «${tema}» (${categoria})`);
    const textos = [f.correcta, f.incorrecta_1, f.incorrecta_2, f.incorrecta_3].map((t) => (t ?? "").trim());
    if (new Set(textos.map(normal)).size !== 4) malas.push("opciones repetidas");
    const enunciado = (f.pregunta ?? "").trim();
    if (enunciados.has(normal(enunciado))) malas.push("pregunta repetida");
    if (malas.length) {
      errores.push(`${donde}: ${malas.join("; ")}`);
      return;
    }
    ids.add(id);
    enunciados.add(normal(enunciado));
    const opciones = textos.map((texto) => ({ id: idOpaco(), texto }));
    preguntas.push({
      id,
      categoria: categoria!,
      tema,
      hermandad: f.hermandad!.trim(),
      dificultad: f.dificultad!.trim(),
      lote: f.lote ? Number(f.lote) : null,
      enunciado,
      // Guardadas ya barajadas: el orden del CSV (la buena primero) no llega a ningún sitio
      opciones: barajar(opciones),
      correcta: opciones[0]!.id,
      explicacion: (f.explicacion ?? "").trim(),
      fuente: f.fuente!.trim(),
    });
    porCategoria[categoria!]++;
  });

  for (const c of CATEGORIAS) {
    if (porCategoria[c.id] === 0) errores.push(`La categoría «${c.nombre}» no tiene ninguna pregunta`);
    else if (porCategoria[c.id] < POCAS) avisos.push(`La categoría «${c.nombre}» solo tiene ${porCategoria[c.id]} preguntas: se repetirán antes`);
  }
  return { preguntas, errores, avisos, porCategoria, huella };
}

import { useEffect, useState } from "react";

/**
 * Trivial cofrade (F-50, P-32; 10-trivial/).
 *
 * El banco viaja DENTRO de la app (trivial-preguntas.json, generado con
 * scripts/gen-trivial.mjs desde docs/datos/trivial/): se juega sin conexión.
 * Va en un trozo aparte que se pide la primera vez que hace falta, o en un
 * rato libre tras abrir la app (precargarTrivial), para que el service
 * worker lo guarde y esté también en la cola sin cobertura.
 *
 * No se guarda nada: ni récords ni historial ni puntos (decisión del
 * 05/11/2026). La partida vive en la memoria de la pantalla.
 */

export type Dificultad = "mezcla" | 0 | 1 | 2;

export type Pregunta = {
  id: number;
  hermandad: string;
  /** El id de su ficha (/cofradias/:id), el mismo slug que el backend. */
  cofradia: string;
  tema: string;
  dificultad: 0 | 1 | 2;
  texto: string;
  correcta: string;
  /** Las cuatro respuestas, ya barajadas. */
  respuestas: string[];
  explicacion: string;
  fuente: Fuente;
};

/** De dónde sale la pregunta, para enseñarlo y poder comprobarlo. */
export type Fuente =
  | { tipo: "web"; url: string; texto: string }
  | { tipo: "ficha"; texto: string }
  | { tipo: "programa"; texto: string };

type Fila = [number, number, string, 0 | 1 | 2, string, string, string, string, string, string, string];
type Banco = { hermandades: string[]; preguntas: Fila[] };

export const PREGUNTAS_POR_PARTIDA = 10;

let promesa: Promise<Banco> | null = null;

function cargar(): Promise<Banco> {
  promesa ??= import("./trivial-preguntas.json").then((m) => m.default as unknown as Banco);
  // Si falla (sin conexión y sin guardar), se puede volver a intentar
  promesa.catch(() => (promesa = null));
  return promesa;
}

/** Pide el banco en un rato libre, para que quede guardado y se pueda jugar sin conexión. */
export function precargarTrivial(): void {
  if (!import.meta.env.PROD) return;
  const pedir = () => void cargar().catch(() => undefined);
  if ("requestIdleCallback" in window) window.requestIdleCallback(pedir, { timeout: 10_000 });
  else setTimeout(pedir, 3_000);
}

/** El banco, o null mientras llega. `fallo` si no se ha podido cargar. */
export function useBancoTrivial(): { banco: Banco | null; fallo: boolean } {
  const [banco, setBanco] = useState<Banco | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    let vivo = true;
    cargar().then(
      (b) => vivo && setBanco(b),
      () => vivo && setFallo(true),
    );
    return () => {
      vivo = false;
    };
  }, []);
  return { banco, fallo };
}

/** El mismo slug que backend/src/rutas/cofradias.ts: «La Macarena» → «la-macarena». */
export function slug(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Cuántas preguntas tiene cada hermandad, por su slug. */
export function cuentaPorCofradia(banco: Banco): Map<string, { nombre: string; preguntas: number }> {
  const cuenta = new Map<string, { nombre: string; preguntas: number }>();
  for (const f of banco.preguntas) {
    const nombre = nombreDe(banco, f);
    const c = cuenta.get(slug(nombre)) ?? { nombre, preguntas: 0 };
    c.preguntas++;
    cuenta.set(slug(nombre), c);
  }
  return cuenta;
}

/** Las que entran en una partida: de una hermandad (o de todas) y de una dificultad (o mezcla). */
export function candidatas(banco: Banco, cofradia: string | null, dificultad: Dificultad): Fila[] {
  return banco.preguntas.filter(
    (f) => (cofradia === null || slug(nombreDe(banco, f)) === cofradia) && (dificultad === "mezcla" || f[3] === dificultad),
  );
}

/**
 * Una partida: hasta 10 preguntas al azar, con las respuestas barajadas. Con
 * todas las hermandades, se evita repetir hermandad mientras haya otras.
 */
export function nuevaPartida(banco: Banco, cofradia: string | null, dificultad: Dificultad): Pregunta[] {
  const elegidas: Fila[] = [];
  const usadas = new Set<number>();
  for (const f of barajar(candidatas(banco, cofradia, dificultad))) {
    if (elegidas.length === PREGUNTAS_POR_PARTIDA) break;
    if (cofradia === null && usadas.has(f[1])) continue;
    elegidas.push(f);
    usadas.add(f[1]);
  }
  // Si no hay bastantes hermandades distintas, se completa con las que falten
  if (elegidas.length < PREGUNTAS_POR_PARTIDA) {
    const ya = new Set(elegidas);
    for (const f of barajar(candidatas(banco, cofradia, dificultad))) {
      if (elegidas.length === PREGUNTAS_POR_PARTIDA) break;
      if (!ya.has(f)) elegidas.push(f);
    }
  }
  return elegidas.map((f) => aPregunta(banco, f));
}

function aPregunta(banco: Banco, f: Fila): Pregunta {
  const [id, h, tema, dificultad, texto, correcta, i1, i2, i3, explicacion, fuente] = f;
  const hermandad = banco.hermandades[h] ?? "";
  return {
    id,
    hermandad,
    cofradia: slug(hermandad),
    tema,
    dificultad,
    texto,
    correcta,
    respuestas: barajar([correcta, i1, i2, i3]),
    explicacion,
    fuente: aFuente(fuente),
  };
}

/**
 * La fuente como se enseña. Las webs, por su dominio y la última parte de la
 * dirección («hermandaddelamacarena.es · patrimonio musical»). Las que salen
 * de los datos de Cofradar no llevan enlace fuera: la ficha de la hermandad y
 * el programa oficial.
 */
export function aFuente(fuente: string): Fuente {
  if (/^https?:\/\//.test(fuente)) {
    try {
      const u = new URL(fuente);
      const dominio = u.hostname.replace(/^www\./, "");
      const pagina = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "")
        .replace(/\.(html?|php|aspx?|pdf)$/i, "")
        .replace(/[-_]+/g, " ")
        .trim();
      const legible = pagina && !/^\d+$/.test(pagina) && pagina.length <= 60;
      return { tipo: "web", url: fuente, texto: legible ? `${dominio} · ${pagina.charAt(0).toUpperCase()}${pagina.slice(1)}` : dominio };
    } catch {
      /* una dirección rota se enseña como texto */
    }
  }
  if (fuente.startsWith("Ficha de Cofradar")) return { tipo: "ficha", texto: "Ficha de la hermandad en Cofradar" };
  if (fuente.startsWith("Programa oficial")) return { tipo: "programa", texto: fuente.replace(/\s*\(.*\)$/, "") };
  return { tipo: "programa", texto: fuente };
}

/** El nombre de la hermandad de una fila del banco. */
function nombreDe(banco: Banco, f: Fila): string {
  return banco.hermandades[f[1]] ?? "";
}

function barajar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
  }
  return copia;
}

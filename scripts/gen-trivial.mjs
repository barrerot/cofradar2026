import { readFileSync, readdirSync, writeFileSync } from "node:fs";

/* Banco del Trivial cofrade (F-50) para la app: junta los seis lotes de
   docs/datos/trivial/ en un JSON compacto que viaja dentro de la app, para
   jugar sin conexión. Solo entran las que Carlos ha validado (vale = «sí»).

   Regenerar: node scripts/gen-trivial.mjs */

const DIR = "docs/datos/trivial";
const SALIDA = "frontend/src/datos/trivial-preguntas.json";
const DIFICULTAD = { fácil: 0, media: 1, difícil: 2 };

/** CSV con comillas dobles (RFC 4180): comas y saltos de línea dentro de las comillas. */
function leerCsv(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let dentro = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentro) {
      if (c === '"' && texto[i + 1] === '"') (campo += '"'), i++;
      else if (c === '"') dentro = false;
      else campo += c;
    } else if (c === '"') dentro = true;
    else if (c === ",") fila.push(campo), (campo = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo), filas.push(fila), (fila = []), (campo = "");
    } else campo += c;
  }
  if (campo || fila.length) fila.push(campo), filas.push(fila);
  const [cabecera, ...resto] = filas.filter((f) => f.length > 1);
  return resto.map((f) => Object.fromEntries(cabecera.map((k, i) => [k, f[i] ?? ""])));
}

const preguntas = readdirSync(DIR)
  .filter((f) => /^preguntas-lote-\d+\.csv$/.test(f))
  .flatMap((f) => leerCsv(readFileSync(`${DIR}/${f}`, "utf8")))
  .filter((p) => p.vale === "sí")
  .sort((a, b) => Number(a.id) - Number(b.id));

const hermandades = [...new Set(preguntas.map((p) => p.hermandad))].sort((a, b) => a.localeCompare(b, "es"));
const indice = new Map(hermandades.map((h, i) => [h, i]));

for (const p of preguntas) {
  if (!(p.dificultad in DIFICULTAD)) throw new Error(`Pregunta ${p.id}: dificultad «${p.dificultad}»`);
  if (!p.pregunta || !p.correcta || !p.incorrecta_1 || !p.incorrecta_2 || !p.incorrecta_3 || !p.fuente)
    throw new Error(`Pregunta ${p.id}: falta un campo`);
}

/* Una fila por pregunta, por posición, para que pese poco:
   [id, hermandad (índice), tema, dificultad (0 fácil, 1 media, 2 difícil),
    pregunta, correcta, incorrecta 1, 2 y 3, explicación, fuente] */
const banco = {
  hermandades,
  preguntas: preguntas.map((p) => [
    Number(p.id),
    indice.get(p.hermandad),
    p.tema,
    DIFICULTAD[p.dificultad],
    p.pregunta,
    p.correcta,
    p.incorrecta_1,
    p.incorrecta_2,
    p.incorrecta_3,
    p.explicacion,
    p.fuente,
  ]),
};

writeFileSync(SALIDA, JSON.stringify(banco) + "\n");
console.log(`${preguntas.length} preguntas de ${hermandades.length} hermandades en ${SALIDA}`);

/**
 * Trae el CSS y las fuentes del export del design system al frontend.
 *
 * `bundle.css` y los .woff2 son GENERADOS: no se editan a mano. Cuando llegue
 * una exportacion nueva, se sustituye docs/design/pantallas/0-sistema/ y se
 * vuelve a ejecutar este script. Lo que escribimos nosotros vive en
 * base.css y marco.css, que este script no toca.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "docs/design/pantallas/0-sistema");
const destino = join(raiz, "frontend/src/estilos");
const destinoFuentes = join(destino, "fuentes");

const AVISO = `/* ARCHIVO GENERADO · no editar.
   Origen: docs/design/pantallas/0-sistema/bundle.css
   Regenerar: npm run sync:diseno
   Lo nuestro va en base.css y marco.css. */\n\n`;

const FUENTES = [
  "InterVariable-latin.woff2",
  "newsreader-latin-wght-normal.woff2",
  "newsreader-latin-wght-italic.woff2",
];

mkdirSync(destinoFuentes, { recursive: true });

const css = readFileSync(join(origen, "bundle.css"), "utf8");
writeFileSync(join(destino, "bundle.css"), AVISO + css);
console.log(`bundle.css  ${(css.length / 1024).toFixed(1)} kB`);

for (const fuente of FUENTES) {
  copyFileSync(join(origen, fuente), join(destinoFuentes, fuente));
  console.log(`fuente      ${fuente}`);
}

// tokens.json se deja a mano para quien quiera leer los tokens desde JS.
copyFileSync(join(origen, "tokens.json"), join(destino, "tokens.json"));
console.log("tokens.json");

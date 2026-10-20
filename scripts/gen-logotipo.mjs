/* Genera frontend/src/marco/logotipo.ts a partir de los SVG del logotipo D
   (docs/design/intro_logos/cofradar-logotipo-d/svg/), sin redibujar nada:

   - la tinta fija (#1D1A16) pasa a currentColor, para que herede el color del
     tema (tinta en claro, cera en oscuro). Las versiones -cera son las mismas
     con otro color, así que basta con las -tinta;
   - los id de las máscaras pasan a «__ID__-…», y el componente Logo los
     cambia por uno único en cada uso.

   Regenerar: node scripts/gen-logotipo.mjs */
import { readFileSync, writeFileSync } from "node:fs";

const ORIGEN = "docs/design/intro_logos/cofradar-logotipo-d/svg";
const FUENTES = {
  horizontal: "cofradar-logo-horizontal-tinta.svg",
  vertical: "cofradar-logo-vertical-tinta.svg",
  simbolo: "cofradar-simbolo-tinta.svg",
  simboloPequeno: "cofradar-simbolo-pequeno-tinta.svg",
};

const salida = {};
for (const [nombre, archivo] of Object.entries(FUENTES)) {
  const svg = readFileSync(`${ORIGEN}/${archivo}`, "utf8").trim();
  const [, atributos, cuerpo] = svg.match(/^<svg([^>]*)>([\s\S]*)<\/svg>$/);
  const viewBox = atributos.match(/viewBox="([^"]+)"/)[1];
  const tinta = cuerpo.replaceAll("#1D1A16", "currentColor");
  if (/#[0-9A-Fa-f]{6}/.test(tinta)) throw new Error(`${archivo}: queda un color fijo`);
  let final = tinta;
  for (const m of tinta.matchAll(/id="(cf-([a-z]+)\d+)"/g)) {
    final = final.replaceAll(`id="${m[1]}"`, `id="__ID__-${m[2]}"`).replaceAll(`url(#${m[1]})`, `url(#__ID__-${m[2]})`);
  }
  if (!final.includes("__ID__") || /cf-[a-z]+\d/.test(final)) throw new Error(`${archivo}: máscaras sin renombrar`);
  const [, , ancho, alto] = viewBox.split(" ").map(Number);
  salida[nombre] = { viewBox, proporcion: Number((ancho / alto).toFixed(4)), cuerpo: final };
}

writeFileSync(
  "frontend/src/marco/logotipo.ts",
  `/* GENERADO por scripts/gen-logotipo.mjs a partir de los SVG del logotipo D.
 * No editar a mano. Ver Logo.tsx. */
export const LOGOTIPO = ${JSON.stringify(salida, null, 2)} as const;
`,
);
console.log(`logotipo: ${Object.keys(salida).join(", ")}`);

import { readFileSync, readdirSync, writeFileSync } from "node:fs";

/* Fuentes de trazos, todas espejo local del artifact del design system. Las
   capturas de pantalla no traen todas las variantes de un componente —solo
   las que esa pantalla usa—, asi que las fichas de 0-sistema/componentes/
   completan el vocabulario (p. ej. las seis alteraciones, de las que Inicio
   solo muestra dos). Al añadir un area o una ficha se añade aqui y se
   declaran sus iconos en `mapa`. */
const dirs = [
  "docs/design/pantallas/1-marco",
  "docs/design/pantallas/2-inicio",
  "docs/design/pantallas/4-cofradias",
  "docs/design/pantallas/0-sistema/componentes",
];

const trazos = new Map();
for (const dir of dirs) {
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".html"))) {
    const html = readFileSync(`${dir}/${f}`, "utf8");
    for (const m of html.matchAll(/<svg[^>]*width="(\d+)"[^>]*>(.*?)<\/svg>/gs)) {
      for (const d of m[2].matchAll(/\sd="([^"]+)"/g)) trazos.set(d[1].slice(0, 20), d[1]);
    }
  }
}

// clave = los 20 primeros caracteres del trazo tal como aparece en el export
const mapa = {
  // ── Marco ──────────────────────────────────────────────────────────────
  chevronAbajo:      "M216.49,104.49l-80,8",
  sincronizar:       "M228,48V96a12,12,0,0",
  buscar:            "M232.49,215.51,185,1",
  flechaIzquierda:   "M228,128a12,12,0,0,1",
  cerrar:            "M208.49,191.51a12,12",
  inicio:            "M219.31,108.68l-80-8",
  inicioRelleno:     "M224,120v96a8,8,0,0,",
  mapa:              "M228.92,49.69a8,8,0,",
  cofradias:         "M244.8,150.4a8,8,0,0",
  cofradiasRelleno:  "M64.12,147.8a4,4,0,0",
  agenda:            "M208,32H184V24a8,8,0",
  miCofradar:        "M128,24A104,104,0,1,",
  miCofradarRelleno: "M172,120a44,44,0,1,1",
  /** Chip de filtro activo. Lo trae 4-cofradias. */
  check:             "M232.49,80.49l-128,1",

  // ── Fases de la cofradia (chip de estado) ──────────────────────────────
  /* Las siete fases canonicas. `prevista` comparte trazo con `calendario` y
     `cancelada` con `interrumpida`: en el export son el mismo glifo, y no se
     duplican aqui. */
  inminente:      "M204,75.64V40a20,20,",
  enCalle:        "M200,164a36.07,36.07",
  proximaEntrada: "M144.49,136.49l-40,4",
  finalizada:     "M229,45a12,12,0,0,0-",
  noProcesiona:   "M180,128a12,12,0,0,1",

  // ── Alteraciones ───────────────────────────────────────────────────────
  retraso:           "M128,44a96,96,0,1,0,",
  adelanto:          "M246.81,111.29,158.6",
  cambioRecorrido:   "M232.49,192.49l-32,3",
  interrumpida:      "M128,20A108,108,0,1,",
  regresoAnticipado: "M236,144a68.07,68.07",
  /* `incidencia` comparte trazo con `critico`: es el mismo triangulo de
     advertencia en el export. No se duplica. */

  // ── Confianza del dato ─────────────────────────────────────────────────
  /** Cola del chip cuando el dato esta desactualizado: «· hace 23 min». */
  desactualizado: "M140,80v41.21l34.17,",
  /** Procedencia del aviso: publicado por Cofradar / informado por usuarios. */
  procedenciaCofradar: "M128,84a44,44,0,1,0,",
  procedenciaUsuarios: "M164.38,181.1a52,52,",
  /* El aviso informativo. `critico` y `atencion` reusan trazo: en el export
     son el mismo triangulo y el mismo reloj que `incidencia` y `retraso`. */
  informativo: "M108,84a16,16,0,1,1,",

  // ── Marca de relacion con la cofradia ──────────────────────────────────
  /* La verificacion de «dar fe» es diferencia de FORMA, no de color: la
     verificada va en relleno y la no verificable en contorno. */
  vista:              "M247.31,124.76c-.35-",
  seguida:            "M184,28H72A20,20,0,0",
  darFeVerificada:    "M225.86,102.82c-3.77",
  darFeNoVerificable: "M228.75,100.05c-3.52",

  // ── Varios de contenido ────────────────────────────────────────────────
  /** Aviso de contexto de la banda superior (riesgo de lluvia). */
  lluvia:     "M156,12A80.22,80.22,",
  /** Aviso critico de incidencia. */
  critico:    "M240.26,186.1,152.81",
  /** «Ver toda la Madruga». */
  calendario: "M208,28H188V24a12,12",
  /** Opcion marcada en un filtro. */
  marca:      "M232.49,80.49l-128,1",
};

const faltan = Object.entries(mapa).filter(([, k]) => !trazos.has(k));
if (faltan.length) {
  console.error("no encontrados:", faltan.map(([n]) => n));
  process.exit(1);
}

const cuerpo = Object.entries(mapa)
  .map(([nombre, clave]) => `  ${nombre}:\n    "${trazos.get(clave)}",`)
  .join("\n");

writeFileSync(
  "frontend/src/marco/trazos.ts",
  `/**
 * ARCHIVO GENERADO · no editar a mano.
 *
 * Trazos SVG extraidos literalmente de las capturas del export
 * (docs/design/pantallas/*​/*.html). Son iconos Phosphor con el lienzo
 * 0 0 256 256 que usa el export. Se copian en lugar de instalar la libreria:
 * asi no hay una dependencia que pueda dibujar algo distinto a la captura.
 *
 * Regenerar: node scripts/gen-trazos.mjs
 */
export const TRAZOS = {
${cuerpo}
} as const;

export type NombreTrazo = keyof typeof TRAZOS;
`,
);
console.log(`${Object.keys(mapa).length} trazos escritos`);

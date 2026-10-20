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
  "docs/design/pantallas/3-mapa",
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

/* Iconos que se ven en las capturas PNG del export pero no vienen en ningun
   HTML. Se copian de Phosphor (@phosphor-icons/core 2.1.1, peso bold, el
   mismo que usa el export: su arrows-clockwise-bold es identico a
   `sincronizar`). */
const EXTRA = {
  /** Navegación «Cofradías» (1-marco/armazon-*, vigente): article y
      article-fill, peso regular como el resto de la barra. El export antiguo
      traía users-three, que el armazón aprobado ya no usa. */
  cofradias:
    "M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM184,96a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,96Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,128Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,160Z",
  cofradiasRelleno:
    "M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM176,168H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16Zm0-32H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16Zm0-32H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16Z",
  /** Introducción (P-02; 8-acceso/acceso-2): «Dar fe». eye-bold, en contorno:
      «vista» es el ojo relleno de la marca de relación. */
  ojo:
    "M251,123.13c-.37-.81-9.13-20.26-28.48-39.61C196.63,57.67,164,44,128,44S59.37,57.67,33.51,83.52C14.16,102.87,5.4,122.32,5,123.13a12.08,12.08,0,0,0,0,9.75c.37.82,9.13,20.26,28.49,39.61C59.37,198.34,92,212,128,212s68.63-13.66,94.48-39.51c19.36-19.35,28.12-38.79,28.49-39.61A12.08,12.08,0,0,0,251,123.13Zm-46.06,33C183.47,177.27,157.59,188,128,188s-55.47-10.73-76.91-31.88A130.36,130.36,0,0,1,29.52,128,130.45,130.45,0,0,1,51.09,99.89C72.54,78.73,98.41,68,128,68s55.46,10.73,76.91,31.89A130.36,130.36,0,0,1,226.48,128,130.45,130.45,0,0,1,204.91,156.12ZM128,84a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,84Zm0,64a20,20,0,1,1,20-20A20,20,0,0,1,128,148Z",
  /** Sin conexion: cabecera y aviso «Sin conexion · ultimo dato hace…»
      (0-sistema/estados/estado-5, 1-marco/armazon-5). cloud-slash-bold. */
  sinConexion:
    "M56.88,31.93A12,12,0,1,0,39.12,48.07L71.79,84A68,68,0,0,0,72,220h88a91.26,91.26,0,0,0,30.66-5.24l8.46,9.31a12,12,0,0,0,17.76-16.14ZM160,196H72a44,44,0,0,1-1.8-87.95A91.91,91.91,0,0,0,68,128a12,12,0,0,0,24,0,68.22,68.22,0,0,1,2.66-18.84l77.88,85.67A68.67,68.67,0,0,1,160,196Zm92-68a91.32,91.32,0,0,1-17.53,54,12,12,0,1,1-19.41-14.11,68,68,0,0,0-89.57-98.53,12,12,0,0,1-12.2-20.66A92,92,0,0,1,252,128Z",
  /** Sin cartografia (0-sistema/estados/estado-7): map-trifold-bold con una
      barra que lo tacha de arriba a la izquierda a abajo a la derecha, del
      mismo grosor que la de cloud-slash. Phosphor no trae «map-slash». */
  sinCartografia:
    "M231.38,46.54a12,12,0,0,0-10.29-2.18L161.4,59.28l-60-30a12,12,0,0,0-8.28-.91l-64,16A12,12,0,0,0,20,56V200a12,12,0,0,0,14.91,11.64L94.6,196.72l60,30a12,12,0,0,0,8.28.91l64-16A12,12,0,0,0,236,200V56A12,12,0,0,0,231.38,46.54ZM108,59.42l40,20V196.58l-40-20Zm-64,6,40-10V174.63l-40,10ZM212,190.63l-40,10V81.37l40-10ZM24.88,15.93a12,12,0,1,0-17.76,16.14l224,208a12,12,0,1,0,17.76-16.14Z",
  /** Ubicación (Ajustes, P-25; 7-mi-cofradar/ajustes). map-pin-bold. */
  ubicacion:
    "M128,60a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,60Zm0,64a20,20,0,1,1,20-20A20,20,0,0,1,128,124Zm0-112a92.1,92.1,0,0,0-92,92c0,77.36,81.64,135.4,85.12,137.83a12,12,0,0,0,13.76,0,259,259,0,0,0,42.18-39C205.15,170.57,220,136.37,220,104A92.1,92.1,0,0,0,128,12Zm31.3,174.71A249.35,249.35,0,0,1,128,216.89a249.35,249.35,0,0,1-31.3-30.18C80,167.37,60,137.31,60,104a68,68,0,0,1,136,0C196,137.31,176,167.37,159.3,186.71Z",
  /** Permiso no concedido: «No permitida». prohibit-bold. */
  prohibido:
    "M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm84,108a83.6,83.6,0,0,1-16.75,50.28L77.72,60.75A84,84,0,0,1,212,128ZM44,128A83.6,83.6,0,0,1,60.75,77.72L178.28,195.25A84,84,0,0,1,44,128Z",
  /** Permiso bloqueado en el navegador. lock-simple-bold. */
  candado:
    "M208,76H180V56A52,52,0,0,0,76,56V76H48A20,20,0,0,0,28,96V208a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V96A20,20,0,0,0,208,76ZM100,56a28,28,0,0,1,56,0V76H100ZM204,204H52V100H204Z",
  /** Permiso concedido: «Permitida». check-circle-bold. */
  permitido:
    "M176.49,95.51a12,12,0,0,1,0,17l-56,56a12,12,0,0,1-17,0l-24-24a12,12,0,1,1,17-17L112,143l47.51-47.52A12,12,0,0,1,176.49,95.51ZM236,128A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-24,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Z",
  /** Política de privacidad. file-text-bold. */
  documento:
    "M216.49,79.52l-56-56A12,12,0,0,0,152,20H56A20,20,0,0,0,36,40V216a20,20,0,0,0,20,20H200a20,20,0,0,0,20-20V88A12,12,0,0,0,216.49,79.52ZM160,57l23,23H160ZM60,212V44h76V92a12,12,0,0,0,12,12h48V212Zm112-80a12,12,0,0,1-12,12H96a12,12,0,0,1,0-24h64A12,12,0,0,1,172,132Zm0,40a12,12,0,0,1-12,12H96a12,12,0,0,1,0-24h64A12,12,0,0,1,172,172Z",
  /** Fila que lleva a otra pantalla. caret-right-bold. */
  chevronDerecha:
    "M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z",
};

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
  /** «Centrar en mi ubicación» del mapa (3-mapa, 8-acceso/acceso-4a). */
  centrar:    "M232,116h-4.72A100.2",
};

const faltan = Object.entries(mapa).filter(([, k]) => !trazos.has(k));
if (faltan.length) {
  console.error("no encontrados:", faltan.map(([n]) => n));
  process.exit(1);
}

const cuerpo = Object.entries(mapa)
  .map(([nombre, clave]) => `  ${nombre}:\n    "${trazos.get(clave)}",`)
  .concat(Object.entries(EXTRA).map(([nombre, d]) => `  ${nombre}:\n    "${d}",`))
  .join("\n");

writeFileSync(
  "frontend/src/marco/trazos.ts",
  `/**
 * ARCHIVO GENERADO · no editar a mano.
 *
 * Trazos SVG extraidos literalmente de las capturas del export
 * (docs/design/pantallas/*​/*.html). Son iconos Phosphor con el lienzo
 * 0 0 256 256 que usa el export (y alguno que solo sale en las capturas PNG,
 * copiado de Phosphor: ver EXTRA en el generador). Se copian en lugar de instalar la libreria:
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
console.log(`${Object.keys(mapa).length + Object.keys(EXTRA).length} trazos escritos`);

/**
 * Los colores de la túnica en el marco de cada estampa (sistema de las estampas, Claude Design, 12/11/2026),
 * sacados de docs/design/estampas/fichas.csv con sus reglas:
 *
 *   - Como mucho dos colores: la BANDA exterior, la pieza que más se ve (túnica o sotana), y el FILETE
 *     interior, la que más contrasta con ella (antifaz, capa o escapulario), aunque sea del otro tramo.
 *   - Primero el tramo del titular de la estampa (la Hiniesta y la Macarena, el de la Virgen).
 *   - Cíngulos, botonaduras, cinturones, bordados, el oro y la plata no entran. El esparto es material.
 *   - Una sola tinta por color para las 72. El blanco no se pinta: es papel entre dos hilos de tinta.
 *
 * Sin filete, el filete es un hilo fino del color de la banda. Las cinco sin datos de túnica (Pino
 * Montano, Bellavista, Alcosa, San José Obrero, La Milagrosa) no están: llevan el marco en tinta.
 */
export type Color = "negro" | "blanco" | "marfil" | "verde" | "azul" | "morado" | "burdeos" | "rojo" | "celeste" | "marron";

/** Una tinta por color. Blanco es el papel. */
export const TINTAS: Record<Color, string> = {
  negro: "#1D1A16",
  blanco: "#FDF9F1",
  marfil: "#E6DAC1",
  verde: "#2E6046",
  azul: "#3B6A97",
  morado: "#4E2C5C",
  burdeos: "#6B2430",
  rojo: "#9E3328",
  celeste: "#8DB0CC",
  marron: "#6B4A30",
};

export const TUNICAS: Record<string, [banda: Color, filete?: Color]> = {
  "bendicion-y-esperanza": ["blanco", "verde"],
  "la-mision": ["blanco", "azul"],
  "pasion-y-muerte": ["negro"],
  "cristo-de-la-corona": ["morado"],
  "salud-y-clemencia-padre-pio": ["marfil", "burdeos"],
  torreblanca: ["blanco"],
  "la-borriquita": ["blanco"],
  "la-cena": ["blanco"],
  "jesus-despojado": ["marfil", "negro"],
  "la-hiniesta": ["azul", "blanco"],
  "la-paz": ["blanco"],
  "san-roque": ["blanco", "morado"],
  "la-estrella": ["blanco", "morado"],
  "la-amargura": ["blanco"],
  "el-amor": ["negro"],
  "san-pablo": ["marfil", "negro"],
  "la-redencion": ["marfil", "verde"],
  "santa-genoveva": ["blanco", "negro"],
  "santa-marta": ["negro"],
  "san-gonzalo": ["blanco"],
  "vera-cruz": ["negro"],
  "las-penas": ["negro"],
  "las-aguas": ["blanco", "morado"],
  "el-museo": ["negro", "blanco"],
  "el-cerro": ["blanco", "burdeos"],
  "san-esteban": ["marfil", "celeste"],
  "la-candelaria": ["blanco"],
  "san-benito": ["blanco", "morado"],
  "los-javieres": ["negro"],
  "el-dulce-nombre": ["blanco"],
  "los-estudiantes": ["negro"],
  "santa-cruz": ["negro"],
  "el-carmen": ["blanco", "marron"],
  "el-buen-fin": ["marron"],
  "la-sed": ["negro", "blanco"],
  "san-bernardo": ["morado", "negro"],
  "la-lanzada": ["marfil", "rojo"],
  "el-baratillo": ["azul"],
  "los-panaderos": ["negro", "morado"],
  "el-cristo-de-burgos": ["negro"],
  "las-siete-palabras": ["blanco", "rojo"],
  "los-negritos": ["blanco", "azul"],
  "la-exaltacion": ["blanco", "morado"],
  "las-cigarreras": ["morado", "blanco"],
  "monte-sion": ["marfil", "negro"],
  "la-quinta-angustia": ["morado"],
  "el-valle": ["morado"],
  pasion: ["negro"],
  "el-silencio": ["negro"],
  "el-gran-poder": ["negro"],
  "la-macarena": ["verde", "morado"],
  "el-calvario": ["negro"],
  "la-esperanza-de-triana": ["morado", "verde"],
  "los-gitanos": ["blanco", "morado"],
  "la-carreteria": ["azul"],
  "la-soledad-de-san-buenaventura": ["blanco", "negro"],
  "el-cachorro": ["negro", "marfil"],
  "la-o": ["morado"],
  "san-isidoro": ["negro"],
  montserrat: ["marfil"],
  "la-sagrada-mortaja": ["morado", "negro"],
  "el-sol": ["marfil", "verde"],
  "los-servitas": ["negro"],
  "la-trinidad": ["marfil", "negro"],
  "el-santo-entierro": ["negro"],
  "la-soledad-de-san-lorenzo": ["blanco", "negro"],
  "la-resurreccion": ["blanco"],
};

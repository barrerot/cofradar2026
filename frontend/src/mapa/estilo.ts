import type { StyleSpecification } from "maplibre-gl";

/**
 * El estilo de la cartografía (design.md §10, D36): OpenStreetMap en teselas
 * vectoriales de OpenFreeMap, pintado con los colores de Cofradar.
 *
 * Sobrio a propósito: manzanas, calles, plazas, agua y los nombres de calle.
 * Sin tiendas ni iconos de lugares, para que destaquen las marcas. Los colores
 * salen de los tokens `--cf-map-*` del sistema, leídos en el momento: así el
 * mismo estilo sirve para claro, oscuro y máximo contraste, y cambia con ellos.
 */
const TESELAS = "https://tiles.openfreemap.org/planet";
const LETRAS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

function token(nombre: string, porDefecto: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return v || porDefecto;
}

export function estiloCofradar(): StyleSpecification {
  const tierra = token("--cf-map-land", "#e9e5df");
  const calle = token("--cf-map-street", "#ffffff");
  const plaza = token("--cf-map-plaza", "#f7f5f2");
  const agua = token("--cf-map-water", "#cfe0ee");
  const etiqueta = token("--cf-map-label", "#4a453f");
  const halo = token("--cf-map-halo", "#ffffff");
  const aguaEtiqueta = token("--cf-map-water-label", "#2b4a66");

  const ancho = (base: number) =>
    ["interpolate", ["exponential", 1.6], ["zoom"], 12, base * 0.4, 15, base * 2, 18, base * 8] as unknown as number;

  return {
    version: 8,
    glyphs: LETRAS,
    sources: { osm: { type: "vector", url: TESELAS, attribution: "© OpenStreetMap" } },
    layers: [
      { id: "tierra", type: "background", paint: { "background-color": tierra } },
      {
        id: "plazas",
        type: "fill",
        source: "osm",
        "source-layer": "transportation",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": plaza },
      },
      { id: "agua", type: "fill", source: "osm", "source-layer": "water", paint: { "fill-color": agua } },
      {
        id: "calles-menores",
        type: "line",
        source: "osm",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["minor", "service", "pedestrian", "path", "track"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": calle, "line-width": ancho(1) },
      },
      {
        id: "calles",
        type: "line",
        source: "osm",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": calle, "line-width": ancho(1.6) },
      },
      {
        id: "nombres-agua",
        type: "symbol",
        source: "osm",
        "source-layer": "water_name",
        layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Italic"], "text-size": 12 },
        paint: { "text-color": aguaEtiqueta, "text-halo-color": halo, "text-halo-width": 1.5 },
      },
      {
        id: "nombres-calle",
        type: "symbol",
        source: "osm",
        "source-layer": "transportation_name",
        minzoom: 14,
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 14, 10, 17, 13],
        },
        paint: { "text-color": etiqueta, "text-halo-color": halo, "text-halo-width": 2 },
      },
    ],
  };
}

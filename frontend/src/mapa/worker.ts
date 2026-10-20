import { setWorkerUrl } from "maplibre-gl";
import urlWorker from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

/**
 * MapLibre 6 busca su worker junto a su propio fichero (`import.meta.url`).
 * Al empaquetar la app, Vite lo mueve y ese camino deja de existir: aquí se le
 * dice dónde quedó, ya empaquetado como módulo con lo que importa.
 */
setWorkerUrl(urlWorker);

/*
 * Service worker de Cofradar: que la app abra sin conexión (§12.1, F-06).
 *
 * Solo guarda la APP (HTML, JS, CSS, fuentes, iconos). Los DATOS no pasan por
 * aquí: los guarda la propia app en el teléfono con su hora (datos/useDato.ts),
 * para poder decir «último dato hace 12 min». Por eso /api/ se deja pasar sin tocar.
 *
 *   /assets/…        llevan el hash en el nombre y no cambian: primero la caché
 *   páginas          primero la red, para recibir las versiones nuevas; sin red,
 *                    el index.html guardado (las rutas las resuelve React)
 *   el resto         la caché al momento y se actualiza por detrás
 */
const CACHE = "cofradar-app-v1";
const BASE = new URL("./", self.location).pathname;
const ESENCIAL = [BASE, `${BASE}index.html`, `${BASE}manifest.webmanifest`, `${BASE}iconos/favicon.svg`];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESENCIAL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function guardarSiVale(peticion, respuesta) {
  if (respuesta.ok && respuesta.type === "basic") {
    const cache = await caches.open(CACHE);
    await cache.put(peticion, respuesta.clone());
  }
  return respuesta;
}

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  const url = new URL(peticion.url);
  if (peticion.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(`${BASE}api/`)) return;

  if (peticion.mode === "navigate") {
    evento.respondWith(
      fetch(peticion)
        .then((r) => guardarSiVale(`${BASE}index.html`, r))
        .catch(async () => (await caches.match(`${BASE}index.html`)) ?? Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith(`${BASE}assets/`)) {
    evento.respondWith(caches.match(peticion).then((guardada) => guardada ?? fetch(peticion).then((r) => guardarSiVale(peticion, r))));
    return;
  }

  evento.respondWith(
    caches.match(peticion).then((guardada) => {
      const red = fetch(peticion)
        .then((r) => guardarSiVale(peticion, r))
        .catch(() => guardada ?? Response.error());
      return guardada ?? red;
    }),
  );
});

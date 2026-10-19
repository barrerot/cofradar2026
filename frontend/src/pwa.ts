/**
 * Registra el service worker (public/sw.js), que guarda la app para que abra
 * sin conexión y la hace instalable.
 *
 * Solo en el build de producción: en desarrollo, una app guardada esconde los
 * cambios que se están haciendo.
 *
 * No se pide instalar la app ni se escucha `beforeinstallprompt`: la
 * instalación nunca es una barrera ni una insistencia (§ permisos). Quien
 * quiera, la instala desde el menú del navegador.
 */
export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* Sin service worker la app funciona igual, solo que no abre sin conexión. */
    });
  });
}

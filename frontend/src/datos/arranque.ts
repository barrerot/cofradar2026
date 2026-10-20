/**
 * Quita la pantalla de arranque (P-01, index.html).
 *
 * Sale solo la primera vez o sin nada guardado, y está mientras no hay datos:
 * se quita en cuanto termina la primera petición, haya ido bien o mal (sin
 * datos, la app enseña su propio estado). Si llegan antes de que acabe la
 * animación, no se espera a que termine. Si no hay nada que pedir, se quita
 * al acabar la animación.
 */
const DURACION_MS = 2850;

export function quitarArranque() {
  const raiz = document.documentElement;
  if (!("arranque" in raiz.dataset)) return;
  delete raiz.dataset.arranque;
  document.querySelector(".cf-arranque")?.remove();
}

/** Para cuando nadie pide nada: al acabar la animación, si no hay peticiones en curso. */
export function quitarArranqueSiNadaPendiente(pendientes: () => number) {
  window.setTimeout(() => {
    if (pendientes() === 0) quitarArranque();
  }, DURACION_MS);
}

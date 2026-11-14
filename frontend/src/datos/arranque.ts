/**
 * Quita la pantalla de arranque (P-01, index.html).
 *
 * Sale siempre al abrir la web (decisión de Carlos del 14/11/2026) y la
 * animación se ve entera: si los datos llegan antes, se espera a que acabe.
 * Un toque la salta (index.html pone data-saltar) y entonces se quita en
 * cuanto hay datos. La Introducción la quita al momento (`ya`), porque empieza
 * con la misma animación.
 */
const DURACION_MS = 2850;
const inicio = performance.now();

export function quitarArranque(ya = false) {
  const raiz = document.documentElement;
  if (!("arranque" in raiz.dataset)) return;
  const caja = document.querySelector<HTMLElement>(".cf-arranque");
  const falta = DURACION_MS - (performance.now() - inicio);
  if (!ya && falta > 0 && caja && !("saltar" in caja.dataset)) {
    window.setTimeout(() => quitarArranque(true), falta);
    return;
  }
  delete raiz.dataset.arranque;
  caja?.remove();
}

/** Para cuando nadie pide nada: al acabar la animación, si no hay peticiones en curso. */
export function quitarArranqueSiNadaPendiente(pendientes: () => number) {
  window.setTimeout(() => {
    if (pendientes() === 0) quitarArranque();
  }, DURACION_MS);
}

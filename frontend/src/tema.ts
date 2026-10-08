/**
 * Tema y contraste (§5). Son atributos en <html>, no clases:
 *
 *   data-theme     light | dark
 *   data-contrast  max         (opcional)
 *   data-register  editorial   (opcional, por zona)
 *
 * Por defecto se sigue la preferencia del sistema. El selector manual de tema
 * es una decision de producto que todavia no esta tomada, asi que aqui solo
 * queda la puerta abierta: `fijarTema` existe y nadie la llama aun.
 *
 * Se puede forzar por query, con la misma convencion que el fixture usa para
 * recorrer las variantes del export sin motor detras:
 *
 *   ?tema=oscuro   fuerza el oscuro, ignorando la preferencia del sistema
 *   ?tema=claro    fuerza el claro
 *
 * Es ANDAMIO DE REVISION, no una funcion: sirve para mirar una pantalla en
 * los dos temas sin tocar los ajustes del sistema operativo. §5 mantiene
 * «claro por defecto» y esto no lo cambia — mientras no haya parametro, el
 * tema lo sigue decidiendo el sistema. Si alguna vez se decide que durante la
 * jornada el oscuro sea el defecto, esa decision va al PRD, no aqui.
 */
export type Tema = "light" | "dark";

/** El tema forzado por query, si lo hay. */
function temaForzado(busqueda: string): Tema | null {
  const valor = new URLSearchParams(busqueda).get("tema");
  if (valor === "oscuro" || valor === "dark") return "dark";
  if (valor === "claro" || valor === "light") return "light";
  return null;
}

export function seguirTemaDelSistema(): () => void {
  const forzado = temaForzado(window.location.search);
  if (forzado) {
    fijarTema(forzado);
    /* Con tema forzado no se escucha al sistema: el parametro manda hasta que
       se quita de la URL. */
    return () => {};
  }

  const consulta = window.matchMedia("(prefers-color-scheme: dark)");
  const aplicar = () => fijarTema(consulta.matches ? "dark" : "light");

  aplicar();
  consulta.addEventListener("change", aplicar);
  return () => consulta.removeEventListener("change", aplicar);
}

export function fijarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema;
}

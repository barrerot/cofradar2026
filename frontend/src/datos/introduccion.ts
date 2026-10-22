import { guardar, leer } from "./almacen";

/**
 * Cuándo sale la Introducción (P-02). Decisión de Carlos del 22/10/2026: en
 * cada visita nueva por la portada, salvo que se marque «No volver a mostrar».
 *
 * - «No volver a mostrar» se guarda en el teléfono (localStorage) y dura.
 * - «Ya la he visto en esta visita» va en sessionStorage: se borra al cerrar
 *   la pestaña, así que no vuelve a salir cada vez que se pasa por Inicio.
 *
 * Sin almacenamiento (modo privado estricto) no se impone: mejor no verla que
 * verla cada vez que se toca Inicio.
 */
const NO_MOSTRAR = "introduccion-no-mostrar";
const ESTA_VISITA = "cofradar:introduccion-esta-visita";

export function tocaIntroduccion(): boolean {
  if (leer(NO_MOSTRAR)) return false;
  try {
    return sessionStorage.getItem(ESTA_VISITA) === null;
  } catch {
    return false;
  }
}

export const noMostrarIntroduccion = (): boolean => leer<boolean>(NO_MOSTRAR) === true;

export function cerrarIntroduccion(noMostrar: boolean): void {
  guardar(NO_MOSTRAR, noMostrar);
  try {
    sessionStorage.setItem(ESTA_VISITA, "1");
  } catch {
    /* Sin sitio o sin permiso: no pasa nada. */
  }
}

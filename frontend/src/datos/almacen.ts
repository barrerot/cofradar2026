/**
 * Lo que Cofradar guarda en el teléfono (localStorage).
 *
 * §12.1: conservar el último estado conocido «no es una optimización: es la
 * condición para que el resto del sistema funcione». Pero el almacenamiento
 * puede no estar (modo privado, cuota llena, navegador que lo bloquea), y su
 * falta no puede romper nada: se lee `null` y se sigue.
 */
const PREFIJO = "cofradar:";

export function leer<T>(clave: string): T | null {
  try {
    const valor = localStorage.getItem(PREFIJO + clave);
    return valor === null ? null : (JSON.parse(valor) as T);
  } catch {
    return null;
  }
}

export function guardar(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
  } catch {
    /* Sin sitio o sin permiso: se trabaja solo en memoria. */
  }
}

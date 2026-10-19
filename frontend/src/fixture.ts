/**
 * FIXTURE DE DEMOSTRACION · esto NO son datos.
 *
 * Nombres, horas y cofradias salen del fixture del export (Madruga, 02:40, La
 * Macarena). No es informacion real, no sale de ninguna fuente y no debe
 * convertirse en logica de producto.
 *
 * Los datos de verdad vienen de docs/datos/, llevan `fuente` por fila y son
 * el camino critico del hito 1 · Datos y motor. Cuando el backend los sirva,
 * este archivo se borra.
 *
 * El estado se puede forzar por query para recorrer las variantes del export
 * sin motor detras:
 *   ?jornada=activa          jornada en calle, con «Dar fe»
 *   ?jornada=sin-actividad   sin nada en la calle, sin franja de accion
 *   ?jornada=fuera-temporada entre temporadas, con cuenta atras
 *   ?ubicacion=no            sin permiso de ubicacion: «Cerca» no existe
 *   ?cuenta=no               visitante sin cuenta: sin bonus en las novedades
 */

/**
 * Una jornada y su genero gramatical.
 *
 * El genero NO es un detalle de presentacion que se pueda deducir en la
 * plantilla: «Ver toda la Madruga» y «Ver todo el Jueves Santo» cambian el
 * adjetivo y el articulo, y el export escribe las dos formas. Concatenar
 * «Ver toda la » + nombre produce «Ver toda la Jueves Santo». Viaja con el
 * dato porque es una propiedad del nombre, no de la pantalla.
 */
export type Jornada = {
  nombre: string;
  genero: "femenino" | "masculino";
};

/** «Ver toda la Madruga» · «Ver todo el Jueves Santo». */
export function etiquetaVerJornada({ nombre, genero }: Jornada): string {
  return genero === "femenino" ? `Ver toda la ${nombre}` : `Ver todo el ${nombre}`;
}

/**
 * Las tres intensidades de Inicio (§8.3). No son grados de lo mismo: cambian
 * que se muestra y si hay accion.
 *
 *   activa          hay cofradias en la calle AHORA
 *   sin-actividad   es jornada, pero no hay nada en la calle todavia
 *   fuera-temporada no es temporada: cuenta atras a la proxima
 */
export type Intensidad = "activa" | "sin-actividad" | "fuera-temporada";

export type EstadoJornada = {
  /** Si hay algo en la calle AHORA. Depende del estado real, no del calendario. */
  activa: boolean;
  intensidad: Intensidad;
  jornada: Jornada;
  /**
   * Si hay ubicacion utilizable. No es un detalle de presentacion: decide si
   * el bloque «Cerca» y los juicios de alcance existen siquiera.
   */
  ubicacion: boolean;
  /** Si hay sesion. Solo cambia lo que necesita cuenta, nunca la franja. */
  cuenta: boolean;
};

const JORNADAS: Record<Intensidad, Jornada> = {
  activa: { nombre: "Madrugá", genero: "femenino" },
  "sin-actividad": { nombre: "Jueves Santo", genero: "masculino" },
  "fuera-temporada": { nombre: "Domingo de Ramos", genero: "masculino" },
};

export function leerEstadoJornada(busqueda: string): EstadoJornada {
  const parametros = new URLSearchParams(busqueda);
  const pedida = parametros.get("jornada");
  const intensidad: Intensidad =
    pedida === "sin-actividad" || pedida === "fuera-temporada" ? pedida : "activa";

  return {
    activa: intensidad === "activa",
    intensidad,
    jornada: JORNADAS[intensidad],
    ubicacion: parametros.get("ubicacion") !== "no",
    cuenta: parametros.get("cuenta") !== "no",
  };
}

/** Cofradias del fixture, solo para poder navegar a una ficha. */
export const COFRADIAS_FIXTURE = [
  { id: "la-macarena", nombre: "La Macarena" },
  { id: "el-gran-poder", nombre: "El Gran Poder" },
  { id: "esperanza-de-triana", nombre: "Esperanza de Triana" },
  { id: "los-gitanos", nombre: "Los Gitanos" },
  { id: "el-silencio", nombre: "El Silencio" },
  { id: "el-calvario", nombre: "El Calvario" },
] as const;

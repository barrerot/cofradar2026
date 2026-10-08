/**
 * FIXTURE DE DEMOSTRACION del area Cofradias · esto NO son datos.
 *
 * Las seis hermandades son las del export, que son reales. Las demas jornadas
 * NO se rellenan con nombres inventados: son instituciones reales y un nombre
 * falso es un error de producto, no un dato de relleno. En su sitio van las
 * filas de relleno rotuladas que trae 4-cofradias.
 *
 * Cuantas hermandades hay en cada jornada es dato del producto y saldra del
 * backend; aqui solo se declara cuantas barras de relleno dibujar.
 */
import type { DatosCofradia } from "./componentes";

/** Las jornadas, en el orden de la semana. */
export const JORNADAS = [
  "Domingo de Ramos",
  "Lunes Santo",
  "Martes Santo",
  "Miércoles Santo",
  "Jueves Santo",
  "Madrugá",
  "Viernes Santo",
  "Sábado Santo",
] as const;

export type NombreJornada = (typeof JORNADAS)[number];

export type CofradiaDirectorio = DatosCofradia & {
  jornada: NombreJornada;
  /**
   * El nombre por el que se ordena: el popular SIN el articulo. «El Gran
   * Poder» ordena por «Gran Poder», no por «El». Es dato, no una regla que
   * pueda deducir la plantilla: el articulo forma parte del nombre y
   * quitarlo con una expresion regular fallaria en cuanto llegue una
   * hermandad cuyo nombre empiece de verdad por «Los» o «La».
   *
   * DECISION A VALIDAR (ver el issue): que el orden interno sea alfabetico.
   */
  orden: string;
};

/**
 * Las seis de la Madruga, con su estado de la jornada activa.
 *
 * Sin `punto` ni `hora`: en el directorio la pregunta no es «¿que puedo ver
 * ahora?» sino «¿cual es esta?», y el proximo punto es dato de jornada, que
 * pertenece a la Agenda. Por eso El Calvario tampoco trae su salida ni su
 * entrada, aunque el fixture de la jornada las tenga.
 */
const MADRUGA: readonly CofradiaDirectorio[] = [
  {
    id: "el-calvario",
    nombre: "El Calvario",
    orden: "Calvario",
    jornada: "Madrugá",
    fase: "finalizada",
    confianza: "confirmado",
  },
  {
    id: "esperanza-de-triana",
    nombre: "Esperanza de Triana",
    orden: "Esperanza de Triana",
    jornada: "Madrugá",
    fase: "en_calle",
    confianza: "confirmado",
    /* Dos alteraciones: en compacta se muestra la mas grave y la otra se
       cuenta en «+1». No se oculta, se cuenta. */
    alteraciones: [{ tipo: "interrumpida" }, { tipo: "cambio_recorrido" }],
  },
  {
    id: "los-gitanos",
    nombre: "Los Gitanos",
    orden: "Gitanos",
    jornada: "Madrugá",
    fase: "inminente",
    confianza: "confirmado",
    relacion: "seguida",
  },
  {
    id: "el-gran-poder",
    nombre: "El Gran Poder",
    orden: "Gran Poder",
    jornada: "Madrugá",
    fase: "en_calle",
    confianza: "estimado",
    relacion: "seguida",
  },
  {
    id: "la-macarena",
    nombre: "La Macarena",
    orden: "Macarena",
    jornada: "Madrugá",
    fase: "en_calle",
    confianza: "confirmado",
    relacion: "vista",
    alteraciones: [{ tipo: "retraso", minutos: 12 }],
  },
  {
    id: "el-silencio",
    nombre: "El Silencio",
    orden: "Silencio",
    jornada: "Madrugá",
    fase: "en_calle",
    confianza: "desactualizado",
    /* Sin el «·»: lo pone la coletilla del chip. */
    antiguedad: "hace 23 min",
  },
];

/**
 * Cuantas filas de relleno lleva cada jornada que no tenemos transcrita.
 * Las anchuras de las barras tambien son del export: varian para que la
 * pantalla ensene la longitud real del listado sin fingir contenido.
 */
export const RELLENO: Readonly<Record<string, readonly number[]>> = {
  "Domingo de Ramos": [62, 48, 70, 55],
  "Lunes Santo": [58, 66, 44],
  "Martes Santo": [52, 72, 60],
  "Miércoles Santo": [68, 50, 64, 46],
  "Jueves Santo": [56, 70],
  "Viernes Santo": [60, 54, 66],
  "Sábado Santo": [50],
};

export type Filtro = "todas" | "en-calle" | "seguidas";

/**
 * El directorio, agrupado por jornada.
 *
 * Con jornada activa la del dia va PRIMERA y rotulada «· hoy»; el resto, en
 * el orden de la semana. Fuera de temporada no hay jornada de hoy y el orden
 * es el de la semana entero.
 *
 * DECISION A VALIDAR: que la agrupacion sea por jornada y no alfabetica.
 */
export function leerDirectorio({
  jornadaDeHoy,
  conEstado,
}: {
  jornadaDeHoy: NombreJornada | null;
  /** Fuera de temporada no hay ningun estado operativo que mostrar. */
  conEstado: boolean;
}) {
  const cofradias: readonly CofradiaDirectorio[] = conEstado
    ? MADRUGA
    : /* Fuera de temporada la fila se queda en lo que es permanente: marca de
         relacion y nombre. Sin fase no hay chip, y no se sustituye por uno
         que diga «Prevista»: no habria dato detras. */
      MADRUGA.map(
        ({ fase: _f, confianza: _c, antiguedad: _a, alteraciones: _al, ...resto }) => resto,
      );

  const orden =
    jornadaDeHoy === null
      ? JORNADAS
      : [jornadaDeHoy, ...JORNADAS.filter((j) => j !== jornadaDeHoy)];

  return orden.map((jornada) => ({
    jornada,
    hoy: jornada === jornadaDeHoy,
    cofradias: cofradias.filter((c) => c.jornada === jornada),
    relleno: RELLENO[jornada] ?? [],
  }));
}

/**
 * Busca por el COMIENZO DE CUALQUIER PALABRA del nombre popular: «g» trae
 * «Los Gitanos» y «El Gran Poder», y «triana» trae «Esperanza de Triana».
 * No se busca por subcadena en medio de una palabra —«ran» no traeria «Gran
 * Poder»—, que daria coincidencias que el usuario no sabe explicarse.
 */
export function coincide(nombre: string, consulta: string): boolean {
  const q = normalizar(consulta.trim());
  if (q === "") return true;
  return normalizar(nombre)
    .split(/\s+/)
    .some((palabra) => palabra.startsWith(q));
}

/** Sin tildes y en minusculas: «macarena» encuentra «Macarena». */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * FIXTURE DE DEMOSTRACION de Inicio · esto NO son datos.
 *
 * Nombres, horas, puntos, distancias y novedades salen de las capturas de
 * docs/design/pantallas/2-inicio-ahora. No salen de ninguna fuente y no deben
 * convertirse en logica de producto. Cuando el backend sirva el estado de la
 * jornada, este archivo se borra.
 *
 * Dos cosas del export son encuadre de la demostracion, no dato, y las notas
 * de diseño lo rotulan asi:
 *   · Que las novedades ocurrieran «mientras no estabas».
 *   · El bonus de puntos y su cifra.
 */
import type { DatoAlteracion, DatosCofradia, Novedad, Relacion, TipoAviso } from "./componentes";
import type { Intensidad } from "./fixture";

export type Incidencia = {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  cuerpo: string;
  procedencia: "cofradar" | "usuarios";
};

/** Jornada en curso con cofradias en la calle. */
export type InicioActivo = {
  intensidad: "activa";
  /** Contexto de toda la jornada. Sin banda no se pinta nada. */
  banda?: { texto: string; critica: boolean };
  /** «Cerca». Vacio sin ubicacion, y entonces el bloque entero desaparece. */
  cerca: readonly DatosCofradia[];
  enCalle: readonly DatosCofradia[];
  incidencias: readonly Incidencia[];
  aPuntoDeOcurrir: readonly DatosCofradia[];
  novedades: readonly Novedad[];
};

/** Es jornada, pero no hay nada en la calle. Informacion, no fallo. */
export type InicioSinActividad = {
  intensidad: "sin-actividad";
  titular: string;
  /** La frase de la proxima salida, partida para destacar la hora. */
  proximaSalida: { antes: string; hora: string; despues: string };
};

/** Entre temporadas. */
export type InicioFueraDeTemporada = {
  intensidad: "fuera-temporada";
  proxima: { nombre: string; fecha: string; dias: number };
  /** Lo personal con sentido: tus seguidas y vistas, con su marca. */
  tuyo: readonly { id: string; nombre: string; relacion: Relacion }[];
};

export type ContenidoInicio = InicioActivo | InicioSinActividad | InicioFueraDeTemporada;

const RETRASO_12: readonly DatoAlteracion[] = [{ tipo: "retraso", minutos: 12 }];

/* Esperanza de Triana lleva dos alteraciones. En compacta se muestra la mas
   grave —interrumpida— y la otra se cuenta en «+1»: no se oculta, se cuenta. */
const INTERRUMPIDA_Y_CAMBIO: readonly DatoAlteracion[] = [
  { tipo: "interrumpida" },
  { tipo: "cambio_recorrido" },
];

/** La unica en estandar: es donde el juicio de alcance aporta algo. */
const LA_MACARENA: DatosCofradia = {
  id: "la-macarena",
  nombre: "La Macarena",
  fase: "en_calle",
  confianza: "confirmado",
  relacion: "vista",
  alteraciones: RETRASO_12,
  punto: "Campana",
  hora: "03:05",
  horaEstimada: true,
  proximidad: "A 450 m · parece alcanzable",
};

/** Sin ubicacion no hay proximidad, y sin proximidad no hay estandar. */
const LA_MACARENA_SIN_UBICACION: DatosCofradia = { ...LA_MACARENA, proximidad: undefined };

const EL_GRAN_PODER: DatosCofradia = {
  id: "el-gran-poder",
  nombre: "El Gran Poder",
  fase: "en_calle",
  confianza: "estimado",
  relacion: "seguida",
  punto: "Sierpes",
  hora: "02:55",
  horaEstimada: true,
};

const EL_SILENCIO: DatosCofradia = {
  id: "el-silencio",
  nombre: "El Silencio",
  fase: "en_calle",
  confianza: "desactualizado",
  antiguedad: "hace 23 min",
  punto: "Catedral",
  hora: "03:10",
  horaEstimada: true,
};

const ESPERANZA_DE_TRIANA: DatosCofradia = {
  id: "esperanza-de-triana",
  nombre: "Esperanza de Triana",
  fase: "en_calle",
  confianza: "confirmado",
  alteraciones: INTERRUMPIDA_Y_CAMBIO,
  punto: "Puente de Triana",
  hora: "03:20",
  horaEstimada: true,
};

const LOS_GITANOS: DatosCofradia = {
  id: "los-gitanos",
  nombre: "Los Gitanos",
  fase: "inminente",
  confianza: "confirmado",
  relacion: "seguida",
  punto: "Salida",
  hora: "03:00",
};

const BANDA = { texto: "Riesgo de lluvia esta madrugada.", critica: false } as const;

const INCIDENCIAS: readonly Incidencia[] = [
  {
    id: "esperanza-interrumpida",
    tipo: "critico",
    titulo: "Esperanza de Triana, interrumpida",
    cuerpo:
      "Está detenida y cambiará su recorrido. Su paso por el Puente de Triana, previsto hacia las 03:20, puede retrasarse.",
    procedencia: "cofradar",
  },
];

/**
 * Lee el contenido de Inicio.
 *
 * `ubicacion` cambia la pantalla de verdad, no un detalle: sin ella el bloque
 * «Cerca» NO EXISTE —sin hueco, sin encabezado, sin mensaje y sin invitacion
 * a conceder permisos— y «En la calle» pasa a ser el primero con las cuatro
 * cofradias, ordenadas por la hora de su proximo punto.
 *
 * `cuenta` solo afecta a «Mientras no estabas»: los cambios de las seguidas
 * se ven igual porque seguir funciona en local; el bonus necesita cuenta.
 */
export function leerContenidoInicio({
  intensidad,
  ubicacion,
  cuenta,
}: {
  intensidad: Intensidad;
  ubicacion: boolean;
  cuenta: boolean;
}): ContenidoInicio {
  if (intensidad === "sin-actividad") {
    return {
      intensidad,
      titular: "Ahora mismo no hay ninguna cofradía en la calle.",
      proximaSalida: {
        antes: "La próxima salida prevista es a las ",
        hora: "18:00",
        despues: ".",
      },
    };
  }

  if (intensidad === "fuera-temporada") {
    /* FECHA DE EJEMPLO. El export fija hoy = 8 de octubre de 2026, y de ahi
       salen los 164 dias. La cuenta atras va en DIAS, sin horas ni segundos:
       a cinco meses y medio vista es la unidad que sirve. */
    return {
      intensidad,
      proxima: { nombre: "Domingo de Ramos", fecha: "21 de marzo de 2027", dias: 164 },
      tuyo: [
        { id: "el-gran-poder", nombre: "El Gran Poder", relacion: "seguida" },
        { id: "los-gitanos", nombre: "Los Gitanos", relacion: "seguida" },
        { id: "la-macarena", nombre: "La Macarena", relacion: "vista" },
      ],
    };
  }

  const novedades: Novedad[] = [
    {
      id: "gran-poder-en-calle",
      relacion: "seguida",
      partes: [
        { tipo: "nombre", valor: "El Gran Poder" },
        { tipo: "texto", valor: " ya está en la calle" },
      ],
    },
    {
      id: "gitanos-salida",
      relacion: "seguida",
      partes: [
        { tipo: "nombre", valor: "Los Gitanos" },
        { tipo: "texto", valor: " sale a las " },
        { tipo: "cifra", valor: "03:00" },
      ],
    },
  ];

  /* El bonus necesita cuenta; el resto de novedades, no. */
  if (cuenta) {
    novedades.push({
      id: "bonus",
      relacion: "dar-fe",
      verificacion: "verificada",
      partes: [
        { tipo: "texto", valor: "Una aportación tuya ayudó a situar una cofradía. " },
        { tipo: "puntos", valor: "+15 puntos" },
      ],
    });
  }

  if (!ubicacion) {
    return {
      intensidad: "activa",
      banda: BANDA,
      cerca: [],
      enCalle: [EL_GRAN_PODER, LA_MACARENA_SIN_UBICACION, EL_SILENCIO, ESPERANZA_DE_TRIANA],
      incidencias: INCIDENCIAS,
      aPuntoDeOcurrir: [LOS_GITANOS],
      novedades,
    };
  }

  return {
    intensidad: "activa",
    banda: BANDA,
    cerca: [LA_MACARENA, EL_GRAN_PODER],
    enCalle: [EL_SILENCIO, ESPERANZA_DE_TRIANA],
    incidencias: INCIDENCIAS,
    aPuntoDeOcurrir: [LOS_GITANOS],
    novedades,
  };
}

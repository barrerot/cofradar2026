import { Icono } from "./Icono";

/**
 * Ultima sincronizacion (§7.3). Es lo UNICO que la cabecera lleva siempre, en
 * todas las vistas: el resto de la cabecera lo compone cada ruta.
 *
 * PROVISIONAL · el export rotula este elemento «formato e icono NO DEFINIDOS».
 * Por eso aqui no se decide nada: el texto entra por `texto` y el formateo
 * vive fuera (ver formatearSincronizacion, que es un marcador de posicion
 * explicito y esta a un cambio de distancia de lo que se decida).
 */
export function IndicadorSincronizacion({
  instante,
  texto,
}: {
  /** Momento de la ultima sincronizacion correcta. */
  instante: Date | null;
  /** Texto ya formateado. Si no se pasa, se usa el formateo provisional. */
  texto?: string;
}) {
  const contenido = texto ?? formatearSincronizacion(instante);

  return (
    <span className="cf-marco-sync">
      <Icono nombre="sincronizar" tamano={16} />
      {instante ? (
        <time dateTime={instante.toISOString()}>{contenido}</time>
      ) : (
        <span>{contenido}</span>
      )}
    </span>
  );
}

/**
 * NO DEFINIDO en el design system. Esto es un relleno funcional para poder
 * ver el marco, no la decision de producto: ni el formato («hace 1 min») ni
 * el umbral a partir del cual el dato se considera viejo estan fijados.
 */
export function formatearSincronizacion(instante: Date | null): string {
  if (!instante) return "sin sincronizar";

  const minutos = Math.floor((Date.now() - instante.getTime()) / 60_000);
  if (minutos < 1) return "ahora mismo";
  if (minutos === 1) return "hace 1 min";
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  return horas === 1 ? "hace 1 h" : `hace ${horas} h`;
}

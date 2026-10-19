import { hace, useReloj, useSincronizacion } from "../datos/sincronizacion";
import { Icono } from "./Icono";

/**
 * Última sincronización (§7.3). Es lo ÚNICO que la cabecera lleva siempre, en
 * todas las vistas, junto con la jornada consultada.
 *
 * Con conexión, el icono de sincronizar; sin ella, la nube tachada y la misma
 * antigüedad (1-marco/armazon-5). Es global: no dice cuándo es cada dato, eso
 * va pegado al dato cuando importa para decidir.
 *
 * Mientras hay una petición en curso dice «actualizando» (estados 1 y 2): es el
 * indicador discreto del refresco, nunca un bloqueo. Sin conexión y sin haber
 * sincronizado nunca, «sin conexión» (estado 6).
 */
export function IndicadorSincronizacion() {
  const { ultima, conexion, refrescando } = useSincronizacion();
  const ahora = useReloj();
  const sinConexion = conexion === "sin-conexion";
  const texto =
    refrescando && !sinConexion ? "actualizando" : ultima ? hace(ultima, ahora) : sinConexion ? "sin conexión" : "actualizando";

  return (
    <span className="cf-marco-sync" aria-busy={refrescando} data-conexion={conexion}>
      <Icono
        nombre={sinConexion ? "sinConexion" : "sincronizar"}
        tamano={16}
        etiqueta={sinConexion ? "Sin conexión. Último dato" : "Sincronizado"}
      />
      {ultima && texto !== "actualizando" ? <time dateTime={ultima.toISOString()}>{texto}</time> : <span>{texto}</span>}
    </span>
  );
}

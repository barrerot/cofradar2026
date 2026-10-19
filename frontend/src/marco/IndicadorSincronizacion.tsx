import { hace, useReloj, useSincronizacion } from "../datos/sincronizacion";
import { Icono } from "./Icono";

/**
 * Última sincronización (§7.3). Es lo ÚNICO que la cabecera lleva siempre, en
 * todas las vistas, junto con la jornada consultada.
 *
 * Con conexión, el icono de sincronizar; sin ella, la nube tachada y la misma
 * antigüedad (1-marco/armazon-5). Es global: no dice cuándo es cada dato, eso
 * va pegado al dato cuando importa para decidir.
 */
export function IndicadorSincronizacion() {
  const { ultima, conexion, refrescando } = useSincronizacion();
  const ahora = useReloj();
  const sinConexion = conexion === "sin-conexion";
  const texto = ultima ? hace(ultima, ahora) : sinConexion ? "sin datos" : "sincronizando";

  return (
    <span className="cf-marco-sync" aria-busy={refrescando} data-conexion={conexion}>
      <Icono
        nombre={sinConexion ? "sinConexion" : "sincronizar"}
        tamano={16}
        etiqueta={sinConexion ? "Sin conexión. Último dato" : "Sincronizado"}
      />
      {ultima ? <time dateTime={ultima.toISOString()}>{texto}</time> : <span>{texto}</span>}
    </span>
  );
}

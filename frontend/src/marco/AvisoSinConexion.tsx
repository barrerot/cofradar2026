import { hace, useReloj, useSincronizacion } from "../datos/sincronizacion";
import { Icono } from "./Icono";

/**
 * «Sin conexión · último dato hace 12 min», bajo la cabecera (§8.2, §12.2,
 * 1-marco/armazon-5). Es del marco, no de cada pantalla: sale en todas igual.
 *
 * Sin nada guardado no sale: no hay «último dato» del que hablar, y la
 * pantalla ya dice que necesita conexión (0-sistema/estados/6).
 *
 * Solo informa. No bloquea nada y no tiene botón: los datos se vuelven a pedir
 * solos al volver la red. Mientras tanto la pantalla enseña lo último guardado,
 * congelado, y nunca calcula posiciones a partir del horario (D35).
 */
export function AvisoSinConexion() {
  const { ultima, conexion } = useSincronizacion();
  const ahora = useReloj();

  return (
    <div className="cf-marco-aviso" role="status" aria-live="polite">
      {conexion === "sin-conexion" && ultima ? (
        <div className="cf-band">
          <Icono nombre="sinConexion" tamano={20} />
          <span className="txt">
            Sin conexión · último dato {hace(ultima, ahora)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

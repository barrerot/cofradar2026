import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boton, Icono, PantallaSecundaria } from "../marco";
import { useDescargarDatos } from "../datos/descarga";
import { cabecerasSesion, useSesion } from "../datos/sesion";

/**
 * P-24 Eliminar cuenta (7-mi-cofradar/eliminar-cuenta).
 *
 * Explica en llano qué se borra y qué se conserva, ofrece descargar los datos
 * en la misma pantalla y pide una casilla antes del botón de peligro, que está
 * desactivado hasta marcarla. Es inmediato: DELETE /api/yo borra la cuenta y
 * con ella las seguidas y las vistas. Después se sale y se vuelve a Mi
 * Cofradar con un aviso.
 *
 * «Se conserva, sin tu nombre» habla de las aportaciones de «Dar fe», que
 * llegan con la fase 4. El texto es el aprobado en el diseño; su encaje legal
 * está pendiente de revisar antes del lanzamiento (BUL-223).
 */
export function EliminarCuenta() {
  const { usuario, salir } = useSesion();
  const navegar = useNavigate();
  const casilla = useId();
  const [entiendo, setEntiendo] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const { estado: descarga, descargar } = useDescargarDatos();

  const eliminar = async () => {
    setBorrando(true);
    setFallo(false);
    try {
      const r = await fetch("/api/yo", { method: "DELETE", headers: await cabecerasSesion() });
      if (!r.ok) throw new Error(String(r.status));
      await salir();
      navegar("/mi-cofradar", { replace: true, state: { cuentaEliminada: true } });
    } catch {
      setBorrando(false);
      setFallo(true);
    }
  };

  return (
    <PantallaSecundaria titulo="Eliminar cuenta" vuelta={{ etiqueta: "Cuenta", ruta: "/mi-cofradar/cuenta" }}>
      {usuario === null ? (
        <p className="cf-cuenta-nota">No has entrado con ninguna cuenta.</p>
      ) : (
        <div className="cf-eliminar">
          <section className="cf-eliminar-caja" aria-labelledby="se-borra">
            <h2 id="se-borra">Se borra</h2>
            <ul>
              <li>Tu cuenta</li>
              <li>Tus puntos y tu nivel</li>
              <li>Tu colección</li>
              <li>Tus seguidas</li>
              <li>Tu historial de aportaciones</li>
            </ul>
          </section>

          <section className="cf-eliminar-caja" aria-labelledby="se-conserva">
            <h2 id="se-conserva">Se conserva, sin tu nombre</h2>
            <p>Que alguien vio un paso en un sitio a una hora. Se queda porque sostiene lo que Cofradar publicó esa noche.</p>
          </section>

          <div className="cf-eliminar-copia">
            <p>Si quieres guardar una copia, descárgala antes.</p>
            <Boton variante="secundario" cargando={descarga === "bajando"} onClick={() => void descargar()}>
              <Icono nombre="descargar" tamano={20} />
              Descargar mis datos
            </Boton>
            {descarga === "fallo" ? <p role="status">No se ha podido descargar. Inténtalo de nuevo en un momento.</p> : null}
          </div>

          <div className="cf-eliminar-confirmar">
            <label htmlFor={casilla} className="cf-eliminar-casilla">
              <input id={casilla} type="checkbox" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} />
              <span>Entiendo que es inmediato y no se puede deshacer</span>
            </label>
            <Boton variante="peligro" tamano="52" disabled={!entiendo} cargando={borrando} onClick={() => void eliminar()}>
              Eliminar mi cuenta
            </Boton>
            <p className="cf-eliminar-pista" role="status">
              {fallo
                ? "No se ha podido eliminar. Inténtalo de nuevo en un momento."
                : entiendo
                  ? ""
                  : "Marca la casilla para continuar."}
            </p>
          </div>
        </div>
      )}
    </PantallaSecundaria>
  );
}

import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AvisoEntrada } from "../componentes";
import { Boton, HojaDecision, Icono, PantallaSecundaria, type NombreTrazo } from "../marco";
import { useDescargarDatos } from "../datos/descarga";
import { useSesion } from "../datos/sesion";

/**
 * P-23 Cuenta (7-mi-cofradar/cuenta).
 *
 *   Cuenta de Google        con la que has entrado.
 *   Cambiar de cuenta       cierra esta sesión y abre el selector de cuentas de
 *                           Google. Avisa antes: lo tuyo se queda en ESTA cuenta,
 *                           no se pasa a la otra.
 *   Descargar mis datos     todo lo que Cofradar guarda de ti, en un fichero
 *                           (GET /api/yo/datos).
 *   Cerrar sesión           no borra nada: lo tuyo sigue en tu cuenta.
 *   Eliminar cuenta         en rojo y aparte (P-24, 2.6).
 *
 * Solo con sesión: sin ella no hay cuenta que enseñar y se vuelve a Mi Cofradar.
 */
export function Cuenta() {
  const { usuario, entrar, salir } = useSesion();
  const navegar = useNavigate();
  const [cambiando, setCambiando] = useState(false);
  const { estado: descarga, descargar } = useDescargarDatos();

  const cerrar = async () => {
    await salir();
    navegar("/mi-cofradar");
  };

  const cambiar = async () => {
    setCambiando(false);
    await salir();
    await entrar("cuenta", "/mi-cofradar/cuenta");
  };

  return (
    <PantallaSecundaria titulo="Cuenta" vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }} sangrado="lista">
      <AvisoEntrada motivo="cuenta" />
      {usuario === null ? (
        <p className="cf-cuenta-nota">No has entrado con ninguna cuenta.</p>
      ) : usuario ? (
        <div className="cf-cuenta">
          <section className="cf-cuenta-grupo" aria-label="Tu cuenta">
            <div className="cf-ajustes-fila">
              <p className="cf-cuenta-rotulo">Cuenta de Google</p>
              <p className="cf-cuenta-correo">{usuario.email ?? usuario.nombre}</p>
            </div>
            <Accion icono="cambiarCuenta" onClick={() => setCambiando(true)}>
              Cambiar de cuenta de Google
            </Accion>
          </section>

          <section className="cf-cuenta-grupo" aria-label="Tus datos">
            <Accion icono="descargar" onClick={() => void descargar()} cargando={descarga === "bajando"}>
              Descargar mis datos
            </Accion>
            {descarga === "fallo" ? (
              <p className="cf-cuenta-nota" role="status">
                No se ha podido descargar. Inténtalo de nuevo en un momento.
              </p>
            ) : null}
          </section>

          <section className="cf-cuenta-grupo" aria-label="Sesión">
            <Accion icono="salir" onClick={() => void cerrar()}>
              Cerrar sesión
            </Accion>
            <p className="cf-cuenta-nota">No se borra nada: lo tuyo sigue en tu cuenta para la próxima vez.</p>
          </section>

          <Link to="/mi-cofradar/cuenta/eliminar" className="cf-cuenta-eliminar">
            <Icono nombre="papelera" tamano={24} />
            Eliminar cuenta
          </Link>

          <HojaDecision
            abierta={cambiando}
            icono={<Icono nombre="cambiarCuenta" tamano={24} />}
            titulo="¿Cambiar de cuenta de Google?"
            alCerrar={() => setCambiando(false)}
            acciones={
              <>
                <Boton variante="primario" tamano="52" onClick={() => void cambiar()}>
                  Elegir otra cuenta
                </Boton>
                <Boton variante="secundario" tamano="52" onClick={() => setCambiando(false)}>
                  Seguir con esta
                </Boton>
              </>
            }
          >
            <p>
              Se cierra la sesión de {usuario.email ?? "esta cuenta"} y eliges otra. Lo que tienes guardado (seguidas
              y vistas) se queda en esta cuenta: no pasa a la otra. Puedes volver a entrar con esta cuando quieras.
            </p>
          </HojaDecision>
        </div>
      ) : null}
    </PantallaSecundaria>
  );
}

function Accion({
  icono,
  onClick,
  cargando = false,
  children,
}: {
  icono: NombreTrazo;
  onClick: () => void;
  cargando?: boolean;
  children: ReactNode;
}) {
  return (
    <button type="button" className="cf-ajustes-fila cf-ajustes-enlace cf-cuenta-accion" onClick={onClick} aria-busy={cargando || undefined} disabled={cargando}>
      <Icono nombre={icono} tamano={24} />
      <span>{cargando ? "Preparando…" : children}</span>
      <Icono nombre="chevronDerecha" tamano={20} />
    </button>
  );
}

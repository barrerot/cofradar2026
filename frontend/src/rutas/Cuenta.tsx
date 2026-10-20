import { useEffect, useState } from "react";
import { Boton, PantallaSecundaria } from "../marco";
import { cabecerasSesion, useSesion } from "../datos/sesion";
import { Relleno } from "./Relleno";

/**
 * P-23 Cuenta. Andamio hasta la 2.5: la cuenta de Google con la que has
 * entrado, que el servidor la reconoce y «Cerrar sesión». Descargar datos y
 * eliminar la cuenta llegan con la 2.5 y la 2.6.
 */
export function Cuenta() {
  const { usuario, salir } = useSesion();
  const [servidor, setServidor] = useState<string>();

  useEffect(() => {
    if (!usuario) return setServidor(undefined);
    let vivo = true;
    cabecerasSesion()
      .then((cabeceras) => fetch("/api/yo", { headers: cabeceras }))
      .then((r) => (r.ok ? "El servidor te reconoce." : `El servidor no te reconoce (${r.status}).`))
      .catch(() => "No se ha podido preguntar al servidor.")
      .then((texto) => vivo && setServidor(texto));
    return () => {
      vivo = false;
    };
  }, [usuario]);

  return (
    <PantallaSecundaria titulo="Cuenta" vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }}>
      <section className="cf-cuenta-provisional" aria-label="Cuenta">
        {usuario ? (
          <>
            <p>
              Has entrado como <strong>{usuario.nombre ?? usuario.email}</strong>
              {usuario.nombre && usuario.email ? ` (${usuario.email})` : null}.
            </p>
            {servidor ? <p data-servidor>{servidor}</p> : null}
            <Boton variante="secundario" onClick={() => void salir()}>
              Cerrar sesión
            </Boton>
          </>
        ) : (
          <p>No has entrado con ninguna cuenta.</p>
        )}
      </section>
      <Relleno>Descargar tus datos y eliminar la cuenta · llegan con la 2.5 y la 2.6</Relleno>
    </PantallaSecundaria>
  );
}

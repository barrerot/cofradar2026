import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AvisoEntrada } from "../componentes";
import { Boton, Marco } from "../marco";
import { cabecerasSesion, useSesion } from "../datos/sesion";
import { CabeceraRaiz } from "./CabeceraRaiz";
import { Relleno } from "./Relleno";

/**
 * Mi Cofradar · la capa personal.
 *
 * Lo que antes era «Mi tramo». No cambia de posicion en la navegacion segun
 * la intensidad (§8.3): fuera de temporada gana protagonismo, no sitio.
 *
 * Sin franja de accion: «Dar fe» es contextual y aqui no hay contexto donde
 * dar fe de nada.
 *
 * La cabecera lleva la jornada consultada como todas las areas: §8.2 dice
 * que «ningun area es excepcion» (D35).
 */
export function MiCofradar() {
  return (
    <Marco cabecera={<CabeceraRaiz />}>
      <AvisoEntrada motivo="mi-cofradar" />
      <Relleno>Mi Cofradar · capa personal</Relleno>
      {/* Andamio hasta la portada de verdad (3.6, P-19), que lleva abajo Cuenta,
          Ajustes y Ayuda y fuentes. */}
      <nav className="cf-lista-provisional" aria-label="Más" style={{ marginTop: "var(--cf-space-4)" }}>
        <Link to="/mi-cofradar/ajustes">Ajustes</Link>
        <Link to="/mi-cofradar/ayuda">Ayuda y fuentes</Link>
      </nav>
      <CuentaProvisional />
    </Marco>
  );
}

/**
 * Andamio de la 2.1 y 2.3: entrar y salir con Google y ver que el servidor reconoce
 * la sesión. Lo sustituyen la portada sin cuenta (P-19, «Entrar con Google»
 * como botón secundario) y Cuenta (P-23, 2.5).
 */
function CuentaProvisional() {
  const { usuario, disponible, entrar, salir } = useSesion();
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

  if (!disponible || usuario === undefined) return null;

  return (
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
        <Boton variante="secundario" onClick={() => void entrar("mi-cofradar")}>
          Entrar con Google
        </Boton>
      )}
    </section>
  );
}

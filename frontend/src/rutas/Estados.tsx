import { useSearchParams } from "react-router-dom";
import {
  DatoPendiente,
  ErrorCarga,
  Esqueleto,
  NadaEnLaCalle,
  NecesitaConexion,
  SinCartografia,
} from "../componentes";
import { Marco, PantallaSecundaria } from "../marco";
import { CabeceraRaiz } from "./CabeceraRaiz";
import { Relleno } from "./Relleno";

/**
 * ANDAMIO DE REVISIÓN · /estados
 *
 * Los ocho estados de 0-sistema/estados/ dentro del marco real, para mirarlos
 * y probarlos sin cortar la red ni romper el servidor. No está en la
 * navegación: se entra escribiendo la dirección.
 *
 * Los enlaces son <a> normales y no del router, porque los forzados de la
 * cabecera (?conexion=sin, ?actualizando=si…) se leen al cargar la página.
 */
const ESTADOS = [
  { n: "1", nombre: "Primera carga", query: "&actualizando=si" },
  { n: "2", nombre: "Refrescando", query: "&actualizando=si" },
  { n: "3", nombre: "No hay nada en la calle", query: "" },
  { n: "4", nombre: "Sin datos («Dato pendiente»)", query: "" },
  { n: "5", nombre: "Sin conexión, con datos", query: "&conexion=sin" },
  { n: "6", nombre: "Sin conexión y sin nada guardado", query: "&conexion=sin&sincronizacion=nunca" },
  { n: "7", nombre: "Sin cartografía", query: "" },
  { n: "8", nombre: "Error", query: "" },
] as const;

export function Estados() {
  const [parametros] = useSearchParams();
  const ver = parametros.get("ver");

  if (ver === "4") {
    return (
      <PantallaSecundaria registro="editorial" titulo="La Soledad de San Lorenzo" vuelta={{ etiqueta: "Estados", ruta: "/estados" }}>
        <dl className="cf-estados-ficha">
          <dt>Sede</dt>
          <dd>Parroquia de San Lorenzo Mártir</dd>
          <dt>Salida y entrada</dt>
          <dd>
            <DatoPendiente />
          </dd>
          <dt>Hermanos y nazarenos</dt>
          <dd>
            <DatoPendiente />
          </dd>
        </dl>
      </PantallaSecundaria>
    );
  }

  return (
    <Marco cabecera={<CabeceraRaiz />}>
      {ver === "1" ? <Esqueleto /> : null}
      {ver === "2" ? <Relleno>El contenido anterior sigue a la vista y se puede usar</Relleno> : null}
      {ver === "3" ? (
        <NadaEnLaCalle>
          La primera salida es a las <strong>15:30</strong> · La Quinta Angustia (ejemplo)
        </NadaEnLaCalle>
      ) : null}
      {ver === "5" ? <Relleno>Lo último guardado, congelado, con su antigüedad</Relleno> : null}
      {ver === "6" ? <NecesitaConexion onReintentar={() => window.location.reload()} /> : null}
      {ver === "7" ? (
        <>
          <SinCartografia />
          <Relleno>Las posiciones en lista</Relleno>
        </>
      ) : null}
      {ver === "8" ? <ErrorCarga onReintentar={() => window.location.reload()} /> : null}
      {ver === null ? (
        <nav className="cf-lista-provisional" aria-label="Estados">
          {ESTADOS.map((e) => (
            <a key={e.n} href={`?ver=${e.n}${e.query}`}>
              {e.n} · {e.nombre}
            </a>
          ))}
        </nav>
      ) : null}
    </Marco>
  );
}

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChipAlteracion, ChipEstado, Contorno } from "../componentes";
import { Icono, PantallaSecundaria } from "../marco";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";

/**
 * P-26 Ayuda y fuentes (7-mi-cofradar/ayuda-y-fuentes, F-35).
 *
 * Textos fijos, sin datos del servidor:
 *
 *   Cómo leer Cofradar   la leyenda. El trazo dice cuánto fiarse de una hora
 *                        (continuo, discontinuo, discontinuo con reloj) y el
 *                        color dice el estado. Se dibuja con los MISMOS chips
 *                        que la app, no con imágenes: si el sistema cambia,
 *                        la leyenda cambia con él.
 *   De dónde salen       el Consejo, siempre citado, lo que la gente ve con
 *                        «Dar fe» y la cartografía de OpenStreetMap.
 *   Legal                privacidad y aviso legal.
 */
export function Ayuda({ estado }: { estado: EstadoJornada }) {
  return (
    <PantallaSecundaria
      titulo="Ayuda y fuentes"
      vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }}
      sangrado="lista"
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <section className="cf-ajustes-grupo" aria-labelledby="ayuda-leer">
        <h2 id="ayuda-leer" className="cf-ayuda-seccion">
          Cómo leer Cofradar
        </h2>

        <h3 className="cf-ajustes-titulo">Cuánto fiarse de una hora</h3>
        <Leyenda
          muestra={<Hora confianza="confirmado">02:36</Hora>}
          nombre="Trazo continuo:"
          texto="confirmado. Alguien lo ha visto."
        />
        <Leyenda
          muestra={
            <Hora confianza="estimado">
              02:50 <span className="cf-ayuda-coletilla">· según horario</span>
            </Hora>
          }
          nombre="Discontinuo:"
          texto="estimado a partir del horario previsto."
        />
        <Leyenda
          muestra={
            <Hora confianza="desactualizado">
              <Icono nombre="desactualizado" tamano={20} />
              02:17 <span className="cf-ayuda-coletilla">· hace 23 min</span>
            </Hora>
          }
          nombre="Discontinuo y reloj:"
          texto="desactualizado. Es el último dato, pero tiene tiempo."
        />

        <h3 className="cf-ajustes-titulo">Colores de estado</h3>
        <Leyenda muestra={<ChipEstado fase="en_calle" />} texto="Verde: en la calle y confirmado." />
        <Leyenda
          muestra={<ChipAlteracion alteracion={{ tipo: "retraso" }} />}
          texto="Ámbar: retraso, adelanto, cambio de recorrido e inminente."
        />
        <Leyenda
          muestra={<ChipAlteracion alteracion={{ tipo: "incidencia" }} />}
          texto="Rojo: incidencia, interrumpida, regreso anticipado y cancelada."
        />
        <Leyenda
          muestra={
            // No hay fase ni alteración azul: la información es la familia de los avisos.
            <span className="cf-chip" data-leyenda="informacion">
              <Contorno />
              <Icono nombre="informativo" tamano={16} />
              <span>Información</span>
            </span>
          }
          texto="Azul: información y lluvia."
        />
        <Leyenda muestra={<ChipEstado fase="prevista" />} texto="Gris: prevista y finalizada." />
      </section>

      <section className="cf-ajustes-grupo" aria-labelledby="ayuda-fuentes">
        <h2 id="ayuda-fuentes" className="cf-ayuda-seccion">
          De dónde salen los datos
        </h2>
        <div className="cf-ajustes-fila">
          <p className="cf-ayuda-fuentes">
            Horarios e itinerarios del Consejo General de Hermandades y Cofradías de Sevilla, y lo que la gente
            ve en la calle con «Dar fe».
          </p>
          <p className="cf-ajustes-texto">
            Mapa:{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              © colaboradores de OpenStreetMap
            </a>
          </p>
        </div>
      </section>

      <section className="cf-ajustes-grupo" aria-label="Introducción">
        <Link to="/introduccion" className="cf-ajustes-fila cf-ajustes-enlace">
          <Icono nombre="informativo" tamano={24} />
          <span>Ver la introducción otra vez</span>
          <Icono nombre="chevronDerecha" tamano={20} />
        </Link>
      </section>

      <section className="cf-ajustes-grupo" aria-label="Información legal">
        <Link to="/mi-cofradar/ayuda/privacidad" className="cf-ajustes-fila cf-ajustes-enlace">
          <Icono nombre="documento" tamano={24} />
          <span>Política de privacidad</span>
          <Icono nombre="chevronDerecha" tamano={20} />
        </Link>
        <Link to="/mi-cofradar/ayuda/aviso-legal" className="cf-ajustes-fila cf-ajustes-enlace">
          <Icono nombre="documento" tamano={24} />
          <span>Aviso legal</span>
          <Icono nombre="chevronDerecha" tamano={20} />
        </Link>
      </section>
    </PantallaSecundaria>
  );
}

function Leyenda({ muestra, nombre, texto }: { muestra: ReactNode; nombre?: string; texto: string }) {
  return (
    <div className="cf-ajustes-fila cf-ayuda-leyenda">
      <div className="cf-ayuda-muestra">{muestra}</div>
      <p>
        {nombre ? <strong>{nombre} </strong> : null}
        {texto}
      </p>
    </div>
  );
}

/** Una hora con el contorno de confianza del sistema (continuo o discontinuo). */
function Hora({ confianza, children }: { confianza: "confirmado" | "estimado" | "desactualizado"; children: ReactNode }) {
  return (
    <span className="cf-ayuda-hora cf-num" data-confianza={confianza}>
      <Contorno />
      {children}
    </span>
  );
}

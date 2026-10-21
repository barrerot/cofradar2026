import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { AvisoEntrada, DatoPendiente, Esqueleto, SegunDato } from "../componentes";
import { Icono, PantallaSecundaria } from "../marco";
import { diaProximo } from "../datos/fechas";
import { useJornada } from "../datos/jornada";
import { useRelaciones } from "../datos/relaciones";
import { useSesion } from "../datos/sesion";
import { useDato } from "../datos/useDato";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { iniciales } from "./Cofradias";

/**
 * P-11 Ficha de cofradía (4-cofradias/ficha-2*), registro EDITORIAL (§3).
 *
 *   Cabecera    escudo de reserva (iniciales), «La has visto» / «La sigues»,
 *               nombre popular y oficial, y qué día sale.
 *   Acciones    «Recorrido y horarios» (P-12), «Seguir» y «La he visto». Las dos
 *               últimas son de la cuenta: sin sesión piden entrar con Google y,
 *               al volver, se hacen solas. «Ver en el mapa» llega con el mapa (4.4).
 *   La hermandad  sede, salida y entrada, pasos, cifras, fundación y web, y su
 *               historia. Lo que no tenemos, «Dato pendiente» (estado 4).
 *
 * «Dónde va cada parte del cortejo», los chips de estado y «Dar fe» desde la
 * ficha son del motor (4.16): fuera de jornada la ficha es la de ficha-2F.
 */
type Lugar = { nombre: string };
type Ficha = {
  id: string;
  nombre: string;
  nombreOficial: string;
  web: string | null;
  fundacion: string | null;
  historia: string | null;
  hermanos: number | null;
  nazarenos: number | null;
  /** Minutos que tarda el cortejo en pasar por un punto. */
  duracionCortejo: number | null;
  sede: Lugar;
  pasos: { orden: number; nombre: string }[];
  salida: {
    anio: number;
    jornada: { id: number; nombre: string };
    estado: string | null;
    templo: Lugar;
    horaSalida: string | null;
    horaEntrada: string | null;
  } | null;
};

export function FichaCofradia({ estado }: { estado: EstadoJornada }) {
  const { id = "" } = useParams();
  const ficha = useDato<Ficha>(`/cofradias/${encodeURIComponent(id)}`, { cadaMs: 600_000 });

  return (
    <PantallaSecundaria
      registro="editorial"
      vuelta={{ etiqueta: "Cofradías", ruta: "/cofradias" }}
      accion={estado.activa ? <DarFe cofradia={id} /> : undefined}
    >
      <SegunDato dato={ficha} esqueleto={<Esqueleto forma="lista" />}>
        {(f) => <Contenido ficha={f} />}
      </SegunDato>
    </PantallaSecundaria>
  );
}

function Contenido({ ficha: f }: { ficha: Ficha }) {
  const relaciones = useRelaciones();
  const marca = relaciones.marca(f.id);
  const dia = useDiaDeSalida(f.salida?.jornada.id ?? null);
  const sinArticulo = f.nombre.replace(/^(El|La|Los|Las) /, "");

  return (
    <article className="cf-ficha">
      <AvisoEntrada
        motivo={`seguir:${f.id}`}
        entrado={`Has entrado con tu cuenta de Google. Ya sigues ${aCofradia(f.nombre)}.`}
      />
      <AvisoEntrada
        motivo={`vista:${f.id}`}
        entrado={`Has entrado con tu cuenta de Google. Ya la tienes como vista.`}
      />

      <header className="cf-ficha-cabecera">
        <span className="cf-ficha-escudo" aria-hidden="true">
          {iniciales(sinArticulo)}
        </span>
        {marca ? (
          <p className="cf-ficha-relacion">
            <Icono nombre={marca === "vista" ? "vista" : "seguida"} tamano={16} />
            {marca === "vista" ? "La has visto" : "La sigues"}
          </p>
        ) : null}
        <h1 className="cf-ficha-nombre">{f.nombre}</h1>
        <p className="cf-ficha-oficial">{f.nombreOficial}</p>
        {f.salida ? (
          <p className="cf-ficha-dia">
            Sale {f.salida.jornada.nombre === "Madrugá" ? "la" : "el"} {f.salida.jornada.nombre}
            {dia ? ` · ${dia}` : null}
          </p>
        ) : null}
      </header>

      <Acciones ficha={f} />

      <section className="cf-ficha-seccion" aria-labelledby="ficha-hermandad">
        <h2 id="ficha-hermandad">La hermandad</h2>
        <dl className="cf-ficha-datos">
          <Dato nombre="Sede">{f.sede.nombre}</Dato>
          <Dato nombre="Salida y entrada">
            {f.salida?.horaSalida && f.salida.horaEntrada ? (
              <>
                Sale a las <strong className="cf-num">{hora(f.salida.horaSalida)}</strong> · entra a las{" "}
                <strong className="cf-num">{hora(f.salida.horaEntrada)}</strong>
                {f.salida.templo.nombre !== f.sede.nombre ? <span className="cf-ficha-nota">desde {f.salida.templo.nombre}</span> : null}
              </>
            ) : null}
          </Dato>
          <Dato nombre="Pasos">
            {f.pasos.length === 0
              ? null
              : f.pasos.map((p) => (
                  <span key={p.orden} className="cf-ficha-paso">
                    {f.pasos.length === 1 ? "Un solo paso" : p.nombre} · <DatoPendiente />
                  </span>
                ))}
          </Dato>
          <Dato nombre="Hermanos y nazarenos">
            {f.hermanos !== null || f.nazarenos !== null ? (
              <>
                {f.hermanos !== null ? `${miles(f.hermanos)} hermanos` : null}
                {f.hermanos !== null && f.nazarenos !== null ? " · " : null}
                {f.nazarenos !== null ? `${miles(f.nazarenos)} nazarenos` : null}
              </>
            ) : null}
          </Dato>
          <Dato nombre="Tarda en pasar">{f.duracionCortejo !== null ? duracion(f.duracionCortejo) : null}</Dato>
          <Dato nombre="Fundada en">{f.fundacion}</Dato>
          <Dato nombre="Web">
            {f.web ? (
              <a href={f.web} target="_blank" rel="noreferrer">
                {f.web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
              </a>
            ) : null}
          </Dato>
        </dl>
      </section>

      <section className="cf-ficha-seccion" aria-labelledby="ficha-historia">
        <h2 id="ficha-historia">Su historia</h2>
        {f.historia ? <p className="cf-ficha-historia">{f.historia.replace(/([^.])$/, "$1.")}</p> : <DatoPendiente />}
      </section>
    </article>
  );
}

/**
 * Recorrido, Seguir y La he visto. Seguir y vista son de la cuenta: sin sesión
 * se pide entrar, y al volver con la cuenta la acción se hace sola (P-03).
 */
function Acciones({ ficha: f }: { ficha: Ficha }) {
  const { usuario, entrada, olvidarEntrada, conCuenta } = useSesion();
  const relaciones = useRelaciones();
  const [fallo, setFallo] = useState(false);
  const seguida = relaciones.esSeguida(f.id);
  const vista = relaciones.esVista(f.id);
  const retomada = useRef(false);

  const cambiar = async (que: "seguir" | "vista", poner: boolean) => {
    setFallo(false);
    const bien = que === "seguir" ? await relaciones.cambiarSeguida(f.id, poner) : await relaciones.cambiarVista(f.id, poner);
    if (!bien) setFallo(true);
  };

  // Vuelta de Google con la cuenta: se hace lo que la persona iba a hacer
  useEffect(() => {
    if (retomada.current || !usuario || !relaciones.listas || entrada?.resultado !== "entrado") return;
    if (entrada.motivo === `seguir:${f.id}`) {
      retomada.current = true;
      void cambiar("seguir", true);
    } else if (entrada.motivo === `vista:${f.id}`) {
      retomada.current = true;
      void cambiar("vista", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, relaciones.listas, entrada, f.id]);

  return (
    <>
      <div className="cf-ficha-acciones">
        <Link className="cf-btn" data-variant="secundario" to={`/cofradias/${f.id}/recorrido`}>
          <Icono nombre="enCalle" tamano={20} />
          Recorrido y horarios
        </Link>
        <button
          type="button"
          className="cf-btn"
          data-variant="secundario"
          aria-pressed={seguida}
          onClick={() => {
            olvidarEntrada();
            conCuenta(`seguir:${f.id}`, () => void cambiar("seguir", !seguida));
          }}
        >
          <Icono nombre="seguida" tamano={20} />
          {seguida ? "La sigues" : "Seguir"}
        </button>
        <button
          type="button"
          className="cf-btn"
          data-variant="secundario"
          aria-pressed={vista}
          onClick={() => {
            olvidarEntrada();
            conCuenta(`vista:${f.id}`, () => void cambiar("vista", !vista));
          }}
        >
          <Icono nombre="vista" tamano={20} />
          La he visto
        </button>
      </div>
      {fallo ? (
        <p className="cf-ficha-fallo" role="status">
          <Icono nombre="informativo" tamano={20} />
          No se ha podido guardar. Inténtalo de nuevo en un momento.
        </p>
      ) : null}
    </>
  );
}

function Dato({ nombre, children }: { nombre: string; children: ReactNode }) {
  const vacio = children === null || children === undefined || children === "" || (Array.isArray(children) && children.length === 0);
  return (
    <div className="cf-ficha-dato">
      <dt>{nombre}</dt>
      <dd>{vacio ? <DatoPendiente /> : children}</dd>
    </div>
  );
}

/** «a La Macarena», «al Gran Poder». */
function aCofradia(nombre: string) {
  return nombre.startsWith("El ") ? `al ${nombre.slice(3)}` : `a ${nombre}`;
}

const hora = (fecha: string) => fecha.slice(11, 16);
/** «17.300», también con cuatro cifras («2.800»), que toLocaleString deja sin punto. */
const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function duracion(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** «27 de marzo de 2027»: el día de la próxima Semana Santa en que sale su jornada. */
function useDiaDeSalida(jornadaId: number | null): string | null {
  const { jornadas } = useJornada();
  const fecha = jornadas.datos?.find((j) => j.id === jornadaId)?.fecha;
  const dia = fecha ? diaProximo(fecha) : null;
  return dia ? dia.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null;
}

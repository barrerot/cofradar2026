import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Esqueleto, HuecoRelacion, MarcaRelacion, SegunDato } from "../componentes";
import { Cabecera, Icono, Marco } from "../marco";
import { diaProximo } from "../datos/fechas";
import { useJornada, type Jornada } from "../datos/jornada";
import { useRelaciones } from "../datos/relaciones";
import { useDato } from "../datos/useDato";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { SelectorJornada } from "./SelectorJornada";

/**
 * P-13 Agenda · «¿qué hay programado?» (5-agenda/agenda-*).
 *
 * Todo lo de la jornada consultada, por hora de salida y SIN PRIORIZAR: cada
 * fila es una cofradía con su salida, su templo, cuándo llega la cruz a La
 * Campana y cuándo entra. Tocarla abre su ficha.
 *
 * El selector de días y la jornada de la cabecera son el MISMO estado
 * (useJornada): cambiar uno cambia el otro. El día de cada botón es el de la
 * próxima Semana Santa; el punto, el de hoy.
 *
 * Sin motor (fase 4) la agenda es la de fuera de temporada (agenda-D): el
 * horario previsto, sin chip de estado. Las horas son las del último programa
 * publicado, y el rótulo lo dice.
 */
type Fila = {
  id: string;
  nombre: string;
  jornadaId: number;
  templo: string | null;
  horaSalida: string | null;
  horaEntrada: string | null;
  horaCampana: string | null;
};

/** El nombre corto de cada jornada en el selector, para que quepan. */
const CORTO: Record<string, string> = {
  "Viernes de Dolores": "Dolores",
  "Sábado de Pasión": "Pasión",
  "Domingo de Ramos": "Domingo",
  "Lunes Santo": "Lunes",
  "Martes Santo": "Martes",
  "Miércoles Santo": "Miércoles",
  "Jueves Santo": "Jueves",
  "Madrugá": "Madrugá",
  "Viernes Santo": "Viernes",
  "Sábado Santo": "Sábado",
  "Domingo de Resurrección": "Resurrección",
};

export function Agenda({ estado }: { estado: EstadoJornada }) {
  const { consultada } = useJornada();

  return (
    <Marco
      sangrado="lista"
      cabecera={
        <Cabecera
          etiqueta="Cabecera de Agenda"
          principal={<SelectorJornada />}
          titulo="Agenda"
          secundaria={<Dias />}
        />
      }
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <div className="cf-agenda">
        {consultada ? <DeLaJornada jornada={consultada} /> : <Esqueleto forma="lista" />}
      </div>
    </Marco>
  );
}

function DeLaJornada({ jornada }: { jornada: Jornada }) {
  const lista = useDato<Fila[]>(`/cofradias?jornada=${jornada.id}`, { cadaMs: 600_000 });
  return (
    <SegunDato dato={lista} esqueleto={<Esqueleto forma="lista" />}>
      {(filas) => <Lista filas={filas} anio={jornada.fecha?.slice(0, 4) ?? null} />}
    </SegunDato>
  );
}

/** Los once días, desplazables; el consultado, centrado a la vista. */
function Dias() {
  const { jornadas, consultada, hoy, elegir } = useJornada();
  const caja = useRef<HTMLDivElement>(null);
  const lista = [...(jornadas.datos ?? [])].sort((a, b) => a.orden - b.orden);

  useEffect(() => {
    const boton = caja.current?.querySelector<HTMLElement>('[aria-current="date"]');
    boton?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [consultada?.id, lista.length]);

  return (
    <div ref={caja} className="cf-days cf-agenda-dias" role="group" aria-label="Día">
      {lista.map((j) => (
        <Dia key={j.id} jornada={j} marcada={j.id === consultada?.id} esHoy={j.id === hoy?.id} alElegir={() => elegir(j.id)} />
      ))}
    </div>
  );
}

function Dia({ jornada: j, marcada, esHoy, alElegir }: { jornada: Jornada; marcada: boolean; esHoy: boolean; alElegir: () => void }) {
  const dia = j.fecha ? diaProximo(j.fecha) : null;
  return (
    <button
      type="button"
      className="cf-day"
      aria-current={marcada ? "date" : undefined}
      aria-label={`${j.nombre}${dia ? `, ${dia.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}` : ""}${esHoy ? ", hoy" : ""}`}
      data-info={esHoy ? "si" : undefined}
      onClick={alElegir}
    >
      <span>{CORTO[j.nombre] ?? j.nombre}</span>
      <span className="d">
        {marcada ? <Icono nombre="check" tamano={16} /> : null}
        {dia ? dia.getDate() : ""}
        {esHoy ? <span className="mk" /> : null}
      </span>
    </button>
  );
}

function Lista({ filas, anio }: { filas: Fila[]; anio: string | null }) {
  const relaciones = useRelaciones();
  if (filas.length === 0) return <p className="cf-agenda-vacio">Este día no sale ninguna cofradía.</p>;
  return (
    <>
      <p className="cf-agenda-rotulo">Horario previsto{anio ? ` · programa de ${anio}` : ""}</p>
      <ol className="cf-agenda-lista">
        {filas.map((f) => {
          const marca = relaciones.marca(f.id);
          return (
            <li key={f.id}>
              <Link className="cf-agenda-fila" to={`/cofradias/${f.id}`}>
                <span className="cf-agenda-hora cf-num">{f.horaSalida ? hora(f.horaSalida) : "—"}</span>
                <HuecoRelacion>{marca ? <MarcaRelacion relacion={marca} /> : null}</HuecoRelacion>
                <span className="cf-agenda-datos">
                  <span className="cf-agenda-nombre">{f.nombre}</span>
                  {f.templo ? <span className="cf-agenda-templo">{f.templo}</span> : null}
                  <span className="cf-agenda-paso cf-num">
                    {[f.horaCampana ? `Campana ${hora(f.horaCampana)}` : null, f.horaEntrada ? `Entrada ${hora(f.horaEntrada)}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}

const hora = (fecha: string) => fecha.slice(11, 16);

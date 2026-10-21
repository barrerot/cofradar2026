import { Fragment } from "react";
import { useParams } from "react-router-dom";
import { Esqueleto, SegunDato } from "../componentes";
import { PantallaSecundaria } from "../marco";
import { coser, type Punto } from "../datos/horario";
import { useDato } from "../datos/useDato";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";

/**
 * P-12 Recorrido y horarios (4-cofradias/recorrido-3).
 *
 * Una fila por lugar del itinerario con la hora PREVISTA de la cruz de guía y
 * la del último paso, del programa oficial. Las que el programa escribe tal
 * cual van limpias; las que solo se deducen de su fila de media hora llevan
 * «≈». La hora real o estimada, «Va por aquí» y la barra de progreso son del
 * motor (4.16).
 *
 * La cruz y el último paso no siempre pasan por los mismos sitios: las dos
 * listas se cosen (datos/horario.ts) y cada lugar va en su fila, con «—»
 * donde no pasa.
 */
type Ficha = {
  id: string;
  nombre: string;
  salida: {
    anio: number;
    cruzGuia: Punto[];
    ultimoPaso: Punto[];
    recorrido: { metros: number | null; provisional: boolean } | null;
  } | null;
};


/**
 * Los lugares de la carrera oficial de Sevilla. Es de la ciudad, no de cada
 * cofradía: cuando los hitos sean configurables (5.4) saldrá de los datos.
 */
const CARRERA = /^(La Campana|Sierpes|Plaza de San Francisco|Avenida de la Constitución|Catedral)/;

export function Recorrido({ estado }: { estado: EstadoJornada }) {
  const { id = "" } = useParams();
  const ficha = useDato<Ficha>(`/cofradias/${encodeURIComponent(id)}`, { cadaMs: 600_000 });

  return (
    <PantallaSecundaria
      titulo="Recorrido y horarios"
      vuelta={{ etiqueta: ficha.datos?.nombre ?? "Ficha", ruta: `/cofradias/${id}` }}
      accion={estado.activa ? <DarFe cofradia={id} /> : undefined}
      sangrado="lista"
    >
      <SegunDato dato={ficha} esqueleto={<Esqueleto forma="lista" />}>
        {(f) => (f.salida ? <Tabla salida={f.salida} /> : <p className="cf-recorrido-vacio">Este año no tiene salida.</p>)}
      </SegunDato>
    </PantallaSecundaria>
  );
}

function Tabla({ salida }: { salida: NonNullable<Ficha["salida"]> }) {
  const filas = coser(salida.cruzGuia, salida.ultimoPaso);
  const primeraCarrera = filas.findIndex((f) => CARRERA.test(f.lugar.nombre));
  const metros = salida.recorrido?.metros;

  return (
    <div className="cf-recorrido">
      {metros ? (
        <div className="cf-recorrido-resumen">
          <p className="cf-num">{miles(metros)} m de recorrido</p>
          {salida.recorrido?.provisional ? <p className="n">Trazado provisional, a falta de revisarlo.</p> : null}
        </div>
      ) : null}

      <table className="cf-recorrido-tabla">
        <caption className="cf-oculto-visual">Horario previsto por cada lugar</caption>
        <thead>
          <tr>
            <th scope="col">Punto</th>
            <th scope="col">Cruz de guía</th>
            <th scope="col">Último paso</th>
          </tr>
          <tr className="cf-recorrido-nota">
            <td colSpan={3}>Horas del programa de {salida.anio}. Con «≈», aproximadas.</td>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <Fragment key={`${f.lugar.id}-${i}`}>
              {i === primeraCarrera ? (
                <tr className="cf-recorrido-tramo">
                  <th colSpan={3} scope="colgroup">
                    Carrera oficial
                  </th>
                </tr>
              ) : null}
              <tr data-carrera={CARRERA.test(f.lugar.nombre) ? "" : undefined}>
                <th scope="row">
                  {f.lugar.nombre}
                  {i === 0 ? <span className="n">salida</span> : i === filas.length - 1 ? <span className="n">entrada</span> : null}
                </th>
                <td>
                  <Hora punto={f.cruz} />
                </td>
                <td>
                  <Hora punto={f.paso} />
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Hora({ punto }: { punto?: Punto }) {
  if (!punto) return <span aria-label="No pasa">—</span>;
  const hora = punto.hora.slice(11, 16);
  return punto.publicada ? (
    <span className="cf-num">{hora}</span>
  ) : (
    <span className="cf-num" aria-label={`hacia las ${hora}`}>
      ≈ {hora}
    </span>
  );
}

const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

import { Fragment } from "react";
import { useParams } from "react-router-dom";
import { Contorno, Esqueleto, SegunDato } from "../componentes";
import { cambioDe, dondeVa, enLaCalle, horaEstimada, retrasoDe, type EnVivo } from "../datos/enVivo";
import type { Jornada } from "../datos/jornada";
import { Icono, PantallaSecundaria } from "../marco";
import { coser, type Punto } from "../datos/horario";
import { useDato } from "../datos/useDato";
import type { EstadoJornada } from "../fixture";
import { useEnVivoDe } from "./CortejoEnVivo";
import { DarFe } from "./DarFe";

/**
 * P-12 Recorrido y horarios (4-cofradias/recorrido-3).
 *
 * Una fila por lugar del itinerario con la hora PREVISTA de la cruz de guía y
 * la del último paso, del programa oficial. Las que el programa escribe tal
 * cual van limpias; las que solo se deducen de su fila de media hora llevan
 * «≈». El día que sale, el motor (4.16) añade la barra de progreso, debajo de
 * cada hora prevista la real o la estimada (con el retraso que lleve) y «Va por
 * aquí» en el lugar por el que va la cruz de guía.
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
    jornada: { id: number };
    cruzGuia: Punto[];
    ultimoPaso: Punto[];
    recorrido: { metros: number | null; provisional: boolean } | null;
  } | null;
};


/** Los lugares de la carrera oficial los marca el servidor (`lugar.carrera`), de los hitos de la ciudad (5.4). */

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
        {(f) => (f.salida ? <Tabla id={f.id} salida={f.salida} /> : <p className="cf-recorrido-vacio">Este año no tiene salida.</p>)}
      </SegunDato>
    </PantallaSecundaria>
  );
}

function Tabla({ id, salida }: { id: string; salida: NonNullable<Ficha["salida"]> }) {
  const filas = coser(salida.cruzGuia, salida.ultimoPaso);
  const primeraCarrera = filas.findIndex((f) => f.lugar.carrera);
  const metros = salida.recorrido?.metros;
  const encontrada = useEnVivoDe(id, salida.jornada.id);
  const vivo = encontrada && enLaCalle(encontrada.v.estado) ? encontrada : null;
  const cruz = vivo?.v.estado.elementos.find((e) => e.orden === 0);
  const dondeCruz = vivo && cruz ? dondeVa(vivo.v.mapa, cruz) : null;
  // «Va por aquí» en el lugar donde está la cruz; si va de camino, «Va hacia aquí» en el siguiente
  const marca = dondeCruz?.match(/^(en|camino de) (.+)$/);

  return (
    <div className="cf-recorrido">
      {vivo && vivo.v.estado.progreso ? <Progreso v={vivo.v} donde={dondeCruz} /> : null}
      {metros && !vivo ? (
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
            <td colSpan={3}>
              {vivo ? "Arriba, hora prevista. Debajo, la real o la estimada." : `Horas del programa de ${salida.anio}. Con «≈», aproximadas.`}
            </td>
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
              <tr data-carrera={f.lugar.carrera ? "" : undefined}>
                <th scope="row">
                  {f.lugar.nombre}
                  {i === 0 ? <span className="n">salida</span> : i === filas.length - 1 ? <span className="n">entrada</span> : null}
                  {marca && marca[2] === f.lugar.nombre && f.cruz ? (
                    <span className="cf-recorrido-aqui">
                      <span className="cf-chip" data-fase="en_calle" data-confianza={cruz?.confianza ?? "estimado"} data-size="24">
                        <Contorno />
                        <Icono nombre="enCalle" tamano={16} />
                        <span>{marca[1] === "en" ? "Va por aquí" : "Va hacia aquí"}</span>
                      </span>
                    </span>
                  ) : null}
                </th>
                <td>
                  <Hora punto={f.cruz} />
                  {vivo ? <Real punto={f.cruz} v={vivo.v} jornada={vivo.jornada} orden={0} /> : null}
                </td>
                <td>
                  <Hora punto={f.paso} />
                  {vivo ? <Real punto={f.paso} v={vivo.v} jornada={vivo.jornada} orden={Math.max(1, vivo.v.mapa.pasos)} /> : null}
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** «Cruz de guía en La Campana», la barra y «1.396 de 2.172 m · 64 %». */
function Progreso({ v, donde }: { v: EnVivo; donde: string | null }) {
  // Tras un cambio de recorrido, la barra llega hasta donde la vieron en él por última vez (BUL-217)
  const cambio = cambioDe(v.estado);
  const p = cambio?.desdeM !== undefined ? { ...v.estado.progreso!, m: Math.min(cambio.desdeM, v.estado.progreso!.m) } : v.estado.progreso!;
  const pc = p.total ? Math.round((100 * p.m) / p.total) : 0;
  const confirmado = !cambio && v.estado.elementos.find((e) => e.orden === 0)?.confianza === "confirmado";
  return (
    <div className="cf-recorrido-progreso">
      <p>{cambio ? `Cambio de recorrido: la han visto ${cambio.detalle ?? "fuera del recorrido"}` : `Cruz de guía ${donde ?? "en la calle"}`}</p>
      <div className="barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pc} aria-label="Recorrido hecho">
        <span style={{ width: `${pc}%` }} data-confianza={confirmado ? "confirmado" : "estimado"} />
      </div>
      <p className="cf-num">
        {miles(p.m)} de {miles(p.total)} m · {pc} %{cambio ? " · hasta donde se la vio en su recorrido" : confirmado ? "" : " · según horario"}
      </p>
    </div>
  );
}

/**
 * Debajo de la hora prevista, la real o la estimada: la del programa más el retraso que lleve ese
 * elemento, en el lugar donde está y en los que le quedan. Si va a su hora y nadie lo ha confirmado,
 * solo «según horario».
 */
function Real({ punto, v, jornada, orden }: { punto?: Punto; v: EnVivo; jornada: Jornada; orden: number }) {
  if (!punto) return null;
  const el = v.estado.elementos.find((e) => e.orden === orden);
  // Lo que ya ha dejado atrás no se sabe a qué hora lo pasó: no se inventa
  const situado = v.mapa[orden === 0 ? "cruzGuia" : "ultimoPaso"].find((h) => h.lugar === punto.lugar.nombre && h.hora === punto.hora.slice(0, 16));
  if (el && situado?.m != null && situado.m < el.m - 80) return null;
  // Tras un cambio de recorrido, lo que queda desde donde la vieron no se sabe si lo pisará (BUL-217)
  const cambio = cambioDe(v.estado);
  if (cambio?.desdeM !== undefined && situado?.m != null && situado.m > cambio.desdeM)
    return (
      <span className="cf-recorrido-real" data-confianza="estimado" data-desfase="no">
        previsto, sin confirmar
      </span>
    );
  // En la calle y sin cruz visible: la cruz ya ha entrado
  if (!el && orden === 0) return null;
  const retraso = el?.retrasoMin ?? retrasoDe(v.estado, orden);
  const confianza = el?.confianza ?? "estimado";
  const hora = horaEstimada(punto.hora, jornada, retraso);
  if (!hora) return null;
  const desfase = Math.abs(retraso) >= 1;
  return (
    <span className="cf-recorrido-real" data-confianza={confianza} data-desfase={desfase ? "si" : "no"}>
      {desfase ? (
        <>
          <span className="hr cf-num">{hora.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
          <span className="dif cf-num">{retraso > 0 ? `+${retraso}` : `−${-retraso}`} min</span>
        </>
      ) : null}
      {confianza === "estimado" ? <span className="cola">según horario</span> : null}
      {confianza === "desactualizado" ? <span className="cola">hace {el?.haceMin} min</span> : null}
    </span>
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

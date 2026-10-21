import { Alteraciones, ChipEstado } from "../componentes";
import { useActividad } from "../datos/actividad";
import { dondeVa, enLaCalle, horaDelElemento, horaEstimada, retrasoDe, useEnVivo, type EnVivo } from "../datos/enVivo";
import { useJornada, type Jornada } from "../datos/jornada";
import type { ElementoEstado } from "../datos/mapa";

/**
 * El estado en vivo dentro de la ficha (4-cofradias/ficha-2A a 2E, 4.16): los chips de fase y
 * alteraciones bajo el nombre y «Dónde va cada parte del cortejo», con una tarjeta por elemento.
 *
 * Solo el día que sale: fuera de su jornada la ficha es la de siempre (ficha-2F) y esto no pinta nada.
 */
export function useEnVivoDe(id: string, jornadaId: number | null | undefined): { v: EnVivo; jornada: Jornada } | null {
  const { hoy } = useJornada();
  const deHoy = hoy && hoy.id === jornadaId ? hoy : null;
  const { cofradias } = useEnVivo(deHoy);
  const v = cofradias?.find((x) => x.estado.id === id);
  return v && deHoy ? { v, jornada: deHoy } : null;
}

const hhmm = (d: Date) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

/** Fase con su confianza y las alteraciones, como chips. */
export function ChipsEnVivo({ v }: { v: EnVivo }) {
  const e = v.estado;
  return (
    <div className="cf-ficha-chips">
      <ChipEstado fase={e.fase.valor} confianza={e.fase.confianza} antiguedad={e.fase.haceMin !== null ? `hace ${e.fase.haceMin} min` : undefined} />
      <Alteraciones alteraciones={e.alteraciones} densidad="estandar" confianza={e.fase.confianza} />
    </div>
  );
}

/** «Dónde va cada parte del cortejo» (ficha-2A) o, si aún no ha salido, a qué hora sale (ficha-2C). */
export function CortejoEnVivo({ v, jornada }: { v: EnVivo; jornada: Jornada }) {
  const { ahora } = useActividad();
  const e = v.estado;
  if (e.fase.valor === "inminente" && e.sale) {
    return (
      <section className="cf-ficha-seccion" aria-labelledby="ficha-cortejo">
        <h2 id="ficha-cortejo">Está a punto de salir</h2>
        <p className="cf-ficha-sale">
          Sale a las <strong className="cf-num">{hhmm(new Date(e.sale))}</strong>
          {e.fase.confianza === "estimado" ? " · según horario" : null}
        </p>
      </section>
    );
  }
  if (!enLaCalle(e)) return null;

  const n = Math.max(1, v.mapa.pasos);
  const ordenes = Array.from({ length: n + 1 }, (_, k) => k);
  return (
    <section className="cf-ficha-seccion" aria-labelledby="ficha-cortejo">
      <h2 id="ficha-cortejo">Dónde va cada parte del cortejo</h2>
      <ol className="cf-ficha-cortejo">
        {ordenes.map((k) => {
          const el = e.elementos.find((x) => x.orden === k);
          const nombre = k === 0 ? "Cruz de guía" : (v.mapa.nombresPasos[k - 1] ?? `Paso ${k}`);
          return (
            <li key={k}>
              <p className="cf-ficha-elemento">{nombre}</p>
              {el ? <DondeVa v={v} el={el} jornada={jornada} intermedio={k > 0 && k < n} /> : <FueraDeLaCalle v={v} orden={k} jornada={jornada} ahora={ahora} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function DondeVa({ v, el, jornada, intermedio }: { v: EnVivo; el: ElementoEstado; jornada: Jornada; intermedio: boolean }) {
  const donde = dondeVa(v.mapa, el);
  // Los pasos de en medio no tienen hora en el programa
  if (intermedio && el.confianza === "estimado") {
    return (
      <>
        <p className="cf-ficha-donde">{donde}</p>
        <p className="cf-ficha-hora" data-confianza="estimado">
          <span className="hr">Según horario</span>
        </p>
        <p className="cf-ficha-nota">sin hora propia: se estima entre la cruz y el último paso</p>
      </>
    );
  }
  const hora = horaDelElemento(v.mapa, el, jornada);
  return (
    <>
      <p className="cf-ficha-donde">{donde}</p>
      {hora ? (
        <p className="cf-ficha-hora" data-confianza={el.confianza}>
          <span className="hr cf-num">{hhmm(hora)}</span>
          {el.confianza === "estimado" ? <span className="cola"> · según horario</span> : null}
          {el.confianza === "desactualizado" ? <span className="cola"> · hace {el.haceMin} min</span> : null}
        </p>
      ) : null}
    </>
  );
}

/** Un elemento que aún no ha salido de su templo o que ya ha entrado. */
function FueraDeLaCalle({ v, orden, jornada, ahora }: { v: EnVivo; orden: number; jornada: Jornada; ahora: Date }) {
  const programa = orden === 0 ? v.mapa.cruzGuia : v.mapa.ultimoPaso;
  const sale = programa[0] ? horaEstimada(programa[0].hora, jornada, retrasoDe(v.estado, orden)) : null;
  if (sale && sale.getTime() > ahora.getTime()) {
    return (
      <p className="cf-ficha-donde">
        aún en su templo · sale hacia las <span className="cf-num">{hhmm(sale)}</span>
      </p>
    );
  }
  return <p className="cf-ficha-donde">ya ha entrado</p>;
}

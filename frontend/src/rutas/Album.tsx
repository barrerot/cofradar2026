import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AvisoEntrada, CabeceraJornada, Esqueleto } from "../componentes";
import { Boton, HojaDecision, Icono, PantallaSecundaria } from "../marco";
import { grados, useAlbum, type Album as DatosAlbum, type Estampa as DatosEstampa, type NuevaEnAlbum } from "../datos/album";
import { useJornada } from "../datos/jornada";
import { useSesion } from "../datos/sesion";
import type { EstadoJornada } from "../fixture";
import { CORTO } from "./Agenda";
import { DarFe } from "./DarFe";
import { Estampa } from "./Estampa";

/**
 * P-35 Álbum de estampas (F-56; 12-ano-cofrade/16–20), registro editorial.
 *
 *   La estampa   la de Claude Design (12/11/2026), en Estampa.tsx: escudo, titular a grabado, colores de la
 *                túnica y sello de dar fe, un grado por capa.
 *   El álbum     «Tienes 14 estampas», sin «de 72»; las jornadas en orden, de tres en fila. El selector
 *                lleva a cada jornada; es el de la Agenda sin fechas, porque el álbum es de por vida.
 *   La hoja      la estampa en grande y sus tres grados con lo que hay; lo vacío, en gris y sin texto.
 * Nunca «te falta», ni contadores por jornada, ni barras (R5). No da puntos.
 */

const MOTIVO = "album";

const GRADOS = [
  { clave: "conoces", icono: "trivial", texto: "La conoces" },
  { clave: "vista", icono: "vista", texto: "La has visto" },
  { clave: "fe", icono: "darFeVerificada", texto: "Has dado fe" },
] as const;

function tiene(e: DatosEstampa, clave: (typeof GRADOS)[number]["clave"]) {
  return clave === "conoces" ? e.conoces : e[clave].length > 0;
}

export function Album({ estado }: { estado: EstadoJornada }) {
  const { usuario, disponible, entrar } = useSesion();
  const { album, fallo } = useAlbum();
  return (
    <PantallaSecundaria
      registro="editorial"
      titulo="Álbum de estampas"
      vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }}
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <AvisoEntrada motivo={MOTIVO} />
      {usuario === null ? (
        <div className="cf-seguidas-vacio">
          <Icono nombre="album" tamano={40} />
          <p>Cada hermandad tiene su estampa, que se completa conociéndola, viéndola y dando fe. Para tener tu álbum, entra con tu cuenta de Google.</p>
          {disponible ? (
            <Boton variante="secundario" onClick={() => void entrar(MOTIVO)}>
              Entrar con Google
            </Boton>
          ) : null}
        </div>
      ) : album ? (
        <Contenido album={album} />
      ) : fallo ? (
        <p className="cf-album-texto">No se ha podido abrir el álbum. Vuelve a intentarlo en un rato.</p>
      ) : (
        <Esqueleto forma="lista" />
      )}
    </PantallaSecundaria>
  );
}

function Contenido({ album }: { album: DatosAlbum }) {
  const { hoy } = useJornada();
  const [marcada, setMarcada] = useState<number | null>(null);
  const [abierta, setAbierta] = useState<{ e: DatosEstampa; jornada: string } | null>(null);
  const [como, setComo] = useState(false);
  const chips = useRef<HTMLDivElement>(null);
  const actual = marcada ?? album.jornadas.find((j) => j.id === hoy?.id)?.id ?? album.jornadas[0]?.id ?? null;

  const ir = (id: number, suave = true) => {
    setMarcada(id);
    document.getElementById(`album-jornada-${id}`)?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
  };
  // En Semana Santa, el álbum se abre en la jornada de hoy
  useEffect(() => {
    if (hoy && album.jornadas.some((j) => j.id === hoy.id)) ir(hoy.id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // El botón marcado, centrado en el selector (moviendo solo el selector: scrollIntoView movería la página)
  useEffect(() => {
    const caja = chips.current;
    const boton = caja?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!caja || !boton) return;
    const c = caja.getBoundingClientRect();
    const b = boton.getBoundingClientRect();
    caja.scrollTo({ left: caja.scrollLeft + b.left - c.left - (c.width - b.width) / 2 });
  }, [actual]);

  return (
    <div className="cf-album">
      <div ref={chips} className="cf-days cf-album-dias" role="group" aria-label="Jornada">
        {album.jornadas.map((j) => (
          <button key={j.id} type="button" className="cf-day" aria-current={j.id === actual ? "true" : undefined} aria-label={j.nombre} onClick={() => ir(j.id)}>
            <span className="d">
              {j.id === actual ? <Icono nombre="check" tamano={16} /> : null}
              {CORTO[j.nombre] ?? j.nombre}
            </span>
          </button>
        ))}
      </div>
      <p className="cf-album-texto">
        {album.estampas === 0 ? "Aún no tienes ninguna estampa." : album.estampas === 1 ? "Tienes 1 estampa." : `Tienes ${album.estampas} estampas.`}
      </p>
      <button type="button" className="cf-album-como" onClick={() => setComo(true)}>
        Cómo se completan
      </button>
      {album.jornadas.map((j) => (
        <section key={j.id} id={`album-jornada-${j.id}`} className="cf-album-jornada" aria-labelledby={`album-h-${j.id}`}>
          <CabeceraJornada id={`album-h-${j.id}`} nombre={j.nombre} />
          <ul className="cf-album-rejilla">
            {j.estampas.map((e) => (
              <li key={e.cofradia}>
                <button
                  type="button"
                  className="cf-album-boton"
                  aria-label={`${e.nombre}${grados(e) ? `: ${GRADOS.filter((g) => tiene(e, g.clave)).map((g) => g.texto.toLowerCase()).join(", ")}` : ""}`}
                  onClick={() => setAbierta({ e, jornada: j.nombre })}
                >
                  <Estampa e={e} jornada={j.nombre} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <HojaEstampa abierta={abierta} alCerrar={() => setAbierta(null)} />
      <HojaComo abierta={como} alCerrar={() => setComo(false)} />
    </div>
  );
}

/** 18 · Una estampa en grande, con sus tres grados */
function HojaEstampa({ abierta, alCerrar }: { abierta: { e: DatosEstampa; jornada: string } | null; alCerrar: () => void }) {
  const navegar = useNavigate();
  const e = abierta?.e;
  const lo = (clave: (typeof GRADOS)[number]["clave"]) =>
    !e ? "" : clave === "conoces" ? "acertaste 5 preguntas suyas" : clave === "vista" ? e.vista.join(" · ") : `${abierta!.jornada} de ${e.fe.join(" · ")}`;
  return (
    <HojaDecision
      abierta={!!abierta}
      titulo={e?.nombre ?? ""}
      tituloOculto
      alCerrar={alCerrar}
      acciones={
        <Boton variante="primario" tamano="52" onClick={() => e && navegar(`/cofradias/${e.cofradia}`)}>
          Ver su ficha
        </Boton>
      }
    >
      {abierta && e ? (
        <>
          <div className="cf-album-grande">
            <Estampa e={e} jornada={abierta.jornada} tamano="grande" />
          </div>
          <ul className="cf-album-grados">
            {GRADOS.map((g) => {
              const si = tiene(e, g.clave);
              return (
                <li key={g.clave} data-tiene={si ? "si" : "no"} data-grado={g.clave}>
                  <Icono nombre={g.icono} tamano={24} />
                  <span>
                    <strong>{g.texto}</strong>
                    {si ? <> · {lo(g.clave)}</> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </HojaDecision>
  );
}

/** 19 · Cómo se completan: en llano y sin empujar */
function HojaComo({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  return (
    <HojaDecision
      abierta={abierta}
      titulo="Cómo se completan"
      alCerrar={alCerrar}
      nota="Lo de cada año se suma. El álbum no da puntos."
      acciones={
        <Boton variante="primario" tamano="52" onClick={alCerrar}>
          Entendido
        </Boton>
      }
    >
      <ul className="cf-album-como-lista">
        <li data-grado="conoces">
          <Icono nombre="trivial" tamano={24} />
          <span>La conoces: cuando aciertas 5 preguntas suyas en el trivial, entrando con tu cuenta.</span>
        </li>
        <li data-grado="vista">
          <Icono nombre="vista" tamano={24} />
          <span>La has visto: cuando la marcas como vista en Mi colección.</span>
        </li>
        <li data-grado="fe">
          <Icono nombre="darFeVerificada" tamano={24} />
          <span>Has dado fe: cuando una aportación tuya ayuda a situarla.</span>
        </li>
      </ul>
    </HojaDecision>
  );
}

/** 20 · «Nueva en tu álbum: El Gran Poder · la conoces», bajo la fuente de un acierto. Sin animación. */
export function NuevaEnTuAlbum({ nuevas }: { nuevas: NuevaEnAlbum[] | undefined }) {
  if (!nuevas?.length) return null;
  return (
    <>
      {nuevas.map((n) => (
        <div key={n.cofradia} className="cf-album-nueva" role="status">
          <span className="cf-estampa" data-grados={1} data-tamano="mini" aria-hidden="true">
            <span className="cf-estampa-filete">
              <span className="cf-estampa-nombre">{n.nombre}</span>
            </span>
          </span>
          <div>
            <p>
              Nueva en tu álbum: {n.nombre} · la conoces
            </p>
            <Link to="/mi-cofradar/album">Ver el álbum</Link>
          </div>
        </div>
      ))}
    </>
  );
}

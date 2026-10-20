import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AvisoEntrada, Esqueleto, SegunDato, TarjetaCofradia } from "../componentes";
import { Boton, Cabecera, Icono, Marco } from "../marco";
import { useJornada, type Jornada } from "../datos/jornada";
import { useRelaciones } from "../datos/relaciones";
import { useSesion } from "../datos/sesion";
import { useDato } from "../datos/useDato";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { SelectorJornada } from "./SelectorJornada";

/**
 * P-10 Cofradías · «¿cuál es esta y cómo llego a ella?» (4-cofradias/cofradias-1*).
 *
 * Es el DIRECTORIO permanente de las hermandades de Sevilla capital, no la
 * lista del día: eso es la Agenda. Existe todo el año, no depende de que haya
 * jornada activa y no pide ubicación ni cuenta.
 *
 *   Datos       las 72 de GET /api/cofradias, agrupadas por jornada: primero
 *               la consultada en la cabecera («· hoy» si es la de hoy) y luego
 *               las demás en el orden de la semana. Dentro, por hora de salida.
 *   Filas       escudo de reserva (iniciales), marca de relación y nombre. Sin
 *               chip: la fase llega con el motor (fase 4, 4.16); hasta entonces
 *               el listado es el de fuera de temporada (cofradias-1D).
 *   Búsqueda    por el comienzo de cualquier palabra del nombre popular, sin
 *               tildes: «g» trae «Los Gitanos» y «El Gran Poder».
 *   Filtros     «En la calle» (vacío hasta el motor) y «Mis seguidas», que es
 *               de la cuenta (decisión del 20/10/2026): sin sesión invita a
 *               entrar con Google en el momento de pedirlas.
 *
 * Ninguna fila destaca: un directorio con un destacado estaría opinando sobre
 * a quién ir a ver (§2).
 */
type CofradiaApi = {
  id: string;
  nombre: string;
  /** El nombre sin artículo: «Gran Poder». */
  orden: string;
  jornada: string;
  jornadaId: number;
  templo: string | null;
  horaSalida: string | null;
  horaEntrada: string | null;
};

type Filtro = "todas" | "en-calle" | "seguidas";

export function Cofradias({ estado }: { estado: EstadoJornada }) {
  const cofradias = useDato<CofradiaApi[]>("/cofradias", { cadaMs: 600_000 });
  const [consulta, setConsulta] = useState("");
  // El filtro va en la dirección: al volver de Google se sigue en «Mis seguidas»
  const [parametros, setParametros] = useSearchParams();
  const pedido = parametros.get("filtro");
  const filtro: Filtro = pedido === "seguidas" || pedido === "en-calle" ? pedido : "todas";
  const setFiltro = (f: Filtro) =>
    setParametros(
      (p) => {
        if (f === "todas") p.delete("filtro");
        else p.set("filtro", f);
        return p;
      },
      { replace: true },
    );

  return (
    <Marco
      sangrado="lista"
      cabecera={
        <Cabecera
          etiqueta="Cabecera de Cofradías"
          principal={<SelectorJornada />}
          titulo="Cofradías"
          secundaria={<Busqueda consulta={consulta} alCambiar={setConsulta} />}
          terciaria={
            <div className="cf-cofradias-filtros" role="group" aria-label="Filtros">
              <ChipFiltro valor="todas" actual={filtro} alPulsar={setFiltro}>
                Todas
              </ChipFiltro>
              <ChipFiltro valor="en-calle" actual={filtro} alPulsar={setFiltro}>
                En la calle
              </ChipFiltro>
              <ChipFiltro valor="seguidas" actual={filtro} alPulsar={setFiltro}>
                Mis seguidas
              </ChipFiltro>
            </div>
          }
        />
      }
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <div className="cf-cofradias">
        <AvisoEntrada motivo="cofradias:seguidas" />
        <SegunDato dato={cofradias} esqueleto={<Esqueleto forma="lista" />}>
          {(lista) => (
            <Directorio
              lista={lista}
              consulta={consulta}
              filtro={filtro}
              alQuitarFiltro={() => setFiltro("todas")}
              alBorrar={() => setConsulta("")}
            />
          )}
        </SegunDato>
      </div>
    </Marco>
  );
}

function Directorio({
  lista,
  consulta,
  filtro,
  alQuitarFiltro,
  alBorrar,
}: {
  lista: CofradiaApi[];
  consulta: string;
  filtro: Filtro;
  alQuitarFiltro: () => void;
  alBorrar: () => void;
}) {
  const { jornadas, consultada, hoy } = useJornada();
  const relaciones = useRelaciones();

  const grupos = useMemo(
    () => agrupar(lista, jornadas.datos ?? [], consultada),
    [lista, jornadas.datos, consultada],
  );

  // «En la calle» no deja pasar ninguna: sin motor no se sabe, y no se finge (fase 4)
  const pasa = (c: CofradiaApi) =>
    coincide(c.nombre, consulta) &&
    (filtro === "todas" || (filtro === "seguidas" && relaciones.get(c.id) === "seguida"));

  const visibles = grupos.map((g) => ({ ...g, cofradias: g.cofradias.filter(pasa) }));
  if (!visibles.some((g) => g.cofradias.length > 0)) {
    return <SinResultados consulta={consulta} filtro={filtro} alQuitarFiltro={alQuitarFiltro} alBorrar={alBorrar} />;
  }

  return (
    <>
      {visibles.map((g) =>
        g.cofradias.length === 0 ? null : (
          <section key={g.id} className="cf-cofradias-grupo" aria-labelledby={`jornada-${g.id}`}>
            <h2 id={`jornada-${g.id}`}>{g.id === hoy?.id ? `${g.nombre} · hoy` : g.nombre}</h2>
            <div className="cf-lista">
              {g.cofradias.map((c) => (
                <Link key={c.id} className="cf-lista-enlace" to={`/cofradias/${c.id}`}>
                  <TarjetaCofradia
                    cofradia={{ id: c.id, nombre: c.nombre, iniciales: iniciales(c.orden), relacion: relaciones.get(c.id) }}
                    densidad="compacta"
                    nombreResaltado={resaltar(c.nombre, consulta)}
                  />
                </Link>
              ))}
            </div>
          </section>
        ),
      )}
    </>
  );
}

/**
 * Las jornadas en el orden de la semana, con la consultada delante. Las
 * cofradías llegan del servidor ya ordenadas por hora de salida.
 */
function agrupar(lista: CofradiaApi[], jornadas: readonly Jornada[], consultada: Jornada | null) {
  const porId = new Map<number, { id: number; nombre: string; orden: number; cofradias: CofradiaApi[] }>();
  for (const j of jornadas) porId.set(j.id, { id: j.id, nombre: j.nombre, orden: j.orden, cofradias: [] });
  for (const c of lista) {
    // Si aún no han llegado las jornadas, el grupo se forma con lo que trae la cofradía
    if (!porId.has(c.jornadaId)) porId.set(c.jornadaId, { id: c.jornadaId, nombre: c.jornada, orden: c.jornadaId, cofradias: [] });
    porId.get(c.jornadaId)!.cofradias.push(c);
  }
  return [...porId.values()].sort(
    (a, b) => Number(b.id === consultada?.id) - Number(a.id === consultada?.id) || a.orden - b.orden,
  );
}

const MENORES = new Set(["de", "del", "la", "las", "los", "el", "y"]);

/** «Gran Poder» → «GP», «Esperanza de Triana» → «ET», «Soledad de San Lorenzo» → «SL». */
export function iniciales(nombreSinArticulo: string): string {
  const palabras = nombreSinArticulo.split(/\s+/).filter((p) => p && !MENORES.has(p.toLowerCase()));
  const [primera, ...resto] = palabras;
  const ultima = resto[resto.length - 1];
  return ((primera?.[0] ?? "") + (ultima?.[0] ?? "")).toUpperCase();
}

/** Sin tildes y en minúsculas: «macarena» encuentra «Macarena». */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Busca por el COMIENZO DE CUALQUIER PALABRA del nombre popular: «triana» trae
 * «Esperanza de Triana». No por subcadena en medio de una palabra —«ran» no
 * trae «Gran Poder»—, que daría coincidencias que nadie sabe explicarse.
 */
export function coincide(nombre: string, consulta: string): boolean {
  const q = normalizar(consulta.trim());
  if (q === "") return true;
  // «san lorenzo»: cada palabra de la búsqueda empieza alguna del nombre
  const palabras = normalizar(nombre).split(/\s+/);
  return q.split(/\s+/).every((trozo) => palabras.some((p) => p.startsWith(trozo)));
}

/**
 * Subraya el comienzo de cada palabra que coincide (ver listas.css): la fila ya
 * tiene marca de relación, y ningún significado depende solo del color.
 */
function resaltar(nombre: string, consulta: string): ReactNode {
  const trozos = normalizar(consulta.trim()).split(/\s+/).filter(Boolean);
  if (trozos.length === 0) return nombre;
  return nombre.split(/(\s+)/).map((palabra, i) => {
    const largo = Math.max(0, ...trozos.filter((t) => normalizar(palabra).startsWith(t)).map((t) => t.length));
    if (largo === 0) return palabra;
    return (
      <span key={i}>
        <mark>{palabra.slice(0, largo)}</mark>
        {palabra.slice(largo)}
      </span>
    );
  });
}

function Busqueda({ consulta, alCambiar }: { consulta: string; alCambiar: (v: string) => void }) {
  return (
    <div className="cf-field cf-cofradias-busqueda">
      <label className="cf-oculto-visual" htmlFor="buscar-hermandad">
        Buscar hermandad
      </label>
      <Icono nombre="buscar" tamano={20} />
      <input
        id="buscar-hermandad"
        type="search"
        placeholder="Buscar hermandad"
        autoComplete="off"
        enterKeyHint="search"
        value={consulta}
        onChange={(e) => alCambiar(e.target.value)}
      />
      {consulta ? (
        <button type="button" className="cf-cofradias-borrar" aria-label="Borrar búsqueda" onClick={() => alCambiar("")}>
          <Icono nombre="cerrar" tamano={20} />
        </button>
      ) : null}
    </div>
  );
}

function ChipFiltro({
  valor,
  actual,
  alPulsar,
  children,
}: {
  valor: Filtro;
  actual: Filtro;
  alPulsar: (f: Filtro) => void;
  children: ReactNode;
}) {
  const activo = valor === actual;
  return (
    <button
      className="cf-filter"
      type="button"
      aria-pressed={activo}
      // Volver a pulsar el filtro puesto lo quita
      onClick={() => alPulsar(activo ? "todas" : valor)}
    >
      {activo ? <Icono nombre="check" tamano={16} /> : null}
      {children}
    </button>
  );
}

/**
 * Sin resultados: dice en llano qué ha pasado y da UNA salida. Sin
 * ilustración, sin disculpa y sin sugerir a quién ir a ver.
 */
function SinResultados({
  consulta,
  filtro,
  alQuitarFiltro,
  alBorrar,
}: {
  consulta: string;
  filtro: Filtro;
  alQuitarFiltro: () => void;
  alBorrar: () => void;
}) {
  const { usuario, disponible, entrar } = useSesion();
  const q = consulta.trim();
  const verTodas = (
    <Boton variante="secundario" onClick={alQuitarFiltro}>
      Ver todas
    </Boton>
  );

  if (filtro === "todas") {
    return (
      <Vacio titulo={`No hay ninguna hermandad que empiece por “${q}”`}>
        <Boton variante="secundario" onClick={alBorrar}>
          <Icono nombre="cerrar" tamano={20} />
          Borrar búsqueda
        </Boton>
      </Vacio>
    );
  }
  if (q) {
    const ambito = filtro === "seguidas" ? "tus seguidas" : "las que están en la calle";
    return (
      <Vacio titulo={`Ninguna de ${ambito} empieza por “${q}”`}>
        <Boton variante="secundario" onClick={alQuitarFiltro}>
          Buscar en todas
        </Boton>
      </Vacio>
    );
  }
  if (filtro === "en-calle") {
    return <Vacio titulo="Ahora no hay ninguna cofradía en la calle">{verTodas}</Vacio>;
  }
  if (!usuario && disponible) {
    return (
      <Vacio titulo="Para seguir cofradías, entra con tu cuenta de Google" texto="Así las tienes en cualquier teléfono.">
        <Boton variante="primario" onClick={() => void entrar("cofradias:seguidas")}>
          Entrar con Google
        </Boton>
      </Vacio>
    );
  }
  return (
    <Vacio titulo="Aún no sigues ninguna cofradía" texto="Puedes seguirlas desde su ficha.">
      {verTodas}
    </Vacio>
  );
}

function Vacio({ titulo, texto, children }: { titulo: string; texto?: string; children: ReactNode }) {
  return (
    <div className="cf-cofradias-vacio">
      <p className="q">{titulo}</p>
      {texto ? <p className="n">{texto}</p> : null}
      {children}
    </div>
  );
}

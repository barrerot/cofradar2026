import { useState } from "react";
import { Link } from "react-router-dom";
import { TarjetaCofradia } from "../componentes";
import { Boton, Cabecera, Icono, Marco } from "../marco";
import type { EstadoJornada } from "../fixture";
import {
  coincide,
  leerDirectorio,
  type CofradiaDirectorio,
  type Filtro,
  type NombreJornada,
} from "../fixture-cofradias";
import { DarFe } from "./DarFe";
import { SelectorJornada } from "./SelectorJornada";

/**
 * Cofradias · «¿cual es esta y como llego a ella?»
 *
 * Es el DIRECTORIO permanente de las hermandades de Sevilla capital, no la
 * lista del dia: eso es la Agenda. Existe todo el ano, no depende de que haya
 * jornada activa y no pide ubicacion ni cuenta.
 *
 * Diferencias de fondo con Inicio, que usa las MISMAS filas:
 *   · Aqui NINGUNA fila destaca. Inicio tiene sujeto porque hay una respuesta
 *     mejor que las demas; un directorio con un destacado estaria opinando
 *     sobre a quien ir a ver, y eso es el tablero de misiones que §2 prohibe.
 *   · La fila no lleva punto, ni hora, ni proximidad, ni accion: son datos de
 *     jornada y pertenecen a la Agenda.
 *   · El chip va donde dice §9.4 —a la derecha, a la altura del nombre, en el
 *     mismo punto de todas las filas—. La excepcion del sujeto de Inicio NO
 *     se replica aqui.
 */
export function Cofradias({ estado }: { estado: EstadoJornada }) {
  const [consulta, setConsulta] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const fueraDeTemporada = estado.intensidad === "fuera-temporada";
  const jornadaDeHoy = fueraDeTemporada ? null : (estado.jornada.nombre as NombreJornada);

  const grupos = leerDirectorio({ jornadaDeHoy, conEstado: !fueraDeTemporada });

  const pasaElFiltro = (c: CofradiaDirectorio) =>
    filtro === "todas" ||
    (filtro === "en-calle" && c.fase === "en_calle") ||
    (filtro === "seguidas" && c.relacion === "seguida");

  const visibles = grupos.map((g) => ({
    ...g,
    cofradias: g.cofradias.filter((c) => pasaElFiltro(c) && coincide(c.nombre, consulta)),
  }));

  /* Los contadores cuentan sobre el directorio entero, no sobre lo que la
     busqueda deja ver: dicen cuantas hay, no cuantas quedan. */
  const todas = grupos.flatMap((g) => g.cofradias);
  const cuenta = {
    enCalle: todas.filter((c) => c.fase === "en_calle").length,
    seguidas: todas.filter((c) => c.relacion === "seguida").length,
  };

  /* El relleno representa hermandades que no tenemos transcritas, asi que no
     se puede ni buscar ni filtrar dentro de el: con cualquiera de los dos
     puestos, desaparece en vez de fingir que coincide. */
  const buscando = consulta.trim() !== "" || filtro !== "todas";
  const hayResultados = visibles.some((g) => g.cofradias.length > 0);

  return (
    <Marco
      cabecera={
        <Cabecera
          etiqueta="Cabecera de Cofradías"
          principal={<SelectorJornada />}
          titulo="Cofradías"
          secundaria={
            <div className="cf-field cf-cofradias-busqueda">
              <label className="cf-oculto-visual" htmlFor="buscar-hermandad">
                Buscar hermandad
              </label>
              <input
                id="buscar-hermandad"
                type="search"
                placeholder="Buscar hermandad por nombre"
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
              />
            </div>
          }
          terciaria={
            <div className="cf-cofradias-filtros" role="group" aria-label="Filtros">
              <ChipFiltro valor="todas" actual={filtro} alPulsar={setFiltro}>
                Todas
              </ChipFiltro>
              <ChipFiltro valor="en-calle" actual={filtro} alPulsar={setFiltro}>
                En la calle <span className="num">({cuenta.enCalle})</span>
              </ChipFiltro>
              <ChipFiltro valor="seguidas" actual={filtro} alPulsar={setFiltro}>
                Mis seguidas <span className="num">({cuenta.seguidas})</span>
              </ChipFiltro>
            </div>
          }
        />
      }
      accion={estado.activa ? <DarFe /> : undefined}
    >
      {hayResultados ? (
        visibles.map((g) => (
          <Grupo
            key={g.jornada}
            jornada={g.jornada}
            hoy={g.hoy}
            cofradias={g.cofradias}
            consulta={consulta}
            relleno={buscando ? [] : g.relleno}
          />
        ))
      ) : (
        <SinResultados
          consulta={consulta}
          filtro={filtro}
          alQuitarFiltro={() => setFiltro("todas")}
          alBorrar={() => setConsulta("")}
        />
      )}
    </Marco>
  );
}

/**
 * Un grupo de jornada. El rotulo se queda pegado arriba al desplazarse (ver
 * cofradias.css): con el listado completo, saber en que jornada estas no
 * puede depender de recordar por donde ibas.
 *
 * Un grupo sin nada que ensenar no se pinta, igual que en Inicio.
 */
function Grupo({
  jornada,
  hoy,
  cofradias,
  consulta,
  relleno,
}: {
  jornada: string;
  hoy: boolean;
  cofradias: readonly CofradiaDirectorio[];
  consulta: string;
  relleno: readonly number[];
}) {
  if (cofradias.length === 0 && relleno.length === 0) return null;

  return (
    <section className="cf-cofradias-grupo">
      <h2>
        {hoy ? `${jornada} · hoy` : jornada}
        {cofradias.length > 0 ? <span className="n"> · {cofradias.length}</span> : null}
      </h2>

      <div className="cf-lista">
        {cofradias.map((c) => (
          <Link key={c.id} className="cf-lista-enlace" to={`/cofradias/${c.id}`}>
            <TarjetaCofradia
              cofradia={c}
              densidad="compacta"
              nombreResaltado={resaltar(c.nombre, consulta)}
            />
          </Link>
        ))}

        {relleno.map((ancho, i) => (
          <div className="cf-cofradias-relleno" key={`relleno-${i}`} aria-hidden="true">
            <span className="bar" style={{ width: `${ancho}%` }} />
            <span className="lab">Relleno</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Subraya la parte del nombre que coincide con la busqueda.
 *
 * Se marca SUBRAYADO y no con fondo de color (ver listas.css): la fila ya
 * tiene chip de fase y marca de relacion, y ningun significado puede depender
 * solo del color.
 */
function resaltar(nombre: string, consulta: string) {
  const q = consulta.trim();
  if (q === "") return nombre;

  /* Se resalta el comienzo de cada palabra, que es por donde se busca. */
  const partes = nombre.split(/(\s+)/).map((trozo, i) => {
    if (!empiezaPor(trozo, q)) return trozo;
    return (
      <span key={i}>
        <mark>{trozo.slice(0, q.length)}</mark>
        {trozo.slice(q.length)}
      </span>
    );
  });

  return <>{partes}</>;
}

function empiezaPor(palabra: string, consulta: string): boolean {
  const sinTildes = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  return sinTildes(palabra).startsWith(sinTildes(consulta));
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
  children: React.ReactNode;
}) {
  const activo = valor === actual;

  return (
    <button
      className="cf-filter"
      type="button"
      aria-pressed={activo}
      /* Volver a pulsar el filtro puesto lo quita: es una de las cuatro
         salidas del estado filtrado. */
      onClick={() => alPulsar(activo ? "todas" : valor)}
    >
      {activo ? <Icono nombre="check" tamano={16} /> : null}
      {children}
    </button>
  );
}

/**
 * Sin resultados.
 *
 * Dice en llano QUE ha pasado y POR QUE, y da UNA salida. La frase y el boton
 * cambian segun haya filtro puesto o no: con filtro, la causa probable es el
 * filtro y la salida es buscar en todas; sin el, borrar la busqueda.
 *
 * Sin ilustracion, sin cara triste, sin disculpa y sin sugerir a quien ir a
 * ver: esto es un directorio, no un tablero de misiones.
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
  const q = consulta.trim();
  const conFiltro = filtro !== "todas";
  const ambito = filtro === "seguidas" ? "«Mis seguidas»" : "«En la calle»";

  return (
    <div className="cf-cofradias-vacio">
      <p className="q">
        {conFiltro
          ? `Ninguna de las de ${ambito} se llama «${q}».`
          : `Ninguna hermandad coincide con «${q}».`}
      </p>
      <p className="n">
        {conFiltro ? `La búsqueda solo mira en ${ambito}.` : "Se busca por el nombre popular."}
      </p>
      <Boton variante="secundario" onClick={conFiltro ? alQuitarFiltro : alBorrar}>
        <span>{conFiltro ? "Buscar en todas" : "Borrar búsqueda"}</span>
      </Boton>
    </div>
  );
}

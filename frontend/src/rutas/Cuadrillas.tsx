import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AvisoEntrada, Esqueleto } from "../componentes";
import { Boton, HojaDecision, Icono, PantallaSecundaria } from "../marco";
import { useSesion } from "../datos/sesion";
import { api, ErrorApi, miles, quedan, useEnLinea } from "../datos/trivialOnline";
import {
  apiCuadrillas,
  diaMes,
  enlaceCuadrilla,
  textoPartida,
  useCuadrillas,
  type Cuadrilla,
  type EnlaceCuadrilla,
  type Miembro,
  type ResumenCuadrilla,
} from "../datos/cuadrillas";
import { dias } from "../datos/dia";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { Cirio } from "./PreguntaDelDia";
import { ElegirAlias } from "./TrivialOnline";

/**
 * P-36 Cuadrillas (F-57; 12-ano-cofrade/8–15).
 *
 *   /mi-cofradar/cuadrillas                 tus cuadrillas y «Crear una cuadrilla» (8)
 *   /mi-cofradar/cuadrillas/nueva           crearla (9); pide el alias si aún no lo tiene
 *   /mi-cofradar/cuadrillas/:id             la cuadrilla: miembros, cirios y partidas (12), la hoja de cada
 *                                           miembro (13) y el menú con salir, cambiar el nombre y quitar (15)
 *   /mi-cofradar/cuadrillas/:id/invitar     el enlace (10)
 *   /mi-cofradar/cuadrillas/i/:token        lo que ve quien lo abre (11); /c/:token lleva aquí
 *
 * El reto a un miembro llega a su bandeja del trivial online, junto a las revanchas (14).
 * Orden alfabético y sin podio. Nunca puntos, nivel ni dónde ha estado nadie.
 */

const LISTA = "/mi-cofradar/cuadrillas";
const VUELTA_MI = { etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" };
const VUELTA_LISTA = { etiqueta: "Cuadrillas", ruta: LISTA };
const MOTIVO = "cuadrillas";

const darFe = (estado: EstadoJornada) => (estado.activa ? <DarFe /> : undefined);
const mensaje = (e: unknown, por: string) => (e instanceof ErrorApi && e.estado ? e.message : por);
const SIN_RED = "No se ha podido hacer. Comprueba la conexión y vuelve a intentarlo.";

function Aviso({ texto }: { texto: string | null }) {
  return texto ? (
    <p className="cf-online-error" role="alert">
      <Icono nombre="informativo" tamano={16} />
      {texto}
    </p>
  ) : null;
}

function PideCuenta() {
  const { disponible, entrar } = useSesion();
  return (
    <div className="cf-online">
      <AvisoEntrada motivo={MOTIVO} />
      <p className="cf-online-intro">Una cuadrilla es un grupo privado de amigos, para que os piquéis entre vosotros. Para crear una o entrar, entra con tu cuenta de Google.</p>
      {disponible ? (
        <Boton variante="primario" tamano="52" onClick={() => void entrar(MOTIVO)}>
          Entrar con Google
        </Boton>
      ) : null}
    </div>
  );
}

function ErrorCarga({ error, alReintentar }: { error: ErrorApi; alReintentar: () => void }) {
  if (error.estado === 404)
    return (
      <div className="cf-online">
        <p className="cf-online-intro">Esta cuadrilla ya no existe o ya no estás en ella.</p>
        <Link to={LISTA} className="cf-online-enlace">
          Ver tus cuadrillas
        </Link>
      </div>
    );
  return (
    <div className="cf-online">
      <p className="cf-online-intro">No se ha podido cargar. Comprueba la conexión.</p>
      <Boton variante="secundario" onClick={alReintentar}>
        Reintentar
      </Boton>
    </div>
  );
}

const personas = (n: number) => (n === 1 ? "1 persona" : `${n} personas`);

// ── 8 · Tus cuadrillas ──

export function TusCuadrillas({ estado }: { estado: EstadoJornada }) {
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const { datos, error, recargar } = useCuadrillas<{ cuadrillas: ResumenCuadrilla[]; max: number }>(usuario ? "" : null);
  let cuerpo: ReactNode;
  if (usuario === null) cuerpo = <PideCuenta />;
  else if (!datos) cuerpo = error ? <ErrorCarga error={error} alReintentar={recargar} /> : <Esqueleto forma="lista" />;
  else {
    const llenas = datos.cuadrillas.length >= datos.max;
    cuerpo = (
      <div className="cf-online">
        {datos.cuadrillas.length ? (
          <ul className="cf-cuad-lista">
            {datos.cuadrillas.map((c) => (
              <li key={c.id}>
                <Link to={`${LISTA}/${c.id}`} className="cf-online-fila">
                  <span className="cf-online-fila-texto">
                    <span className="cf-cuad-nombre">{c.nombre}</span>
                    <span className="cf-online-fila-nota">
                      {personas(c.miembros)} · {c.soyCapataz ? "tú eres el capataz" : c.capataz ? `capataz ${c.capataz}` : "sin capataz"}
                    </span>
                  </span>
                  <Icono nombre="chevronDerecha" tamano={20} />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <Boton variante="primario" tamano="52" disabled={llenas} onClick={() => navegar(`${LISTA}/nueva`)}>
          Crear una cuadrilla
        </Boton>
        {llenas ? <p className="cf-online-nota">Puedes estar en {datos.max} cuadrillas como mucho.</p> : null}
        <p className="cf-online-nota">Una cuadrilla es un grupo privado de amigos, de 2 a 30. Solo la ven sus miembros.</p>
      </div>
    );
  }
  return (
    <PantallaSecundaria titulo="Cuadrillas" vuelta={VUELTA_MI} accion={darFe(estado)} registro="editorial">
      {cuerpo}
    </PantallaSecundaria>
  );
}

// ── 9 · Crear una cuadrilla ──

export function CrearCuadrilla({ estado }: { estado: EstadoJornada }) {
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const enLinea = useEnLinea();
  const [alias, setAlias] = useState<string | null | undefined>(undefined);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    api<{ alias: string | null }>("GET", "/yo")
      .then((r) => setAlias(r.alias))
      .catch(() => setAlias(null));
  }, [usuario]);

  const crear = async () => {
    if (!nombre.trim()) {
      setError("Ponle un nombre");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const r = await apiCuadrillas<{ id: string }>("POST", "", { nombre });
      navegar(`${LISTA}/${r.id}/invitar`, { replace: true });
    } catch (e) {
      if (e instanceof ErrorApi && e.extra.sinAlias) setAlias(null);
      else setError(mensaje(e, SIN_RED));
    } finally {
      setEnviando(false);
    }
  };

  let cuerpo: ReactNode;
  let principal: ReactNode;
  if (usuario === null) cuerpo = <PideCuenta />;
  else if (alias === undefined) cuerpo = <Esqueleto forma="lista" />;
  else if (alias === null) cuerpo = <ElegirAlias texto="Antes de crear la cuadrilla, elige cómo te verán." alGuardar={setAlias} />;
  else {
    cuerpo = (
      <form
        id="crear-cuadrilla"
        className="cf-online"
        onSubmit={(e) => {
          e.preventDefault();
          void crear();
        }}
      >
        <div className="cf-field" data-state={error ? "error" : undefined}>
          <label htmlFor="cuadrilla-nombre">Nombre de la cuadrilla</label>
          <input
            id="cuadrilla-nombre"
            value={nombre}
            maxLength={30}
            autoComplete="off"
            aria-describedby="cuadrilla-nombre-ayuda"
            aria-invalid={error ? true : undefined}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Aviso texto={error} />
          <p id="cuadrilla-nombre-ayuda" className="cf-online-ayuda">
            Hasta 30 letras. Lo ven solo los que entren
          </p>
        </div>
        <p className="cf-online-intro">Serás el capataz: podrás cambiar el nombre, anular el enlace y quitar a alguien.</p>
      </form>
    );
    principal = (
      <div className="cf-online-franja">
        <Boton variante="primario" tamano="52" type="submit" form="crear-cuadrilla" cargando={enviando} disabled={!enLinea}>
          Crear
        </Boton>
      </div>
    );
  }
  return (
    <PantallaSecundaria
      titulo="Crear una cuadrilla"
      vuelta={VUELTA_LISTA}
      accion={principal || estado.activa ? <>{principal}{darFe(estado)}</> : undefined}
      registro="editorial"
    >
      {cuerpo}
    </PantallaSecundaria>
  );
}

// ── 10 · Invitar ──

export function InvitarCuadrilla({ estado }: { estado: EstadoJornada }) {
  const { id = "" } = useParams();
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const { datos, error, recargar } = useCuadrillas<Cuadrilla>(usuario ? `/${id}` : null);
  const [enlace, setEnlace] = useState<{ token: string; vence: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [anular, setAnular] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    apiCuadrillas<{ token: string; vence: string }>("POST", `/${id}/enlace`)
      .then(setEnlace)
      .catch((e) => setAviso(mensaje(e, SIN_RED)));
  }, [usuario, id]);

  const url = enlace ? enlaceCuadrilla(enlace.token) : "";
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      setAviso("No se ha podido copiar. Mantén pulsado el enlace para copiarlo.");
    }
  };
  const compartir = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Cuadrilla de Cofradar", text: `Únete a mi cuadrilla «${datos?.nombre ?? ""}» en Cofradar`, url });
      } catch {
        /* cerrar el menú no es un error */
      }
    } else await copiar();
  };

  let cuerpo: ReactNode;
  if (usuario === null) cuerpo = <PideCuenta />;
  else if (!datos) cuerpo = error ? <ErrorCarga error={error} alReintentar={recargar} /> : <Esqueleto forma="lista" />;
  else
    cuerpo = (
      <div className="cf-online">
        <p className="cf-online-titulo">Tu invitación está lista.</p>
        <div className="cf-field">
          <label htmlFor="cuadrilla-enlace">Enlace de la invitación</label>
          <input id="cuadrilla-enlace" className="cf-online-enlace-caja" readOnly value={url} onFocus={(e) => e.target.select()} />
        </div>
        <div className="cf-online-botones">
          <Boton variante="primario" tamano="52" disabled={!enlace} onClick={() => void compartir()}>
            <Icono nombre="compartir" tamano={20} />
            Compartir
          </Boton>
          <Boton variante="secundario" tamano="52" disabled={!enlace} onClick={() => void copiar()}>
            <Icono nombre="copiar" tamano={20} />
            {copiado ? "Enlace copiado" : "Copiar enlace"}
          </Boton>
        </div>
        <p className="cf-online-nota">El enlace vale 7 días y sirve para varias personas, hasta llenar la cuadrilla.</p>
        <p className="cf-cuad-cupo">
          <Icono nombre="cuadrilla" tamano={20} />
          <span className="cf-num">
            {datos.total} de {datos.max}
          </span>
        </p>
        <Aviso texto={aviso} />
        {datos.soyCapataz ? (
          <button type="button" className="cf-online-enlace" onClick={() => setAnular(true)}>
            Anular el enlace
          </button>
        ) : null}
        <HojaAnular abierta={anular} id={id} alCerrar={() => setAnular(false)} alAnular={() => navegar(`${LISTA}/${id}`, { replace: true })} />
      </div>
    );
  return (
    <PantallaSecundaria titulo="Invitar a la cuadrilla" vuelta={{ etiqueta: datos?.nombre ?? "Cuadrilla", ruta: `${LISTA}/${id}` }} accion={darFe(estado)} registro="editorial">
      {cuerpo}
    </PantallaSecundaria>
  );
}

function HojaAnular({ abierta, id, alCerrar, alAnular }: { abierta: boolean; id: string; alCerrar: () => void; alAnular: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  return (
    <HojaDecision
      abierta={abierta}
      titulo="¿Anular el enlace de invitación?"
      alCerrar={alCerrar}
      acciones={
        <>
          <Boton variante="primario" tamano="52" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="secundario"
            tamano="52"
            cargando={enviando}
            onClick={async () => {
              setEnviando(true);
              try {
                await apiCuadrillas("DELETE", `/${id}/enlace`);
                alCerrar();
                alAnular();
              } catch (e) {
                setAviso(mensaje(e, SIN_RED));
              } finally {
                setEnviando(false);
              }
            }}
          >
            Anular
          </Boton>
        </>
      }
    >
      <p>Quien lo tenga ya no podrá entrar. Con «Invitar» sale uno nuevo.</p>
      <Aviso texto={aviso} />
    </HojaDecision>
  );
}

// ── 11 · La invitación, al abrir el enlace ──

export function InvitacionCuadrilla({ estado }: { estado: EstadoJornada }) {
  const { token = "" } = useParams();
  const navegar = useNavigate();
  const { usuario, entrar, disponible } = useSesion();
  const { datos, error, recargar } = useCuadrillas<EnlaceCuadrilla>(usuario === undefined ? null : `/enlaces/${token}`);
  const [pideAlias, setPideAlias] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cerrada, setCerrada] = useState<EnlaceCuadrilla["estado"] | null>(null);

  const unirme = async () => {
    setEnviando(true);
    setAviso(null);
    try {
      const r = await apiCuadrillas<{ id: string }>("POST", `/enlaces/${token}/entrar`);
      navegar(`${LISTA}/${r.id}`, { replace: true });
    } catch (e) {
      if (e instanceof ErrorApi && e.extra.sinAlias) setPideAlias(true);
      else if (e instanceof ErrorApi && typeof e.extra.estado === "string") setCerrada(e.extra.estado as EnlaceCuadrilla["estado"]);
      else setAviso(mensaje(e, SIN_RED));
    } finally {
      setEnviando(false);
    }
  };

  const volver = (
    <Boton variante="primario" tamano="52" onClick={() => navegar(VUELTA_MI.ruta)}>
      Volver a Mi Cofradar
    </Boton>
  );
  let cuerpo: ReactNode;
  if (!datos)
    cuerpo = error ? (
      error.estado === 404 ? (
        <div className="cf-online">
          <p className="cf-online-titulo">Esta invitación no existe.</p>
          {volver}
        </div>
      ) : (
        <ErrorCarga error={error} alReintentar={recargar} />
      )
    ) : (
      <Esqueleto forma="lista" />
    );
  else {
    const estadoEnlace = cerrada ?? datos.estado;
    const titulo = `${datos.invita ? `${datos.invita} te invita` : "Te invitan"} a la cuadrilla «${datos.cuadrilla}»`;
    if (pideAlias)
      cuerpo = (
        <div className="cf-online">
          <h1 className="cf-online-h1">{titulo}</h1>
          <p className="cf-online-nota">{personas(datos.miembros)}</p>
          <ElegirAlias
            texto="Antes de entrar, elige cómo te verán."
            alGuardar={() => {
              setPideAlias(false);
              void unirme();
            }}
          />
        </div>
      );
    else if (datos.dentro)
      cuerpo = (
        <div className="cf-online">
          <p className="cf-online-titulo">Ya estás en esta cuadrilla.</p>
          <Boton variante="primario" tamano="52" onClick={() => navegar(`${LISTA}/${datos.id}`)}>
            Ver la cuadrilla
          </Boton>
        </div>
      );
    else if (estadoEnlace !== "valido")
      cuerpo = (
        <div className="cf-online">
          <p className="cf-online-titulo">
            {estadoEnlace === "llena" ? `Esta cuadrilla ya tiene ${datos.max} personas.` : "Este enlace ha caducado o se ha anulado."}
          </p>
          {estadoEnlace === "llena" ? null : <p className="cf-online-intro">Pide a alguien de la cuadrilla que te mande uno nuevo.</p>}
          {volver}
        </div>
      );
    else
      cuerpo = (
        <div className="cf-online">
          <h1 className="cf-online-h1">{titulo}</h1>
          <p className="cf-cuad-personas">{personas(datos.miembros)}</p>
          <p className="cf-online-intro cf-cuad-secundario">Verás el alias, el cirio y las partidas de cada uno. Nunca tus puntos ni dónde has estado.</p>
          <AvisoEntrada motivo="cuadrilla-invitacion" />
          <Aviso texto={aviso} />
          <div className="cf-online-botones">
            <Boton
              variante="primario"
              tamano="52"
              cargando={enviando}
              disabled={usuario === null && !disponible}
              onClick={() => (usuario ? void unirme() : void entrar("cuadrilla-invitacion"))}
            >
              {usuario ? "Entrar en la cuadrilla" : "Entrar con Google para unirte"}
            </Boton>
            <Boton variante="secundario" tamano="52" onClick={() => navegar(VUELTA_MI.ruta)}>
              Ahora no
            </Boton>
          </div>
        </div>
      );
  }
  return (
    <PantallaSecundaria vuelta={VUELTA_MI} accion={darFe(estado)} registro="editorial">
      {cuerpo}
    </PantallaSecundaria>
  );
}

/** El enlace corto que se comparte: /c/:token. */
export function RedirigirCuadrilla() {
  const { token = "" } = useParams();
  return <Navigate to={`${LISTA}/i/${token}`} replace />;
}

// ── 12 · La cuadrilla ──

type Hoja = { tipo: "miembro"; alias: string } | { tipo: "menu" } | { tipo: "salir" } | { tipo: "quitar"; alias: string } | { tipo: "nombre" } | { tipo: "anular" } | null;

export function LaCuadrilla({ estado }: { estado: EstadoJornada }) {
  const { id = "" } = useParams();
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const { datos: c, error, recargar } = useCuadrillas<Cuadrilla>(usuario ? `/${id}` : null);
  const [hoja, setHoja] = useState<Hoja>(null);

  let cuerpo: ReactNode;
  if (usuario === null) cuerpo = <PideCuenta />;
  else if (!c) cuerpo = error ? <ErrorCarga error={error} alReintentar={recargar} /> : <Esqueleto forma="lista" />;
  else {
    const miembro = hoja?.tipo === "miembro" ? c.miembros.find((m) => m.alias === hoja.alias) : undefined;
    cuerpo = (
      <div className="cf-online">
        <p className="cf-cuad-sub">
          {personas(c.total)}
          {c.capataz ? ` · capataz ${c.soyCapataz ? "tú" : c.capataz}` : ""}
        </p>
        <div className="cf-cuad-acciones">
          <Boton variante="secundario" tamano="52" onClick={() => navegar(`${LISTA}/${id}/invitar`)}>
            <Icono nombre="invitar" tamano={20} />
            Invitar
          </Boton>
          <button type="button" className="cf-cuad-mas" aria-label="Más opciones" onClick={() => setHoja({ tipo: "menu" })}>
            <Icono nombre="masOpciones" tamano={24} />
          </button>
        </div>

        <section className="cf-online-grupo" aria-label="Miembros">
          <h2>Miembros</h2>
          <ul className="cf-cuad-miembros">
            {c.miembros.map((m) => (
              <li key={m.alias}>
                <FilaMiembro m={m} cuaresma={c.cuaresma} alTocar={m.tu ? undefined : () => setHoja({ tipo: "miembro", alias: m.alias })} />
              </li>
            ))}
          </ul>
          {c.total === 1 ? <p className="cf-online-nota">Por ahora solo estás tú. Invita a tus amigos con «Invitar».</p> : null}
        </section>

        <section className="cf-online-grupo" aria-label="Partidas en la cuadrilla">
          <h2>Partidas en la cuadrilla</h2>
          {c.partidas.enCurso.length ? (
            <ul className="cf-cuad-curso">
              {c.partidas.enCurso.map((p) => (
                <li key={p.id}>
                  <Link to={`/mi-cofradar/trivial/online/${p.id}`} className="cf-online-fila cf-cuad-en-curso">
                    <Icono nombre="reloj" tamano={20} />
                    <span className="cf-online-fila-titulo">
                      Tú contra {p.rival} · {p.teToca ? "te toca" : "le toca"}
                    </span>
                    <Icono nombre="chevronDerecha" tamano={20} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {c.partidas.terminadas.length ? (
            <ul className="cf-cuad-terminadas">
              {c.partidas.terminadas.map((p) => (
                <li key={p.id}>
                  <span className="cf-online-fila-nota">{diaMes(p.terminada)}</span>
                  <span className="cf-cuad-partida">{textoPartida(p)}</span>
                </li>
              ))}
            </ul>
          ) : !c.partidas.enCurso.length ? (
            <p className="cf-online-nota">Aún no habéis jugado entre vosotros. Toca a alguien de la cuadrilla para retarle.</p>
          ) : null}
        </section>

        <p className="cf-cuad-pie">Solo lo veis los de la cuadrilla. El cirio se ve en Cuaresma.</p>

        <HojaMiembro c={c} m={miembro} alCerrar={() => setHoja(null)} alCambiar={recargar} alQuitar={(alias) => setHoja({ tipo: "quitar", alias })} />
        <HojaDecision
          abierta={hoja?.tipo === "menu"}
          titulo={c.nombre}
          alCerrar={() => setHoja(null)}
          acciones={
            <ul className="cf-cuad-menu">
              {c.soyCapataz ? (
                <>
                  <li>
                    <button type="button" onClick={() => setHoja({ tipo: "nombre" })}>
                      Cambiar el nombre
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => setHoja({ tipo: "anular" })}>
                      Anular el enlace de invitación
                    </button>
                  </li>
                </>
              ) : null}
              <li>
                <button type="button" onClick={() => setHoja({ tipo: "salir" })}>
                  Salir de la cuadrilla
                </button>
              </li>
            </ul>
          }
        />
        <HojaSalir c={c} abierta={hoja?.tipo === "salir"} alCerrar={() => setHoja(null)} alSalir={() => navegar(LISTA, { replace: true })} />
        <HojaQuitar c={c} alias={hoja?.tipo === "quitar" ? hoja.alias : null} alCerrar={() => setHoja(null)} alQuitar={recargar} />
        <HojaNombre c={c} abierta={hoja?.tipo === "nombre"} alCerrar={() => setHoja(null)} alCambiar={recargar} />
        <HojaAnular abierta={hoja?.tipo === "anular"} id={c.id} alCerrar={() => setHoja(null)} alAnular={() => undefined} />
      </div>
    );
  }
  return (
    <PantallaSecundaria titulo={c?.nombre ?? "Cuadrilla"} vuelta={VUELTA_LISTA} accion={darFe(estado)} registro="editorial">
      {cuerpo}
    </PantallaSecundaria>
  );
}

function FilaMiembro({ m, cuaresma, alTocar }: { m: Miembro; cuaresma: boolean; alTocar?: () => void }) {
  const contenido = (
    <>
      <span className="cf-online-fila-texto">
        <span className="cf-cuad-alias">
          {m.alias}
          {m.tu ? <span className="cf-cuad-marca"> (tú)</span> : null}
          {m.capataz ? <span className="cf-cuad-marca"> capataz</span> : null}
        </span>
        {m.numero ? <span className="cf-online-fila-nota">nº {miles(m.numero)}</span> : null}
      </span>
      {cuaresma && m.cirio ? <CirioMiembro m={m} /> : null}
    </>
  );
  return alTocar ? (
    <button type="button" className="cf-cuad-miembro" onClick={alTocar}>
      {contenido}
    </button>
  ) : (
    <div className="cf-cuad-miembro">{contenido}</div>
  );
}

function CirioMiembro({ m }: { m: Miembro }) {
  const c = m.cirio!;
  const encendido = c.estado === "encendido" || c.estado === "pendiente";
  const forma = c.estado === "encendido" ? "encendido" : c.estado === "pendiente" ? "pendiente" : "apagado";
  return (
    <span className="cf-cuad-cirio">
      <Cirio forma={forma} tamano={20} />
      <span>
        <span className="cf-cuad-cirio-dias">{encendido ? dias(c.dias) : c.estado === "apagado" ? "apagado" : "sin encender"}</span>
        {m.tu && c.estado === "pendiente" ? <span className="cf-cuad-cirio-nota">hoy aún no</span> : null}
      </span>
    </span>
  );
}

// ── 13 · Un miembro ──

function HojaMiembro({
  c,
  m,
  alCerrar,
  alCambiar,
  alQuitar,
}: {
  c: Cuadrilla;
  m: Miembro | undefined;
  alCerrar: () => void;
  alCambiar: () => Promise<void> | void;
  alQuitar: (alias: string) => void;
}) {
  const navegar = useNavigate();
  const enLinea = useEnLinea();
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => setAviso(null), [m?.alias]);

  const hacer = async (fn: () => Promise<void>) => {
    setEnviando(true);
    setAviso(null);
    try {
      await fn();
    } catch (e) {
      // Ya había partida en curso: a ella
      if (e instanceof ErrorApi && typeof e.extra.partida === "string") navegar(`/mi-cofradar/trivial/online/${e.extra.partida}`);
      else {
        setAviso(mensaje(e, SIN_RED));
        void alCambiar();
      }
    } finally {
      setEnviando(false);
    }
  };

  let principal: ReactNode = null;
  if (m?.enCurso)
    principal = (
      <Boton variante="primario" tamano="52" onClick={() => navegar(`/mi-cofradar/trivial/online/${m.enCurso}`)}>
        Ir a la partida
      </Boton>
    );
  else if (m?.reto?.tuyo)
    principal = (
      <>
        <Boton variante="secundario" tamano="52" disabled>
          Reto enviado · vence en {quedan(m.reto.vence)}
        </Boton>
        <button
          type="button"
          className="cf-online-enlace"
          disabled={!enLinea || enviando}
          onClick={() => void hacer(async () => {
            await apiCuadrillas("DELETE", `/retos/${m.reto!.id}`);
            await alCambiar();
          })}
        >
          Cancelar
        </button>
      </>
    );
  else if (m?.reto)
    principal = (
      <Boton
        variante="primario"
        tamano="52"
        cargando={enviando}
        disabled={!enLinea}
        onClick={() => void hacer(async () => {
          const r = await apiCuadrillas<{ partida: string }>("POST", `/retos/${m.reto!.id}/aceptar`);
          navegar(`/mi-cofradar/trivial/online/${r.partida}`);
        })}
      >
        Aceptar su reto
      </Boton>
    );
  else if (m)
    principal = (
      <Boton
        variante="primario"
        tamano="52"
        cargando={enviando}
        disabled={!enLinea}
        onClick={() => void hacer(async () => {
          await apiCuadrillas("POST", `/${c.id}/retos`, { alias: m.alias });
          await alCambiar();
        })}
      >
        Jugar una partida
      </Boton>
    );

  return (
    <HojaDecision
      abierta={!!m}
      titulo={m?.alias ?? ""}
      alCerrar={alCerrar}
      acciones={
        <>
          {principal}
          {c.soyCapataz && m && !m.tu ? (
            <button type="button" className="cf-online-enlace" onClick={() => alQuitar(m.alias)}>
              Quitar de la cuadrilla
            </button>
          ) : null}
        </>
      }
    >
      {m?.numero ? <p className="cf-online-nota">hermano nº {miles(m.numero)}</p> : null}
      {m?.historial && m.marcador ? (
        <Link to={`/mi-cofradar/trivial/online/${m.historial}/historial`} className="cf-online-enlace">
          Tú y {m.alias}: {m.marcador.tuyas}&nbsp;–&nbsp;{m.marcador.suyas} · Ver historial
        </Link>
      ) : m ? (
        <p className="cf-online-nota">Aún no habéis jugado.</p>
      ) : null}
      {m?.reto && !m.reto.tuyo ? <p className="cf-online-nota">Te ha retado · vence en {quedan(m.reto.vence)}</p> : null}
      <Aviso texto={aviso} />
    </HojaDecision>
  );
}

// ── 15 · Salir, quitar y cambiar el nombre ──

function HojaSalir({ c, abierta, alCerrar, alSalir }: { c: Cuadrilla; abierta: boolean; alCerrar: () => void; alSalir: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  return (
    <HojaDecision
      abierta={abierta}
      titulo={`¿Salir de «${c.nombre}»?`}
      alCerrar={alCerrar}
      acciones={
        <>
          <Boton variante="primario" tamano="52" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="secundario"
            tamano="52"
            cargando={enviando}
            onClick={async () => {
              setEnviando(true);
              try {
                await apiCuadrillas("POST", `/${c.id}/salir`);
                alSalir();
              } catch (e) {
                setAviso(mensaje(e, SIN_RED));
              } finally {
                setEnviando(false);
              }
            }}
          >
            Salir
          </Boton>
        </>
      }
    >
      <p>Podrás volver si te invitan otra vez.</p>
      {c.total === 1 ? <p className="cf-cuad-aviso">La cuadrilla desaparecerá.</p> : c.soyCapataz && c.sucesor ? <p className="cf-cuad-aviso">{c.sucesor} pasará a ser el capataz.</p> : null}
      <Aviso texto={aviso} />
    </HojaDecision>
  );
}

function HojaQuitar({ c, alias, alCerrar, alQuitar }: { c: Cuadrilla; alias: string | null; alCerrar: () => void; alQuitar: () => Promise<void> | void }) {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  return (
    <HojaDecision
      abierta={!!alias}
      titulo={`¿Quitar a ${alias ?? ""}?`}
      alCerrar={alCerrar}
      acciones={
        <>
          <Boton variante="primario" tamano="52" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="secundario"
            tamano="52"
            cargando={enviando}
            onClick={async () => {
              setEnviando(true);
              try {
                await apiCuadrillas("DELETE", `/${c.id}/miembros/${encodeURIComponent(alias ?? "")}`);
                alCerrar();
                await alQuitar();
              } catch (e) {
                setAviso(mensaje(e, SIN_RED));
              } finally {
                setEnviando(false);
              }
            }}
          >
            Quitar
          </Boton>
        </>
      }
    >
      <p>Podrá volver si le invitáis otra vez.</p>
      <Aviso texto={aviso} />
    </HojaDecision>
  );
}

function HojaNombre({ c, abierta, alCerrar, alCambiar }: { c: Cuadrilla; abierta: boolean; alCerrar: () => void; alCambiar: () => Promise<void> | void }) {
  const [nombre, setNombre] = useState(c.nombre);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    if (abierta) {
      setNombre(c.nombre);
      setAviso(null);
    }
  }, [abierta, c.nombre]);
  return (
    <HojaDecision
      abierta={abierta}
      titulo="Cambiar el nombre"
      alCerrar={alCerrar}
      acciones={
        <>
          <Boton
            variante="primario"
            tamano="52"
            cargando={enviando}
            disabled={!nombre.trim()}
            onClick={async () => {
              setEnviando(true);
              try {
                await apiCuadrillas("PATCH", `/${c.id}`, { nombre });
                alCerrar();
                await alCambiar();
              } catch (e) {
                setAviso(mensaje(e, SIN_RED));
              } finally {
                setEnviando(false);
              }
            }}
          >
            Guardar
          </Boton>
          <Boton variante="secundario" tamano="52" onClick={alCerrar}>
            Cancelar
          </Boton>
        </>
      }
    >
      <div className="cf-field" data-state={aviso ? "error" : undefined}>
        <label htmlFor="cuadrilla-renombrar">Nombre de la cuadrilla</label>
        <input id="cuadrilla-renombrar" value={nombre} maxLength={30} autoComplete="off" onChange={(e) => setNombre(e.target.value)} />
        <Aviso texto={aviso} />
        <p className="cf-online-ayuda">Hasta 30 letras.</p>
      </div>
    </HojaDecision>
  );
}

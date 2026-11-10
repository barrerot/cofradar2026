import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AvisoEntrada, Esqueleto } from "../componentes";
import { HojaDecision, Icono, PantallaSecundaria, Boton, type NombreTrazo } from "../marco";
import { useSesion } from "../datos/sesion";
import { aFuente, slug } from "../datos/trivial";
import { CATEGORIAS, describir, iniciales } from "../datos/tableroTrivial";
import {
  api,
  enlaceInvitacion,
  ErrorApi,
  hace,
  nuevaAccion,
  quedan,
  useEnLinea,
  useSondeo,
  type Bandeja,
  type Invitacion,
  type Partida,
  type Resolucion,
  type ResumenPartida,
} from "../datos/trivialOnline";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { TableroTrivial, Estrellas } from "./TableroTrivial";
import { FuenteDe } from "./Trivial";

/**
 * P-33 Trivial online por turnos (F-51; 11-trivial-online/).
 *
 *   /mi-cofradar/trivial                    portada: «Jugar solo» o «Jugar online» (01)
 *   /mi-cofradar/trivial/online             vestíbulo y bandeja (03, 14); el alias la primera vez (02)
 *   /mi-cofradar/trivial/alias              cambiar el alias (desde Cuenta)
 *   /mi-cofradar/trivial/invitar/:token     el enlace para compartir (04)
 *   /mi-cofradar/trivial/i/:token           la invitación recibida (05); /trivial/i/:token lleva aquí
 *   /mi-cofradar/trivial/online/:id         la partida: tablero, pregunta, resolución y resultado (06–13)
 *
 * El servidor manda en todo; aquí se pinta lo que dice y se le mandan las jugadas con un id, para que un
 * reintento no se cuente dos veces. Necesita cuenta y conexión; el solitario sigue sin ninguna de las dos.
 */

const ORIGEN_TRIVIAL = { etiqueta: "Trivial", ruta: "/mi-cofradar/trivial" };
const ORIGEN_ONLINE = { etiqueta: "Online", ruta: "/mi-cofradar/trivial/online" };

/** Lo que va en la franja: «Dar fe» si hay cofradías en la calle, y la acción del momento si la hay. */
function franja(estado: EstadoJornada, principal?: ReactNode) {
  const darFe = estado.activa ? <DarFe /> : null;
  if (!principal && !darFe) return undefined;
  return (
    <>
      {principal ? <div className="cf-online-franja">{principal}</div> : null}
      {darFe}
    </>
  );
}

// ── 01 · Portada del trivial ──

export function TrivialPortada({ estado }: { estado: EstadoJornada }) {
  const { usuario } = useSesion();
  const { datos } = useSondeo<Bandeja>(usuario ? "/bandeja" : null, 60_000);
  const esperan = datos?.partidas.filter((p) => p.teToca).length ?? 0;
  return (
    <PantallaSecundaria titulo="Trivial cofrade" vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }} accion={franja(estado)} registro="editorial">
      <div className="cf-online">
        <Link to="/mi-cofradar/trivial/solo" className="cf-online-modo">
          <span className="cf-online-modo-texto">
            <span className="cf-online-modo-nombre">Jugar solo</span>
            <span className="cf-online-modo-nota">10 preguntas. Sin cuenta, sin conexión y sin puntos.</span>
          </span>
          <Icono nombre="chevronDerecha" tamano={24} />
        </Link>
        <Link to="/mi-cofradar/trivial/online" className="cf-online-modo">
          <span className="cf-online-modo-texto">
            <span className="cf-online-modo-nombre">Jugar online</span>
            <span className="cf-online-modo-nota">Contra otra persona, por turnos.</span>
            {esperan ? <span className="cf-online-modo-aviso">{esperan === 1 ? "1 partida te espera" : `${esperan} partidas te esperan`}</span> : null}
          </span>
          <Icono nombre="chevronDerecha" tamano={24} />
        </Link>
      </div>
    </PantallaSecundaria>
  );
}

// ── Sin cuenta ──

function PideCuenta({ motivo, texto }: { motivo: string; texto: string }) {
  const { disponible, entrar } = useSesion();
  return (
    <div className="cf-online">
      <AvisoEntrada motivo={motivo} />
      <p className="cf-online-intro">{texto}</p>
      {disponible ? (
        <Boton variante="primario" tamano="52" onClick={() => void entrar(motivo)}>
          Entrar con Google
        </Boton>
      ) : null}
      <Link to="/mi-cofradar/trivial/solo" className="cf-online-enlace">
        Mientras, puedes jugar solo
      </Link>
    </div>
  );
}

// ── 02 · Alias ──

function ElegirAlias({ inicial, alGuardar, boton = "Guardar y seguir" }: { inicial?: string; alGuardar: (alias: string) => void; boton?: string }) {
  const [alias, setAlias] = useState(inicial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const guardar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await api<{ alias: string }>("PUT", "/yo", { alias: alias.trim() });
      alGuardar(r.alias);
    } catch (e) {
      setError(e instanceof ErrorApi && e.estado ? e.message : "No se ha podido guardar. Comprueba la conexión.");
    } finally {
      setEnviando(false);
    }
  };
  return (
    <form
      className="cf-online"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <p className="cf-online-intro">Elige cómo te verá tu rival.</p>
      <div className="cf-field" data-state={error ? "error" : undefined}>
        <label htmlFor="trivial-alias">Alias</label>
        <input
          id="trivial-alias"
          value={alias}
          maxLength={20}
          autoComplete="nickname"
          autoCapitalize="off"
          spellCheck={false}
          aria-describedby="trivial-alias-ayuda"
          aria-invalid={error ? true : undefined}
          onChange={(e) => setAlias(e.target.value)}
        />
        {error ? (
          // En tinta con icono, no en rojo (11-trivial-online/02b)
          <p className="cf-online-error" role="alert">
            <Icono nombre="informativo" tamano={16} />
            {error}
          </p>
        ) : null}
        <p id="trivial-alias-ayuda" className="cf-online-ayuda">
          De 3 a 20 letras, números o _. Tu correo no se enseña nunca.
        </p>
      </div>
      <Boton variante="primario" tamano="52" type="submit" cargando={enviando} disabled={alias.trim().length < 3}>
        {boton}
      </Boton>
    </form>
  );
}

export function TrivialAlias({ estado }: { estado: EstadoJornada }) {
  const navegar = useNavigate();
  const { usuario } = useSesion();
  const { datos } = useSondeo<{ alias: string | null }>(usuario ? "/yo" : null, 600_000);
  const vuelta = { etiqueta: "Cuenta", ruta: "/mi-cofradar/cuenta" };
  return (
    <PantallaSecundaria titulo="Alias del trivial" vuelta={vuelta} accion={franja(estado)} registro="editorial">
      {usuario === null ? (
        <PideCuenta motivo="trivial-alias" texto="Para jugar online, entra con tu cuenta de Google." />
      ) : !datos ? (
        <Esqueleto forma="lista" />
      ) : (
        <ElegirAlias inicial={datos.alias ?? ""} boton="Guardar" alGuardar={() => navegar(vuelta.ruta)} />
      )}
    </PantallaSecundaria>
  );
}

// ── 03 · Vestíbulo y bandeja (14 sin conexión) ──

export function TrivialVestibulo({ estado }: { estado: EstadoJornada }) {
  const navegar = useNavigate();
  const { usuario } = useSesion();
  const enLinea = useEnLinea();
  const { datos, error, recargar, poner } = useSondeo<Bandeja>(usuario ? "/bandeja" : null, 20_000);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const hacer = async (que: string, fn: () => Promise<void>) => {
    setOcupado(que);
    setAviso(null);
    try {
      await fn();
    } catch (e) {
      setAviso(e instanceof ErrorApi && e.estado ? e.message : "No se ha podido hacer. Comprueba la conexión y vuelve a intentarlo.");
    } finally {
      setOcupado(null);
    }
  };

  let cuerpo: ReactNode;
  if (usuario === null) cuerpo = <PideCuenta motivo="trivial-online" texto="Para jugar online contra otra persona, entra con tu cuenta de Google." />;
  else if (!datos) cuerpo = error ? <ErrorCarga alReintentar={recargar} /> : <Esqueleto forma="lista" />;
  else if (!datos.alias) cuerpo = <ElegirAlias alGuardar={(alias) => poner({ ...datos, alias })} />;
  else {
    const tuTurno = datos.partidas.filter((p) => p.estado === "activa" && p.teToca);
    const suyo = datos.partidas.filter((p) => p.estado === "activa" && !p.teToca);
    const fin = datos.partidas.filter((p) => p.estado === "finalizada");
    cuerpo = (
      <div className="cf-online">
        <div className="cf-online-botones">
          <Boton
            variante="primario"
            tamano="52"
            disabled={!enLinea}
            cargando={ocupado === "invitar"}
            onClick={() =>
              void hacer("invitar", async () => {
                const r = await api<{ token: string }>("POST", "/invitaciones");
                navegar(`/mi-cofradar/trivial/invitar/${r.token}`);
              })
            }
          >
            Invitar a un amigo
          </Boton>
          <Boton
            variante="secundario"
            tamano="52"
            disabled={!enLinea || !!datos.busqueda}
            cargando={ocupado === "buscar"}
            onClick={() =>
              void hacer("buscar", async () => {
                const r = await api<{ partida?: string }>("POST", "/cola");
                if (r.partida) navegar(`/mi-cofradar/trivial/online/${r.partida}`);
                else await recargar();
              })
            }
          >
            Buscar rival
          </Boton>
        </div>

        {!enLinea ? (
          <p className="cf-online-nota">
            Para jugar online necesitas conexión. Mientras, puedes <Link to="/mi-cofradar/trivial/solo">jugar solo</Link>.
          </p>
        ) : null}
        {aviso ? (
          <p className="cf-online-error" role="alert">
            <Icono nombre="informativo" tamano={16} />
            {aviso}
          </p>
        ) : null}

        {datos.invitaciones.length || datos.busqueda ? (
          <ul className="cf-online-estados">
            {datos.invitaciones.map((i) => (
              <li key={i.token}>
                <Icono nombre="enlace" tamano={20} />
                <Link to={`/mi-cofradar/trivial/invitar/${i.token}`} className="cf-online-estado-texto">
                  Invitación enviada · vence en {quedan(i.vence)}
                </Link>
                <button
                  type="button"
                  className="cf-online-cancelar"
                  disabled={!enLinea || ocupado === i.token}
                  onClick={() =>
                    void hacer(i.token, async () => {
                      await api("DELETE", `/invitaciones/${i.token}`);
                      await recargar();
                    })
                  }
                >
                  Cancelar
                </button>
              </li>
            ))}
            {datos.busqueda ? (
              <li>
                <Icono nombre="buscar" tamano={20} />
                <span className="cf-online-estado-texto">Buscando rival desde hace {hace(datos.busqueda.desde)}</span>
                <button
                  type="button"
                  className="cf-online-cancelar"
                  disabled={!enLinea || ocupado === "cola"}
                  onClick={() =>
                    void hacer("cola", async () => {
                      const r = await api<{ cancelada: boolean; partida?: string | null }>("DELETE", "/cola");
                      // Si justo antes alguien te emparejó, gana el emparejamiento
                      if (!r.cancelada && r.partida) navegar(`/mi-cofradar/trivial/online/${r.partida}`);
                      else await recargar();
                    })
                  }
                >
                  Cancelar
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}

        <GrupoBandeja titulo="Tu turno" partidas={tuTurno} vacio="Ahora no te toca en ninguna." />
        <GrupoBandeja titulo="Turno del rival" partidas={suyo} />
        <GrupoBandeja titulo="Finalizadas" partidas={fin} />
        {!datos.partidas.length ? <p className="cf-online-nota">Aún no tienes partidas. Invita a un amigo o busca rival.</p> : null}
      </div>
    );
  }

  return (
    <PantallaSecundaria titulo="Trivial online" vuelta={ORIGEN_TRIVIAL} accion={franja(estado)} registro="editorial">
      {cuerpo}
    </PantallaSecundaria>
  );
}

function GrupoBandeja({ titulo, partidas, vacio }: { titulo: string; partidas: ResumenPartida[]; vacio?: string }) {
  if (!partidas.length && !vacio) return null;
  return (
    <section className="cf-online-grupo" aria-label={titulo}>
      <h2>{titulo}</h2>
      {partidas.length ? (
        <ul>
          {partidas.map((p) => (
            <li key={p.id}>
              <Link to={`/mi-cofradar/trivial/online/${p.id}`} className="cf-online-fila">
                <span className="cf-online-fila-texto">
                  <span className="cf-online-fila-titulo">{tituloFila(p)}</span>
                  {notaFila(p).map((l) => (
                    <span key={l} className="cf-online-fila-nota">
                      {l}
                    </span>
                  ))}
                </span>
                <Icono nombre="chevronDerecha" tamano={20} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cf-online-nota">{vacio}</p>
      )}
    </section>
  );
}

function tituloFila(p: ResumenPartida): string {
  if (p.estado === "activa") return p.teToca ? `Contra ${p.rival}` : `Esperando a ${p.rival} · ${quedan(p.turnoVence)}`;
  if (p.motivo === "inactividad") return `Sin ganador contra ${p.rival}`;
  const marcador = p.motivo === "estrellas" ? ` ${p.estrellas.tuyas}-${p.estrellas.rival}` : "";
  return p.ganaste ? `Ganaste${marcador} a ${p.rival}` : `Ganó ${p.rival}${p.motivo === "estrellas" ? ` ${p.estrellas.rival}-${p.estrellas.tuyas}` : ""}`;
}

function notaFila(p: ResumenPartida): string[] {
  if (p.estado === "activa") {
    const estrellas = `Estrellas: tú ${p.estrellas.tuyas} · ${p.rival} ${p.estrellas.rival}`;
    return p.teToca ? [`Te toca · te quedan ${quedan(p.turnoVence)}`, estrellas] : [estrellas];
  }
  const dia = p.terminada ? new Date(p.terminada).toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : "";
  const motivo = p.motivo === "rendicion" ? (p.ganaste ? `${p.rival} se rindió` : "Te rendiste") : p.motivo === "inactividad" ? "Cerrada por inactividad" : "";
  return [[dia, motivo].filter(Boolean).join(" · ")];
}

function ErrorCarga({ alReintentar }: { alReintentar: () => void }) {
  return (
    <div className="cf-online">
      <p className="cf-online-nota">No se ha podido cargar. Comprueba la conexión.</p>
      <Boton variante="secundario" onClick={alReintentar}>
        Reintentar
      </Boton>
    </div>
  );
}

// ── 04 · Invitar a un amigo ──

export function TrivialInvitar({ estado }: { estado: EstadoJornada }) {
  const { token = "" } = useParams();
  const navegar = useNavigate();
  const enlace = enlaceInvitacion(token);
  const [copiado, setCopiado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const texto = "Te reto a una partida del Trivial cofrade de Cofradar";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
    } catch {
      setAviso("No se ha podido copiar. Mantén pulsado el enlace para copiarlo.");
    }
  };
  const compartir = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Trivial cofrade", text: texto, url: enlace });
      } catch {
        /* cerrar el menú no es un error */
      }
    } else await copiar();
  };

  return (
    <PantallaSecundaria titulo="Invitar a un amigo" vuelta={ORIGEN_ONLINE} accion={franja(estado)} registro="editorial">
      <div className="cf-online">
        <p className="cf-online-intro">Tu invitación está lista.</p>
        <input className="cf-online-enlace-caja" readOnly value={enlace} aria-label="Enlace de la invitación" onFocus={(e) => e.target.select()} />
        <div className="cf-online-botones">
          <Boton variante="primario" tamano="52" onClick={() => void compartir()}>
            Compartir
          </Boton>
          <Boton variante="secundario" tamano="52" onClick={() => void copiar()}>
            {copiado ? "Enlace copiado" : "Copiar enlace"}
          </Boton>
        </div>
        <p className="cf-online-nota">Vale 72 horas y solo para una persona.</p>
        {aviso ? <p className="cf-online-nota" role="status">{aviso}</p> : null}
        <button
          type="button"
          className="cf-online-enlace"
          onClick={async () => {
            try {
              await api("DELETE", `/invitaciones/${token}`);
            } catch {
              /* ya no estaba pendiente: igual se vuelve */
            }
            navegar(ORIGEN_ONLINE.ruta);
          }}
        >
          Cancelar invitación
        </button>
      </div>
    </PantallaSecundaria>
  );
}

// ── 05 · Invitación recibida ──

export function TrivialInvitacion({ estado }: { estado: EstadoJornada }) {
  const { token = "" } = useParams();
  const navegar = useNavigate();
  const { usuario, entrar, disponible } = useSesion();
  const { datos, error, recargar } = useSondeo<Invitacion>(usuario === undefined ? null : `/invitaciones/${token}`, 60_000);
  const [pideAlias, setPideAlias] = useState(false);
  const [aceptando, setAceptando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [final, setFinal] = useState<Invitacion["estado"] | null>(null);

  const aceptar = async () => {
    setAceptando(true);
    setAviso(null);
    try {
      const r = await api<{ partida: string }>("POST", `/invitaciones/${token}/aceptar`);
      navegar(`/mi-cofradar/trivial/online/${r.partida}`, { replace: true });
    } catch (e) {
      if (e instanceof ErrorApi && e.extra.sinAlias) setPideAlias(true);
      else if (e instanceof ErrorApi && typeof e.extra.estado === "string" && e.extra.estado !== "tuya") setFinal(e.extra.estado as Invitacion["estado"]);
      else setAviso(e instanceof ErrorApi && e.estado ? e.message : "No se ha podido aceptar. Comprueba la conexión.");
    } finally {
      setAceptando(false);
    }
  };

  let cuerpo: ReactNode;
  if (!datos) cuerpo = error ? (error.estado === 404 ? <p className="cf-online-intro">Esta invitación no existe.</p> : <ErrorCarga alReintentar={recargar} />) : <Esqueleto forma="lista" />;
  else if (pideAlias) cuerpo = <ElegirAlias alGuardar={() => { setPideAlias(false); void aceptar(); }} />;
  else {
    const estadoInv = final ?? datos.estado;
    const cerrada =
      estadoInv === "caducada" ? "Esta invitación ya ha caducado." : estadoInv === "cancelada" ? `${datos.anfitrion} ha cancelado esta invitación.` : estadoInv === "aceptada" ? "Otra persona ya ha aceptado esta invitación." : null;
    cuerpo = (
      <div className="cf-online">
        {cerrada ? (
          <>
            <p className="cf-online-titulo">{cerrada}</p>
            <Boton variante="primario" tamano="52" onClick={() => navegar(ORIGEN_TRIVIAL.ruta)}>
              Volver al trivial
            </Boton>
          </>
        ) : datos.tuya ? (
          <>
            <p className="cf-online-titulo">Es tu propia invitación.</p>
            <p className="cf-online-intro">Compártela con quien quieras retar.</p>
            <Boton variante="primario" tamano="52" onClick={() => navegar(`/mi-cofradar/trivial/invitar/${token}`)}>
              Compartirla
            </Boton>
          </>
        ) : (
          <>
            <p className="cf-online-titulo">{datos.anfitrion} te reta a una partida de Trivial cofrade.</p>
            <p className="cf-online-intro">Por turnos, 48 horas para cada jugada. Gana quien consiga las seis estrellas.</p>
            <AvisoEntrada motivo="trivial-invitacion" />
            {aviso ? (
              <p className="cf-online-error" role="alert">
                <Icono nombre="informativo" tamano={16} />
                {aviso}
              </p>
            ) : null}
            <div className="cf-online-botones">
              <Boton
                variante="primario"
                tamano="52"
                cargando={aceptando}
                disabled={usuario === null && !disponible}
                onClick={() => (usuario ? void aceptar() : void entrar("trivial-invitacion"))}
              >
                {usuario ? "Aceptar" : "Entrar con Google y aceptar"}
              </Boton>
              <Boton variante="secundario" tamano="52" onClick={() => navegar(ORIGEN_TRIVIAL.ruta)}>
                Ahora no
              </Boton>
            </div>
          </>
        )}
      </div>
    );
  }
  return (
    <PantallaSecundaria titulo="Invitación" vuelta={ORIGEN_TRIVIAL} accion={franja(estado)} registro="editorial">
      {cuerpo}
    </PantallaSecundaria>
  );
}

/** El enlace corto que se comparte: /trivial/i/:token. */
export function RedirigirInvitacion() {
  const { token = "" } = useParams();
  return <Navigate to={`/mi-cofradar/trivial/i/${token}`} replace />;
}

// ── 06–13 · La partida ──

type Pendiente = { cuerpo: Record<string, unknown> };

export function TrivialPartida({ estado }: { estado: EstadoJornada }) {
  const { id = "" } = useParams();
  const navegar = useNavigate();
  const { usuario } = useSesion();
  const enLinea = useEnLinea();
  // Cuando le toca al rival se mira más a menudo, para ver enseguida que te toca
  const [cada, setCada] = useState(15_000);
  const { datos: partida, error, recargar, poner } = useSondeo<Partida>(usuario ? `/partidas/${id}` : null, cada);
  const [resolucion, setResolucion] = useState<{ r: Resolucion; elegida: string; pregunta: NonNullable<Partida["pregunta"]> } | null>(null);
  const [verTablero, setVerTablero] = useState(false);
  const [elegida, setElegida] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<{ mensaje: string; reintento?: Pendiente } | null>(null);
  const [rendirse, setRendirse] = useState(false);

  const mia = !!partida && partida.estado === "activa" && partida.turno === partida.yo;
  useEffect(() => setCada(mia ? 60_000 : 15_000), [mia]);

  // Cada pantalla nueva empieza arriba
  const paso = `${partida?.fase}-${partida?.turno}-${resolucion ? "r" : ""}-${verTablero}-${partida?.estado}`;
  useEffect(() => {
    document.getElementById("contenido")?.scrollTo({ top: 0 });
    window.scrollTo(0, 0);
  }, [paso]);

  const enviar = useCallback(
    async (p: Pendiente) => {
      setEnviando(true);
      setFallo(null);
      try {
        const r = await api<{ resultado: Record<string, unknown>; partida: Partida }>("POST", `/partidas/${id}/jugadas`, p.cuerpo);
        if (p.cuerpo.tipo === "responder" && partida?.pregunta) {
          setResolucion({ r: r.resultado as unknown as Resolucion, elegida: String(p.cuerpo.opcion), pregunta: partida.pregunta });
          setElegida(null);
        }
        if (p.cuerpo.tipo === "rendirse") setRendirse(false);
        setVerTablero(false);
        poner(r.partida);
      } catch (e) {
        if (e instanceof ErrorApi && e.estado === 409 && e.extra.partida) {
          // La partida cambió (venció el turno, otra sesión): se repinta como está
          poner(e.extra.partida as Partida);
          setFallo({ mensaje: e.message === "La partida ha cambiado" ? "La partida ha cambiado mientras tanto. Ya está al día." : e.message });
          setElegida(null);
        } else if (e instanceof ErrorApi && e.estado && e.estado !== 0) {
          setFallo({ mensaje: e.message });
        } else {
          // Sin respuesta: se puede reenviar la MISMA jugada; el servidor no la repite
          setFallo({ mensaje: "No ha llegado la respuesta del servidor.", reintento: p });
        }
      } finally {
        setEnviando(false);
      }
    },
    [id, partida, poner],
  );

  const jugada = (tipo: string, extra: Record<string, unknown> = {}) =>
    partida && void enviar({ cuerpo: { tipo, ...extra, accionId: nuevaAccion(), version: partida.version } });

  const vuelta = ORIGEN_ONLINE;
  if (usuario === null) {
    return (
      <PantallaSecundaria vuelta={vuelta} accion={franja(estado)} registro="editorial">
        <PideCuenta motivo="trivial-online" texto="Para ver tus partidas, entra con tu cuenta de Google." />
      </PantallaSecundaria>
    );
  }
  if (!partida) {
    return (
      <PantallaSecundaria vuelta={vuelta} accion={franja(estado)} registro="editorial">
        {error ? error.estado === 404 ? <p className="cf-online-intro">Esa partida no existe o no es tuya.</p> : <ErrorCarga alReintentar={recargar} /> : <Esqueleto forma="lista" />}
      </PantallaSecundaria>
    );
  }

  const yo = partida.yo;
  const rivalP = yo === 0 ? 1 : 0;
  const nombres = partida.jugadores;
  const rival = nombres[rivalP];
  const avisoFallo = fallo ? (
    <div className="cf-online-error" role="alert">
      <Icono nombre="informativo" tamano={16} />
      <span>{fallo.mensaje}</span>
      {fallo.reintento ? (
        <button type="button" className="cf-online-cancelar" disabled={!enLinea || enviando} onClick={() => void enviar(fallo.reintento!)}>
          Reintentar
        </button>
      ) : null}
    </div>
  ) : null;

  // 09 · 10 · Resolución de la pregunta que acabas de contestar
  if (resolucion) {
    const { r, pregunta: p } = resolucion;
    const sigue = partida.estado === "activa" && partida.turno === yo;
    return (
      <PantallaSecundaria vuelta={{ etiqueta: "Partida", accion: () => setResolucion(null) }} accion={franja(estado)} registro="editorial">
        <div className="cf-trivial">
          <ChipCategoria p={p} />
          <h1 className="cf-trivial-pregunta">{p.enunciado}</h1>
          <Opciones opciones={p.opciones} marca={(o) => (o === r.correcta ? "correcta" : o === resolucion.elegida ? "tuya" : "apagada")} />
          <div aria-live="polite" className="cf-online-resolucion">
            <p className="cf-oculto-visual">{r.acierto ? "Has acertado." : `No. La respuesta buena es ${p.opciones.find((o) => o.id === r.correcta)?.texto}.`}</p>
            {r.estrella ? (
              <div className="cf-online-estrella">
                <span className="cf-online-estrella-icono" data-cat={r.estrella}>
                  <Icono nombre={CATEGORIAS[r.estrella].icono} tamano={24} />
                  <span className="cf-online-estrella-insignia">
                    <Icono nombre="estrella" tamano={16} />
                  </span>
                </span>
                <p>Consigues la estrella de {CATEGORIAS[r.estrella].nombre}</p>
              </div>
            ) : null}
            <div className="cf-trivial-explicacion">
              {r.explicacion ? <p>{r.explicacion}</p> : null}
              <FuenteDe fuente={aFuente(r.fuente)} cofradia={slug(p.hermandad)} />
            </div>
            {!r.acierto && partida.estado === "activa" ? <p className="cf-online-intro">Ahora le toca a {rival}.</p> : null}
          </div>
          <BotonFoco
            alPulsar={() => {
              setResolucion(null);
              setVerTablero(false);
            }}
          >
            {partida.estado === "finalizada" ? "Ver el resultado" : sigue ? "Volver a tirar" : "Volver a la partida"}
          </BotonFoco>
        </div>
      </PantallaSecundaria>
    );
  }

  // 13 · Resultado
  if (partida.estado === "finalizada") {
    const gane = partida.ganador === yo;
    const titulo = partida.motivo === "inactividad" ? "Partida cerrada por inactividad" : gane ? `Ganaste a ${rival}` : `Ganó ${rival}`;
    const motivo =
      partida.motivo === "estrellas"
        ? gane
          ? "Conseguiste las seis estrellas"
          : `${rival} consiguió las seis estrellas`
        : partida.motivo === "rendicion"
          ? gane
            ? `${rival} se ha rendido`
            : "Te rendiste"
          : "Nadie jugó en dos turnos seguidos.";
    return (
      <PantallaSecundaria vuelta={vuelta} accion={franja(estado)} registro="editorial">
        <div className="cf-online">
          <h1 className="cf-online-h1">{titulo}</h1>
          {partida.motivo === "estrellas" ? (
            <p className="cf-trivial-cifra cf-num" aria-label={`${partida.estrellas[yo].length} a ${partida.estrellas[rivalP].length}`}>
              {partida.estrellas[yo].length} – {partida.estrellas[rivalP].length}
            </p>
          ) : null}
          <p className="cf-online-intro">{motivo}</p>
          <Marcador partida={partida} />
          <Boton variante="primario" tamano="52" onClick={() => navegar(vuelta.ruta)}>
            Volver a la bandeja
          </Boton>
        </div>
      </PantallaSecundaria>
    );
  }

  // 08 · La pregunta pendiente
  if (mia && partida.fase === "responder" && partida.pregunta && !verTablero) {
    const p = partida.pregunta;
    return (
      <PantallaSecundaria vuelta={{ etiqueta: "Partida", accion: () => setVerTablero(true) }} accion={franja(estado)} registro="editorial">
        <div className="cf-trivial">
          <ChipCategoria p={p} />
          <h1 className="cf-trivial-pregunta">{p.enunciado}</h1>
          <Opciones opciones={p.opciones} elegida={elegida} alElegir={setElegida} />
          {avisoFallo}
          <Boton variante="primario" tamano="52" disabled={!elegida || !enLinea} cargando={enviando} onClick={() => jugada("responder", { opcion: elegida })}>
            Confirmar respuesta
          </Boton>
        </div>
      </PantallaSecundaria>
    );
  }

  // 06 · 07 · 11 · El tablero
  const fichas = [
    { casilla: partida.posiciones[yo], letras: iniciales(nombres[yo], rival), tuya: true },
    { casilla: partida.posiciones[rivalP], letras: iniciales(rival, nombres[yo]), tuya: false },
  ];
  const destinos = mia && partida.fase === "mover" ? (partida.destinos ?? []) : [];
  const principal = !mia ? undefined : partida.fase === "tirar" ? (
    <Boton variante="primario" tamano="52" disabled={!enLinea} cargando={enviando} onClick={() => jugada("tirar")}>
      Tirar el dado
    </Boton>
  ) : partida.fase === "responder" ? (
    <Boton variante="primario" tamano="52" onClick={() => setVerTablero(false)}>
      Responder la pregunta
    </Boton>
  ) : undefined;

  return (
    <PantallaSecundaria vuelta={vuelta} accion={franja(estado, principal)} registro="editorial">
      <div className="cf-online cf-online-partida">
        <div>
          <h1 className="cf-online-h1">Contra {rival}</h1>
          <p className="cf-online-plazo">
            <Icono nombre="reloj" tamano={20} />
            {mia ? `Te toca · te quedan ${quedan(partida.turnoVence)}` : `Esperando a ${rival} · tiene ${quedan(partida.turnoVence)}`}
          </p>
        </div>
        {destinos.length && partida.tirada ? (
          <p className="cf-online-dado" aria-live="polite">
            <span className="cf-online-dado-cara">
              <Icono nombre={`dado${partida.tirada}` as NombreTrazo} tamano={40} />
            </span>
            Has sacado un {partida.tirada}
          </p>
        ) : null}
        <TableroTrivial
          fichas={fichas}
          destinos={destinos.map((d) => d.id)}
          etiqueta={`Tablero. Tu ficha está en ${describir(partida.posiciones[yo])}; la de ${rival}, en ${describir(partida.posiciones[rivalP])}.`}
        />
        {avisoFallo}
        {destinos.length ? (
          <ol className="cf-online-destinos" aria-label="Elige destino">
            {destinos.map((d, i) => (
              <li key={d.id}>
                <button type="button" className="cf-online-destino" disabled={enviando || !enLinea} onClick={() => jugada("mover", { destino: d.id })}>
                  <span className="cf-online-destino-n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>
                    {i + 1} · {d.texto}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : mia && partida.fase === "tirar" ? (
          <p className="cf-online-intro">Estás en {describir(partida.posiciones[yo])}.</p>
        ) : !mia ? (
          <p className="cf-online-intro">Te avisaremos aquí, en la bandeja, cuando te toque.</p>
        ) : null}
        <Marcador partida={partida} />
        <button type="button" className="cf-online-enlace" onClick={() => setRendirse(true)}>
          Rendirse
        </button>
      </div>
      <HojaDecision
        abierta={rendirse}
        titulo="¿Rendirte en esta partida?"
        alCerrar={() => setRendirse(false)}
        acciones={
          <>
            <Boton variante="primario" tamano="52" onClick={() => setRendirse(false)}>
              Seguir jugando
            </Boton>
            <Boton variante="secundario" tamano="52" cargando={enviando} disabled={!enLinea} onClick={() => jugada("rendirse")}>
              Rendirme
            </Boton>
          </>
        }
      >
        <p>Ganará {rival} y no se puede deshacer.</p>
      </HojaDecision>
    </PantallaSecundaria>
  );
}

function ChipCategoria({ p }: { p: NonNullable<Partida["pregunta"]> }) {
  const meta = CATEGORIAS[p.categoria];
  const lugar = p.estrella ? p.casillaTexto.split(" · ")[0] : null;
  return (
    <p className="cf-online-chip">
      <span className="cf-online-chip-icono" data-cat={p.categoria}>
        <Icono nombre={meta.icono} tamano={16} />
      </span>
      {meta.nombre}
      {lugar ? ` · casilla de estrella: ${lugar}` : ""}
    </p>
  );
}

function Opciones({
  opciones,
  elegida,
  alElegir,
  marca,
}: {
  opciones: { id: string; texto: string }[];
  elegida?: string | null;
  alElegir?: (id: string) => void;
  marca?: (id: string) => "correcta" | "tuya" | "apagada";
}) {
  return (
    <ol className="cf-trivial-respuestas" role={alElegir ? "radiogroup" : undefined} aria-label={alElegir ? "Respuestas" : undefined}>
      {opciones.map((o, i) => {
        const m = marca?.(o.id);
        return (
          <li key={o.id}>
            <button
              type="button"
              className="cf-trivial-respuesta"
              role={alElegir ? "radio" : undefined}
              aria-checked={alElegir ? elegida === o.id : undefined}
              data-marca={m ?? (elegida === o.id ? "elegida" : undefined)}
              disabled={!alElegir}
              onClick={() => alElegir?.(o.id)}
            >
              <span className="cf-trivial-letra" aria-hidden="true">
                {"ABCD"[i]}
              </span>
              <span className="cf-oculto-visual">{"ABCD"[i]}: </span>
              <span className="cf-trivial-respuesta-texto">{o.texto}</span>
              {m === "correcta" ? (
                <span className="cf-trivial-rotulo">
                  <Icono nombre="check" tamano={16} />
                  Correcta
                </span>
              ) : m === "tuya" ? (
                <span className="cf-trivial-rotulo">
                  <Icono nombre="cerrar" tamano={16} />
                  Tu respuesta
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Marcador({ partida }: { partida: Partida }) {
  const yo = partida.yo;
  const rivalP: 0 | 1 = yo === 0 ? 1 : 0;
  const filas: { p: 0 | 1; quien: string }[] = [
    { p: yo, quien: "Tú" },
    { p: rivalP, quien: "Rival" },
  ];
  return (
    <ul className="cf-online-marcador">
      {filas.map(({ p, quien }) => (
        <li key={p}>
          <div className="cf-online-marcador-cabeza">
            <span className="cf-online-ficha" data-tuya={p === yo ? "" : undefined} aria-hidden="true">
              {iniciales(partida.jugadores[p], partida.jugadores[p === 0 ? 1 : 0])}
            </span>
            <span className="cf-online-marcador-alias">{partida.jugadores[p]}</span>
            <span className="cf-online-marcador-cifra">
              {quien} · {partida.estrellas[p].length} de 6
            </span>
          </div>
          <Estrellas tiene={partida.estrellas[p]} />
        </li>
      ))}
    </ul>
  );
}

/** Botón primario que se lleva el foco al aparecer, como «Siguiente» en el solitario. */
function BotonFoco({ children, alPulsar }: { children: ReactNode; alPulsar: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <button ref={ref} type="button" className="cf-btn" data-variant="primario" data-size="52" onClick={alPulsar}>
      {children}
    </button>
  );
}

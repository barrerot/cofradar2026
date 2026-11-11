import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AvisoEntrada, Esqueleto } from "../componentes";
import { Boton, HojaDecision, Icono, PantallaSecundaria } from "../marco";
import { useSesion } from "../datos/sesion";
import { aFuente, slug } from "../datos/trivial";
import { CATEGORIAS } from "../datos/tableroTrivial";
import { dias, ErrorDia, fechaCorta, fechaLarga, textoCompartirDia, useDia, type Cirio as DatosCirio, type VistaDia } from "../datos/dia";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { FuenteDe } from "./Trivial";
import { Opciones } from "./TrivialOnline";
import { RetarConPregunta } from "./RetoTrivial";

/**
 * P-34 La pregunta del día y el cirio encendido (F-55; 12-ano-cofrade/1–7).
 *
 *   TarjetaDia        en la portada del trivial, encima de «Jugar solo» (1); solo cerca de la Cuaresma
 *   LineaCirio        en Mi Cofradar, bajo el número de hermano (7); solo en Cuaresma
 *   /mi-cofradar/trivial/dia   la pregunta, su resolución y el cirio (2–6); /dia lleva aquí
 *
 * Contestar cada día, aciertes o no, mantiene el cirio; dejar pasar un día lo apaga. Nunca «no pierdas tu
 * racha» ni reproches: lo que hiciste se queda (R5). Necesita cuenta. Nunca en Inicio ni en el Mapa.
 */

const RUTA = "/mi-cofradar/trivial/dia";
const MOTIVO = "pregunta-del-dia";
const VUELTA = { etiqueta: "Trivial", ruta: "/mi-cofradar/trivial" };

// ── El cirio: un cirio de nazareno de línea. La forma dice el estado, no el color ──

export type FormaCirio = "encendido" | "pendiente" | "apagado";

export function Cirio({ forma, tamano = 20 }: { forma: FormaCirio; tamano?: number }) {
  const grande = tamano >= 48;
  return (
    <svg
      className="cf-cirio"
      data-forma={forma}
      width={(tamano * 20) / 48}
      height={tamano}
      viewBox="0 0 20 48"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="6" y="21" width="8" height="25.5" rx="1.2" className="cf-cirio-cuerpo" />
      {forma === "apagado" ? (
        <path d="M10 21 V17.5 Q10 15.5 11.4 14.6" className="cf-cirio-pabilo" />
      ) : (
        <>
          <path d="M10 21 V18" className="cf-cirio-pabilo" />
          <path
            d="M10 4.5 C12.6 8.2 13.6 10.6 13.6 12.7 C13.6 14.9 12 16.6 10 16.6 C8 16.6 6.4 14.9 6.4 12.7 C6.4 10.6 7.4 8.2 10 4.5 Z"
            className="cf-cirio-llama"
            strokeDasharray={forma === "pendiente" && grande ? "2.2 1.6" : undefined}
          />
        </>
      )}
    </svg>
  );
}

const formaDe = (c: DatosCirio | undefined): FormaCirio => (c?.estado === "encendido" ? "encendido" : c?.estado === "pendiente" ? "pendiente" : "apagado");

// ── 1 · La tarjeta de la portada del trivial ──

export function TarjetaDia() {
  const { vista, conSesion } = useDia();
  if (!vista?.fase) return null;
  const c = vista.cirio;

  if (vista.fase === "antes")
    return (
      <div className="cf-online-modo cf-dia-tarjeta" data-quieta="">
        <span className="cf-dia-tarjeta-icono">
          <Cirio forma="apagado" tamano={28} />
        </span>
        <span className="cf-online-modo-texto">
          <span className="cf-dia-tarjeta-titulo">Pregunta del día</span>
          <span className="cf-online-modo-nota">El Miércoles de Ceniza, {vista.inicio ? fechaCorta(vista.inicio) : ""}, empieza la pregunta del día</span>
        </span>
      </div>
    );

  if (vista.fase === "despues") {
    if (!c?.contestadas) return null;
    return (
      <div className="cf-online-modo cf-dia-tarjeta" data-quieta="">
        <span className="cf-dia-tarjeta-icono">
          <Cirio forma="encendido" tamano={28} />
        </span>
        <span className="cf-online-modo-texto">
          <span className="cf-dia-tarjeta-titulo">Pregunta del día</span>
          <span className="cf-online-modo-nota">Mantuviste el cirio {dias(c.mejor)} esta Cuaresma</span>
        </span>
      </div>
    );
  }

  const titulo = conSesion ? `Pregunta del día · Día ${vista.dia} de Cuaresma` : "Pregunta del día";
  const nota = !conSesion
    ? "Entra con Google para encender tu cirio"
    : c?.estado === "encendido"
      ? `Hecho por hoy · ${dias(c.dias)} · ${vista.dia === vista.total ? "Era la última de la Cuaresma" : "Mañana, nueva pregunta"}`
      : c?.estado === "pendiente"
        ? `Llevas ${dias(c.dias)} con el cirio encendido · Contesta hoy para mantenerlo`
        : c?.estado === "apagado"
          ? "Tu cirio se apagó. Contesta hoy y vuelve a encenderse"
          : "Contesta hoy y enciende tu cirio";
  return (
    <Link to={RUTA} className="cf-online-modo cf-dia-tarjeta">
      <span className="cf-dia-tarjeta-icono">
        <Cirio forma={conSesion ? formaDe(c) : "apagado"} tamano={28} />
      </span>
      <span className="cf-online-modo-texto">
        <span className="cf-dia-tarjeta-titulo">{titulo}</span>
        <span className="cf-online-modo-nota cf-dia-tarjeta-nota">{nota}</span>
      </span>
      <Icono nombre="chevronDerecha" tamano={24} />
    </Link>
  );
}

// ── 7 · La línea del cirio en Mi Cofradar ──

export function LineaCirio() {
  const { vista } = useDia();
  const c = vista?.cirio;
  if (vista?.fase !== "cuaresma" || !c) return null;
  const texto =
    c.estado === "encendido"
      ? `Cirio encendido · ${dias(c.dias)} · hecho por hoy`
      : c.estado === "pendiente"
        ? `Cirio encendido · ${dias(c.dias)} · contesta hoy`
        : c.estado === "apagado"
          ? "Cirio apagado · contesta hoy y vuelve a encenderse"
          : "Pregunta del día · enciende tu cirio";
  return (
    <Link to={RUTA} className="cf-dia-linea">
      <Cirio forma={formaDe(c)} tamano={20} />
      <span className="cf-dia-linea-texto">{texto}</span>
      <Icono nombre="chevronDerecha" tamano={20} />
    </Link>
  );
}

// ── 2–6 · La pregunta del día ──

export function PreguntaDelDia({ estado }: { estado: EstadoJornada }) {
  const { vista, error, recargar, responder, conSesion, cargando } = useDia();
  const [elegida, setElegida] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [compartir, setCompartir] = useState(false);
  const navegar = useNavigate();

  // Otro día (se quedó abierta pasadas las 00:00): se empieza de cero
  useEffect(() => {
    setElegida(null);
    setFallo(null);
  }, [vista?.hoy]);

  const contestar = async () => {
    if (!elegida) return;
    setEnviando(true);
    setFallo(null);
    try {
      await responder(elegida);
    } catch (e) {
      const err = e as ErrorDia;
      setFallo(err.message);
      // Ya es otro día o ha cambiado la pregunta: lo de ahora
      if (err.estado === 409) void recargar();
    } finally {
      setEnviando(false);
    }
  };

  const pantalla = (cuerpo: ReactNode, sheet?: ReactNode) => (
    <PantallaSecundaria vuelta={VUELTA} accion={estado.activa ? <DarFe /> : undefined} registro="editorial" sheet={sheet}>
      {cuerpo}
    </PantallaSecundaria>
  );

  if (!cargando && !conSesion) return pantalla(<PideCuentaDia />);
  if (!vista) {
    if (error)
      return pantalla(
        <div className="cf-online">
          <p className="cf-online-intro">{error.message}</p>
          <Boton variante="secundario" tamano="52" onClick={() => void recargar()}>
            Reintentar
          </Boton>
        </div>,
      );
    return pantalla(<Esqueleto forma="lista" />);
  }
  if (vista.fase !== "cuaresma" || !vista.pregunta) return pantalla(<FueraDeCuaresma vista={vista} alVolver={() => navegar(VUELTA.ruta)} />);

  const p = vista.pregunta;
  const c = vista.cirio;
  const meta = CATEGORIAS[p.categoria];
  const cabeza = (
    <>
      <p className="cf-dia-fecha">
        Día {vista.dia} de Cuaresma · {fechaLarga(vista.hoy)}
      </p>
      {c?.estado === "apagado" && !vista.tuya ? (
        <div className="cf-dia-apagado">
          <Cirio forma="apagado" tamano={24} />
          <p>
            Tu cirio se apagó el día {c.apagadoEl}. Lo encendiste {dias(c.llevaba)} seguidos. Contesta hoy y vuelve a encenderse.
          </p>
        </div>
      ) : null}
      <p className="cf-online-chip">
        {meta ? (
          <span className="cf-online-chip-icono" data-cat={p.categoria}>
            <Icono nombre={meta.icono} tamano={16} />
          </span>
        ) : null}
        {meta ? `${meta.nombre} · ` : ""}
        {p.hermandad}
      </p>
      <h1 className="cf-trivial-pregunta">{p.enunciado}</h1>
    </>
  );

  // 2 · 6 · Sin contestar
  if (!vista.tuya)
    return pantalla(
      <div className="cf-trivial">
        {cabeza}
        <Opciones opciones={p.opciones} elegida={elegida} alElegir={setElegida} />
        {fallo ? (
          <div className="cf-online-error" role="alert">
            <Icono nombre="informativo" tamano={16} />
            <span>{fallo}</span>
          </div>
        ) : null}
        <Boton variante="primario" tamano="52" disabled={!elegida} cargando={enviando} onClick={() => void contestar()}>
          Confirmar respuesta
        </Boton>
        <p className="cf-dia-pie">Una pregunta al día, la misma para todos. Cambia a las 00:00.</p>
      </div>,
    );

  // 3 · 5 · 6b · Contestada
  const r = vista.tuya.resolucion;
  const ultima = vista.dia === vista.total;
  return pantalla(
    <div className="cf-trivial">
      {cabeza}
      <Opciones opciones={p.opciones} marca={(o) => (o === r.correcta ? "correcta" : o === vista.tuya!.respuesta ? "tuya" : "apagada")} />
      <div aria-live="polite" className="cf-online-resolucion">
        <p className="cf-oculto-visual">{r.acierto ? "Has acertado." : `No. La respuesta buena es ${p.opciones.find((o) => o.id === r.correcta)?.texto}.`}</p>
        <div className="cf-trivial-explicacion">
          {r.explicacion ? <p>{r.explicacion}</p> : null}
          <FuenteDe fuente={aFuente(r.fuente)} cofradia={slug(p.hermandad)} />
        </div>
        {c ? <BloqueCirio cirio={c} dia={vista.dia ?? 0} /> : null}
      </div>
      <div className="cf-online-botones">
        <Boton variante="primario" tamano="52" onClick={() => setCompartir(true)}>
          <Icono nombre="compartir" tamano={20} />
          Compartir
        </Boton>
        <Boton variante="secundario" tamano="52" onClick={() => navegar(VUELTA.ruta)}>
          Volver al trivial
        </Boton>
      </div>
      <RetarConPregunta id={r.pregunta} enunciado={p.enunciado} acierto={r.acierto} />
      <p className="cf-dia-pie">{ultima ? "Era la última pregunta de la Cuaresma. Mañana, Domingo de Ramos." : "Mañana, nueva pregunta a las 00:00"}</p>
    </div>,
    <CompartirDia vista={vista} abierta={compartir} alCerrar={() => setCompartir(false)} />,
  );
}

/** 3 · El cirio grande, los días, los aciertos y una marca por día. */
function BloqueCirio({ cirio: c, dia }: { cirio: DatosCirio; dia: number }) {
  return (
    <section className="cf-dia-cirio" aria-label="Tu cirio">
      <div className="cf-dia-cirio-cabeza">
        <Cirio forma={formaDe(c)} tamano={96} />
        <div>
          <p className="cf-dia-cirio-dias">Llevas {dias(c.dias)} con el cirio encendido</p>
          {c.contestadas > 1 ? (
            <p className="cf-dia-cirio-aciertos">
              Has acertado {c.aciertos} de {c.contestadas}
            </p>
          ) : null}
        </div>
      </div>
      {c.contestadas > 1 ? (
        <>
          <ol className="cf-dia-marcas" aria-label={`Del día 1 al ${dia}: ${c.aciertos} acertadas, ${c.contestadas - c.aciertos} falladas`}>
            {c.marcas.map((m, i) => (
              <li key={i} data-marca={m ?? "nada"} data-hoy={i === c.marcas.length - 1 ? "" : undefined} />
            ))}
          </ol>
          <p className="cf-dia-marcas-pie" aria-hidden="true">
            <span>Día 1</span>
            <span>Hoy, día {dia}</span>
          </p>
        </>
      ) : null}
    </section>
  );
}

/** 4 · Como el Wordle: el día, si acertaste y los días del cirio. Nunca la respuesta. */
function CompartirDia({ vista, abierta, alCerrar }: { vista: VistaDia; abierta: boolean; alCerrar: () => void }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const mensaje = textoCompartirDia(vista);
  const compartir = async () => {
    setAviso(null);
    if (navigator.share) {
      try {
        await navigator.share({ text: mensaje });
        alCerrar();
      } catch {
        /* cerrar el menú no es un error */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(mensaje);
      setAviso("Mensaje copiado. Pégalo en WhatsApp o donde quieras.");
    } catch {
      setAviso("No se ha podido copiar. Mantén pulsado el mensaje para copiarlo.");
    }
  };
  return (
    <HojaDecision
      abierta={abierta}
      titulo="Vista previa del mensaje"
      alCerrar={alCerrar}
      acciones={
        <>
          <Boton variante="primario" tamano="52" onClick={() => void compartir()}>
            <Icono nombre="compartir" tamano={20} />
            Compartir
          </Boton>
          <Boton variante="secundario" tamano="52" onClick={alCerrar}>
            Ahora no
          </Boton>
        </>
      }
    >
      <p className="cf-reto-mensaje">{mensaje}</p>
      {aviso ? <p role="status">{aviso}</p> : null}
    </HojaDecision>
  );
}

function PideCuentaDia() {
  const { disponible, entrar } = useSesion();
  return (
    <div className="cf-online">
      <AvisoEntrada motivo={MOTIVO} />
      <h1 className="cf-online-h1">Pregunta del día</h1>
      <p className="cf-online-intro">Cada día de Cuaresma, una pregunta, la misma para todos. Si contestas cada día, tu cirio sigue encendido.</p>
      {disponible ? (
        <Boton variante="primario" tamano="52" onClick={() => void entrar(MOTIVO)}>
          Entrar con Google
        </Boton>
      ) : null}
      <Link to="/mi-cofradar/trivial/solo" className="cf-online-enlace">
        Mientras, puedes jugar solo
      </Link>
    </div>
  );
}

function FueraDeCuaresma({ vista, alVolver }: { vista: VistaDia; alVolver: () => void }) {
  const c = vista.cirio;
  const texto =
    vista.fase === "antes" && vista.inicio
      ? `El Miércoles de Ceniza, ${fechaCorta(vista.inicio)}, empieza la pregunta del día.`
      : vista.fase === "despues" && c?.contestadas
        ? `La Cuaresma terminó. Mantuviste el cirio ${dias(c.mejor)} y acertaste ${c.aciertos} de ${c.contestadas}.`
        : vista.fase === "cuaresma"
          ? "Hoy no hay pregunta del día."
          : "La pregunta del día vuelve en Cuaresma.";
  return (
    <div className="cf-online">
      <h1 className="cf-online-h1">Pregunta del día</h1>
      <p className="cf-online-intro">{texto}</p>
      <Boton variante="primario" tamano="52" onClick={alVolver}>
        Volver al trivial
      </Boton>
    </div>
  );
}

/** El enlace corto que se comparte: /dia. */
export function RedirigirDia() {
  return <Navigate to={RUTA} replace />;
}

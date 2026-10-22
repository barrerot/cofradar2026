import { Link } from "react-router-dom";
import { BandaContexto, Bloque, MarcaRelacion, TarjetaCofradia, type DatosCofradia } from "../componentes";
import { Icono, Marco } from "../marco";
import { useActividad, type SalidaDeHoy } from "../datos/actividad";
import { distancia, distanciaEnLlano, enLaCalle, proximoPunto, useEnVivo, type EnVivo } from "../datos/enVivo";
import { useJornada, type Jornada } from "../datos/jornada";
import { usePosicion, type Posicion } from "../datos/ubicacion";
import { useRelaciones } from "../datos/relaciones";
import { useDato } from "../datos/useDato";
import type { EstadoJornada } from "../fixture";
import type { EstadoJornadaMotor } from "../datos/mapa";
import { CabeceraRaiz } from "./CabeceraRaiz";
import { DarFe } from "./DarFe";
import { IncidenciasDe } from "./CortejoEnVivo";

/**
 * P-05 Inicio · «¿Qué puedo ver ahora?» (2-inicio/inicio-*), con el motor (4.16).
 *
 * Tres intensidades que NO son grados de lo mismo (§8.3). Salen de la hora y
 * del horario del programa (datos/actividad.tsx), no de un fixture:
 *
 *   fuera-temporada  cuenta atrás al Domingo de Ramos (inicio-D) y tus cofradías
 *   sin-actividad    «Ninguna cofradía en la calle ahora» y la primera salida
 *                    (inicio-C), o que ya entraron todas
 *   activa           lo que dice el motor (EnVivoAhora): cerca de ti, en la
 *                    calle y a punto de salir, cada una con su fase, su
 *                    confianza («según horario», «hace 23 min»), su retraso y
 *                    el próximo punto con su hora (BUL-221). Mientras llega el
 *                    primer dato del motor, el horario del programa.
 *
 * Reglas que siguen valiendo: una cofradía aparece una sola vez, las ya
 * entradas no salen, y un bloque vacío no se pinta.
 */
export function Inicio({ estado }: { estado: EstadoJornada }) {
  const { intensidad } = useActividad();

  return (
    <Marco cabecera={<CabeceraRaiz />} accion={estado.activa ? <DarFe /> : undefined}>
      {intensidad === "activa" ? <Activa /> : intensidad === "sin-actividad" ? <SinActividad /> : <FueraDeTemporada />}
    </Marco>
  );
}

const hora = (d: Date) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

function Activa() {
  const { hoy } = useJornada();
  const { cofradias, contexto } = useEnVivo(hoy);
  return hoy && cofradias ? <EnVivoAhora jornada={hoy} cofradias={cofradias} contexto={contexto} /> : <SegunHorario />;
}

/** Hasta aquí, «cerca»: más lejos ya no es «qué puedo ver ahora» (candidata a calibrar). */
const CERCA = 1500;

/**
 * La jornada en curso con el motor (2-inicio/01). Bloques, en este orden y sin repetir cofradía:
 * Cerca (solo con ubicación; la primera es el sujeto de la pantalla) → En la calle → A punto de salir.
 * Antes de todo, lo que publica el equipo desde el panel: avisos de jornada (lluvia) e incidencias.
 * Un bloque vacío no se pinta.
 */
function EnVivoAhora({ jornada, cofradias, contexto }: { jornada: Jornada; cofradias: EnVivo[]; contexto: EstadoJornadaMotor["contexto"] }) {
  const { ahora } = useActividad();
  const posicion = usePosicion();
  const sale = (v: EnVivo) => (v.estado.sale ? Date.parse(v.estado.sale) : Infinity);
  const calle = cofradias.filter((v) => enLaCalle(v.estado)).sort((a, b) => sale(a) - sale(b));
  const conDistancia = posicion ? calle.map((v) => ({ v, d: distancia(posicion, v) })) : [];
  const cerca = conDistancia
    .filter((x): x is { v: EnVivo; d: number } => x.d !== null && x.d <= CERCA)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  const enCerca = new Set(cerca.map((x) => x.v.estado.id));
  const resto = calle.filter((v) => !enCerca.has(v.estado.id));
  const aPuntoDeSalir = cofradias.filter((v) => v.estado.fase.valor === "inminente").sort((a, b) => sale(a) - sale(b));
  const nadieHaDadoFe = calle.every((v) => v.estado.fase.confianza === "estimado");

  return (
    <div className="cf-ahora">
      {/* Lo que publica el equipo (panel, 5.2): primero lo que afecta a toda la jornada, luego las incidencias */}
      {contexto.map((a) => (
        <BandaContexto key={a.id} texto={a.texto} icono={a.clase === "lluvia" ? "lluvia" : "informativo"} critica />
      ))}
      {cofradias.map((v) => (v.estado.incidencias.length ? <IncidenciasDe key={v.estado.id} v={v} conNombre /> : null))}
      {nadieHaDadoFe && calle.length ? <p className="cf-ahora-nota">Según el horario del programa: nadie ha dado fe todavía.</p> : null}
      {cerca.length ? (
        <Bloque titulo="Cerca de ti">
          <div className="cf-lista">
            {cerca.map(({ v, d }, i) =>
              i === 0 ? (
                <div className="cf-ahora-sujeto" key={v.estado.id}>
                  <FilaEnVivo v={v} jornada={jornada} ahora={ahora} posicion={posicion} densidad="estandar" proximidad={distanciaEnLlano(d)} />
                </div>
              ) : (
                <FilaEnVivo key={v.estado.id} v={v} jornada={jornada} ahora={ahora} posicion={posicion} />
              ),
            )}
          </div>
        </Bloque>
      ) : null}
      {resto.length ? (
        <Bloque titulo="En la calle">
          <div className="cf-lista">
            {resto.map((v) => (
              <FilaEnVivo key={v.estado.id} v={v} jornada={jornada} ahora={ahora} posicion={posicion} />
            ))}
          </div>
        </Bloque>
      ) : null}
      {aPuntoDeSalir.length ? (
        <Bloque titulo="A punto de salir">
          <div className="cf-lista">
            {aPuntoDeSalir.map((v) => (
              <FilaEnVivo key={v.estado.id} v={v} jornada={jornada} ahora={ahora} posicion={posicion} />
            ))}
          </div>
        </Bloque>
      ) : null}
      {!calle.length && !aPuntoDeSalir.length ? <SinActividad /> : <VerJornada />}
    </div>
  );
}

function FilaEnVivo({
  v,
  jornada,
  ahora,
  posicion,
  densidad = "compacta",
  proximidad,
}: {
  v: EnVivo;
  jornada: Jornada;
  ahora: Date;
  posicion: Posicion | null;
  densidad?: "compacta" | "estandar";
  proximidad?: string;
}) {
  const relaciones = useRelaciones();
  const e = v.estado;
  const decision: Pick<DatosCofradia, "punto" | "hora" | "horaEstimada"> =
    e.fase.valor === "inminente"
      ? { punto: "Sale", hora: e.sale ? hora(new Date(e.sale)) : undefined }
      : (() => {
          const p = proximoPunto(v, jornada, ahora, posicion);
          return p
            ? { punto: p.lugar, hora: hora(p.hora), horaEstimada: true }
            : { punto: "Entra", hora: e.entra ? hora(new Date(e.entra)) : undefined, horaEstimada: true };
        })();
  return (
    <Link className="cf-lista-enlace" to={`/cofradias/${e.id}`}>
      <TarjetaCofradia
        densidad={densidad}
        cofradia={{
          id: e.id,
          nombre: e.nombre,
          relacion: relaciones.marca(e.id),
          fase: e.fase.valor,
          confianza: e.fase.confianza,
          antiguedad: e.fase.haceMin !== null ? `hace ${e.fase.haceMin} min` : undefined,
          alteraciones: e.alteraciones,
          proximidad,
          ...decision,
        }}
      />
    </Link>
  );
}

/** Jornada en curso según el horario: en la calle y por salir. Mientras llega el primer dato del motor. */
function SegunHorario() {
  const { salidas, ahora } = useActividad();
  const t = ahora.getTime();
  const enCalle = salidas.filter((s) => s.salida && s.entrada && s.salida.getTime() <= t && t < s.entrada.getTime());
  const porSalir = salidas.filter((s) => s.salida && s.salida.getTime() > t);

  return (
    <div className="cf-ahora">
      <p className="cf-ahora-nota">Según el horario del programa. Dónde va cada una de verdad, cuando la gente dé fe.</p>
      {enCalle.length ? (
        <Bloque titulo="En la calle">
          <div className="cf-lista">
            {enCalle.map((s) => (
              <Fila key={s.id} salida={s} enCalle />
            ))}
          </div>
        </Bloque>
      ) : null}
      {porSalir.length ? (
        <Bloque titulo="Por salir">
          <div className="cf-lista">
            {porSalir.map((s) => (
              <Fila key={s.id} salida={s} />
            ))}
          </div>
        </Bloque>
      ) : null}
      <VerJornada />
    </div>
  );
}

function Fila({ salida: s, enCalle = false }: { salida: SalidaDeHoy; enCalle?: boolean }) {
  const relaciones = useRelaciones();
  return (
    <Link className="cf-lista-enlace" to={`/cofradias/${s.id}`}>
      <TarjetaCofradia
        densidad="compacta"
        cofradia={{
          id: s.id,
          nombre: s.nombre,
          relacion: relaciones.marca(s.id),
          ...(enCalle
            ? { fase: "en_calle", confianza: "estimado", punto: "Entra", hora: s.entrada ? hora(s.entrada) : undefined, horaEstimada: true }
            : { punto: "Sale", hora: s.salida ? hora(s.salida) : undefined }),
        }}
      />
    </Link>
  );
}

/** Es jornada y no hay nadie en la calle según el horario. Información, no fallo. */
function SinActividad() {
  const { salidas, ahora } = useActividad();
  const primera = salidas.find((s) => s.salida && s.salida.getTime() > ahora.getTime());

  return (
    <div className="cf-ahora">
      <div className="cf-ahora-tarjeta cf-ahora-calma">
        <p className="titular">Ninguna cofradía en la calle ahora</p>
        {primera?.salida ? (
          <p className="siguiente">
            {primera === salidas[0] ? "La primera salida es a las " : "La siguiente salida es a las "}
            <b className="cf-num">{hora(primera.salida)}</b> · <span className="nm">{primera.nombre}</span>
          </p>
        ) : salidas.length ? (
          <p className="siguiente">Hoy ya han entrado todas.</p>
        ) : null}
      </div>
      <VerJornada />
    </div>
  );
}

function VerJornada() {
  return (
    <Link className="cf-ahora-enlace" to="/agenda">
      <span>Ver la jornada completa</span>
      <Icono nombre="chevronDerecha" tamano={20} />
    </Link>
  );
}

/** Entre temporadas: cuánto falta, consultar las cofradías y lo tuyo. */
function FueraDeTemporada() {
  const { jornadas } = useJornada();
  const { ahora } = useActividad();
  const domingo = jornadas.datos?.find((j) => j.nombre === "Domingo de Ramos");
  const dia = domingo?.dia ? new Date(`${domingo.dia}T00:00`) : null;
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const dias = dia ? Math.round((dia.getTime() - hoy.getTime()) / 86_400_000) : null;

  return (
    <div className="cf-ahora" data-intensidad="fuera-temporada">
      <div className="cf-ahora-tarjeta">
        {dia && dias !== null ? (
          <>
            <p className="cf-ahora-dias cf-num">{dias}</p>
            <p className="cf-ahora-para">{dias === 1 ? "día" : "días"} para el Domingo de Ramos</p>
            <p className="cf-ahora-fecha">{dia.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</p>
          </>
        ) : (
          <p className="cf-ahora-para">Domingo de Ramos</p>
        )}
        <Link className="cf-btn" data-variant="secundario" to="/cofradias">
          Consultar las cofradías
          <Icono nombre="flechaDerecha" tamano={20} />
        </Link>
      </div>
      <LoTuyo />
    </div>
  );
}

/** Tus cofradías (las que sigues o has visto), si tienes alguna. Sin cuenta, nada. */
function LoTuyo() {
  const relaciones = useRelaciones();
  const todas = useDato<{ id: string; nombre: string }[]>("/cofradias", { cadaMs: 600_000 });
  const tuyas = (todas.datos ?? []).filter((c) => relaciones.marca(c.id));
  if (!tuyas.length) return null;
  return (
    <Bloque titulo="Tus cofradías">
      <div className="cf-ahora-tuyo">
        {tuyas.map((c) => (
          <Link className="fila" key={c.id} to={`/cofradias/${c.id}`}>
            <MarcaRelacion relacion={relaciones.marca(c.id)!} />
            <span className="nm">{c.nombre}</span>
          </Link>
        ))}
      </div>
    </Bloque>
  );
}

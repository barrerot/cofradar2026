import { Link } from "react-router-dom";
import { Bloque, MarcaRelacion, TarjetaCofradia } from "../componentes";
import { Icono, Marco } from "../marco";
import { useActividad, type SalidaDeHoy } from "../datos/actividad";
import { useJornada } from "../datos/jornada";
import { useRelaciones } from "../datos/relaciones";
import { useDato } from "../datos/useDato";
import type { EstadoJornada } from "../fixture";
import { CabeceraRaiz } from "./CabeceraRaiz";
import { DarFe } from "./DarFe";

/**
 * P-05 Inicio · «¿Qué puedo ver ahora?» (2-inicio/inicio-*), sin motor (3.5).
 *
 * Tres intensidades que NO son grados de lo mismo (§8.3). Salen de la hora y
 * del horario del programa (datos/actividad.tsx), no de un fixture:
 *
 *   fuera-temporada  cuenta atrás al Domingo de Ramos (inicio-D) y tus cofradías
 *   sin-actividad    «Ninguna cofradía en la calle ahora» y la primera salida
 *                    (inicio-C), o que ya entraron todas
 *   activa           SEGÚN HORARIO: las que deberían estar en la calle, con su
 *                    chip «según horario» (confianza estimada), y las que faltan
 *                    por salir. Lo que de verdad pasa, lo cerca, las incidencias
 *                    y las novedades llegan con el motor (4.16).
 *
 * Reglas que siguen valiendo: una cofradía aparece una sola vez, las ya
 * entradas no salen, y un bloque vacío no se pinta.
 */
export function Inicio({ estado }: { estado: EstadoJornada }) {
  const { intensidad } = useActividad();

  return (
    <Marco cabecera={<CabeceraRaiz />} accion={estado.activa ? <DarFe /> : undefined}>
      {intensidad === "activa" ? <SegunHorario /> : intensidad === "sin-actividad" ? <SinActividad /> : <FueraDeTemporada />}
    </Marco>
  );
}

const hora = (d: Date) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

/** Jornada en curso según el horario: en la calle y por salir. */
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

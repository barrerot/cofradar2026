import { Link } from "react-router-dom";
import { Esqueleto } from "../componentes";
import { Icono, PantallaSecundaria } from "../marco";
import { puntosEnTexto, useCargo, type Cargo } from "../datos/cargo";
import { mesDe, type Hermano } from "../datos/hermano";
import { miles } from "../datos/trivialOnline";
import { useSesion } from "../datos/sesion";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { LineaCirio } from "./PreguntaDelDia";

/**
 * El cargo: la calle y la casa (F-58; 12-ano-cofrade/16, 21–24), registro editorial.
 *
 *   Tarjeta      en Mi Cofradar: puntos, cargo «en Cofradar», número de hermano, cirio, la barra hacia el
 *                siguiente y «De la calle 620 · De la casa 560». Lleva a «Tu cargo».
 *   Tu cargo     el cargo con su frase, los doce cargos (pasados con check, el tuyo resaltado), cómo se
 *                suman y la regla de la mitad. Sin candados ni «te falta».
 *   El tope      si lo que frena es la regla de la calle, ni barra ni «Faltan»: una línea en tinta (22).
 *   Subes        la hoja «Ahora eres Costalero en Cofradar» tras dar fe o ganar una partida (23).
 *   La casa      «+5 puntos para tu cargo» o «Hoy ya has sumado los 10 puntos de la casa» (24).
 * Sin ranking, sin comparar con nadie, sin confeti. Los puntos no compran nada (R4).
 */

const TU_CARGO = "/mi-cofradar/cargo";

function NumeroHermano({ h }: { h: Hermano }) {
  return (
    <p className="cf-mi-hermano">
      Hermano nº <span className="cf-num">{miles(h.numero)}</span> de Cofradar · desde {mesDe(h.desde)}
    </p>
  );
}

function LineaTope({ cargo }: { cargo: Cargo }) {
  if (!cargo.tope || !cargo.siguiente) return null;
  return (
    <p className="cf-cargo-tope">
      <Icono nombre="informativo" tamano={20} />
      <span>Para {cargo.siguiente.nombre}, al menos la mitad tiene que venir de la calle.</span>
    </p>
  );
}

/** 16 · 22 · La tarjeta de Mi Cofradar. Granate: es lo tuyo. */
export function TarjetaCargo({ cargo, hermano }: { cargo: Cargo; hermano: Hermano | null }) {
  const sig = cargo.siguiente;
  const pc = sig && sig.faltan !== null ? Math.round((100 * (sig.desde - sig.faltan - cargo.desde)) / (sig.desde - cargo.desde)) : 100;
  return (
    <Link to={TU_CARGO} className="cf-mi-progreso cf-mi-nivel cf-cargo-tarjeta" aria-label={`Tu progreso: ${cargo.nombre} en Cofradar, ${cargo.puntos} puntos`}>
      <p className="rotulo">
        <span>Tu progreso</span>
        <Icono nombre="chevronDerecha" tamano={20} />
      </p>
      <p className="puntos">
        <span className="cf-num">{puntosEnTexto(cargo.puntos)}</span> puntos
      </p>
      <p className="nivel">
        {cargo.nombre} <span className="en">en Cofradar</span>
      </p>
      {hermano ? <NumeroHermano h={hermano} /> : null}
      <LineaCirio />
      {!sig ? (
        <p className="hacia">Has llegado al último cargo.</p>
      ) : sig.faltan === null ? (
        <LineaTope cargo={cargo} />
      ) : (
        <>
          <div className="barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pc} aria-label={`Hacia ${sig.nombre}`}>
            <span style={{ width: `${pc}%` }} />
          </div>
          <p className="hacia">
            <span>Hacia {sig.nombre}</span>
            <span className="cf-num">Faltan {puntosEnTexto(sig.faltan)}</span>
          </p>
        </>
      )}
      <p className="cf-cargo-fuentes cf-num">
        De la calle {puntosEnTexto(cargo.calle)} · De la casa {puntosEnTexto(cargo.casa)}
      </p>
    </Link>
  );
}

/** 21 · Tu cargo */
export function TuCargo({ estado }: { estado: EstadoJornada }) {
  const { usuario } = useSesion();
  const { cargo } = useCargo();
  return (
    <PantallaSecundaria
      registro="editorial"
      titulo="Tu cargo"
      vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }}
      accion={estado.activa ? <DarFe /> : undefined}
    >
      {usuario === null ? (
        <p className="cf-cargo-frase">Tu cargo empieza a contar cuando entras con tu cuenta y das fe.</p>
      ) : !cargo ? (
        <Esqueleto forma="lista" />
      ) : (
        <div className="cf-cargo">
          <section className="cf-cargo-arriba">
            <h2 className="cf-cargo-nombre">
              {cargo.nombre} en Cofradar
            </h2>
            <p className="cf-cargo-puntos cf-num">{puntosEnTexto(cargo.puntos)} puntos</p>
            <p className="cf-cargo-frase">{cargo.frase}</p>
            <LineaTope cargo={cargo} />
          </section>

          <section aria-labelledby="cargo-escalera">
            <h3 id="cargo-escalera" className="cf-cargo-rotulo">
              Los doce cargos
            </h3>
            <ol className="cf-cargo-escalera">
              {cargo.niveles.map((n, i) => {
                const cual = i + 1 < cargo.numero ? "pasado" : i + 1 === cargo.numero ? "tuyo" : "siguiente";
                return (
                  <li key={n.nombre} data-cual={cual} aria-current={cual === "tuyo" ? "step" : undefined}>
                    <span className="cf-cargo-marca" aria-hidden="true">
                      {cual === "pasado" ? <Icono nombre="check" tamano={20} /> : cual === "tuyo" ? <span className="cf-cargo-punto" /> : null}
                    </span>
                    <span className="cf-cargo-escalon">
                      <span>{n.nombre}</span>
                      {cual === "tuyo" ? <span className="cf-cargo-tuyo">Tu cargo</span> : null}
                    </span>
                    <span className="cf-num">{puntosEnTexto(n.desde)}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="cargo-suman">
            <h3 id="cargo-suman" className="cf-cargo-rotulo">
              Cómo se suman
            </h3>
            <div className="cf-cargo-fuente">
              <p>
                <strong>La calle:</strong> dar fe. 10 puntos y el bonus si tu aportación aporta algo nuevo. Sin tope.
              </p>
              <span className="cf-cargo-cifra cf-num">{puntosEnTexto(cargo.calle)}</span>
            </div>
            <div className="cf-cargo-fuente">
              <p>
                <strong>La casa:</strong> ganar una partida online, 5; la pregunta del día, 2. Hasta 10 al día. El trivial en solitario no suma.
              </p>
              <span className="cf-cargo-cifra cf-num">{puntosEnTexto(cargo.casa)}</span>
            </div>
          </section>

          <p className="cf-cargo-regla">
            <Icono nombre="informativo" tamano={20} />
            <span>Desde Diputado de tramo, al menos la mitad de tus puntos tiene que venir de la calle.</span>
          </p>
          <p className="cf-cargo-pie">Los puntos no compran nada: tu cargo no da más peso a lo que aportas.</p>
        </div>
      )}
    </PantallaSecundaria>
  );
}

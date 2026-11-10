import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Esqueleto } from "../componentes";
import { Boton, Cabecera, Icono, Marco, PantallaSecundaria } from "../marco";
import {
  candidatas,
  cuentaPorCofradia,
  nuevaPartida,
  useBancoTrivial,
  type Dificultad,
  type Fuente,
  type Pregunta,
} from "../datos/trivial";
import type { EstadoJornada } from "../fixture";
import { coincide } from "./Cofradias";
import { DarFe } from "./DarFe";

/**
 * P-32 Trivial cofrade (F-50; 10-trivial/trivial-03 a 08).
 *
 *   elegir      todas las hermandades o una, y la dificultad (03, 03c)
 *   buscar      el buscador del listado de Cofradías, sin marcas ni estados (03b)
 *   jugar       una pregunta; al responder, la buena en verde con «Correcta»,
 *               la tuya, si fallas, en tinta con «Tu respuesta» —nunca en rojo—,
 *               la explicación y la fuente (04, 05, 06)
 *   resultado   «7 de 10» y el repaso, sin juzgar (07)
 *
 * Se entra desde la portada del trivial («Jugar solo», /mi-cofradar/trivial/solo;
 * la portada ofrece también el online, TrivialOnline.tsx) o desde la ficha de una
 * cofradía (/cofradias/:id/trivial), con esa hermandad ya elegida. Sin cuenta,
 * sin conexión, sin puntos, y no se guarda nada: la partida vive aquí. La
 * franja «Dar fe» sigue a mano: si pasa la cofradía, se deja la partida.
 */
type Fase = { es: "elegir" } | { es: "buscar" } | { es: "jugar"; partida: Pregunta[]; i: number; respuestas: string[] } | { es: "resultado"; partida: Pregunta[]; respuestas: string[] };

const DIFICULTADES: { valor: Dificultad; etiqueta: string; adjetivo: string }[] = [
  { valor: "mezcla", etiqueta: "Mezcla", adjetivo: "" },
  { valor: 0, etiqueta: "Fácil", adjetivo: "fáciles" },
  { valor: 1, etiqueta: "Media", adjetivo: "de dificultad media" },
  { valor: 2, etiqueta: "Difícil", adjetivo: "difíciles" },
];

export function Trivial({ estado }: { estado: EstadoJornada }) {
  const { id } = useParams();
  const navegar = useNavigate();
  const { banco, fallo } = useBancoTrivial();
  const [cofradia, setCofradia] = useState<string | null>(id ?? null);
  const [dificultad, setDificultad] = useState<Dificultad>("mezcla");
  const [fase, setFase] = useState<Fase>({ es: "elegir" });
  const cuenta = useMemo(() => (banco ? cuentaPorCofradia(banco) : null), [banco]);

  // Cada pregunta nueva empieza arriba
  const paso = fase.es === "jugar" ? fase.i : fase.es;
  useEffect(() => {
    // El que desplaza es el contenido del marco, no la ventana
    document.getElementById("contenido")?.scrollTo({ top: 0 });
    window.scrollTo(0, 0);
  }, [paso]);

  const desdeFicha = id !== undefined;
  const nombreFicha = id ? cuenta?.get(id)?.nombre : undefined;
  const origen = desdeFicha
    ? { etiqueta: nombreFicha ?? "Cofradía", ruta: `/cofradias/${id}` }
    : { etiqueta: "Trivial", ruta: "/mi-cofradar/trivial" };
  const accion = estado.activa ? <DarFe cofradia={id} /> : undefined;
  const aTrivial = { etiqueta: "Trivial", accion: () => setFase({ es: "elegir" }) };

  const empezar = () => banco && setFase({ es: "jugar", partida: nuevaPartida(banco, cofradia, dificultad), i: 0, respuestas: [] });

  if (!banco || !cuenta) {
    return (
      <PantallaSecundaria titulo="Trivial cofrade" vuelta={origen} accion={accion} registro="editorial">
        {fallo ? (
          <div className="cf-trivial-aviso" role="status">
            <Icono nombre="informativo" tamano={20} />
            <p>No se han podido cargar las preguntas. Inténtalo de nuevo cuando tengas conexión.</p>
          </div>
        ) : (
          <Esqueleto forma="lista" />
        )}
      </PantallaSecundaria>
    );
  }

  if (fase.es === "buscar") {
    return (
      <Buscar
        cuenta={cuenta}
        accion={accion}
        alVolver={() => setFase({ es: "elegir" })}
        alElegir={(c) => {
          setCofradia(c);
          setFase({ es: "elegir" });
        }}
      />
    );
  }

  if (fase.es === "jugar") {
    const p = fase.partida[fase.i];
    if (!p) return null;
    const elegida = fase.respuestas[fase.i];
    const ultima = fase.i === fase.partida.length - 1;
    return (
      <PantallaSecundaria vuelta={aTrivial} accion={accion} registro="editorial">
        <JugarPregunta
          key={fase.i}
          pregunta={p}
          numero={fase.i + 1}
          total={fase.partida.length}
          elegida={elegida}
          alResponder={(r) => setFase({ ...fase, respuestas: [...fase.respuestas, r] })}
          ultima={ultima}
          alSeguir={() =>
            setFase(ultima ? { es: "resultado", partida: fase.partida, respuestas: fase.respuestas } : { ...fase, i: fase.i + 1 })
          }
        />
      </PantallaSecundaria>
    );
  }

  if (fase.es === "resultado") {
    return (
      <PantallaSecundaria vuelta={aTrivial} accion={accion} registro="editorial">
        <Resultado
          partida={fase.partida}
          respuestas={fase.respuestas}
          alOtra={empezar}
          volver={{ etiqueta: desdeFicha ? `Volver a ${origen.etiqueta}` : "Volver al trivial", alPulsar: () => navegar(origen.ruta) }}
        />
      </PantallaSecundaria>
    );
  }

  const hay = candidatas(banco, cofradia, dificultad).length;
  const elegidaUna = cofradia ? cuenta.get(cofradia) : undefined;
  const adjetivo = DIFICULTADES.find((d) => d.valor === dificultad)?.adjetivo;

  return (
    <PantallaSecundaria titulo="Trivial cofrade" vuelta={origen} accion={accion} registro="editorial">
      <div className="cf-trivial">
        <p className="cf-trivial-intro">10 preguntas. Sin cuenta, sin conexión y sin puntos.</p>

        <div className="cf-trivial-opciones" role="radiogroup" aria-label="Con qué hermandades">
          <button type="button" role="radio" aria-checked={cofradia === null} className="cf-trivial-opcion" onClick={() => setCofradia(null)}>
            <span className="cf-trivial-radio" aria-hidden="true" />
            <span className="cf-trivial-opcion-texto">
              <span className="cf-trivial-opcion-nombre">Todas las hermandades</span>
              <span className="cf-trivial-opcion-nota">
                {miles(banco.preguntas.length)} preguntas de las {cuenta.size} hermandades
              </span>
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={cofradia !== null}
            className="cf-trivial-opcion"
            onClick={() => setFase({ es: "buscar" })}
            aria-label={elegidaUna ? `${elegidaUna.nombre}, ${elegidaUna.preguntas} preguntas. Cambiar de hermandad` : "Una hermandad. Buscar"}
          >
            <span className="cf-trivial-radio" aria-hidden="true" />
            <span className="cf-trivial-opcion-texto">
              <span className="cf-trivial-opcion-nombre">{elegidaUna ? elegidaUna.nombre : "Una hermandad"}</span>
              {elegidaUna ? <span className="cf-trivial-opcion-nota">{elegidaUna.preguntas} preguntas</span> : null}
            </span>
            <Icono nombre="buscar" tamano={24} />
          </button>
        </div>

        <section className="cf-trivial-dificultad" aria-labelledby="trivial-dificultad">
          <h2 id="trivial-dificultad">Dificultad</h2>
          <div className="cf-segmentado" data-cuatro="" role="radiogroup" aria-labelledby="trivial-dificultad">
            {DIFICULTADES.map((d) => (
              <button key={d.etiqueta} type="button" role="radio" aria-checked={dificultad === d.valor} onClick={() => setDificultad(d.valor)}>
                {d.etiqueta}
              </button>
            ))}
          </div>
        </section>

        {hay === 0 ? (
          <p className="cf-trivial-nota" role="status">
            {elegidaUna ? `${elegidaUna.nombre} no tiene preguntas ${adjetivo}.` : `No hay preguntas ${adjetivo}.`} Elige otra dificultad.
          </p>
        ) : hay < 10 ? (
          <p className="cf-trivial-nota">
            Hay {hay === 1 ? "una pregunta" : `${hay} preguntas`} {adjetivo}
            {elegidaUna ? ` de ${elegidaUna.nombre}` : ""}: la partida será más corta.
          </p>
        ) : null}

        <Boton variante="primario" tamano="52" disabled={hay === 0} onClick={empezar}>
          Empezar
        </Boton>
      </div>
    </PantallaSecundaria>
  );
}

/** 03b · Elegir una hermandad: el buscador de Cofradías, en la cabecera. */
function Buscar({
  cuenta,
  accion,
  alVolver,
  alElegir,
}: {
  cuenta: Map<string, { nombre: string; preguntas: number }>;
  accion?: React.ReactNode;
  alVolver: () => void;
  alElegir: (cofradia: string) => void;
}) {
  const [consulta, setConsulta] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => campo.current?.focus(), []);

  const lista = [...cuenta.entries()]
    .filter(([, c]) => coincide(c.nombre, consulta))
    .sort(([, a], [, b]) => a.nombre.replace(/^(El|La|Los|Las) /, "").localeCompare(b.nombre.replace(/^(El|La|Los|Las) /, ""), "es"));

  return (
    <Marco
      registro="editorial"
      accion={accion}
      cabecera={
        <Cabecera
          etiqueta="Cabecera de pantalla secundaria"
          marca={false}
          principal={
            <Boton variante="secundario" tamano="36" data-vuelta="" onClick={alVolver}>
              <Icono nombre="flechaIzquierda" tamano={16} />
              <span>Trivial</span>
            </Boton>
          }
          secundaria={
            <div className="cf-field cf-cofradias-busqueda">
              <label className="cf-oculto-visual" htmlFor="trivial-buscar">
                Buscar hermandad
              </label>
              <Icono nombre="buscar" tamano={20} />
              <input
                ref={campo}
                id="trivial-buscar"
                type="search"
                placeholder="Buscar hermandad"
                autoComplete="off"
                enterKeyHint="search"
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
              />
              {consulta ? (
                <button type="button" className="cf-cofradias-borrar" aria-label="Borrar búsqueda" onClick={() => setConsulta("")}>
                  <Icono nombre="cerrar" tamano={20} />
                </button>
              ) : null}
            </div>
          }
        />
      }
    >
      {lista.length ? (
        <ul className="cf-trivial-hermandades">
          {lista.map(([id, c]) => (
            <li key={id}>
              <button type="button" className="cf-trivial-hermandad" onClick={() => alElegir(id)}>
                <span className="cf-trivial-opcion-texto">
                  <span className="cf-trivial-opcion-nombre">{c.nombre}</span>
                  <span className="cf-trivial-opcion-nota">{c.preguntas} preguntas</span>
                </span>
                <Icono nombre="chevronDerecha" tamano={20} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cf-trivial-nota">Ninguna hermandad se llama así.</p>
      )}
    </Marco>
  );
}

/** 04 · 05 · 06 · Una pregunta, antes y después de responder. */
function JugarPregunta({
  pregunta: p,
  numero,
  total,
  elegida,
  alResponder,
  ultima,
  alSeguir,
}: {
  pregunta: Pregunta;
  numero: number;
  total: number;
  elegida: string | undefined;
  alResponder: (r: string) => void;
  ultima: boolean;
  alSeguir: () => void;
}) {
  const respondida = elegida !== undefined;
  const seguir = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!respondida) return;
    // Que se vean la explicación y «Siguiente» sin tener que buscarlos
    seguir.current?.focus({ preventScroll: true });
    seguir.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [respondida]);

  return (
    <div className="cf-trivial">
      <div className="cf-trivial-avance">
        <p>
          Pregunta {numero} de {total}
        </p>
        <div className="cf-trivial-barra" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={numero} aria-label="Avance de la partida">
          <span style={{ width: `${(100 * numero) / total}%` }} />
        </div>
      </div>

      <p className="cf-trivial-chip">
        {p.hermandad} · {p.tema}
      </p>
      <h1 className="cf-trivial-pregunta">{p.texto}</h1>

      <ol className="cf-trivial-respuestas">
        {p.respuestas.map((r, i) => {
          const marca = !respondida ? undefined : r === p.correcta ? "correcta" : r === elegida ? "tuya" : "apagada";
          return (
            <li key={r}>
              <button type="button" className="cf-trivial-respuesta" data-marca={marca} disabled={respondida} onClick={() => alResponder(r)}>
                <span className="cf-trivial-letra" aria-hidden="true">
                  {"ABCD"[i]}
                </span>
                <span className="cf-oculto-visual">{"ABCD"[i]}: </span>
                <span className="cf-trivial-respuesta-texto">{r}</span>
                {marca === "correcta" ? (
                  <span className="cf-trivial-rotulo">
                    <Icono nombre="check" tamano={16} />
                    Correcta
                  </span>
                ) : marca === "tuya" ? (
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

      <div aria-live="polite">
        {respondida ? (
          <>
            <p className="cf-oculto-visual">{elegida === p.correcta ? "Has acertado." : `No. La respuesta buena es ${p.correcta}.`}</p>
            <Explicacion pregunta={p} />
          </>
        ) : null}
      </div>

      {respondida ? (
        // Un .cf-btn a mano y no <Boton>: hace falta su ref para llevar ahí el foco al responder
        <button ref={seguir} type="button" className="cf-btn" data-variant="primario" data-size="52" onClick={alSeguir}>
          {ultima ? "Ver el resultado" : "Siguiente"}
        </button>
      ) : null}
    </div>
  );
}

function Explicacion({ pregunta: p }: { pregunta: Pregunta }) {
  return (
    <div className="cf-trivial-explicacion">
      {p.explicacion ? <p>{p.explicacion}</p> : null}
      <FuenteDe fuente={p.fuente} cofradia={p.cofradia} />
    </div>
  );
}

export function FuenteDe({ fuente, cofradia }: { fuente: Fuente; cofradia: string }) {
  if (fuente.tipo === "web") {
    return (
      <a className="cf-trivial-fuente" href={fuente.url} target="_blank" rel="noreferrer">
        <Icono nombre="enlaceExterno" tamano={20} />
        <span>{fuente.texto}</span>
      </a>
    );
  }
  if (fuente.tipo === "ficha") {
    return (
      <Link className="cf-trivial-fuente" to={`/cofradias/${cofradia}`}>
        <Icono nombre="documento" tamano={20} />
        <span>{fuente.texto}</span>
      </Link>
    );
  }
  return (
    <p className="cf-trivial-fuente">
      <Icono nombre="calendario" tamano={20} />
      <span>{fuente.texto}</span>
    </p>
  );
}

/** 07 · Resultado: la cifra y el repaso, sin juzgar y sin guardar nada. */
function Resultado({
  partida,
  respuestas,
  alOtra,
  volver,
}: {
  partida: Pregunta[];
  respuestas: string[];
  alOtra: () => void;
  volver: { etiqueta: string; alPulsar: () => void };
}) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const aciertos = partida.filter((p, i) => respuestas[i] === p.correcta).length;

  return (
    <div className="cf-trivial">
      <h1 className="cf-trivial-cifra">
        {aciertos} de {partida.length}
      </h1>
      <p className="cf-trivial-intro">Has repasado {partida.length === 1 ? "una pregunta" : `${partida.length} preguntas`}.</p>

      <ol className="cf-trivial-repaso">
        {partida.map((p, i) => {
          const bien = respuestas[i] === p.correcta;
          const esta = abierta === i;
          return (
            <li key={p.id}>
              <button type="button" className="cf-trivial-repaso-fila" aria-expanded={esta} onClick={() => setAbierta(esta ? null : i)}>
                <span className="cf-trivial-repaso-n cf-num">{i + 1}</span>
                <span className="cf-trivial-repaso-marca" data-bien={bien ? "" : undefined}>
                  <Icono nombre={bien ? "check" : "cerrar"} tamano={16} />
                  <span className="cf-oculto-visual">{bien ? "Acertada" : "Fallada"}</span>
                </span>
                <span className="cf-trivial-repaso-texto">{p.texto}</span>
                <span className="cf-trivial-repaso-chevron">
                  <Icono nombre="chevronAbajo" tamano={20} />
                </span>
              </button>
              {esta ? (
                <div className="cf-trivial-repaso-detalle">
                  <p className="cf-trivial-repaso-buena">Correcta: {p.correcta}</p>
                  {!bien ? <p className="cf-trivial-repaso-tuya">Tu respuesta: {respuestas[i]}</p> : null}
                  {p.explicacion ? <p>{p.explicacion}</p> : null}
                  <FuenteDe fuente={p.fuente} cofradia={p.cofradia} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="cf-trivial-final">
        <Boton variante="primario" tamano="52" onClick={alOtra}>
          Otra partida
        </Boton>
        <Boton variante="secundario" tamano="52" onClick={volver.alPulsar}>
          {volver.etiqueta}
        </Boton>
      </div>
    </div>
  );
}

const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChipAlteracion, ChipEstado } from "../../componentes";
import { useJornada } from "../../datos/jornada";
import { Boton, Icono } from "../../marco";
import { ErrorPanel, leerJornada, publicar, retirar, type AlteracionMotor, type Anotacion, type CofradiaPanel, type JornadaPanel } from "./api";

/**
 * P-28 · Jornada en curso (9-admin/admin-2*). Las excepciones del día que el motor no puede deducir:
 *
 * - Aviso de jornada (lluvia u otro), para toda la jornada.
 * - Por cofradía: «Marcar como cancelada» antes de que salga (cancelada es no salir) y «Publicar
 *   incidencia» mientras está en la calle.
 * - Retirar una alteración que publicó el motor («Cofradar»), o lo que se publicó aquí.
 *
 * Todo pide nota o motivo y queda en «Registro de hoy»: quién, cuándo y por qué. Nada se borra. Lo que se
 * publica aquí se ve en la app en su siguiente refresco (30 segundos).
 */
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });

const NOMBRE_ALTERACION = { retraso: "Retraso", adelanto: "Adelanto" } as const;
const etiquetaAlteracion = (a: AlteracionMotor) => `${NOMBRE_ALTERACION[a.tipo]} ${a.minutos} min`;

type Dialogo =
  | { tipo: "aviso" }
  | { tipo: "incidencia"; c: CofradiaPanel }
  | { tipo: "cancelar"; c: CofradiaPanel }
  | { tipo: "retirar-alteracion"; c: CofradiaPanel; a: AlteracionMotor }
  | { tipo: "retirar"; a: Anotacion; titulo: string; muestra: ReactNode };

export function JornadaEnCurso() {
  const { jornadas, hoy, consultada } = useJornada();
  const lista = jornadas.datos ?? [];
  const [elegida, setElegida] = useState<number | null>(null);
  const jornada = elegida ?? hoy?.id ?? consultada?.id ?? null;
  const nombreJornada = lista.find((j) => j.id === jornada)?.nombre ?? "";

  const [datos, setDatos] = useState<JornadaPanel | null>(null);
  const [error, setError] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [verRegistro, setVerRegistro] = useState(false);

  const cargar = useCallback(async () => {
    if (jornada === null) return;
    setActualizando(true);
    try {
      const d = await leerJornada(jornada);
      setDatos(d.jornada === jornada ? d : null);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setActualizando(false);
    }
  }, [jornada]);

  useEffect(() => {
    setDatos(null);
    void cargar();
    const t = window.setInterval(() => void cargar(), 30_000);
    return () => window.clearInterval(t);
  }, [cargar]);

  return (
    <>
      <header className="cf-admin-cab">
        <div>
          <h1>Jornada en curso</h1>
          <p className="cf-admin-cab-sub">
            {nombreJornada}
            {datos ? (
              <>
                {" · "}
                {fecha(datos.ahora)} · <span className="cf-num">{hhmm(datos.ahora)}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="cf-admin-cab-lado">
          <label className="cf-admin-elegir">
            <span>Jornada</span>
            <select value={jornada ?? ""} onChange={(e) => setElegida(Number(e.target.value))}>
              {lista.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre}
                  {j.id === hoy?.id ? " (hoy)" : ""}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="cf-admin-refresco" onClick={() => void cargar()} aria-busy={actualizando}>
            <Icono nombre="sincronizar" tamano={16} />
            {error ? "Sin actualizar · reintentar" : datos ? `Actualizado ${hhmm(datos.ahora)}` : "Cargando…"}
          </button>
          <button type="button" className="cf-admin-ver-registro" onClick={() => setVerRegistro((v) => !v)}>
            {verRegistro ? "Ver las cofradías" : "Registro de hoy"}
          </button>
        </div>
      </header>

      {!datos ? (
        <div className="cf-admin-cuerpo">
          {error ? (
            <p className="cf-admin-aviso">No se ha podido cargar la jornada. Inténtalo de nuevo en un momento.</p>
          ) : (
            <p className="cf-admin-nota">Cargando la jornada…</p>
          )}
        </div>
      ) : (
        <div className="cf-admin-cuerpo cf-admin-jornada" data-ver={verRegistro ? "registro" : "cofradias"}>
          <div className="cf-admin-principal">
            <AvisosJornada datos={datos} abrir={setDialogo} />
            <Cofradias datos={datos} abrir={setDialogo} />
          </div>
          <Registro registro={datos.registro} />
        </div>
      )}

      {dialogo && jornada !== null ? (
        <DialogoAccion
          dialogo={dialogo}
          jornada={jornada}
          cerrar={() => setDialogo(null)}
          hecho={() => {
            setDialogo(null);
            void cargar();
          }}
        />
      ) : null}
    </>
  );
}

// ── Aviso de jornada ──────────────────────────────────────────────────────────────────────────────

function BandaAviso({ a, accion }: { a: Anotacion; accion?: ReactNode }) {
  return (
    <div className="cf-admin-banda">
      <Icono nombre={a.clase === "lluvia" ? "lluvia" : "informativo"} tamano={20} />
      <div>
        <p>
          <strong>{a.clase === "lluvia" ? "Lluvia" : "Aviso"}</strong> · {a.texto}
        </p>
        {a.autor ? (
          <p className="cf-admin-quien">
            Publicado por {a.autor} · <span className="cf-num">{hhmm(a.creada)}</span>
          </p>
        ) : null}
      </div>
      {accion}
    </div>
  );
}

function AvisosJornada({ datos, abrir }: { datos: JornadaPanel; abrir: (d: Dialogo) => void }) {
  return (
    <section className="cf-admin-caja" aria-labelledby="admin-aviso">
      <div className="cf-admin-caja-cab">
        <h2 id="admin-aviso">Aviso de jornada</h2>
        <Boton variante="primario" onClick={() => abrir({ tipo: "aviso" })}>
          Publicar aviso de jornada
        </Boton>
      </div>
      {datos.avisos.length ? (
        datos.avisos.map((a) => (
          <BandaAviso
            key={a.id}
            a={a}
            accion={
              <BotonRetirar
                onClick={() =>
                  abrir({ tipo: "retirar", a, titulo: "¿Retirar el aviso de jornada?", muestra: <BandaAviso a={{ ...a, autor: "" }} /> })
                }
              />
            }
          />
        ))
      ) : (
        <p className="cf-admin-nota">Sin aviso publicado. Si llueve o hay algo que afecta a toda la jornada, se publica aquí.</p>
      )}
    </section>
  );
}

// ── Las cofradías del día ─────────────────────────────────────────────────────────────────────────

function BotonRetirar({ onClick, texto = "Retirar" }: { onClick: () => void; texto?: string }) {
  return (
    <span className="cf-admin-rojo">
      <Boton variante="secundario" tamano="36" onClick={onClick}>
        {texto}
      </Boton>
    </span>
  );
}

function Cofradias({ datos, abrir }: { datos: JornadaPanel; abrir: (d: Dialogo) => void }) {
  if (!datos.cofradias.length) return <p className="cf-admin-nota">Esta jornada no tiene cofradías.</p>;
  return (
    <section className="cf-admin-caja cf-admin-tabla" aria-label="Cofradías de la jornada">
      <div className="cf-admin-fila cf-admin-fila-cab" aria-hidden="true">
        <span>Cofradía</span>
        <span>Fase</span>
        <span>Alteraciones</span>
        <span>Acciones</span>
      </div>
      <ul>
        {datos.cofradias.map((c) => (
          <FilaCofradia key={c.id} c={c} abrir={abrir} />
        ))}
      </ul>
    </section>
  );
}

function FilaCofradia({ c, abrir }: { c: CofradiaPanel; abrir: (d: Dialogo) => void }) {
  const f = c.fase;
  const antesDeSalir = f.valor === "prevista" || f.valor === "inminente";
  const enLaCalle = f.valor === "en_calle" || f.valor === "proxima_entrada";
  const antiguedad = f.haceMin !== null ? `hace ${f.haceMin} min` : f.confianza === "estimado" ? "según horario" : undefined;
  const nada = !c.alteraciones.length && !c.incidencias.length && !c.cancelada && !c.alteracionesRetiradas.length;

  return (
    <li className="cf-admin-fila">
      <div>
        <h3 className="cf-admin-nombre">{c.nombre}</h3>
        <p className="cf-admin-quien">
          <span className="cf-admin-solo-movil">Última observación: </span>
          {c.ultima ? (
            <>
              {c.ultima.que} · <span className="cf-num">{hhmm(c.ultima.hora)}</span>
            </>
          ) : (
            "Nadie ha dado fe"
          )}
        </p>
      </div>
      <div>
        <ChipEstado fase={f.valor} confianza={f.confianza} antiguedad={antiguedad} tamano="24" />
        {antesDeSalir && c.sale ? (
          <p className="cf-admin-quien">
            Sale a las <span className="cf-num">{hhmm(c.sale)}</span>
          </p>
        ) : null}
      </div>
      <div className="cf-admin-alteraciones">
        {nada ? <p className="cf-admin-nota">Sin alteraciones</p> : null}
        {c.cancelada ? (
          <Publicado
            muestra={<strong>Cancelada desde el panel</strong>}
            quien={`${hhmm(c.cancelada.creada)} · ${c.cancelada.autor}`}
            texto={c.cancelada.texto}
            accion={
              <BotonRetirar
                texto="Deshacer"
                onClick={() =>
                  abrir({
                    tipo: "retirar",
                    a: c.cancelada!,
                    titulo: `¿Quitar la cancelación de ${c.nombre}?`,
                    muestra: <ChipEstado fase="cancelada" tamano="24" />,
                  })
                }
              />
            }
          />
        ) : null}
        {c.incidencias.map((a) => (
          <Publicado
            key={a.id}
            muestra={<ChipAlteracion alteracion={{ tipo: "incidencia" }} />}
            quien={`${hhmm(a.creada)} · ${a.autor}`}
            texto={a.texto}
            accion={
              <BotonRetirar
                onClick={() =>
                  abrir({
                    tipo: "retirar",
                    a,
                    titulo: `¿Retirar la incidencia de ${c.nombre}?`,
                    muestra: <ChipAlteracion alteracion={{ tipo: "incidencia" }} />,
                  })
                }
              />
            }
          />
        ))}
        {c.alteraciones.map((a) => (
          <Publicado
            key={a.tipo}
            muestra={<ChipAlteracion alteracion={a} confianza={f.confianza} />}
            quien="Cofradar"
            accion={<BotonRetirar onClick={() => abrir({ tipo: "retirar-alteracion", c, a })} />}
          />
        ))}
        {c.alteracionesRetiradas.map((a) => (
          <Publicado
            key={a.id}
            muestra={<span className="cf-admin-retirada">{a.detalle} · retirada</span>}
            quien={`${hhmm(a.creada)} · ${a.autor}`}
            texto={a.texto}
            accion={
              <BotonRetirar
                texto="Volver a mostrar"
                onClick={() =>
                  abrir({
                    tipo: "retirar",
                    a,
                    titulo: `¿Volver a mostrar «${a.detalle}» en ${c.nombre}?`,
                    muestra: <span className="cf-admin-retirada">{a.detalle} · retirada</span>,
                  })
                }
              />
            }
          />
        ))}
      </div>
      <div className="cf-admin-acciones">
        {antesDeSalir && !c.cancelada ? (
          <span className="cf-admin-rojo">
            <Boton variante="secundario" onClick={() => abrir({ tipo: "cancelar", c })}>
              Marcar como cancelada
            </Boton>
          </span>
        ) : enLaCalle ? (
          <Boton variante="secundario" onClick={() => abrir({ tipo: "incidencia", c })}>
            Publicar incidencia
          </Boton>
        ) : (
          <p className="cf-admin-nota">Sin acciones</p>
        )}
      </div>
    </li>
  );
}

function Publicado({ muestra, quien, texto, accion }: { muestra: ReactNode; quien: string; texto?: string; accion: ReactNode }) {
  return (
    <div className="cf-admin-publicado">
      {muestra}
      {texto ? <p className="cf-admin-publicado-texto">«{texto}»</p> : null}
      <div className="cf-admin-publicado-pie">
        <span className="cf-admin-quien">{quien}</span>
        {accion}
      </div>
    </div>
  );
}

// ── Registro de hoy ───────────────────────────────────────────────────────────────────────────────

type Entrada = { hora: string; texto: string; quien: string; nota?: string };

function entradas(registro: Anotacion[]): Entrada[] {
  const en = (a: Anotacion) => a.nombre ?? a.cofradia ?? "";
  const res: Entrada[] = [];
  for (const a of registro) {
    const publicado: Record<Anotacion["tipo"], string> = {
      aviso_jornada: `Publicó el aviso de jornada «${a.clase === "lluvia" ? "Lluvia" : "Aviso"}».`,
      incidencia: `Publicó una incidencia en ${en(a)}.`,
      cancelada: `Marcó ${en(a)} como cancelada.`,
      retirar_alteracion: `Retiró «${a.detalle}» de ${en(a)}.`,
    };
    res.push({ hora: a.creada, texto: publicado[a.tipo], quien: a.autor, nota: a.texto });
    if (a.retirada) {
      const retirado: Record<Anotacion["tipo"], string> = {
        aviso_jornada: `Retiró el aviso de jornada «${a.clase === "lluvia" ? "Lluvia" : "Aviso"}».`,
        incidencia: `Retiró la incidencia de ${en(a)}.`,
        cancelada: `Quitó la cancelación de ${en(a)}.`,
        retirar_alteracion: `Volvió a mostrar «${a.detalle}» en ${en(a)}.`,
      };
      res.push({ hora: a.retirada.cuando, texto: retirado[a.tipo], quien: a.retirada.por, nota: a.retirada.motivo });
    }
  }
  return res.sort((x, y) => Date.parse(x.hora) - Date.parse(y.hora));
}

function Registro({ registro }: { registro: Anotacion[] }) {
  const lista = entradas(registro);
  return (
    <aside className="cf-admin-caja cf-admin-registro" aria-labelledby="admin-registro">
      <h2 id="admin-registro">Registro de hoy</h2>
      <p className="cf-admin-nota">Publicaciones y retiradas, por orden de hora.</p>
      {lista.length ? (
        <ol>
          {lista.map((e, i) => (
            <li key={i}>
              <span className="cf-num">{hhmm(e.hora)}</span>
              <div>
                <p>{e.texto}</p>
                {e.nota ? <p className="cf-admin-publicado-texto">«{e.nota}»</p> : null}
                <p className="cf-admin-quien">{e.quien}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cf-admin-nota">Hoy no se ha publicado nada desde el panel.</p>
      )}
    </aside>
  );
}

// ── Los diálogos ──────────────────────────────────────────────────────────────────────────────────

function DialogoAccion({ dialogo, jornada, cerrar, hecho }: { dialogo: Dialogo; jornada: number; cerrar: () => void; hecho: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [texto, setTexto] = useState("");
  const [clase, setClase] = useState<"lluvia" | "otro">("lluvia");
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const listo = texto.trim().length > 0;

  const enviar = async () => {
    if (!listo || enviando) return;
    setEnviando(true);
    setFallo(null);
    try {
      const t = texto.trim();
      if (dialogo.tipo === "aviso") await publicar(jornada, { tipo: "aviso_jornada", clase, texto: t });
      else if (dialogo.tipo === "incidencia") await publicar(jornada, { tipo: "incidencia", cofradia: dialogo.c.id, texto: t });
      else if (dialogo.tipo === "cancelar") await publicar(jornada, { tipo: "cancelada", cofradia: dialogo.c.id, texto: t });
      else if (dialogo.tipo === "retirar-alteracion")
        await publicar(jornada, {
          tipo: "retirar_alteracion",
          cofradia: dialogo.c.id,
          clase: dialogo.a.tipo,
          detalle: etiquetaAlteracion(dialogo.a),
          texto: t,
        });
      else await retirar(dialogo.a.id, t);
      hecho();
    } catch (e) {
      setFallo(e instanceof ErrorPanel ? e.message : "No se ha podido completar. Inténtalo de nuevo.");
      setEnviando(false);
    }
  };

  const contenido = (() => {
    switch (dialogo.tipo) {
      case "aviso":
        return {
          titulo: "Publicar aviso de jornada",
          cuerpo: (
            <>
              <fieldset className="cf-admin-clase">
                <legend>Tipo</legend>
                <label>
                  <input type="radio" name="clase" checked={clase === "lluvia"} onChange={() => setClase("lluvia")} /> Lluvia
                </label>
                <label>
                  <input type="radio" name="clase" checked={clase === "otro"} onChange={() => setClase("otro")} /> Otro aviso
                </label>
              </fieldset>
              <Campo etiqueta="Texto del aviso" valor={texto} cambiar={setTexto} />
              <p className="cf-admin-campo-titulo">Vista previa en la app</p>
              <div className="cf-band" role="note">
                <Icono nombre={clase === "lluvia" ? "lluvia" : "informativo"} tamano={20} />
                <span className="txt">{texto.trim() || "Aquí aparecerá el texto del aviso."}</span>
              </div>
            </>
          ),
          boton: "Publicar",
          peligro: false,
        };
      case "incidencia":
        return {
          titulo: "Publicar incidencia",
          cuerpo: (
            <>
              <p className="cf-admin-campo-titulo">Cofradía</p>
              <p className="cf-admin-fijo">{dialogo.c.nombre}</p>
              <Campo etiqueta="Texto del aviso" valor={texto} cambiar={setTexto} />
              <p className="cf-admin-campo-titulo">Vista previa en la app</p>
              <div className="cf-admin-previa">
                <p className="cf-admin-previa-nombre">{dialogo.c.nombre}</p>
                <ChipAlteracion alteracion={{ tipo: "incidencia" }} />
                <p>{texto.trim() || "Aquí aparecerá el texto del aviso."}</p>
              </div>
            </>
          ),
          boton: "Publicar",
          peligro: false,
        };
      case "cancelar":
        return {
          titulo: `¿${dialogo.c.nombre} no realiza estación de penitencia?`,
          cuerpo: (
            <>
              <p>Se mostrará como «No realiza estación» en toda la app.</p>
              <Campo etiqueta="Nota (queda en el registro)" valor={texto} cambiar={setTexto} />
              <p className="cf-admin-nota">«Marcar como cancelada» se activa al escribir la nota.</p>
            </>
          ),
          boton: "Marcar como cancelada",
          peligro: true,
        };
      case "retirar-alteracion":
        return {
          titulo: `¿Retirar «${etiquetaAlteracion(dialogo.a)}» de ${dialogo.c.nombre}?`,
          cuerpo: (
            <>
              <p>Dejará de mostrarse mientras no se vuelva a mostrar. Queda en el registro con el motivo.</p>
              <div className="cf-admin-publicado-pie">
                <ChipAlteracion alteracion={dialogo.a} />
                <span className="cf-admin-quien">Cofradar</span>
              </div>
              <Campo etiqueta="Motivo" valor={texto} cambiar={setTexto} />
            </>
          ),
          boton: "Retirar",
          peligro: true,
        };
      case "retirar":
        return {
          titulo: dialogo.titulo,
          cuerpo: (
            <>
              <p>Queda en el registro con el motivo.</p>
              <div className="cf-admin-publicado-pie">
                {dialogo.muestra}
                <span className="cf-admin-quien">
                  <span className="cf-num">{hhmm(dialogo.a.creada)}</span> · {dialogo.a.autor}
                </span>
              </div>
              <Campo etiqueta="Motivo" valor={texto} cambiar={setTexto} />
            </>
          ),
          boton: dialogo.a.tipo === "retirar_alteracion" ? "Volver a mostrar" : dialogo.a.tipo === "cancelada" ? "Quitar la cancelación" : "Retirar",
          peligro: dialogo.a.tipo !== "retirar_alteracion" && dialogo.a.tipo !== "cancelada",
        };
    }
  })();

  return (
    <dialog
      ref={ref}
      className="cf-admin-dialogo"
      aria-labelledby="admin-dialogo-titulo"
      onCancel={(e) => {
        e.preventDefault();
        if (!enviando) cerrar();
      }}
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        <h2 id="admin-dialogo-titulo">{contenido.titulo}</h2>
        {contenido.cuerpo}
        {fallo ? (
          <p className="cf-admin-aviso" role="alert">
            {fallo}
          </p>
        ) : null}
        <div className="cf-admin-dialogo-botones">
          <Boton variante="secundario" onClick={cerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton variante={contenido.peligro ? "peligro" : "primario"} type="submit" disabled={!listo} cargando={enviando}>
            {contenido.boton}
          </Boton>
        </div>
      </form>
    </dialog>
  );
}

function Campo({ etiqueta, valor, cambiar }: { etiqueta: string; valor: string; cambiar: (v: string) => void }) {
  return (
    <label className="cf-admin-campo">
      <span className="cf-admin-campo-titulo">
        {etiqueta} <span className="cf-admin-obligatorio">· obligatorio</span>
      </span>
      <textarea value={valor} onChange={(e) => cambiar(e.target.value)} rows={3} maxLength={500} required autoFocus />
    </label>
  );
}

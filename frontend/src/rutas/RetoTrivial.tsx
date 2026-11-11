import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Esqueleto } from "../componentes";
import { Boton, HojaDecision, Icono, PantallaSecundaria } from "../marco";
import { preguntaPorId, useBancoTrivial } from "../datos/trivial";
import { CATEGORIAS, categoriaDeTema } from "../datos/tableroTrivial";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { FuenteDe } from "./Trivial";

/**
 * «Te reto a esta pregunta» (F-53; 11-trivial-online/18–20).
 *
 *   RetarConPregunta     tras contestar una (solo u online): la vista previa del mensaje y «Compartir»,
 *                        que abre el menú de compartir del móvil (o copia el mensaje si no lo hay).
 *   /trivial/r/:id       lo que abre quien lo recibe: la pregunta, sin cuenta, con su explicación y su
 *                        fuente al contestar. Sale del banco que viaja con la app (el mismo id que el
 *                        online), así que funciona también sin conexión.
 *
 * El enlace no dice quién lo mandó ni qué contestó: solo qué pregunta es.
 */

/** «¿Qué escultor…?» → «¿Sabes qué escultor…?». Solo si empieza por una palabra que lo admite. */
const ADMITE = /^¿\s*(qué|quién|quiénes|cuál|cuáles|cuándo|cuánto|cuántos|cuánta|cuántas|dónde|cómo|en|de|del|a|al|por|con|desde|hasta|para|sobre|entre|durante|según|tras|bajo)(?=\s)/i;

export function textoReto(enunciado: string, acierto: boolean): string {
  const pregunta = enunciado.trim();
  const m = ADMITE.exec(pregunta);
  if (m) {
    const resto = pregunta.replace(/^¿\s*/, "");
    return `¿Sabes ${resto.charAt(0).toLowerCase()}${resto.slice(1)} ${acierto ? "Yo sí. ¿Y tú?" : "A mí se me ha resistido. ¿Te atreves?"}`;
  }
  return `${pregunta} ${acierto ? "Yo la he acertado. ¿Y tú?" : "A mí se me ha resistido. ¿Te atreves?"}`;
}

export const enlaceReto = (id: number) => `${window.location.origin}/trivial/r/${id}`;

/** El enlace (o botón) «Retar a un amigo con esta pregunta» y su hoja con la vista previa del mensaje. */
export function RetarConPregunta({ id, enunciado, acierto, como = "enlace" }: { id: number; enunciado: string; acierto: boolean; como?: "enlace" | "boton" }) {
  const [abierta, setAbierta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const url = enlaceReto(id);
  const mensaje = `${textoReto(enunciado, acierto)} ${url}`;

  const compartir = async () => {
    setAviso(null);
    if (navigator.share) {
      try {
        await navigator.share({ text: mensaje });
        setAbierta(false);
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
    <>
      {como === "boton" ? (
        <Boton variante="secundario" tamano="52" onClick={() => setAbierta(true)}>
          Retar a otro con esta pregunta
        </Boton>
      ) : (
        <button type="button" className="cf-online-enlace cf-reto-enlace" onClick={() => setAbierta(true)}>
          <Icono nombre="compartir" tamano={20} />
          Retar a un amigo con esta pregunta
        </button>
      )}
      <HojaDecision
        abierta={abierta}
        titulo="Vista previa del mensaje"
        alCerrar={() => setAbierta(false)}
        acciones={
          <>
            <Boton variante="primario" tamano="52" onClick={() => void compartir()}>
              Compartir
            </Boton>
            <Boton variante="secundario" tamano="52" onClick={() => setAbierta(false)}>
              Ahora no
            </Boton>
          </>
        }
      >
        <p className="cf-reto-mensaje">{mensaje}</p>
        {aviso ? <p role="status">{aviso}</p> : null}
      </HojaDecision>
    </>
  );
}

/** 19 · 20 · El reto, al abrir el enlace. */
export function TrivialReto({ estado }: { estado: EstadoJornada }) {
  const { id = "" } = useParams();
  const navegar = useNavigate();
  const { banco, fallo } = useBancoTrivial();
  // Las respuestas se barajan una vez, al llegar el banco
  const p = useMemo(() => (banco && /^\d{1,6}$/.test(id) ? preguntaPorId(banco, Number(id)) : null), [banco, id]);
  const [elegida, setElegida] = useState<string | null>(null);
  const [respondida, setRespondida] = useState(false);

  const vuelta = { etiqueta: "Trivial", ruta: "/mi-cofradar/trivial" };
  const jugar = (
    <Boton variante="primario" tamano="52" onClick={() => navegar(vuelta.ruta)}>
      Jugar al trivial
    </Boton>
  );

  let cuerpo;
  if (!banco) cuerpo = fallo ? <p className="cf-online-intro">No se ha podido cargar la pregunta. Comprueba la conexión.</p> : <Esqueleto forma="lista" />;
  else if (!p)
    cuerpo = (
      <div className="cf-online">
        <p className="cf-online-intro">Esta pregunta ya no está en el trivial.</p>
        {jugar}
      </div>
    );
  else {
    const cat = categoriaDeTema(p.tema);
    const acierto = respondida && elegida === p.correcta;
    cuerpo = (
      <div className="cf-trivial">
        <h1 className="cf-online-h1">Te han retado a una pregunta del Trivial cofrade</h1>
        <p className="cf-online-chip">
          {cat ? (
            <span className="cf-online-chip-icono" data-cat={cat}>
              <Icono nombre={CATEGORIAS[cat].icono} tamano={16} />
            </span>
          ) : null}
          {cat ? `${CATEGORIAS[cat].nombre} · ` : ""}
          {p.hermandad}
        </p>
        <h2 className="cf-trivial-pregunta">{p.texto}</h2>
        <ol className="cf-trivial-respuestas" role={respondida ? undefined : "radiogroup"} aria-label={respondida ? undefined : "Respuestas"}>
          {p.respuestas.map((r, i) => {
            const marca = !respondida ? (elegida === r ? "elegida" : undefined) : r === p.correcta ? "correcta" : r === elegida ? "tuya" : "apagada";
            return (
              <li key={r}>
                <button
                  type="button"
                  className="cf-trivial-respuesta"
                  role={respondida ? undefined : "radio"}
                  aria-checked={respondida ? undefined : elegida === r}
                  data-marca={marca}
                  disabled={respondida}
                  onClick={() => setElegida(r)}
                >
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
        {!respondida ? (
          <Boton variante="primario" tamano="52" disabled={!elegida} onClick={() => setRespondida(true)}>
            Confirmar respuesta
          </Boton>
        ) : (
          <div aria-live="polite" className="cf-online-resolucion">
            <p className="cf-oculto-visual">{acierto ? "Has acertado." : `No. La respuesta buena es ${p.correcta}.`}</p>
            <div className="cf-trivial-explicacion">
              {p.explicacion ? <p>{p.explicacion}</p> : null}
              <FuenteDe fuente={p.fuente} cofradia={p.cofradia} />
            </div>
            {acierto ? <p className="cf-online-titulo cf-reto-acierto">¡Acertaste! Ahora reta tú a alguien.</p> : null}
            <div className="cf-online-botones">
              {jugar}
              <RetarConPregunta id={p.id} enunciado={p.texto} acierto={acierto} como="boton" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <PantallaSecundaria vuelta={vuelta} accion={estado.activa ? <DarFe /> : undefined} registro="editorial">
      {cuerpo}
    </PantallaSecundaria>
  );
}

/** El enlace corto que se comparte: /trivial/r/:id. */
export function RedirigirReto() {
  const { id = "" } = useParams();
  return <Navigate to={`/mi-cofradar/trivial/reto/${id}`} replace />;
}

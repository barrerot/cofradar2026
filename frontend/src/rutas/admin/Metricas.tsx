import { useCallback, useEffect, useState } from "react";
import { desfaseReloj } from "../../datos/reloj";
import { cabecerasSesion } from "../../datos/sesion";

/**
 * P-32 · Métricas (BUL-213; PRD, «Cómo sabremos si funciona»). Las cuatro preguntas, por jornada, de
 * GET /api/admin/metricas (backend/src/rutas/metricas.ts). En 2027 solo se miden, sin cifras objetivo.
 * Nada aquí sigue a una persona: son sumas.
 */
type Hora = { hora: string; enLaCalle: number; confirmadas: number };
type Jornada = {
  id: number;
  nombre: string;
  abiertas: number;
  vuelven: number;
  danFe: number;
  aportaciones: number;
  consolidadas: number;
  horas: Hora[];
};
type Datos = { anio: number; anios: number[]; jornadas: Jornada[] };

async function leer(anio: number | null): Promise<Datos> {
  const desfase = desfaseReloj();
  const q = new URLSearchParams();
  if (anio !== null) q.set("anio", String(anio));
  if (desfase) q.set("desfase", String(desfase));
  const r = await fetch(`/api/admin/metricas?${q}`, { headers: { Accept: "application/json", ...(await cabecerasSesion()) } });
  if (!r.ok) throw new Error();
  return r.json();
}

const pct = (n: number, de: number) => (de > 0 ? `${Math.round((100 * n) / de)} %` : "—");
const num = (n: number) => n.toLocaleString("es-ES");

function Cifra({ n, de }: { n: number; de: number }) {
  return (
    <>
      <strong>{pct(n, de)}</strong>
      <span className="cf-admin-quien">
        {" "}
        {num(n)} de {num(de)}
      </span>
    </>
  );
}

export function Metricas() {
  const [anio, setAnio] = useState<number | null>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDatos(await leer(anio));
      setError(false);
    } catch {
      setError(true);
    }
  }, [anio]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const enLaCalle = (j: Jornada) => j.horas.reduce((n, h) => n + h.enLaCalle, 0);
  const confirmadas = (j: Jornada) => j.horas.reduce((n, h) => n + h.confirmadas, 0);

  return (
    <>
      <header className="cf-admin-cab">
        <h1>Métricas</h1>
        {datos ? (
          <label className="cf-admin-elegir">
            <span>Semana Santa</span>
            <select value={datos.anio} onChange={(e) => setAnio(Number(e.target.value))}>
              {datos.anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>
      <div className="cf-admin-cuerpo">
        {!datos ? (
          <p className={error ? "cf-admin-aviso" : "cf-admin-nota"}>
            {error ? "No se han podido cargar. Inténtalo de nuevo en un momento." : "Cargando…"}
          </p>
        ) : (
          <div className="cf-admin-metricas">
            <p className="cf-admin-nota">
              Este año solo se mide, sin objetivos: sirve de referencia para el siguiente. Son sumas por jornada; no se sigue a nadie. Quien
              abre Cofradar en dos navegadores, o borra sus datos, cuenta dos veces.
            </p>
            <section className="cf-admin-caja cf-admin-datos" aria-label="Las cuatro métricas por jornada">
              <div className="cf-admin-desliza">
                <table>
                  <thead>
                    <tr>
                      <th>Jornada</th>
                      <th>Abrieron Cofradar</th>
                      <th title="De quienes la abrieron, cuántos dieron fe">¿Lo entienden?</th>
                      <th title="De los «Dar fe», cuántos ayudaron a situar una cofradía">¿Colaboran bien?</th>
                      <th title="De quienes la abrieron, cuántos ya la habían abierto otra jornada">¿Les resulta útil?</th>
                      <th title="Hora a hora, de las cofradías en la calle, cuántas tenían alguna posición confirmada">¿Llegamos a todas?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.jornadas.map((j) => (
                      <tr key={j.id}>
                        <th scope="row">{j.nombre}</th>
                        <td className="cf-num">{num(j.abiertas)}</td>
                        <td>
                          <Cifra n={j.danFe} de={j.abiertas} />
                        </td>
                        <td>
                          <Cifra n={j.consolidadas} de={j.aportaciones} />
                        </td>
                        <td>
                          <Cifra n={j.vuelven} de={j.abiertas} />
                        </td>
                        <td>
                          <Cifra n={confirmadas(j)} de={enLaCalle(j)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="cf-admin-metricas-leyenda">
                <div>
                  <dt>¿Lo entienden?</dt>
                  <dd>De quienes abrieron Cofradar esa jornada, cuántas personas dieron fe al menos una vez.</dd>
                </div>
                <div>
                  <dt>¿Colaboran bien?</dt>
                  <dd>De los «Dar fe» de esa jornada, cuántos ayudaron a situar una cofradía.</dd>
                </div>
                <div>
                  <dt>¿Les resulta útil?</dt>
                  <dd>De quienes la abrieron esa jornada, cuántos ya la habían abierto otra jornada de esta Semana Santa.</dd>
                </div>
                <div>
                  <dt>¿Llegamos a todas?</dt>
                  <dd>Cada hora, de las cofradías en la calle según el horario, cuántas tenían alguna posición confirmada. Abajo, hora a hora.</dd>
                </div>
              </dl>
            </section>

            <section className="cf-admin-caja" aria-labelledby="admin-horas">
              <h2 id="admin-horas">¿Llegamos a todas?, hora a hora</h2>
              {datos.jornadas
                .filter((j) => j.horas.length)
                .map((j) => (
                  <details key={j.id} className="cf-admin-metricas-horas">
                    <summary>
                      {j.nombre} <span className="cf-admin-quien">· {pct(confirmadas(j), enLaCalle(j))}</span>
                    </summary>
                    <ul>
                      {j.horas.map((h) => (
                        <li key={h.hora}>
                          <span className="cf-num">{h.hora}</span>
                          <span>
                            {h.confirmadas} de {h.enLaCalle} {h.enLaCalle === 1 ? "cofradía" : "cofradías"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
            </section>
          </div>
        )}
      </div>
    </>
  );
}

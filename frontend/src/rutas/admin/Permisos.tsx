import { useCallback, useEffect, useState } from "react";
import { cabecerasSesion } from "../../datos/sesion";
import { Boton } from "../../marco";

/**
 * P-31 · Permisos y configuración (9-admin/admin-5, 5.5).
 *
 * - Personas con acceso: las cuentas de Google con permiso de administración (5.1). Se añade por correo
 *   una cuenta que ya haya entrado en Cofradar; se quita al momento. Nadie se quita a sí mismo.
 * - Ajustes generales: se enseñan, no se cambian aquí (decisión de Carlos del 22/10/2026). Mueven el
 *   motor y se cambian en el código, con sus pruebas. Salen de las mismas constantes que usa el motor.
 */
type Persona = { id: string; email: string; yo: boolean };
type Ajustes = { grupo: string; valores: { nombre: string; valor: string }[] }[];

async function pedir(metodo: "GET" | "POST" | "DELETE", ruta: string, cuerpo?: unknown) {
  const r = await fetch(`/api/admin/permisos${ruta}`, {
    method: metodo,
    headers: { Accept: "application/json", ...(cuerpo ? { "Content-Type": "application/json" } : {}), ...(await cabecerasSesion()) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  if (!r.ok) {
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? "No se ha podido completar. Inténtalo de nuevo.");
  }
  return r.status === 204 ? null : r.json();
}

export function Permisos() {
  const [datos, setDatos] = useState<{ personas: Persona[]; ajustes: Ajustes } | null>(null);
  const [error, setError] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [anadiendo, setAnadiendo] = useState(false);
  const [correo, setCorreo] = useState("");
  const [quitando, setQuitando] = useState<Persona | null>(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await pedir("GET", ""));
      setError(false);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hacer = async (f: () => Promise<unknown>) => {
    setOcupado(true);
    setFallo(null);
    try {
      await f();
      await cargar();
      return true;
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se ha podido completar.");
      return false;
    } finally {
      setOcupado(false);
    }
  };

  return (
    <>
      <header className="cf-admin-cab">
        <h1>Permisos y configuración</h1>
      </header>
      <div className="cf-admin-cuerpo">
        {!datos ? (
          <p className={error ? "cf-admin-aviso" : "cf-admin-nota"}>
            {error ? "No se han podido cargar. Inténtalo de nuevo en un momento." : "Cargando…"}
          </p>
        ) : (
          <div className="cf-admin-taxonomias cf-admin-permisos">
            <section className="cf-admin-caja" aria-labelledby="admin-personas">
              <div className="cf-admin-caja-cab">
                <h2 id="admin-personas">Personas con acceso</h2>
                <Boton variante="primario" onClick={() => setAnadiendo(true)} disabled={anadiendo}>
                  Añadir persona
                </Boton>
              </div>
              <p className="cf-admin-nota">Por correo de Google. La persona tiene que haber entrado antes una vez en Cofradar.</p>
              {fallo ? (
                <p className="cf-admin-aviso" role="alert">
                  {fallo}
                </p>
              ) : null}
              {anadiendo ? (
                <form
                  className="cf-admin-taxo-linea cf-admin-taxo-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await hacer(() => pedir("POST", "", { email: correo }))) {
                      setCorreo("");
                      setAnadiendo(false);
                    }
                  }}
                >
                  <input type="email" aria-label="Correo de Google" placeholder="persona@gmail.com" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoFocus />
                  <Boton variante="primario" tamano="36" type="submit" cargando={ocupado}>
                    Dar acceso
                  </Boton>
                  <Boton variante="terciario" tamano="36" onClick={() => (setAnadiendo(false), setFallo(null))}>
                    Cancelar
                  </Boton>
                </form>
              ) : null}
              <ul className="cf-admin-taxo">
                {datos.personas.map((p) => (
                  <li key={p.id}>
                    <p className="cf-admin-taxo-texto cf-admin-partir">
                      <strong>{p.email}</strong>
                      {p.yo ? <span className="cf-admin-quien"> · tú</span> : null}
                    </p>
                    <span className="cf-admin-quien">Administración</span>
                    {p.yo ? null : quitando?.id === p.id ? (
                      <span className="cf-admin-botones">
                        <span className="cf-admin-rojo">
                          <Boton
                            variante="secundario"
                            tamano="36"
                            cargando={ocupado}
                            onClick={async () => {
                              if (await hacer(() => pedir("DELETE", `/${p.id}`))) setQuitando(null);
                            }}
                          >
                            Sí, quitar
                          </Boton>
                        </span>
                        <Boton variante="terciario" tamano="36" onClick={() => setQuitando(null)}>
                          No
                        </Boton>
                      </span>
                    ) : (
                      <Boton variante="secundario" tamano="36" onClick={() => setQuitando(p)}>
                        Quitar
                      </Boton>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="cf-admin-caja" aria-labelledby="admin-ajustes">
              <h2 id="admin-ajustes">Ajustes generales</h2>
              <p className="cf-admin-nota">
                Son los que usa el motor ahora mismo. No se cambian desde aquí: se cambian en el código, con sus pruebas, para no alterar el
                cálculo en plena jornada.
              </p>
              {datos.ajustes.map((g) => (
                <div key={g.grupo} className="cf-admin-ajustes">
                  <h3 className="cf-admin-campo-titulo">{g.grupo}</h3>
                  <dl>
                    {g.valores.map((v) => (
                      <div key={v.nombre}>
                        <dt>{v.nombre}</dt>
                        <dd>{v.valor}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </>
  );
}

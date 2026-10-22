import * as maplibregl from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cabecerasSesion } from "../../datos/sesion";
import { estiloCofradar } from "../../mapa/estilo";
import { Boton } from "../../marco";

/**
 * P-29 · Datos base (9-admin/admin-3). Corregir las cofradías, las jornadas y los horarios sin tocar los
 * CSV: desde el 22/10/2026 manda Supabase, y los CSV de docs/datos/ son su copia en el repositorio
 * (npm run exportar:datos -w backend). Lo que se guarda aquí se ve en la app al momento.
 *
 * Tres pestañas, como el diseño: Cofradías (tabla y, al elegir una, su ficha con el itinerario sobre el
 * mapa y «Editar»), Jornadas y Horarios (los puntos del programa de la cofradía elegida).
 */
export type Lugar = { id: number; nombre: string; tipo: string; latitud: number | null; longitud: number | null };
type Horario = { id: number; referencia: "cruz_guia" | "ultimo_paso"; orden: number; lugar: number; hora: string; publicada: boolean };
type Cofradia = {
  id: string;
  salidaId: number;
  hermandadId: number;
  nombre: string;
  nombreOficial: string;
  web: string | null;
  fundacion: string | null;
  templo: number;
  jornada: number;
  estado: string | null;
  pasos: { id: number; orden: number; nombre: string; elemento_id: number | null }[];
  horarios: Horario[];
  itinerario: boolean;
};
export type Elemento = { id: number; nombre: string; llano: string; orden: number; clave: string | null };
export type Hito = { id: number; lugar: number; orden: number; carreraOficial: boolean };
export type Datos = {
  anio: number;
  jornadas: { id: number; nombre: string; orden: number }[];
  templos: { id: number; nombre: string }[];
  lugares: Lugar[];
  elementos: Elemento[];
  hitos: Hito[];
  cofradias: Cofradia[];
};

export async function guardar(que: string, id: number | null, cambio: Record<string, unknown> | null, metodo: "PUT" | "POST" | "DELETE" = "PUT") {
  const r = await fetch(`/api/admin/datos/${que}${id === null ? "" : `/${id}`}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(await cabecerasSesion()) },
    body: cambio ? JSON.stringify(cambio) : undefined,
  });
  if (!r.ok) {
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? "No se ha podido guardar. Inténtalo de nuevo.");
  }
}

const hhmm = (hora: string) => hora.slice(11, 16);

type Pestana = "cofradias" | "jornadas" | "horarios";

/** Los datos de las pantallas de Datos base y Taxonomías (GET /api/admin/datos), con su recarga. */
export function useDatosBase() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/datos", { headers: { Accept: "application/json", ...(await cabecerasSesion()) } });
      if (!r.ok) throw new Error();
      setDatos((await r.json()) as Datos);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);
  return { datos, error, cargar };
}

export function DatosBase() {
  const { datos, error, cargar } = useDatosBase();
  const [pestana, setPestana] = useState<Pestana>("cofradias");
  const [elegida, setElegida] = useState<string | null>(null);

  const cofradia = datos?.cofradias.find((c) => c.id === elegida) ?? null;

  return (
    <>
      <header className="cf-admin-cab">
        <div>
          <h1>Datos base</h1>
          {datos ? <p className="cf-admin-cab-sub">Edición {datos.anio}</p> : null}
        </div>
      </header>
      <div className="cf-admin-cuerpo cf-admin-datos">
        <p className="cf-admin-nota cf-admin-copia">
          Lo que se corrige aquí se ve en la app al momento. Los CSV de <code>docs/datos/</code> son la copia en el repositorio: para
          ponerlos al día, <code>npm run exportar:datos -w backend</code> y subir el cambio.
        </p>
        <div className="cf-admin-pestanas" role="tablist">
          {(
            [
              ["cofradias", "Cofradías"],
              ["jornadas", "Jornadas"],
              ["horarios", "Horarios"],
            ] as const
          ).map(([id, nombre]) => (
            <button key={id} type="button" role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}>
              {nombre}
            </button>
          ))}
        </div>
        {!datos ? (
          error ? (
            <p className="cf-admin-aviso">No se han podido cargar los datos. Inténtalo de nuevo en un momento.</p>
          ) : (
            <p className="cf-admin-nota">Cargando los datos…</p>
          )
        ) : pestana === "cofradias" ? (
          <div className="cf-admin-datos-cofradias">
            <TablaCofradias datos={datos} elegida={elegida} elegir={setElegida} />
            {cofradia ? (
              <FichaCofradia key={cofradia.id} c={cofradia} datos={datos} recargar={cargar} verHorarios={() => setPestana("horarios")} />
            ) : (
              <aside className="cf-admin-caja cf-admin-nota">Elige una cofradía para ver su ficha y su itinerario, y corregirla.</aside>
            )}
          </div>
        ) : pestana === "jornadas" ? (
          <Jornadas datos={datos} recargar={cargar} />
        ) : (
          <Horarios datos={datos} elegida={elegida} elegir={setElegida} recargar={cargar} />
        )}
      </div>
    </>
  );
}

// ── Cofradías ─────────────────────────────────────────────────────────────────────────────────────

function TablaCofradias({ datos, elegida, elegir }: { datos: Datos; elegida: string | null; elegir: (id: string) => void }) {
  const jornada = useMemo(() => new Map(datos.jornadas.map((j) => [j.id, j])), [datos]);
  const templo = useMemo(() => new Map(datos.templos.map((t) => [t.id, t.nombre])), [datos]);
  const [filtro, setFiltro] = useState<number | "todas">("todas");
  const lista = datos.cofradias
    .filter((c) => filtro === "todas" || c.jornada === filtro)
    .sort((a, b) => (jornada.get(a.jornada)?.orden ?? 0) - (jornada.get(b.jornada)?.orden ?? 0) || a.nombre.localeCompare(b.nombre, "es"));
  return (
    <section className="cf-admin-caja cf-admin-datos-tabla" aria-label="Cofradías">
      <label className="cf-admin-elegir">
        <span>Jornada</span>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value === "todas" ? "todas" : Number(e.target.value))}>
          <option value="todas">Todas ({datos.cofradias.length})</option>
          {datos.jornadas.map((j) => (
            <option key={j.id} value={j.id}>
              {j.nombre}
            </option>
          ))}
        </select>
      </label>
      <div className="cf-admin-desliza">
        <table>
          <thead>
            <tr>
              <th>Nombre popular</th>
              <th>Jornada</th>
              <th>Templo</th>
              <th>Pasos</th>
              <th>Titulares</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id} aria-selected={c.id === elegida} onClick={() => elegir(c.id)}>
                <td>
                  <button type="button" className="cf-admin-enlace" onClick={() => elegir(c.id)}>
                    {c.nombre}
                  </button>
                  <Insignias c={c} />
                </td>
                <td>{jornada.get(c.jornada)?.nombre}</td>
                <td>{templo.get(c.templo)}</td>
                <td className="cf-num">{c.pasos.length}</td>
                <td>{c.pasos.map((p) => p.nombre).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Insignias({ c }: { c: Cofradia }) {
  const lista = [
    !c.horarios.length && "Sin horarios",
    !c.itinerario && "Sin itinerario",
    c.estado === "no_procesiona" && "No procesiona",
  ].filter(Boolean) as string[];
  return lista.length ? (
    <span className="cf-admin-insignias">
      {lista.map((x) => (
        <span key={x} className="cf-admin-insignia">
          {x}
        </span>
      ))}
    </span>
  ) : null;
}

function FichaCofradia({ c, datos, recargar, verHorarios }: { c: Cofradia; datos: Datos; recargar: () => Promise<void>; verHorarios: () => void }) {
  const [editando, setEditando] = useState(false);
  const ref = useRef<HTMLElement>(null);
  // En pantallas estrechas la ficha va debajo de la tabla: se lleva a la vista al elegir
  useEffect(() => {
    if (window.matchMedia("(max-width: 64rem)").matches) ref.current?.scrollIntoView({ block: "start" });
  }, []);
  const templo = datos.templos.find((t) => t.id === c.templo)?.nombre;
  const cruz = c.horarios.filter((h) => h.referencia === "cruz_guia");
  const ultimo = c.horarios.filter((h) => h.referencia === "ultimo_paso");
  return (
    <aside ref={ref} className="cf-admin-caja cf-admin-ficha" aria-labelledby="admin-ficha">
      <h2 id="admin-ficha">{c.nombre}</h2>
      {editando ? (
        <EditarCofradia c={c} datos={datos} cerrar={() => setEditando(false)} recargar={recargar} />
      ) : (
        <>
          <p className="cf-admin-nota">{c.nombreOficial}</p>
          <dl>
            <dt>Titulares</dt>
            <dd>
              {c.pasos.map((p) => (
                <span key={p.id} className="cf-admin-linea">
                  {p.nombre}
                  <span className="cf-admin-quien"> · {datos.elementos.find((e) => e.id === p.elemento_id)?.nombre ?? "tipo sin indicar"}</span>
                </span>
              ))}
            </dd>
            <dt>Templo</dt>
            <dd>{templo}</dd>
            <dt>Jornada</dt>
            <dd>
              {datos.jornadas.find((j) => j.id === c.jornada)?.nombre}
              {c.estado === "no_procesiona" ? " · no procesiona" : ""}
            </dd>
            <dt>Salida</dt>
            <dd className="cf-num">{cruz[0] ? hhmm(cruz[0].hora) : "Sin horario"}</dd>
            <dt>Entrada</dt>
            <dd className="cf-num">{ultimo.length ? hhmm(ultimo[ultimo.length - 1]!.hora) : "Sin horario"}</dd>
            {c.web ? (
              <>
                <dt>Web</dt>
                <dd className="cf-admin-partir">{c.web}</dd>
              </>
            ) : null}
            {c.fundacion ? (
              <>
                <dt>Fundación</dt>
                <dd>{c.fundacion}</dd>
              </>
            ) : null}
          </dl>
          <div className="cf-admin-botones">
            <Boton variante="secundario" onClick={() => setEditando(true)}>
              Editar
            </Boton>
            <Boton variante="terciario" onClick={verHorarios}>
              Ver los horarios
            </Boton>
          </div>
          <h3 className="cf-admin-campo-titulo">Itinerario</h3>
          {c.itinerario ? <MiniMapa c={c} lugares={datos.lugares} /> : <p className="cf-admin-nota">Sin itinerario cargado.</p>}
        </>
      )}
    </aside>
  );
}

function EditarCofradia({ c, datos, cerrar, recargar }: { c: Cofradia; datos: Datos; cerrar: () => void; recargar: () => Promise<void> }) {
  const [f, setF] = useState({
    nombre: c.nombre,
    nombreOficial: c.nombreOficial,
    web: c.web ?? "",
    fundacion: c.fundacion ?? "",
    templo: c.templo,
    jornada: c.jornada,
    noProcesiona: c.estado === "no_procesiona",
    pasos: c.pasos.map((p) => p.nombre),
    tipos: c.pasos.map((p) => p.elemento_id),
  });
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const cambia = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const enviar = async () => {
    setGuardando(true);
    setFallo(null);
    try {
      const h = { nombre: f.nombre, nombre_oficial: f.nombreOficial, web: f.web, fundacion: f.fundacion, templo_id: f.templo };
      if (h.nombre !== c.nombre || h.nombre_oficial !== c.nombreOficial || h.web !== (c.web ?? "") || h.fundacion !== (c.fundacion ?? "") || h.templo_id !== c.templo)
        await guardar("hermandad", c.hermandadId, h);
      const estado = f.noProcesiona ? "no_procesiona" : null;
      if (f.jornada !== c.jornada || estado !== c.estado) await guardar("salida", c.salidaId, { jornada_id: f.jornada, estado });
      for (const [i, p] of c.pasos.entries())
        if (f.pasos[i] !== p.nombre || f.tipos[i] !== p.elemento_id) await guardar("paso", p.id, { nombre: f.pasos[i], elemento_id: f.tipos[i] ?? null });
      await recargar();
      cerrar();
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se ha podido guardar.");
      setGuardando(false);
    }
  };

  return (
    <form
      className="cf-admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
    >
      <Texto etiqueta="Nombre popular" valor={f.nombre} cambiar={(v) => cambia("nombre", v)} nota="Cambiarlo cambia también su enlace en la app." />
      <Texto etiqueta="Nombre completo" valor={f.nombreOficial} cambiar={(v) => cambia("nombreOficial", v)} largo />
      <Seleccion etiqueta="Templo" valor={f.templo} opciones={datos.templos} cambiar={(v) => cambia("templo", v)} />
      <Seleccion etiqueta="Jornada" valor={f.jornada} opciones={datos.jornadas} cambiar={(v) => cambia("jornada", v)} />
      <label className="cf-admin-marca">
        <input type="checkbox" checked={f.noProcesiona} onChange={(e) => cambia("noProcesiona", e.target.checked)} /> No procesiona este año (no es su día)
      </label>
      {c.pasos.map((p, i) => (
        <fieldset key={p.id} className="cf-admin-paso">
          <legend>Paso {p.orden}</legend>
          <Texto etiqueta="Titulares" valor={f.pasos[i] ?? ""} cambiar={(v) => cambia("pasos", f.pasos.map((x, k) => (k === i ? v : x)))} />
          <label className="cf-admin-campo">
            <span className="cf-admin-campo-titulo">Tipo</span>
            <select
              value={f.tipos[i] ?? ""}
              onChange={(e) => cambia("tipos", f.tipos.map((x, k) => (k === i ? (e.target.value ? Number(e.target.value) : null) : x)))}
            >
              <option value="">Sin indicar</option>
              {datos.elementos
                .filter((e) => e.clave !== "cruz_guia")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
            </select>
          </label>
        </fieldset>
      ))}
      <Texto etiqueta="Web" valor={f.web} cambiar={(v) => cambia("web", v)} opcional />
      <Texto etiqueta="Fundación" valor={f.fundacion} cambiar={(v) => cambia("fundacion", v)} opcional />
      {fallo ? (
        <p className="cf-admin-aviso" role="alert">
          {fallo}
        </p>
      ) : null}
      <div className="cf-admin-botones">
        <Boton variante="secundario" onClick={cerrar} disabled={guardando}>
          Cancelar
        </Boton>
        <Boton variante="primario" type="submit" cargando={guardando}>
          Guardar
        </Boton>
      </div>
    </form>
  );
}

function Texto({
  etiqueta,
  valor,
  cambiar,
  nota,
  largo,
  opcional,
}: {
  etiqueta: string;
  valor: string;
  cambiar: (v: string) => void;
  nota?: string;
  largo?: boolean;
  opcional?: boolean;
}) {
  return (
    <label className="cf-admin-campo">
      <span className="cf-admin-campo-titulo">{etiqueta}</span>
      {largo ? (
        <textarea value={valor} onChange={(e) => cambiar(e.target.value)} rows={3} required={!opcional} />
      ) : (
        <input value={valor} onChange={(e) => cambiar(e.target.value)} required={!opcional} />
      )}
      {nota ? <span className="cf-admin-quien">{nota}</span> : null}
    </label>
  );
}

function Seleccion({
  etiqueta,
  valor,
  opciones,
  cambiar,
}: {
  etiqueta: ReactNode;
  valor: number;
  opciones: { id: number; nombre: string }[];
  cambiar: (v: number) => void;
}) {
  return (
    <label className="cf-admin-campo">
      <span className="cf-admin-campo-titulo">{etiqueta}</span>
      <select value={valor} onChange={(e) => cambiar(Number(e.target.value))}>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}

/** El itinerario sobre un mapa pequeño, con los lugares de paso de la cruz de guía (admin-3). */
function MiniMapa({ c, lugares }: { c: Cofradia; lugares: Lugar[] }) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!caja.current) return;
    const m = new maplibregl.Map({
      container: caja.current,
      style: estiloCofradar(),
      center: [-5.9945, 37.3891],
      zoom: 13,
      attributionControl: false,
      interactive: true,
      dragRotate: false,
    });
    m.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: "" }), "bottom-right");
    const marcas: maplibregl.Marker[] = [];
    let vivo = true;
    void (async () => {
      const r = await fetch(`/api/cofradias/${c.id}/recorrido`).catch(() => null);
      if (!r?.ok || !vivo) return;
      const geojson = (await r.json()) as GeoJSON.FeatureCollection<GeoJSON.LineString>;
      const linea = geojson.features[0]?.geometry.coordinates ?? [];
      const pintar = () => {
        m.addSource("itinerario", { type: "geojson", data: geojson });
        m.addLayer({ id: "itinerario", type: "line", source: "itinerario", paint: { "line-color": "#1D1A16", "line-width": 3 } });
        const porId = new Map(lugares.map((l) => [l.id, l]));
        const cruz = c.horarios.filter((h) => h.referencia === "cruz_guia");
        const vistos = new Set<number>();
        cruz.forEach((h, i) => {
          const l = porId.get(h.lugar);
          if (!l || l.latitud === null || l.longitud === null || vistos.has(l.id)) return;
          vistos.add(l.id);
          const el = document.createElement("div");
          el.className = "cf-mapa-hito";
          el.innerHTML = `<span class="pt"></span>`;
          // Rótulo solo en la salida y en la carrera oficial y la entrada, para que se lea
          if (i === 0 || i === cruz.length - 1 || /campana|catedral/i.test(l.nombre)) {
            const tx = document.createElement("span");
            tx.className = "tx";
            tx.textContent = `${l.nombre} · ${hhmm(h.hora)}`;
            el.append(tx);
          }
          marcas.push(new maplibregl.Marker({ element: el, anchor: "left", offset: [-6, 0] }).setLngLat([l.longitud, l.latitud]).addTo(m));
        });
        if (linea.length) {
          const b = linea.reduce((acc, p) => acc.extend(p as [number, number]), new maplibregl.LngLatBounds(linea[0] as [number, number], linea[0] as [number, number]));
          m.fitBounds(b, { padding: 32, duration: 0 });
        }
      };
      if (m.isStyleLoaded()) pintar();
      else m.once("load", pintar);
    })();
    return () => {
      vivo = false;
      marcas.forEach((x) => x.remove());
      m.remove();
    };
  }, [c, lugares]);
  return <div ref={caja} className="cf-admin-minimapa" role="img" aria-label={`Itinerario de ${c.nombre}`} />;
}

// ── Jornadas ──────────────────────────────────────────────────────────────────────────────────────

function Jornadas({ datos, recargar }: { datos: Datos; recargar: () => Promise<void> }) {
  return (
    <section className="cf-admin-caja" aria-label="Jornadas">
      <div className="cf-admin-desliza">
        <table>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Nombre</th>
              <th>Cofradías</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {datos.jornadas.map((j) => (
              <FilaJornada key={`${j.id}-${j.nombre}`} j={j} n={datos.cofradias.filter((c) => c.jornada === j.id).length} recargar={recargar} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FilaJornada({ j, n, recargar }: { j: Datos["jornadas"][number]; n: number; recargar: () => Promise<void> }) {
  const [nombre, setNombre] = useState(j.nombre);
  const [estado, setEstado] = useState<"" | "guardando" | string>("");
  return (
    <tr>
      <td className="cf-num">{j.orden}</td>
      <td>
        <input aria-label={`Nombre de la jornada ${j.orden}`} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </td>
      <td className="cf-num">{n}</td>
      <td>
        {nombre.trim() !== j.nombre ? (
          <Boton
            variante="secundario"
            tamano="36"
            cargando={estado === "guardando"}
            onClick={async () => {
              setEstado("guardando");
              try {
                await guardar("jornada", j.id, { nombre });
                await recargar();
              } catch (e) {
                setEstado(e instanceof Error ? e.message : "No se ha podido guardar");
              }
            }}
          >
            Guardar
          </Boton>
        ) : null}
        {estado && estado !== "guardando" ? <span className="cf-admin-error">{estado}</span> : null}
      </td>
    </tr>
  );
}

// ── Horarios ──────────────────────────────────────────────────────────────────────────────────────

function Horarios({ datos, elegida, elegir, recargar }: { datos: Datos; elegida: string | null; elegir: (id: string) => void; recargar: () => Promise<void> }) {
  const c = datos.cofradias.find((x) => x.id === elegida) ?? datos.cofradias[0]!;
  return (
    <section className="cf-admin-caja" aria-label="Horarios">
      <label className="cf-admin-elegir">
        <span>Cofradía</span>
        <select value={c.id} onChange={(e) => elegir(e.target.value)}>
          {datos.cofradias.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nombre}
            </option>
          ))}
        </select>
      </label>
      <p className="cf-admin-nota">
        Los puntos del programa por los que pasa la cruz de guía y el último paso. «Publicada» es una hora del programa oficial; si no,
        es una hora calculada por Cofradar.
      </p>
      {(["cruz_guia", "ultimo_paso"] as const).map((ref) => {
        const filas = c.horarios.filter((h) => h.referencia === ref);
        return (
          <div key={ref}>
            <h3 className="cf-admin-campo-titulo">{ref === "cruz_guia" ? "Cruz de guía" : "Último paso"}</h3>
            {filas.length ? (
              <div className="cf-admin-desliza">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Lugar</th>
                      <th>Fecha y hora</th>
                      <th>Publicada</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((h) => (
                      <FilaHorario key={`${c.id}-${h.id}-${h.hora}-${h.lugar}-${h.publicada}`} h={h} lugares={datos.lugares} recargar={recargar} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="cf-admin-nota">Sin horarios.</p>
            )}
          </div>
        );
      })}
    </section>
  );
}

function FilaHorario({ h, lugares, recargar }: { h: Horario; lugares: Lugar[]; recargar: () => Promise<void> }) {
  const [f, setF] = useState({ lugar: h.lugar, hora: h.hora, publicada: h.publicada });
  const [estado, setEstado] = useState<"" | "guardando" | string>("");
  const cambiado = f.lugar !== h.lugar || f.hora !== h.hora || f.publicada !== h.publicada;
  return (
    <tr>
      <td className="cf-num">{h.orden}</td>
      <td>
        <select aria-label="Lugar" value={f.lugar} onChange={(e) => setF({ ...f, lugar: Number(e.target.value) })}>
          {lugares.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input aria-label="Fecha y hora" type="datetime-local" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} required />
      </td>
      <td>
        <input aria-label="Hora publicada" type="checkbox" checked={f.publicada} onChange={(e) => setF({ ...f, publicada: e.target.checked })} />
      </td>
      <td>
        {cambiado ? (
          <Boton
            variante="secundario"
            tamano="36"
            cargando={estado === "guardando"}
            onClick={async () => {
              setEstado("guardando");
              try {
                await guardar("horario", h.id, { punto_geografico_id: f.lugar, fecha_hora: f.hora, hora_publicada: f.publicada });
                await recargar();
              } catch (e) {
                setEstado(e instanceof Error ? e.message : "No se ha podido guardar");
              }
            }}
          >
            Guardar
          </Boton>
        ) : null}
        {estado && estado !== "guardando" ? <span className="cf-admin-error">{estado}</span> : null}
      </td>
    </tr>
  );
}

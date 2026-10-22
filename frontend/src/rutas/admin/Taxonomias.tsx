import { useState, type ReactNode } from "react";
import { Boton } from "../../marco";
import { guardar, useDatosBase, type Datos, type Elemento, type Hito } from "./DatosBase";

/**
 * P-30 · Taxonomías (9-admin/admin-4, 5.4). Lo que antes estaba escrito en el código, configurable:
 *
 * - Elementos rastreables: los tipos de elemento del cortejo, en orden, con su nombre cofrade y en llano
 *   («Palio · El paso de la Virgen»). «Dar fe» los usa para preguntar qué tienes delante, y cada paso
 *   dice de qué tipo es en Datos base.
 * - Hitos de la ciudad: los lugares que importan, en orden, y cuáles son carrera oficial. El recorrido
 *   marca con ellos la carrera, la Agenda da la hora del primero (La Campana) y el mapa, el final.
 * - Templos: para corregir su nombre.
 *
 * Como el resto de los datos base (5.3), manda Supabase: se exportan a docs/datos/elemento.csv y hito.csv.
 * Para reordenar, flechas en vez de arrastrar: funcionan igual con teclado y en el móvil.
 */
export function Taxonomias() {
  const { datos, error, cargar } = useDatosBase();
  return (
    <>
      <header className="cf-admin-cab">
        <h1>Taxonomías</h1>
      </header>
      <div className="cf-admin-cuerpo">
        {!datos ? (
          <p className={error ? "cf-admin-aviso" : "cf-admin-nota"}>
            {error ? "No se han podido cargar los datos. Inténtalo de nuevo en un momento." : "Cargando…"}
          </p>
        ) : (
          <div className="cf-admin-taxonomias">
            <Elementos datos={datos} recargar={cargar} />
            <HitosYTemplos datos={datos} recargar={cargar} />
          </div>
        )}
      </div>
    </>
  );
}

/** Hace la acción y recarga; si falla, enseña por qué. */
function useAccion(recargar: () => Promise<void>) {
  const [fallo, setFallo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const hacer = async (f: () => Promise<unknown>) => {
    setOcupado(true);
    setFallo(null);
    try {
      await f();
      await recargar();
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se ha podido guardar.");
    } finally {
      setOcupado(false);
    }
  };
  return { fallo, ocupado, hacer };
}

function Fallo({ texto }: { texto: string | null }) {
  return texto ? (
    <p className="cf-admin-aviso" role="alert">
      {texto}
    </p>
  ) : null;
}

/** Cambia el orden de dos filas vecinas. */
function intercambiar(que: string, a: { id: number; orden: number }, b: { id: number; orden: number }) {
  return Promise.all([guardar(que, a.id, { orden: b.orden }), guardar(que, b.id, { orden: a.orden })]);
}

function Flechas({ lista, i, que, hacer, nombre }: { lista: { id: number; orden: number }[]; i: number; que: string; hacer: (f: () => Promise<unknown>) => void; nombre: string }) {
  return (
    <span className="cf-admin-flechas">
      <button type="button" aria-label={`Subir ${nombre}`} disabled={i === 0} onClick={() => hacer(() => intercambiar(que, lista[i]!, lista[i - 1]!))}>
        ↑
      </button>
      <button
        type="button"
        aria-label={`Bajar ${nombre}`}
        disabled={i === lista.length - 1}
        onClick={() => hacer(() => intercambiar(que, lista[i]!, lista[i + 1]!))}
      >
        ↓
      </button>
    </span>
  );
}

// ── Elementos rastreables ─────────────────────────────────────────────────────────────────────────

function Elementos({ datos, recargar }: { datos: Datos; recargar: () => Promise<void> }) {
  const { fallo, ocupado, hacer } = useAccion(recargar);
  const [editando, setEditando] = useState<number | "nuevo" | null>(null);
  const lista = datos.elementos;
  const usados = (e: Elemento) => datos.cofradias.reduce((n, c) => n + c.pasos.filter((p) => p.elemento_id === e.id).length, 0);
  return (
    <section className="cf-admin-caja" aria-labelledby="admin-elementos">
      <div className="cf-admin-caja-cab">
        <h2 id="admin-elementos">Elementos rastreables</h2>
        <Boton variante="secundario" onClick={() => setEditando("nuevo")} disabled={editando !== null}>
          Añadir
        </Boton>
      </div>
      <p className="cf-admin-nota">En orden de cortejo. Con las flechas se reordenan.</p>
      <Fallo texto={fallo} />
      <ol className="cf-admin-taxo">
        {lista.map((e, i) =>
          editando === e.id ? (
            <li key={e.id}>
              <FormElemento
                inicial={e}
                cancelar={() => setEditando(null)}
                guardar={(v) => hacer(async () => (await guardar("elemento", e.id, v), setEditando(null)))}
                ocupado={ocupado}
              />
            </li>
          ) : (
            <li key={e.id}>
              <Flechas lista={lista} i={i} que="elemento" hacer={(f) => void hacer(f)} nombre={e.nombre} />
              <span className="cf-admin-taxo-n cf-num">{i + 1}</span>
              <div className="cf-admin-taxo-texto">
                <p>
                  <strong>{e.nombre}</strong>
                </p>
                <p className="cf-admin-quien">
                  {e.llano}
                  {e.clave === "cruz_guia" ? " · la cruz de cada cofradía" : ` · ${usados(e)} pasos`}
                </p>
              </div>
              <span className="cf-admin-botones">
                <Boton variante="terciario" tamano="36" onClick={() => setEditando(e.id)}>
                  Editar
                </Boton>
                {e.clave === null ? (
                  <Boton variante="terciario" tamano="36" disabled={ocupado} onClick={() => void hacer(() => guardar("elemento", e.id, null, "DELETE"))}>
                    Quitar
                  </Boton>
                ) : null}
              </span>
            </li>
          ),
        )}
        {editando === "nuevo" ? (
          <li>
            <FormElemento
              inicial={{ nombre: "", llano: "" }}
              cancelar={() => setEditando(null)}
              guardar={(v) => hacer(async () => (await guardar("elemento", null, v, "POST"), setEditando(null)))}
              ocupado={ocupado}
            />
          </li>
        ) : null}
      </ol>
    </section>
  );
}

function FormElemento({
  inicial,
  guardar: enviar,
  cancelar,
  ocupado,
}: {
  inicial: { nombre: string; llano: string };
  guardar: (v: { nombre: string; llano: string }) => void;
  cancelar: () => void;
  ocupado: boolean;
}) {
  const [v, setV] = useState({ nombre: inicial.nombre, llano: inicial.llano });
  return (
    <form
      className="cf-admin-form cf-admin-taxo-form"
      onSubmit={(e) => {
        e.preventDefault();
        enviar(v);
      }}
    >
      <Campo etiqueta="Nombre cofrade" nota="Palio">
        <input value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} required autoFocus />
      </Campo>
      <Campo etiqueta="En llano" nota="El paso de la Virgen">
        <input value={v.llano} onChange={(e) => setV({ ...v, llano: e.target.value })} required />
      </Campo>
      <div className="cf-admin-botones">
        <Boton variante="secundario" onClick={cancelar} disabled={ocupado}>
          Cancelar
        </Boton>
        <Boton variante="primario" type="submit" cargando={ocupado}>
          Guardar
        </Boton>
      </div>
    </form>
  );
}

function Campo({ etiqueta, nota, children }: { etiqueta: string; nota?: string; children: ReactNode }) {
  return (
    <label className="cf-admin-campo">
      <span className="cf-admin-campo-titulo">
        {etiqueta}
        {nota ? <span className="cf-admin-obligatorio"> · por ejemplo, «{nota}»</span> : null}
      </span>
      {children}
    </label>
  );
}

// ── Hitos y templos ───────────────────────────────────────────────────────────────────────────────

function HitosYTemplos({ datos, recargar }: { datos: Datos; recargar: () => Promise<void> }) {
  const { fallo, ocupado, hacer } = useAccion(recargar);
  const [anadiendo, setAnadiendo] = useState(false);
  const nombre = new Map(datos.lugares.map((l) => [l.id, l.nombre]));
  const lista = datos.hitos;
  return (
    <section className="cf-admin-caja" aria-labelledby="admin-hitos">
      <div className="cf-admin-caja-cab">
        <h2 id="admin-hitos">Hitos y templos de Sevilla</h2>
        <Boton variante="secundario" onClick={() => setAnadiendo(true)} disabled={anadiendo}>
          Añadir hito
        </Boton>
      </div>
      <Fallo texto={fallo} />
      <div className="cf-admin-dos">
        <div>
          <h3 className="cf-admin-campo-titulo">Hitos</h3>
          <p className="cf-admin-nota">La carrera oficial marca el recorrido; su primer hito da la hora de la Agenda.</p>
          {anadiendo ? (
            <NuevoHito
              datos={datos}
              cancelar={() => setAnadiendo(false)}
              ocupado={ocupado}
              guardar={(v) => void hacer(async () => (await guardar("hito", null, v, "POST"), setAnadiendo(false)))}
            />
          ) : null}
          <ol className="cf-admin-taxo">
            {lista.map((h: Hito, i) => (
              <li key={h.id}>
                <Flechas lista={lista} i={i} que="hito" hacer={(f) => void hacer(f)} nombre={nombre.get(h.lugar) ?? ""} />
                <div className="cf-admin-taxo-texto">
                  <p>{nombre.get(h.lugar)}</p>
                  <label className="cf-admin-marca cf-admin-quien">
                    <input
                      type="checkbox"
                      checked={h.carreraOficial}
                      disabled={ocupado}
                      onChange={(e) => void hacer(() => guardar("hito", h.id, { carrera_oficial: e.target.checked }))}
                    />{" "}
                    Carrera oficial
                  </label>
                </div>
                <Boton variante="terciario" tamano="36" disabled={ocupado} onClick={() => void hacer(() => guardar("hito", h.id, null, "DELETE"))}>
                  Quitar
                </Boton>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="cf-admin-campo-titulo">Templos</h3>
          <p className="cf-admin-nota">Para corregir su nombre. Cada cofradía elige el suyo en Datos base.</p>
          <ul className="cf-admin-taxo">
            {datos.templos.map((t) => (
              <Templo key={`${t.id}-${t.nombre}`} t={t} hacer={hacer} ocupado={ocupado} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function NuevoHito({
  datos,
  guardar: enviar,
  cancelar,
  ocupado,
}: {
  datos: Datos;
  guardar: (v: { punto_geografico_id: number; carrera_oficial: boolean }) => void;
  cancelar: () => void;
  ocupado: boolean;
}) {
  const ya = new Set(datos.hitos.map((h) => h.lugar));
  const libres = datos.lugares.filter((l) => !ya.has(l.id) && l.tipo !== "templo");
  const [lugar, setLugar] = useState<number>(libres[0]?.id ?? 0);
  const [carrera, setCarrera] = useState(false);
  return (
    <form
      className="cf-admin-form cf-admin-taxo-form"
      onSubmit={(e) => {
        e.preventDefault();
        enviar({ punto_geografico_id: lugar, carrera_oficial: carrera });
      }}
    >
      <Campo etiqueta="Lugar">
        <select value={lugar} onChange={(e) => setLugar(Number(e.target.value))} autoFocus>
          {libres.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </select>
      </Campo>
      <label className="cf-admin-marca">
        <input type="checkbox" checked={carrera} onChange={(e) => setCarrera(e.target.checked)} /> Es carrera oficial
      </label>
      <div className="cf-admin-botones">
        <Boton variante="secundario" onClick={cancelar} disabled={ocupado}>
          Cancelar
        </Boton>
        <Boton variante="primario" type="submit" cargando={ocupado}>
          Añadir
        </Boton>
      </div>
    </form>
  );
}

function Templo({ t, hacer, ocupado }: { t: { id: number; nombre: string }; hacer: (f: () => Promise<unknown>) => Promise<void>; ocupado: boolean }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(t.nombre);
  return (
    <li>
      {editando ? (
        <form
          className="cf-admin-taxo-linea"
          onSubmit={(e) => {
            e.preventDefault();
            void hacer(async () => (await guardar("templo", t.id, { nombre }), setEditando(false)));
          }}
        >
          <input aria-label="Nombre del templo" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
          <Boton variante="primario" tamano="36" type="submit" cargando={ocupado}>
            Guardar
          </Boton>
          <Boton variante="terciario" tamano="36" onClick={() => (setNombre(t.nombre), setEditando(false))}>
            Cancelar
          </Boton>
        </form>
      ) : (
        <>
          <p className="cf-admin-taxo-texto">{t.nombre}</p>
          <Boton variante="terciario" tamano="36" onClick={() => setEditando(true)}>
            Editar
          </Boton>
        </>
      )}
    </li>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Alteraciones, ChipEstado, MarcaRelacion, usePedirUbicacion } from "../componentes";
import { Boton, Icono } from "../marco";
import { leer, guardar } from "../datos/almacen";
import { alCambiarCola, enviar, nuevoClienteId, pendientes, vaciarCola, type Envio } from "../datos/darFe";
import { useEstadoJornada, useMapaJornada } from "../datos/estadoJornada";
import { useJornada } from "../datos/jornada";
import type { CofradiaMapa, EstadoCofradia } from "../datos/mapa";
import { useRelaciones } from "../datos/relaciones";
import { ahora as relojAhora } from "../datos/reloj";
import { useSesion } from "../datos/sesion";
import { estiloCofradar } from "../mapa/estilo";
import "../mapa/worker";

/**
 * «Dar fe», de principio a fin (P-14 a P-18; 6-dar-fe/ y BUL-195).
 *
 * Un solo flujo en una hoja alta sobre la pantalla en la que se está, de pie, entre gente y con una
 * mano: una pregunta por paso, opciones grandes abajo, «Atrás» y «Cancelar» siempre a la vista.
 *
 *   P-14 Guía        solo la primera vez (se recuerda en el teléfono)
 *   P-15 ¿Qué cofradía?   las que están en la calle, por cercanía si hay ubicación y por hora si no.
 *                    Cofradar propone, la persona decide: nada va marcado (F-24)
 *   P-16 ¿Qué tienes delante?   la cruz de guía y los pasos de ESA cofradía, en el orden del cortejo,
 *                    y siempre «Estoy viendo la cofradía», igual de cómoda (F-22). Nada marcado
 *   P-17 ¿Das fe de esto?   cofradía, elemento, hora y ubicación (o «Sin ubicación»: nunca bloquea).
 *                    Sin conexión, se guarda y sale sola (F-26). Sin cuenta, la pide AQUÍ, y al
 *                    volver de Google sigue en este paso con todo igual (F-23)
 *   P-18 Hecho       panel compacto que no tapa la calle, con los puntos base; se va solo
 *
 * Desde una cofradía concreta (su ficha, el mapa) se empieza en P-16.
 */
type Paso = "guia" | "cofradia" | "elemento" | "confirmar";
type Borrador = { cofradia?: string; elemento?: number | null; observada?: string; desdeCofradia: boolean };
type Hecho = { envio: Envio; puntos: number | null };
type Posicion = { latitud: number; longitud: number; precision: number };

type ContextoDarFe = {
  /** Abre el flujo; con `cofradia`, directamente en «¿Qué tienes delante?». */
  abrir: (cofradia?: string) => void;
  /** Cuántas esperan conexión en el teléfono. */
  pendientes: number;
};

const Contexto = createContext<ContextoDarFe | null>(null);
const GUIA_VISTA = "dar-fe:guia-vista";
const BORRADOR = "cofradar:dar-fe-borrador";
const MOTIVO = "dar-fe";

export function useDarFe(): ContextoDarFe {
  const v = useContext(Contexto);
  if (!v) throw new Error("useDarFe fuera de DarFeProvider");
  return v;
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

/** «Cruz de guía», «Primer paso», «La cofradía». */
function etiquetaElemento(c: CofradiaMapa, elemento: number | null): string {
  if (elemento === null) return "La cofradía";
  if (elemento === 0) return "Cruz de guía";
  return c.nombresPasos[elemento - 1] ?? `Paso ${elemento}`;
}

const ORDINAL = ["primer", "segundo", "tercer"];

/** Las opciones de P-16: en llano y, debajo, el término cofrade. */
function opcionesDe(c: CofradiaMapa): { elemento: number | null; llano: string; cofrade: string }[] {
  const pasos = c.nombresPasos.length ? c.nombresPasos : ["Paso"];
  return [
    { elemento: 0, llano: "La cruz que abre el cortejo", cofrade: "Cruz de guía" },
    ...pasos.map((nombre, i) => {
      // Hasta que los datos digan cuál es el del Cristo y cuál el palio, por su orden
      const llano = pasos.length === 1 ? "El paso" : `El ${ORDINAL[i] ?? `${i + 1}.º`} paso`;
      const generico = /^(paso|primer paso|segundo paso|tercer paso)$/i.test(nombre);
      return { elemento: i + 1, llano, cofrade: generico ? (pasos.length === 1 ? "Paso" : `Paso ${i + 1} de ${pasos.length}`) : nombre };
    }),
    { elemento: null, llano: "Estoy viendo la cofradía", cofrade: "Sin precisar" },
  ];
}

// ── Distancias ──────────────────────────────────────────────────────────────────────────────────────
const M_LON = 111_320 * Math.cos((37.39 * Math.PI) / 180);
const M_LAT = 110_540;
function distancia(p: Posicion, c: CofradiaMapa, e: EstadoCofradia): number | null {
  const puntos = e.elementos.length ? e.elementos.map((x) => x.punto) : c.linea.length ? [c.linea[0]!] : [];
  if (!puntos.length) return null;
  return Math.min(...puntos.map(([lon, lat]) => Math.hypot((lon - p.longitud) * M_LON, (lat - p.latitud) * M_LAT)));
}

/** «a unos 300 m», «a 1,2 km». Siempre aproximada. */
function enLlano(m: number): string {
  if (m < 1000) return `a unos ${Math.max(50, Math.round(m / 50) * 50)} m`;
  return `a ${(Math.round(m / 100) / 10).toLocaleString("es-ES")} km`;
}

const EN_LA_CALLE = ["en_calle", "proxima_entrada"];

// ── El proveedor ────────────────────────────────────────────────────────────────────────────────────
export function DarFeProvider({ children }: { children: ReactNode }) {
  const sesion = useSesion();
  const [paso, setPaso] = useState<Paso | null>(null);
  const [borrador, setBorrador] = useState<Borrador>({ desdeCofradia: false });
  const [hecho, setHecho] = useState<Hecho | null>(null);
  const [enCola, setEnCola] = useState(() => pendientes().length);

  // La cola de «pendiente de enviar»: sale sola al volver la red, al entrar y cada minuto
  useEffect(() => alCambiarCola(() => setEnCola(pendientes().length)), []);
  useEffect(() => {
    const intentar = () => void vaciarCola();
    intentar();
    window.addEventListener("online", intentar);
    const id = window.setInterval(intentar, 60_000);
    return () => {
      window.removeEventListener("online", intentar);
      window.clearInterval(id);
    };
  }, [sesion.usuario?.id]);

  // Vuelta de Google con un «Dar fe» a medias: se sigue en «¿Das fe de esto?» con todo igual
  const { entrada, olvidarEntrada } = sesion;
  useEffect(() => {
    if (entrada?.motivo !== MOTIVO || sesion.usuario === undefined) return;
    olvidarEntrada();
    try {
      const guardado = JSON.parse(sessionStorage.getItem(BORRADOR) ?? "null") as Borrador | null;
      sessionStorage.removeItem(BORRADOR);
      if (guardado?.cofradia) {
        setBorrador(guardado);
        setPaso("confirmar");
      }
    } catch {
      /* sin sessionStorage no hay nada que retomar */
    }
  }, [entrada, sesion.usuario, olvidarEntrada]);

  const abrir = useCallback((cofradia?: string) => {
    setHecho(null);
    setBorrador({ cofradia, desdeCofradia: !!cofradia });
    setPaso(leer<boolean>(GUIA_VISTA) ? (cofradia ? "elemento" : "cofradia") : "guia");
  }, []);

  const valor = useMemo(() => ({ abrir, pendientes: enCola }), [abrir, enCola]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      {paso ? (
        <Flujo
          paso={paso}
          borrador={borrador}
          irA={setPaso}
          cambiar={(b) => setBorrador((x) => ({ ...x, ...b }))}
          cerrar={() => setPaso(null)}
          alTerminar={(h) => {
            setPaso(null);
            setHecho(h);
          }}
        />
      ) : null}
      {hecho ? <PanelHecho hecho={hecho} alCerrar={() => setHecho(null)} /> : null}
    </Contexto.Provider>
  );
}

// ── El flujo ────────────────────────────────────────────────────────────────────────────────────────
function Flujo({
  paso,
  borrador,
  irA,
  cambiar,
  cerrar,
  alTerminar,
}: {
  paso: Paso;
  borrador: Borrador;
  irA: (p: Paso) => void;
  cambiar: (b: Partial<Borrador>) => void;
  cerrar: () => void;
  alTerminar: (h: Hecho) => void;
}) {
  const { hoy, consultada } = useJornada();
  const jornada = hoy ?? consultada;
  const mapa = useMapaJornada(jornada?.id);
  const motor = useEstadoJornada(jornada?.id);
  const sesion = useSesion();
  const { ubicacion: permiso, solicitar, hoja } = usePedirUbicacion({ nota: "Tu posición solo se guarda con lo que das fe." });
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [conexion, setConexion] = useState(() => navigator.onLine);
  const caja = useRef<HTMLDivElement>(null);

  // Con permiso, la posición se toma al abrir: sirve para ordenar y para la aportación. Sin él, nada.
  const tomarPosicion = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setPosicion({ latitud: p.coords.latitude, longitud: p.coords.longitude, precision: Math.round(p.coords.accuracy) }),
      () => {},
      { maximumAge: 30_000, timeout: 15_000, enableHighAccuracy: true },
    );
  }, []);
  useEffect(() => {
    if (permiso.estado === "permitida") tomarPosicion();
  }, [permiso.estado, tomarPosicion]);

  useEffect(() => {
    const on = () => setConexion(true);
    const off = () => setConexion(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      document.removeEventListener("keydown", esc);
    };
  }, [cerrar]);

  // Cada paso empieza arriba y con el foco en su pregunta
  useEffect(() => {
    caja.current?.scrollTo?.({ top: 0 });
    caja.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [paso]);

  const porId = useMemo(() => new Map((mapa.datos ?? []).map((c) => [c.id, c])), [mapa.datos]);
  const c = borrador.cofradia ? porId.get(borrador.cofradia) : undefined;

  const atras = () => {
    if (paso === "confirmar") irA("elemento");
    else if (paso === "elemento" && !borrador.desdeCofradia) irA("cofradia");
    else cerrar();
  };

  const elegirElemento = (elemento: number | null) => {
    cambiar({ elemento, observada: relojAhora().toISOString() });
    irA("confirmar");
  };

  const darFe = async () => {
    if (!c || borrador.elemento === undefined) return;
    const observada = borrador.observada ?? relojAhora().toISOString();
    if (!sesion.usuario) {
      try {
        sessionStorage.setItem(BORRADOR, JSON.stringify({ ...borrador, observada }));
      } catch {
        /* sin sessionStorage, al volver empieza de nuevo */
      }
      void sesion.entrar(MOTIVO);
      return;
    }
    const envio: Envio = {
      clienteId: nuevoClienteId(),
      cofradia: c.id,
      nombre: c.nombre,
      elemento: borrador.elemento,
      etiqueta: etiquetaElemento(c, borrador.elemento),
      ubicacion: posicion,
      observada,
    };
    setEnviando(true);
    const r = await enviar(envio);
    setEnviando(false);
    if (r.tipo === "sin-cuenta") {
      try {
        sessionStorage.setItem(BORRADOR, JSON.stringify({ ...borrador, observada }));
      } catch {
        /* nada */
      }
      void sesion.entrar(MOTIVO);
      return;
    }
    alTerminar({ envio, puntos: r.tipo === "hecho" ? r.puntos : null });
  };

  let titulo = "";
  let cuerpo: ReactNode = null;
  if (paso === "guia") {
    titulo = "Dar fe";
    cuerpo = (
      <Guia
        alEntender={() => {
          guardar(GUIA_VISTA, true);
          irA(borrador.cofradia ? "elemento" : "cofradia");
        }}
      />
    );
  } else if (paso === "cofradia") {
    titulo = "¿Qué cofradía estás viendo?";
    cuerpo = (
      <QueCofradia
        cofradias={mapa.datos ?? []}
        estados={motor.datos?.cofradias ?? null}
        posicion={posicion}
        alElegir={(id) => {
          cambiar({ cofradia: id });
          irA("elemento");
        }}
      />
    );
  } else if (paso === "elemento" && c) {
    titulo = "¿Qué tienes delante?";
    cuerpo = <QueTienesDelante c={c} alElegir={elegirElemento} />;
  } else if (paso === "confirmar" && c && borrador.elemento !== undefined) {
    titulo = "¿Das fe de esto?";
    const etiqueta = etiquetaElemento(c, borrador.elemento);
    const horaVista = hora(borrador.observada ?? relojAhora().toISOString());
    const puedePedir = permiso.estado === "no-permitida" && !permiso.rechazada;
    cuerpo = (
      <>
        <div className="cf-darfe-resumen">
          <p className="cf-darfe-resumen-que">
            <span className="cf-name">{c.nombre}</span> · {etiqueta} · <span className="cf-num">{horaVista}</span>
          </p>
          {posicion ? (
            <>
              <MiniMapa posicion={posicion} />
              <p className="cf-darfe-nota">Tu posición ahora, con unos {Math.max(5, Math.round(posicion.precision / 5) * 5)} m de margen.</p>
            </>
          ) : (
            <div className="cf-darfe-sin-ubicacion">
              <p>
                <Icono nombre="ubicacion" tamano={20} /> Sin ubicación
              </p>
              {puedePedir ? (
                <Boton variante="terciario" tamano="36" onClick={() => solicitar(tomarPosicion)}>
                  Usar mi ubicación
                </Boton>
              ) : null}
            </div>
          )}
          {!conexion ? (
            <p className="cf-darfe-nota">Se guardará en tu teléfono con la hora {horaVista} y se enviará sola cuando vuelva la conexión.</p>
          ) : null}
          {!sesion.usuario ? (
            <p className="cf-darfe-nota">Para dar fe, entra con tu cuenta de Google. Al volver, seguirás aquí con todo igual.</p>
          ) : null}
        </div>
        <Boton variante="primario" tamano="52" cargando={enviando} onClick={() => void darFe()}>
          {!sesion.usuario ? (
            <span>Entrar con Google y dar fe</span>
          ) : !conexion ? (
            <span>Guardar y enviar después</span>
          ) : (
            <>
              <Icono nombre="ojo" tamano={20} />
              <span>Dar fe</span>
            </>
          )}
        </Boton>
      </>
    );
  } else {
    // La cofradía aún no ha llegado (primera carga) o ya no está en los datos
    titulo = "Dar fe";
    cuerpo = <p className="cf-darfe-nota">{mapa.datos ? "No encontramos esa cofradía en la jornada de hoy." : "Cargando…"}</p>;
  }

  return createPortal(
    <>
      <button type="button" className="cf-hoja-decision-scrim cf-scrim" aria-label="Cancelar" tabIndex={-1} onClick={cerrar} />
      <div ref={caja} className="cf-hoja-decision cf-sheet cf-darfe" role="dialog" aria-modal="true" aria-label={titulo}>
        <span className="cf-handle" aria-hidden="true" />
        <div className="cf-darfe-barra">
          {paso === "guia" ? (
            <span />
          ) : (
            <Boton variante="terciario" tamano="44" onClick={atras}>
              <Icono nombre="flechaIzquierda" tamano={20} />
              <span>Atrás</span>
            </Boton>
          )}
          <Boton variante="terciario" tamano="44" onClick={cerrar}>
            Cancelar
          </Boton>
        </div>
        {paso === "elemento" && c ? <NombreConMarca c={c} /> : null}
        <h2 tabIndex={-1}>{titulo}</h2>
        <div className="cf-darfe-opciones">{cuerpo}</div>
      </div>
      {hoja}
    </>,
    document.body,
  );
}

function NombreConMarca({ c }: { c: CofradiaMapa }) {
  const { marca } = useRelaciones();
  const m = marca(c.id);
  return (
    <p className="cf-darfe-cofradia">
      {m ? <MarcaRelacion relacion={m} /> : null}
      <span className="cf-name">{c.nombre}</span>
    </p>
  );
}

// ── P-14 ────────────────────────────────────────────────────────────────────────────────────────────
function Guia({ alEntender }: { alEntender: () => void }) {
  return (
    <>
      <p className="cf-darfe-guia-lema">Es decir «estoy viendo esta cofradía ahora».</p>
      <ol className="cf-darfe-guia">
        <li>Elige la cofradía.</li>
        <li>Dinos qué parte ves, si lo sabes.</li>
        <li>Confirma.</li>
      </ol>
      <Boton variante="primario" tamano="52" onClick={alEntender}>
        Entendido
      </Boton>
    </>
  );
}

// ── P-15 ────────────────────────────────────────────────────────────────────────────────────────────
function QueCofradia({
  cofradias,
  estados,
  posicion,
  alElegir,
}: {
  cofradias: CofradiaMapa[];
  estados: EstadoCofradia[] | null;
  posicion: Posicion | null;
  alElegir: (id: string) => void;
}) {
  const [todas, setTodas] = useState(false);
  const { marca } = useRelaciones();
  if (!estados) return <p className="cf-darfe-nota">Cargando…</p>;

  const porId = new Map(cofradias.map((c) => [c.id, c]));
  const filas = estados.flatMap((e) => {
    const c = porId.get(e.id);
    if (!c) return [];
    const enCalle = EN_LA_CALLE.includes(e.fase.valor);
    const candidata = enCalle || e.fase.valor === "inminente";
    return [{ c, e, enCalle, candidata, d: posicion ? distancia(posicion, c, e) : null }];
  });
  const sale = (x: (typeof filas)[number]) => (x.e.sale ? Date.parse(x.e.sale) : Infinity);
  const ordenadas = todas
    ? [...filas].sort((a, b) => sale(a) - sale(b))
    : filas
        .filter((x) => x.candidata)
        .sort((a, b) =>
          posicion
            ? (a.d ?? Infinity) - (b.d ?? Infinity)
            : Number(b.enCalle) - Number(a.enCalle) || sale(a) - sale(b),
        );

  return (
    <>
      {!todas ? (
        <p className="cf-darfe-seccion">{posicion ? "Por cercanía" : "Sin ubicación: elige tú de la lista"}</p>
      ) : (
        <p className="cf-darfe-seccion">Todas las de hoy</p>
      )}
      {ordenadas.length ? (
        <ul className="cf-darfe-lista">
          {ordenadas.map(({ c, e, d }) => {
            const m = marca(c.id);
            return (
              <li key={c.id}>
                <button type="button" className="cf-darfe-opcion" onClick={() => alElegir(c.id)}>
                  <span className="cf-darfe-opcion-cab">
                    <span className="cf-darfe-marca">{m ? <MarcaRelacion relacion={m} /> : null}</span>
                    <span className="cf-name">{c.nombre}</span>
                    {d !== null && !todas ? <span className="cf-darfe-dist cf-num">{enLlano(d)}</span> : null}
                  </span>
                  <span className="cf-darfe-chips">
                    <ChipEstado
                      fase={e.fase.valor}
                      confianza={e.fase.confianza}
                      antiguedad={e.fase.haceMin !== null ? `hace ${e.fase.haceMin} min` : undefined}
                      tamano="24"
                    />
                    <Alteraciones alteraciones={e.alteraciones} densidad="compacta" />
                  </span>
                  <Icono nombre="chevronDerecha" tamano={20} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="cf-darfe-nota">Ahora mismo no hay ninguna cofradía en la calle.</p>
      )}
      {!todas ? (
        <button type="button" className="cf-darfe-todas" onClick={() => setTodas(true)}>
          Ver todas las de hoy
        </button>
      ) : null}
    </>
  );
}

// ── P-16 ────────────────────────────────────────────────────────────────────────────────────────────
function QueTienesDelante({ c, alElegir }: { c: CofradiaMapa; alElegir: (elemento: number | null) => void }) {
  return (
    <ul className="cf-darfe-lista">
      {opcionesDe(c).map((o) => (
        <li key={String(o.elemento)}>
          <button type="button" className="cf-darfe-opcion" onClick={() => alElegir(o.elemento)}>
            <span className="cf-darfe-opcion-texto">
              <span className="cf-darfe-llano">{o.llano}</span>
              <span className="cf-darfe-cofrade">{o.cofrade}</span>
            </span>
            <Icono nombre="chevronDerecha" tamano={20} />
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── P-17: el minimapa ───────────────────────────────────────────────────────────────────────────────
function MiniMapa({ posicion }: { posicion: Posicion }) {
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!caja.current) return;
    const centro: [number, number] = [posicion.longitud, posicion.latitud];
    const m = new maplibregl.Map({ container: caja.current, style: estiloCofradar(), center: centro, zoom: 16.5, interactive: false, attributionControl: false });
    m.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: "" }), "bottom-right");
    const el = document.createElement("div");
    el.className = "cf-mapa-yo";
    new maplibregl.Marker({ element: el }).setLngLat(centro).addTo(m);
    return () => m.remove();
  }, [posicion.longitud, posicion.latitud]);
  return <div ref={caja} className="cf-darfe-minimapa" role="img" aria-label="Tu posición en el mapa" />;
}

// ── P-18 ────────────────────────────────────────────────────────────────────────────────────────────
function PanelHecho({ hecho, alCerrar }: { hecho: Hecho; alCerrar: () => void }) {
  const { envio, puntos } = hecho;
  const pendiente = puntos === null;
  // Se va solo: no le quita la calle a nadie
  useEffect(() => {
    const id = window.setTimeout(alCerrar, pendiente ? 8000 : 6000);
    return () => window.clearTimeout(id);
  }, [alCerrar, pendiente]);

  return createPortal(
    <div className="cf-darfe-hecho cf-sheet" data-register="editorial" role="status">
      <Boton variante="terciario" tamano="44" aria-label="Cerrar" onClick={alCerrar}>
        <Icono nombre="cerrar" tamano={20} />
      </Boton>
      <span className="cf-darfe-sello" data-pendiente={pendiente ? "si" : "no"} aria-hidden="true">
        <Icono nombre={pendiente ? "desactualizado" : "darFeVerificada"} tamano={24} />
      </span>
      <div>
        <p className="cf-darfe-hecho-titulo">{pendiente ? "Guardado · pendiente de enviar" : "Has dado fe"}</p>
        <p className="cf-darfe-hecho-que">
          <span className="cf-name">{envio.nombre}</span> · {envio.etiqueta} · <span className="cf-num">{hora(envio.observada)}</span>
        </p>
        {pendiente ? (
          <p className="cf-darfe-hecho-nota">Se enviará sola cuando vuelva la conexión.</p>
        ) : puntos ? (
          <p className="cf-darfe-puntos cf-num">+{puntos} puntos</p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as Mapa_ } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { SinCartografia, usePedirUbicacion } from "../componentes";
import { BottomSheet, Cabecera, Icono, Marco, TRAZOS } from "../marco";
import { useJornada } from "../datos/jornada";
import { tramoCortejo, type CofradiaMapa, type ElementoEstado, type EstadoCofradia, type EstadoJornadaMotor } from "../datos/mapa";
import { desfaseReloj } from "../datos/reloj";
import { useRelaciones } from "../datos/relaciones";
import { useDato } from "../datos/useDato";
import type { EstadoJornada } from "../fixture";
import { estiloCofradar } from "../mapa/estilo";
import "../mapa/worker";
import { DarFe } from "./DarFe";
import { SelectorJornada } from "./SelectorJornada";

/**
 * P-07 Mapa general (3-mapa/mapa-1*), sobre OpenStreetMap con MapLibre (D36).
 *
 * Una marca por elemento del cortejo (cruz de guía y cada paso), donde la pone
 * el motor del servidor (4.1-4.3), que se pide cada 30 segundos. El borde dice
 * cuánto fiarse: continuo si la gente lo acaba de ver (confirmado), discontinuo
 * si sale del horario (estimado) o si el último dato tiene más de 10 minutos
 * (desactualizado, con «hace X min»). Entre la cabeza y la cola, el tramo del
 * recorrido que ocupa la cofradía. Las que salen en los próximos 30 minutos,
 * en su templo, en ámbar. El nombre va junto a la cruz, con tu marca si la
 * sigues o la has visto, y el retraso si lo hay.
 *
 *   Ubicación   «Centrar en mi ubicación» la pide en contexto (P-04) y, con
 *               permiso, centra el mapa en ti con un punto. Nunca al abrirlo.
 *   Sin mapa    si no cargan las teselas (sin conexión), las marcas siguen
 *               ahí sobre el fondo liso y se avisa (estado 7).
 *   Tocar       una marca abre la vista rápida de su cofradía (4.6 la amplía).
 */
const SEVILLA: [number, number] = [-5.9925, 37.3891];

export function Mapa({ estado }: { estado: EstadoJornada }) {
  const { hoy, consultada } = useJornada();
  const jornada = hoy ?? consultada;
  const datos = useDato<CofradiaMapa[]>(jornada ? `/jornadas/${jornada.id}/mapa` : "/jornadas/0/mapa", { cadaMs: 600_000 });
  const desfase = desfaseReloj();
  const motor = useDato<EstadoJornadaMotor>(`/jornadas/${jornada?.id ?? 0}/estado${desfase ? `?desfase=${desfase}` : ""}`, { cadaMs: 30_000 });
  const relaciones = useRelaciones();
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [sinTeselas, setSinTeselas] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<Mapa_ | null>(null);
  const marcas = useRef<maplibregl.Marker[]>([]);
  const yo = useRef<maplibregl.Marker | null>(null);
  const encuadrado = useRef(false);
  const tramos = useRef<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });
  const { ubicacion, solicitar, hoja } = usePedirUbicacion({
    nota: "Tu posición no sale de tu teléfono para dibujar el mapa.",
  });

  const situaciones = useMemo(() => {
    if (!datos.datos || !motor.datos) return [];
    const porId = new Map(datos.datos.map((c) => [c.id, c]));
    return motor.datos.cofradias
      .filter((s) => VISIBLES.includes(s.fase.valor))
      .flatMap((s) => {
        const c = porId.get(s.id);
        return c && c.linea.length > 1 ? [{ c, s }] : [];
      });
  }, [datos.datos, motor.datos]);

  // El mapa, una vez
  useEffect(() => {
    if (!caja.current) return;
    const m = new maplibregl.Map({
      container: caja.current,
      style: estiloCofradar(),
      center: SEVILLA,
      zoom: 14.5,
      minZoom: 11,
      maxZoom: 19,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: "" }), "bottom-left");
    m.on("error", (e) => {
      if (String(e.error?.message ?? "").match(/fetch|network|load/i)) setSinTeselas(true);
    });
    m.on("data", (e) => {
      if (e.dataType === "source" && m.isSourceLoaded("osm")) setSinTeselas(false);
    });
    mapa.current = m;

    // Los cortejos se ponen encima cada vez que se carga un estilo (el primero y los de cambio de tema)
    m.on("style.load", () => pintarCortejos(m, tramos.current));

    // Claro, oscuro y máximo contraste: se vuelve a pintar con los tokens del momento, solo si cambian
    let tema = `${document.documentElement.dataset.theme}|${document.documentElement.dataset.contrast}`;
    const repintar = () => {
      const ahora_ = `${document.documentElement.dataset.theme}|${document.documentElement.dataset.contrast}`;
      if (ahora_ === tema) return;
      tema = ahora_;
      m.setStyle(estiloCofradar(), { diff: false });
    };
    const observador = new MutationObserver(repintar);
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-contrast"] });
    return () => {
      observador.disconnect();
      m.remove();
      mapa.current = null;
    };
  }, []);

  // Las marcas y los tramos, cada vez que cambian los datos o pasa un minuto
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    tramos.current = {
      type: "FeatureCollection",
      features: situaciones.flatMap(({ c, s }) => {
        const tramo = tramoCortejo(c, s);
        const confirmado = s.elementos.some((e) => e.confianza === "confirmado");
        return tramo.length > 1
          ? [{ type: "Feature" as const, properties: { id: c.id, confirmado }, geometry: { type: "LineString" as const, coordinates: tramo } }]
          : [];
      }),
    };
    // Si el estilo aún está cargando (teselas, cambio de tema), en cuanto el mapa se quede quieto
    if (m.isStyleLoaded()) pintarCortejos(m, tramos.current);
    else m.once("idle", () => pintarCortejos(m, tramos.current));

    marcas.current.forEach((x) => x.remove());
    marcas.current = situaciones.flatMap(({ c, s }) => crearMarcas(c, s, relaciones.marca(c.id), () => setSeleccion(c.id)).map((el) => el.addTo(m)));

    // La primera vez con cofradías en la calle, se encuadran todas
    if (!encuadrado.current && situaciones.length) {
      encuadrado.current = true;
      const puntos = situaciones.flatMap(({ c, s }) => (s.fase.valor === "inminente" ? [c.linea[0]!] : s.elementos.map((e) => e.punto)));
      if (puntos.length) {
        const b = puntos.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(puntos[0]!, puntos[0]!));
        // Más margen a la derecha: ahí van los nombres
        m.fitBounds(b, { padding: { top: 72, bottom: 72, left: 48, right: 160 }, maxZoom: 16, duration: 0 });
      }
    }
  }, [situaciones, relaciones]);

  const centrar = () =>
    solicitar(() =>
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const m = mapa.current;
          if (!m) return;
          const lngLat: [number, number] = [p.coords.longitude, p.coords.latitude];
          yo.current?.remove();
          const el = document.createElement("div");
          el.className = "cf-mapa-yo";
          el.setAttribute("aria-label", "Tu posición");
          yo.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(m);
          m.flyTo({ center: lngLat, zoom: Math.max(m.getZoom(), 15.5) });
        },
        () => {},
        { maximumAge: 30_000, timeout: 15_000 },
      ),
    );

  const conCentrar = (ubicacion.estado === "no-permitida" && !ubicacion.rechazada) || ubicacion.estado === "permitida";
  const elegida = situaciones.find((x) => x.c.id === seleccion);

  return (
    <Marco
      sangrado="completo"
      cabecera={<Cabecera principal={<SelectorJornada />} />}
      accion={estado.activa ? <DarFe /> : undefined}
      sheet={
        <BottomSheet abierto={!!elegida} titulo={elegida?.c.nombre ?? ""} modo="convive" alturaInicial="asomado" alCerrar={() => setSeleccion(null)}>
          {elegida ? <VistaRapida c={elegida.c} s={elegida.s} /> : null}
        </BottomSheet>
      }
    >
      <div className="cf-mapa">
        <div ref={caja} className="cf-mapa-lienzo" role="region" aria-label="Mapa de las cofradías" />
        {sinTeselas ? (
          <div className="cf-mapa-aviso">
            <SinCartografia />
          </div>
        ) : null}
        {datos.datos && motor.datos && !situaciones.length ? (
          <p className="cf-mapa-vacio" role="status">
            Ahora no hay ninguna cofradía en la calle.
          </p>
        ) : null}
        {conCentrar ? (
          <button type="button" className="cf-locate" aria-label="Centrar en mi ubicación" onClick={centrar}>
            <Icono nombre="centrar" tamano={24} />
          </button>
        ) : null}
      </div>
      {hoja}
    </Marco>
  );
}

/** El tramo que ocupa cada cofradía, entre su cabeza y su cola: continuo si está confirmado, discontinuo si no. */
function pintarCortejos(m: Mapa_, datos: GeoJSON.FeatureCollection) {
  const fuente = m.getSource("cortejos") as GeoJSONSource | undefined;
  if (fuente) {
    fuente.setData(datos);
    return;
  }
  m.addSource("cortejos", { type: "geojson", data: datos });
  m.addLayer({ id: "cortejos-borde", type: "line", source: "cortejos", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": token("--cf-map-casing"), "line-width": 8 } });
  // El trazo discontinuo no puede depender de cada línea en MapLibre: van en dos capas
  m.addLayer({ id: "cortejos", type: "line", source: "cortejos", filter: ["!", ["get", "confirmado"]], paint: { "line-color": token("--cf-live"), "line-width": 4, "line-dasharray": [2, 1.2] } });
  m.addLayer({ id: "cortejos-confirmados", type: "line", source: "cortejos", filter: ["get", "confirmado"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": token("--cf-live"), "line-width": 4 } });
}

function token(nombre: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || "#2e7d4f";
}

/** Una marca (círculo con el icono) y, junto a la cruz, el nombre. Mismo marcado que el sistema (.cf-map .mk). */
function crearMarcas(c: CofradiaMapa, s: EstadoCofradia, relacion: string | undefined, alTocar: () => void): maplibregl.Marker[] {
  const res: maplibregl.Marker[] = [];
  const marca = (punto: [number, number], icono: string, fase: string, confianza: string, etiqueta: string) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "cf-mapa-marca cf-map";
    el.setAttribute("aria-label", etiqueta);
    el.innerHTML = `<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><g class="mk" data-fase="${fase}" data-confianza="${confianza}"><circle class="h" cx="20" cy="20" r="16"/><circle class="b" cx="20" cy="20" r="16"/><svg x="12" y="12" width="16" height="16" class="ico" viewBox="0 0 256 256" fill="currentColor"><path d="${icono}"/></svg></g></svg>`;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      alTocar();
    });
    res.push(new maplibregl.Marker({ element: el }).setLngLat(punto));
  };
  const nombre = (punto: [number, number], extra: string) => {
    const el = document.createElement("div");
    el.className = "cf-mapa-nombre";
    el.innerHTML = `${relacion ? `<span class="cf-mapa-rel" data-relacion="${relacion}"></span>` : ""}<span class="nm"></span>${extra ? `<span class="ex"></span>` : ""}`;
    el.querySelector(".nm")!.textContent = c.nombre;
    if (extra) el.querySelector(".ex")!.textContent = extra;
    el.addEventListener("click", alTocar);
    res.push(new maplibregl.Marker({ element: el, anchor: "left", offset: [24, 0] }).setLngLat(punto));
  };

  if (s.fase.valor === "inminente" && s.sale) {
    const sale = `sale a las ${hora(s.sale)}`;
    marca(c.linea[0]!, TRAZOS.cruzGuia, "inminente", s.fase.confianza, `${c.nombre}: ${sale}`);
    nombre(c.linea[0]!, sale);
  } else {
    for (const e of s.elementos) {
      const icono = e.tipo === "cruz" ? TRAZOS.cruzGuia : TRAZOS.misterio;
      marca(e.punto, icono, "en_calle", e.confianza, `${c.nombre}, ${e.nombre}, ${comoSeSabe(e)}`);
    }
    const cabeza = s.elementos[0];
    if (cabeza) nombre(cabeza.punto, alteracion(s));
  }
  return res;
}

/** Las fases que se ven en el mapa. */
const VISIBLES = ["inminente", "en_calle", "proxima_entrada"];

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

/** «visto hace 3 min», «según horario»: de dónde sale la posición de un elemento. */
function comoSeSabe(e: ElementoEstado): string {
  if (e.confianza === "confirmado") return e.haceMin ? `visto hace ${e.haceMin} min` : "visto ahora";
  if (e.confianza === "desactualizado") return `último dato hace ${e.haceMin} min`;
  return "según horario";
}

/** «20 min de retraso», o nada. */
function alteracion(s: EstadoCofradia): string {
  const a = s.alteraciones[0];
  return a ? `${a.minutos} min de ${a.tipo}` : "";
}

/** La fase en una frase, con su confianza (PRD, «Fase»). */
function estadoEnLlano(s: EstadoCofradia): string {
  const { valor, confianza, haceMin } = s.fase;
  const cola = confianza === "estimado" ? ", según el horario" : confianza === "desactualizado" ? ` (último dato hace ${haceMin} min)` : "";
  if (valor === "inminente") return `Sale a las ${s.sale ? hora(s.sale) : "—"}${cola}.`;
  if (valor === "proxima_entrada") return `De regreso, entra a las ${s.entra ? hora(s.entra) : "—"}${cola}.`;
  return `En la calle${cola}.`;
}

/** Vista rápida de una cofradía (la amplía 4.6): qué es lo que se ve y adónde ir. */
function VistaRapida({ c, s }: { c: CofradiaMapa; s: EstadoCofradia }) {
  const alt = alteracion(s);
  return (
    <div className="cf-mapa-rapida">
      <p className="cf-mapa-rapida-estado">
        {estadoEnLlano(s)}
        {alt ? ` Lleva ${alt}.` : ""}
      </p>
      {s.elementos.length ? (
        <ul>
          {s.elementos.map((e) => (
            <li key={`${e.tipo}-${e.orden}`}>
              <Icono nombre={e.tipo === "cruz" ? "cruzGuia" : "misterio"} tamano={20} />
              {e.nombre} · {comoSeSabe(e)}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="cf-mapa-rapida-enlaces">
        <Link className="cf-btn" data-variant="secundario" to={`/cofradias/${c.id}`}>
          Ver ficha
        </Link>
        <Link className="cf-btn" data-variant="secundario" to={`/cofradias/${c.id}/recorrido`}>
          Recorrido y horarios
        </Link>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as Mapa_ } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Alteraciones, ChipEstado, SinCartografia, usePedirUbicacion } from "../componentes";
import { BottomSheet, Boton, Cabecera, Icono, Marco, TRAZOS } from "../marco";
import { useJornada, type Jornada } from "../datos/jornada";
import { distancia, distanciaEnLlano, dondeVa, hitosDe, horaDelElemento, nombreElemento, partirRecorrido, siguienteLugar } from "../datos/enVivo";
import { usePosicion } from "../datos/ubicacion";
import { useEstadoJornada, useMapaJornada } from "../datos/estadoJornada";
import { tramoCortejo, type CofradiaMapa, type ElementoEstado, type EstadoCofradia } from "../datos/mapa";
import { useRelaciones } from "../datos/relaciones";
import type { EstadoJornada } from "../fixture";
import { estiloCofradar } from "../mapa/estilo";
import { agrupar, alBorde, rumbo } from "../mapa/agrupar";
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
 *   Tocar       una marca elige su cofradía (P-08, 4.5): se encuadra su recorrido
 *               entero, partido en hecho y pendiente, con su salida y su próximo
 *               lugar rotulados, y la hoja trae su estado, tres hitos con la
 *               hora prevista y la estimada, y cuánto lleva. 4.6 lo amplía.
 */
const SEVILLA: [number, number] = [-5.9925, 37.3891];

export function Mapa({ estado }: { estado: EstadoJornada }) {
  const { hoy, consultada } = useJornada();
  const jornada = hoy ?? consultada;
  const datos = useMapaJornada(jornada?.id);
  const motor = useEstadoJornada(jornada?.id);
  const relaciones = useRelaciones();
  // «Ver en el mapa» desde la ficha llega con ?cofradia=la-macarena: se abre con ella elegida y encuadrada
  const [params] = useSearchParams();
  const [seleccion, setSeleccion] = useState<string | null>(() => params.get("cofradia"));
  // El elemento tocado de la elegida (P-09, 4.6): 0 la cruz, 1..n los pasos; null, la cofradía entera
  const [elemento, setElemento] = useState<number | null>(null);
  // Un grupo de marcas que se pisaban, tocado: la hoja lista sus cofradías para elegir
  const [grupo, setGrupo] = useState<string[] | null>(null);
  // Las tuyas (seguidas, vistas) que no caben en pantalla, con su etiqueta en el borde
  const [fuera, setFuera] = useState<Fuera[]>([]);
  const elegir = (id: string | null, orden: number | null = null) => {
    setSeleccion(id);
    setElemento(orden);
    setGrupo(null);
  };
  const [sinTeselas, setSinTeselas] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<Mapa_ | null>(null);
  const marcas = useRef<maplibregl.Marker[]>([]);
  const yo = useRef<maplibregl.Marker | null>(null);
  const encuadrado = useRef(false);
  const tramos = useRef<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });
  // El recorrido entero de la elegida (4.5): lo hecho y lo que le queda
  const recorrido = useRef<GeoJSON.FeatureCollection>({ type: "FeatureCollection", features: [] });
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

    // Lo que se pisa y lo que no cabe depende de dónde se mira: se recalcula al terminar cada movimiento
    m.on("moveend", () => pintarMarcas.current());

    // Los cortejos se ponen encima cada vez que se carga un estilo (el primero y los de cambio de tema)
    m.on("style.load", () => pintarCortejos(m, tramos.current, recorrido.current));

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
    const elegida_ = situaciones.find(({ c }) => c.id === seleccion);
    const partes = elegida_ ? partirRecorrido({ estado: elegida_.s, mapa: elegida_.c }) : null;
    recorrido.current = {
      type: "FeatureCollection",
      features: partes
        ? (["hecho", "pendiente"] as const).flatMap((tipo) =>
            partes[tipo].length > 1 ? [{ type: "Feature" as const, properties: { tipo }, geometry: { type: "LineString" as const, coordinates: partes[tipo] } }] : [],
          )
        : [],
    };
    // Si el estilo aún está cargando (teselas, cambio de tema), en cuanto el mapa se quede quieto
    if (m.isStyleLoaded()) pintarCortejos(m, tramos.current, recorrido.current);
    else m.once("idle", () => pintarCortejos(m, tramos.current, recorrido.current));

    pintarMarcas.current();

    // La primera vez con cofradías en la calle, se encuadran todas
    if (!encuadrado.current && situaciones.length) {
      encuadrado.current = true;
      const pedida = situaciones.filter(({ c }) => c.id === seleccion);
      const puntos = (pedida.length ? pedida : situaciones).flatMap(({ c, s }) => (s.fase.valor === "inminente" ? [c.linea[0]!] : s.elementos.map((e) => e.punto)));
      if (puntos.length) {
        const b = puntos.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(puntos[0]!, puntos[0]!));
        // Más margen a la derecha: ahí van los nombres
        m.fitBounds(b, { padding: { top: 72, bottom: 72, left: 48, right: 160 }, maxZoom: 16, duration: 0 });
      }
    }
  }, [situaciones, relaciones, seleccion, elemento, jornada, grupo]);

  /**
   * Las marcas, con lo que se pisa agrupado (07-4, 08-4): las cofradías cuyas cabezas caen a menos de
   * un dedo en pantalla se juntan en un círculo con cuántas son y su alteración más grave. La elegida
   * nunca se agrupa. Y las tuyas que no caben en pantalla, como etiqueta en el borde («al noreste»).
   * Va en una referencia porque la llama también el mapa al terminar de moverse.
   */
  const pintarMarcas = useRef<() => void>(() => {});
  pintarMarcas.current = () => {
    const m = mapa.current;
    if (!m) return;
    const cabeza = ({ c, s }: (typeof situaciones)[number]) => (s.fase.valor === "inminente" ? c.linea[0] : s.elementos[0]?.punto);
    const sueltas = situaciones.filter((x) => x.c.id !== seleccion && cabeza(x));
    const grupos = agrupar(
      sueltas.map((x) => {
        const p = m.project(cabeza(x)!);
        return { id: x.c.id, x: p.x, y: p.y };
      }),
      RADIO_GRUPO,
    ).filter((g) => g.length > 1);
    const agrupadas = new Set(grupos.flat().map((p) => p.id));
    const elegida_ = situaciones.find(({ c }) => c.id === seleccion);

    marcas.current.forEach((x) => x.remove());
    marcas.current = [
      ...situaciones
        .filter(({ c }) => !agrupadas.has(c.id))
        .flatMap(({ c, s }) => crearMarcas(c, s, relaciones.marca(c.id), c.id === seleccion ? elemento : null, (orden) => elegir(c.id, orden))),
      ...grupos.map((g) => {
        const miembros = g.map((p) => situaciones.find(({ c }) => c.id === p.id)!);
        const centro = m.unproject([g.reduce((a, p) => a + p.x, 0) / g.length, g.reduce((a, p) => a + p.y, 0) / g.length]);
        return crearGrupo(miembros, [centro.lng, centro.lat], () => {
          const puntos = miembros.flatMap(({ c, s }) => (s.elementos.length ? s.elementos.map((e) => e.punto) : [c.linea[0]!]));
          const b = puntos.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(puntos[0]!, puntos[0]!));
          m.fitBounds(b, { padding: { top: 64, bottom: Math.round(window.innerHeight * 0.35), left: 48, right: 48 }, maxZoom: 18, duration: 500 });
          setSeleccion(null);
          setElemento(null);
          setGrupo(miembros.map(({ c }) => c.id));
        });
      }),
      ...(elegida_ && jornada ? crearHitos(elegida_.c, elegida_.s, jornada) : []),
    ].map((el) => el.addTo(m));

    // Fuera del mapa: solo las tuyas, para no llenar los bordes de nombres
    const lienzo = m.getCanvas();
    const [ancho, alto] = [lienzo.clientWidth, lienzo.clientHeight];
    const hoja = seleccion || grupo ? alto * 0.3 : 24;
    setFuera(
      situaciones.flatMap((x) => {
        const punto = cabeza(x);
        if (!punto || x.c.id === seleccion || !relaciones.marca(x.c.id)) return [];
        const p = m.project(punto);
        if (p.x >= 0 && p.x <= ancho && p.y >= 0 && p.y <= alto - hoja) return [];
        const [dx, dy] = [p.x - ancho / 2, p.y - alto / 2];
        const pos = alBorde(dx, dy, ancho, alto, { arriba: 24, abajo: hoja + 24, lados: 16 });
        const cuando = x.s.fase.valor === "inminente" && x.s.sale ? hora(x.s.sale) : "en la calle";
        // La etiqueta se apoya en el lado hacia el que queda: a la derecha, crece hacia dentro desde el borde
        const lado = dx > ancho / 6 ? "derecha" : dx < -ancho / 6 ? "izquierda" : "centro";
        return [{ id: x.c.id, texto: `${x.c.nombre} · ${cuando} · ${rumbo(dx, dy)}`, x: lado === "derecha" ? ancho - 16 : lado === "izquierda" ? 16 : pos.x, y: pos.y, relacion: relaciones.marca(x.c.id)!, lado }];
      }),
    );
  };

  // Al elegir una cofradía, se encuadra su recorrido entero, dejando sitio abajo a la hoja
  const encuadrada = useRef<string | null>(null);
  useEffect(() => {
    const m = mapa.current;
    const sit = situaciones.find(({ c }) => c.id === seleccion);
    if (!m || !sit || encuadrada.current === seleccion) return;
    encuadrada.current = seleccion;
    const linea = sit.c.linea;
    const b = linea.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(linea[0]!, linea[0]!));
    m.fitBounds(b, { padding: { top: 56, bottom: Math.round(window.innerHeight * 0.3), left: 32, right: 32 }, maxZoom: 16.5, duration: 600 });
  }, [seleccion, situaciones]);
  useEffect(() => {
    if (!seleccion) encuadrada.current = null;
  }, [seleccion]);

  // Al tocar un elemento, se centra en él, por encima de la hoja (que sube a media altura)
  useEffect(() => {
    const m = mapa.current;
    const punto = elemento === null ? undefined : situaciones.find(({ c }) => c.id === seleccion)?.s.elementos.find((e) => e.orden === elemento)?.punto;
    if (m && punto) m.easeTo({ center: punto, offset: [0, -Math.round(window.innerHeight * 0.25)], zoom: Math.max(m.getZoom(), 16), duration: 500 });
    // Solo al tocarlo, no cada vez que el motor lo mueve
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccion, elemento]);

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
  const elementoElegido = elemento === null ? undefined : elegida?.s.elementos.find((e) => e.orden === elemento);

  return (
    <Marco
      sangrado="completo"
      cabecera={<Cabecera principal={<SelectorJornada />} />}
      accion={estado.activa ? <DarFe cofradia={elegida?.c.id} elemento={elementoElegido?.orden} /> : undefined}
      sheet={
        <BottomSheet
          abierto={!!elegida || !!grupo}
          titulo={
            elegida
              ? elementoElegido
                ? `${nombreElemento(elegida.c, elementoElegido.orden)} de ${elegida.c.nombre}`
                : elegida.c.nombre
              : `${grupo?.length ?? 0} cofradías aquí`
          }
          modo="convive"
          alturaInicial={elementoElegido || grupo ? "medio" : "asomado"}
          alCerrar={() => elegir(null)}
        >
          {!elegida && grupo ? (
            <ListaGrupo situaciones={situaciones.filter(({ c }) => grupo.includes(c.id))} alElegir={(id) => elegir(id)} />
          ) : elegida && jornada ? (
            elementoElegido ? (
              <DetalleElemento c={elegida.c} s={elegida.s} el={elementoElegido} jornada={jornada} alVolver={() => setElemento(null)} />
            ) : (
              <VistaCofradia c={elegida.c} s={elegida.s} jornada={jornada} />
            )
          ) : null}
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
        {fuera.map((f) => (
          <button
            key={f.id}
            type="button"
            className="cf-mapa-fuera"
            style={{ left: f.x, top: f.y }}
            data-lado={f.lado}
            onClick={() => elegir(f.id)}
          >
            <span className="cf-mapa-rel" data-relacion={f.relacion} />
            {f.texto}
          </button>
        ))}
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

/**
 * El tramo que ocupa cada cofradía, entre su cabeza y su cola: continuo si está confirmado, discontinuo si
 * no. Debajo, el recorrido entero de la elegida (mapa-2): lo hecho, continuo en verde; lo que le queda,
 * discontinuo y neutro.
 */
function pintarCortejos(m: Mapa_, datos: GeoJSON.FeatureCollection, recorrido: GeoJSON.FeatureCollection) {
  const fuenteRecorrido = m.getSource("recorrido") as GeoJSONSource | undefined;
  if (fuenteRecorrido) fuenteRecorrido.setData(recorrido);
  else {
    m.addSource("recorrido", { type: "geojson", data: recorrido });
    m.addLayer({ id: "recorrido-pendiente", type: "line", source: "recorrido", filter: ["==", ["get", "tipo"], "pendiente"], paint: { "line-color": token("--cf-text-secondary"), "line-width": 3, "line-dasharray": [1.5, 1.5] } });
    m.addLayer({ id: "recorrido-hecho", type: "line", source: "recorrido", filter: ["==", ["get", "tipo"], "hecho"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": token("--cf-live"), "line-width": 3 } });
  }
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
function crearMarcas(
  c: CofradiaMapa,
  s: EstadoCofradia,
  relacion: string | undefined,
  elegido: number | null,
  alTocar: (orden: number | null) => void,
): maplibregl.Marker[] {
  const res: maplibregl.Marker[] = [];
  const marca = (punto: [number, number], icono: string, fase: string, confianza: string, etiqueta: string, orden: number | null) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "cf-mapa-marca cf-map";
    el.setAttribute("aria-label", etiqueta);
    if (orden !== null && orden === elegido) el.dataset.elegido = "";
    el.innerHTML = `<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><g class="mk" data-fase="${fase}" data-confianza="${confianza}"><circle class="h" cx="20" cy="20" r="16"/><circle class="b" cx="20" cy="20" r="16"/><svg x="12" y="12" width="16" height="16" class="ico" viewBox="0 0 256 256" fill="currentColor"><path d="${icono}"/></svg></g></svg>`;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      alTocar(orden);
    });
    res.push(new maplibregl.Marker({ element: el }).setLngLat(punto));
  };
  const nombre = (punto: [number, number], extra: string) => {
    const el = document.createElement("div");
    el.className = "cf-mapa-nombre";
    el.innerHTML = `${relacion ? `<span class="cf-mapa-rel" data-relacion="${relacion}"></span>` : ""}<span class="nm"></span>${extra ? `<span class="ex"></span>` : ""}`;
    el.querySelector(".nm")!.textContent = c.nombre;
    if (extra) el.querySelector(".ex")!.textContent = extra;
    el.addEventListener("click", () => alTocar(null));
    res.push(new maplibregl.Marker({ element: el, anchor: "left", offset: [24, 0] }).setLngLat(punto));
  };

  if (s.fase.valor === "inminente" && s.sale) {
    const sale = `sale a las ${hora(s.sale)}`;
    marca(c.linea[0]!, TRAZOS.cruzGuia, "inminente", s.fase.confianza, `${c.nombre}: ${sale}`, null);
    nombre(c.linea[0]!, sale);
  } else {
    for (const e of s.elementos) {
      const icono = e.tipo === "cruz" ? TRAZOS.cruzGuia : TRAZOS.misterio;
      marca(e.punto, icono, "en_calle", e.confianza, `${c.nombre}, ${e.nombre}, ${comoSeSabe(e)}`, e.orden);
    }
    const cabeza = s.elementos[0];
    if (cabeza) nombre(cabeza.punto, alteracion(s));
  }
  return res;
}

type Fuera = { id: string; texto: string; x: number; y: number; relacion: string; lado: "izquierda" | "centro" | "derecha" };

/** Un dedo: a menos de esto en pantalla, dos marcas se pisan. */
const RADIO_GRUPO = 44;

/** Una alteración, de más a menos grave, para el distintivo del grupo (la más grave manda). */
const GRAVEDAD = ["interrumpida", "incidencia", "regreso_anticipado", "cambio_recorrido", "retraso", "adelanto"];

/** El círculo de un grupo: cuántas son y, si alguna lleva alteración, la más grave. */
function crearGrupo(miembros: { c: CofradiaMapa; s: EstadoCofradia }[], centro: [number, number], alTocar: () => void): maplibregl.Marker {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "cf-mapa-grupo";
  el.setAttribute("aria-label", `${miembros.length} cofradías juntas: ${miembros.map(({ c }) => c.nombre).join(", ")}`);
  const alteraciones = miembros.flatMap(({ s }) => s.alteraciones.map((a) => a.tipo as string));
  const grave = GRAVEDAD.find((g) => alteraciones.includes(g));
  const trazo = grave ? (TRAZOS as Record<string, string>)[grave === "regreso_anticipado" ? "regresoAnticipado" : grave === "cambio_recorrido" ? "cambioRecorrido" : grave] : undefined;
  el.innerHTML = `<span class="n"></span>${trazo ? `<span class="alt" data-alteracion="${grave}"><svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${trazo}"/></svg></span>` : ""}`;
  el.querySelector(".n")!.textContent = String(miembros.length);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    alTocar();
  });
  return new maplibregl.Marker({ element: el }).setLngLat(centro);
}

/** La hoja de un grupo (08-4): sus cofradías, en el orden de su próxima hora, para elegir una. */
function ListaGrupo({ situaciones, alElegir }: { situaciones: { c: CofradiaMapa; s: EstadoCofradia }[]; alElegir: (id: string) => void }) {
  const relaciones = useRelaciones();
  const orden = [...situaciones].sort((a, b) => Date.parse(a.s.entra ?? "") - Date.parse(b.s.entra ?? ""));
  return (
    <ul className="cf-mapa-grupo-lista">
      {orden.map(({ c, s }) => {
        const m = relaciones.marca(c.id);
        return (
          <li key={c.id}>
            <button type="button" onClick={() => alElegir(c.id)}>
              <span className="cab">
                {m ? <span className="cf-mapa-rel" data-relacion={m} /> : null}
                <span className="cf-name">{c.nombre}</span>
              </span>
              <span className="chips">
                <ChipEstado fase={s.fase.valor} confianza={s.fase.confianza} antiguedad={s.fase.haceMin !== null ? `hace ${s.fase.haceMin} min` : undefined} tamano="24" />
                <Alteraciones alteraciones={s.alteraciones} densidad="compacta" confianza={s.fase.confianza} />
              </span>
              <Icono nombre="chevronDerecha" tamano={20} />
            </button>
          </li>
        );
      })}
    </ul>
  );
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

/**
 * Las etiquetas de la elegida sobre el mapa (mapa-2): de dónde sale y a qué hora, y el próximo lugar por
 * el que pasará su cruz de guía, con su hora.
 */
function crearHitos(c: CofradiaMapa, s: EstadoCofradia, jornada: Jornada): maplibregl.Marker[] {
  const etiqueta = (punto: [number, number], texto: string, estimado: boolean) => {
    const el = document.createElement("div");
    el.className = "cf-mapa-hito";
    el.dataset.confianza = estimado ? "estimado" : "confirmado";
    el.innerHTML = `<span class="pt"></span><span class="tx"></span>`;
    el.querySelector(".tx")!.textContent = texto;
    return new maplibregl.Marker({ element: el, anchor: "left", offset: [-6, 0] }).setLngLat(punto);
  };
  const res: maplibregl.Marker[] = [];
  const salida = c.cruzGuia[0];
  if (salida && c.linea[0]) res.push(etiqueta(c.linea[0], `${salida.lugar} · salida ${salida.hora.slice(11, 16)}`, false));
  const cruz = s.elementos.find((e) => e.orden === 0);
  const sig = cruz ? siguienteLugar(c, cruz, jornada) : null;
  const situado = sig ? c.cruzGuia.find((h) => h.lugar === sig.lugar && h.m !== null) : undefined;
  if (sig && situado) {
    const acum = [0];
    for (let i = 1; i < c.linea.length; i++) {
      const [a, b] = [c.linea[i - 1]!, c.linea[i]!];
      acum.push(acum[i - 1]! + Math.hypot((b[0] - a[0]) * 88_450, (b[1] - a[1]) * 110_540));
    }
    const i = Math.max(0, acum.findIndex((x) => x >= situado.m!));
    const estimado = cruz?.confianza !== "confirmado";
    res.push(etiqueta(c.linea[i]!, `${sig.lugar} · ${hora(sig.hora.toISOString())}${estimado ? " · según horario" : ""}`, estimado));
  }
  return res;
}

/**
 * El mapa de una cofradía (P-08, 3-mapa/mapa-2 y 06): en la hoja, su estado, tres hitos con la hora
 * prevista y la real o estimada, y cuánto lleva de recorrido. Lo amplía 4.6 al tocar un elemento.
 */
function VistaCofradia({ c, s, jornada }: { c: CofradiaMapa; s: EstadoCofradia; jornada: Jornada }) {
  const v = { estado: s, mapa: c };
  const hitos = hitosDe(v, jornada);
  const cruz = s.elementos.find((e) => e.orden === 0);
  const pc = s.progreso && s.progreso.total ? Math.round((100 * s.progreso.m) / s.progreso.total) : null;
  const hhmm = (d: Date) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="cf-mapa-rapida">
      <div className="cf-mapa-rapida-chips">
        <ChipEstado fase={s.fase.valor} confianza={s.fase.confianza} antiguedad={s.fase.haceMin !== null ? `hace ${s.fase.haceMin} min` : undefined} />
        <Alteraciones alteraciones={s.alteraciones} densidad="estandar" confianza={s.fase.confianza} />
      </div>
      {s.fase.valor === "inminente" && s.sale ? <p className="cf-mapa-rapida-estado">Sale a las {hora(s.sale)}.</p> : null}
      {hitos.length ? (
        <dl className="cf-mapa-hitos">
          {hitos.map((h) => (
            <div key={h.titulo}>
              <dt>{h.titulo}</dt>
              <dd className="prevista cf-num">Prevista {hhmm(h.prevista)}</dd>
              <dd className="real" data-confianza={h.confianza}>
                {h.retrasoMin !== 0 || h.confianza !== "estimado" ? (
                  <>
                    <span className="hr cf-num">{hhmm(h.estimada)}</span>
                    {h.retrasoMin !== 0 ? <span className="dif cf-num"> {h.retrasoMin > 0 ? `+${h.retrasoMin}` : `−${-h.retrasoMin}`} min</span> : null}
                  </>
                ) : (
                  <span className="hr">según horario</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {cruz && pc !== null ? (
        <p className="cf-mapa-rapida-progreso">
          Cruz de guía {dondeVa(c, cruz)}
          <span className="cf-num">{pc} % del recorrido</span>
        </p>
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

/**
 * P-09 Detalle de un elemento (3-mapa/mapa-3 y 11-6): dónde va y a qué hora, cuándo se vio por última
 * vez o que nadie lo ha visto todavía (en llano, sin culpa), a cuánto te queda si hay ubicación, y el
 * resto del cortejo en su orden. «Dar fe» de la franja empieza por este elemento.
 */
function DetalleElemento({ c, s, el, jornada, alVolver }: { c: CofradiaMapa; s: EstadoCofradia; el: ElementoEstado; jornada: Jornada; alVolver: () => void }) {
  const posicion = usePosicion();
  const hhmm = (d: Date) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const linea = (e: ElementoEstado, mayuscula = false) => {
    const h = horaDelElemento(c, e, jornada);
    const donde = dondeVa(c, e);
    return (
      <>
        {mayuscula ? donde[0]!.toUpperCase() + donde.slice(1) : donde}
        {" · "}
        {h ? (
          <span className="hr cf-num" data-confianza={e.confianza}>
            {hhmm(h)}
          </span>
        ) : null}
        {h && e.confianza === "estimado" ? " · " : null}
        {e.confianza === "estimado" ? (
          <span className="hr" data-confianza="estimado">
            según horario
          </span>
        ) : null}
      </>
    );
  };
  const nombre = nombreElemento(c, el.orden).toLowerCase();
  const de = el.orden === 0 ? `de la ${nombre}` : `del ${nombre}`;
  const d = posicion ? distancia(posicion, { estado: { ...s, elementos: [el] }, mapa: c }) : null;
  const resto = s.elementos.filter((e) => e.orden !== el.orden);
  return (
    <div className="cf-mapa-rapida cf-mapa-elemento">
      <p className="cf-mapa-elemento-donde">{linea(el, true)}</p>
      <p className="cf-mapa-elemento-visto">
        {el.confianza === "confirmado"
          ? el.haceMin
            ? `Visto hace ${el.haceMin} min.`
            : "Visto ahora mismo."
          : el.confianza === "desactualizado"
            ? `Último dato hace ${el.haceMin} min.`
            : `Nadie ha dado fe ${de} todavía.`}
      </p>
      {d !== null ? (
        <p className="cf-mapa-elemento-distancia">
          <Icono nombre="ubicacion" tamano={20} /> {distanciaEnLlano(d)}
        </p>
      ) : null}
      {resto.length ? (
        <section aria-labelledby="resto-cortejo">
          <h3 id="resto-cortejo">El resto de la cofradía</h3>
          <ul className="cf-mapa-elemento-resto">
            {resto.map((e) => (
              <li key={e.orden}>
                <Icono nombre={e.tipo === "cruz" ? "cruzGuia" : "misterio"} tamano={20} />
                <span>
                  <strong>{nombreElemento(c, e.orden)}</strong> · {linea(e)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="cf-mapa-rapida-enlaces">
        <Boton variante="secundario" onClick={alVolver}>
          Toda la cofradía
        </Boton>
        <Link className="cf-btn" data-variant="secundario" to={`/cofradias/${c.id}`}>
          Ver ficha
        </Link>
      </div>
    </div>
  );
}

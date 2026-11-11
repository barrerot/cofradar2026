import { useCallback, useEffect, useRef, useState } from "react";
import { cabecerasSesion } from "./sesion";

/**
 * Trivial online por turnos (F-51, P-33): lo que se pide a /api/trivial. El servidor manda en todo (dado,
 * preguntas, plazos, resultado); aquí solo se pide, se reintenta y se repinta lo que diga.
 *
 * No se guarda nada en el teléfono: las partidas son de la cuenta (decisión del 10/11/2026).
 */

export type Categoria =
  | "historia"
  | "imagenes"
  | "patrimonio_simbolos"
  | "jornadas_sedes"
  | "musica_literatura"
  | "tradiciones_curiosidades";

export type ResumenPartida = {
  id: string;
  rival: string;
  /** El rival borró su cuenta: sin historial ni revancha. */
  rivalEliminado: boolean;
  estado: "activa" | "finalizada";
  teToca: boolean;
  turnoVence: string;
  estrellas: { tuyas: number; rival: number };
  motivo: Motivo | null;
  ganaste: boolean | null;
  terminada: string | null;
};

export type Bandeja = {
  alias: string | null;
  partidas: ResumenPartida[];
  invitaciones: { token: string; creada: string; vence: string }[];
  busqueda: { desde: string; vence: string } | null;
  /** F-52: las que te piden (`tuya` false) y las que has pedido tú. */
  revanchas: { id: string; tuya: boolean; rival: string; vence: string }[];
  /** F-57: los retos de cuadrilla, igual: los que te mandan y los que has mandado. */
  retos?: { id: string; tuyo: boolean; rival: string; cuadrilla: string; vence: string }[];
};

/** La revancha pendiente entre dos: `tuya` si la pediste tú. */
export type Revancha = { id: string; tuya: boolean; vence: string };

export type Motivo = "estrellas" | "rendicion" | "inactividad";

export type Partida = {
  id: string;
  yo: 0 | 1;
  jugadores: [string, string];
  /** F-54: el número de hermano de cada uno. */
  numeros: [number | null, number | null];
  eliminados: [boolean, boolean];
  estado: "activa" | "finalizada";
  motivo: Motivo | null;
  ganador: 0 | 1 | null;
  posiciones: [string, string];
  estrellas: [Categoria[], Categoria[]];
  turno: 0 | 1;
  turnoVence: string;
  fase: "tirar" | "mover" | "responder";
  tirada: number | null;
  destinos: { id: string; texto: string }[] | null;
  pregunta: {
    categoria: Categoria;
    casilla: string;
    casillaTexto: string;
    estrella: boolean;
    hermandad: string;
    enunciado: string;
    opciones: { id: string; texto: string }[];
  } | null;
  version: number;
  creada: string;
  terminada: string | null;
  /** Al acabar, si el rival sigue: el marcador de todas vuestras partidas y la revancha pendiente. */
  pareja: { marcador: { tuyas: number; suyas: number }; revancha: Revancha | null } | null;
};

/** `pregunta`: su id en el banco, para retar a otro con ella (F-53). */
export type Resolucion = { acierto: boolean; correcta: string; explicacion: string; fuente: string; estrella: Categoria | null; pregunta: number };

/** Tú y un rival (F-52, 11-trivial-online/17). */
export type Historial = {
  rival: { alias: string; numero: number | null };
  marcador: { tuyas: number; suyas: number };
  enCurso: { id: string; teToca: boolean; turnoVence: string }[];
  terminadas: { id: string; terminada: string; motivo: Motivo | null; ganaste: boolean | null; estrellas: { tuyas: number; rival: number } }[];
  revancha: Revancha | null;
  ultima: string | null;
};

export type Invitacion = { anfitrion: string; estado: "pendiente" | "caducada" | "cancelada" | "aceptada"; vence: string; tuya: boolean; partida: string | null };

/** Un error de la API con lo que el servidor añade (`sinAlias`, `estado`, la `partida` al día…). */
export class ErrorApi extends Error {
  constructor(
    public estado: number,
    mensaje: string,
    public extra: Record<string, unknown>,
  ) {
    super(mensaje);
  }
}

export async function api<T>(metodo: "GET" | "POST" | "PUT" | "DELETE", ruta: string, cuerpo?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`/api/trivial${ruta}`, {
      method: metodo,
      headers: { Accept: "application/json", ...(cuerpo ? { "Content-Type": "application/json" } : {}), ...(await cabecerasSesion()) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ErrorApi(0, "Sin conexión", {});
  }
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) {
    const { error, ...extra } = j;
    throw new ErrorApi(r.status, typeof error === "string" ? error : `Error ${r.status}`, extra);
  }
  return j as T;
}

/** Un id para cada jugada: si se reenvía (se cortó la red), el servidor no la repite (CA-08). */
export const nuevaAccion = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "");

/** Si el teléfono tiene red, según el navegador. */
export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() => typeof navigator === "undefined" || navigator.onLine !== false);
  useEffect(() => {
    const si = () => setEnLinea(true);
    const no = () => setEnLinea(false);
    window.addEventListener("online", si);
    window.addEventListener("offline", no);
    return () => {
      window.removeEventListener("online", si);
      window.removeEventListener("offline", no);
    };
  }, []);
  return enLinea;
}

/**
 * Pide `ruta` al abrir, al volver a primer plano y, mientras se ve, cada `cadaMs` (PRD: la bandeja se
 * actualiza al volver y mientras está visible). Lo último bueno se queda aunque falle una vuelta.
 */
const versionDe = (x: unknown) => (x && typeof (x as { version?: unknown }).version === "number" ? (x as { version: number }).version : -1);

export function useSondeo<T>(ruta: string | null, cadaMs: number) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const vigente = useRef(ruta);
  vigente.current = ruta;

  const pedir = useCallback(async () => {
    if (!ruta) return;
    try {
      const d = await api<T>("GET", ruta);
      if (vigente.current === ruta) {
        // Una respuesta que salió antes de una jugada no pisa la partida ya jugada
        setDatos((antes) => (versionDe(antes) > versionDe(d) ? antes : d));
        setError(null);
      }
    } catch (e) {
      if (vigente.current === ruta) setError(e as ErrorApi);
    }
  }, [ruta]);

  // Otra ruta: se empieza de cero. Cambiar solo el ritmo no borra lo que hay
  useEffect(() => {
    setDatos(null);
    setError(null);
    void pedir();
  }, [pedir]);

  useEffect(() => {
    if (!ruta) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void pedir();
    }, cadaMs);
    const alVolver = () => {
      if (document.visibilityState === "visible") void pedir();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", alVolver);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", alVolver);
    };
  }, [ruta, cadaMs, pedir]);

  return { datos, error, recargar: pedir, poner: setDatos };
}

/** «te quedan 31 h», «te quedan 40 min» */
export function quedan(iso: string, ahora = Date.now()): string {
  const ms = new Date(iso).getTime() - ahora;
  if (ms <= 0) return "0 min";
  const h = Math.floor(ms / 3600_000);
  if (h >= 1) return `${h} h`;
  return `${Math.max(1, Math.ceil(ms / 60_000))} min`;
}

/** «hace 3 h», «hace 12 min» */
export function hace(iso: string, ahora = Date.now()): string {
  const ms = Math.max(0, ahora - new Date(iso).getTime());
  const h = Math.floor(ms / 3600_000);
  if (h >= 1) return `${h} h`;
  return `${Math.max(1, Math.floor(ms / 60_000))} min`;
}

/** El enlace que se comparte para una invitación. */
export const enlaceInvitacion = (token: string) => `${window.location.origin}/trivial/i/${token}`;

/** «1.032», con el punto también en los de cuatro cifras (Intl no lo pone en español). */
export const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

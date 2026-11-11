import { useCallback, useEffect, useRef, useState } from "react";
import { cabecerasSesion } from "./sesion";
import { desfaseReloj } from "./reloj";
import { ErrorApi, type Motivo } from "./trivialOnline";

/**
 * Cuadrillas (F-57, P-36): lo que se pide a /api/cuadrillas. El servidor manda: quién está, quién es el
 * capataz, los cirios y las partidas. Aquí solo se pide y se repinta.
 */

export type ResumenCuadrilla = { id: string; nombre: string; miembros: number; capataz: string | null; soyCapataz: boolean };

export type Miembro = {
  alias: string;
  numero: number | null;
  capataz: boolean;
  tu: boolean;
  /** Solo en Cuaresma. De los demás, solo encendido o apagado y los días. */
  cirio: { estado: "encendido" | "pendiente" | "apagado" | "sin_empezar"; dias: number } | null;
  marcador: { tuyas: number; suyas: number } | null;
  enCurso: string | null;
  /** Una partida entre los dos, para ir a vuestro historial */
  historial: string | null;
  reto: { id: string; tuyo: boolean; vence: string } | null;
};

export type Cuadrilla = {
  id: string;
  nombre: string;
  capataz: string | null;
  soyCapataz: boolean;
  /** Si sales siendo capataz, quién lo será */
  sucesor: string | null;
  total: number;
  max: number;
  cuaresma: boolean;
  miembros: Miembro[];
  partidas: {
    enCurso: { id: string; rival: string; teToca: boolean }[];
    terminadas: { id: string; terminada: string; jugadores: [string, string]; tu: 0 | 1 | null; ganador: 0 | 1 | null; motivo: Motivo | null; estrellas: [number, number] }[];
  };
};

export type EnlaceCuadrilla = {
  cuadrilla: string;
  invita: string | null;
  miembros: number;
  max: number;
  estado: "valido" | "caducado" | "anulado" | "llena";
  dentro: boolean;
  id: string | null;
};

export async function apiCuadrillas<T>(metodo: "GET" | "POST" | "PATCH" | "DELETE", ruta: string, cuerpo?: unknown): Promise<T> {
  const desfase = desfaseReloj();
  let r: Response;
  try {
    r = await fetch(`/api/cuadrillas${ruta}`, {
      method: metodo,
      headers: {
        Accept: "application/json",
        ...(cuerpo ? { "Content-Type": "application/json" } : {}),
        ...(await cabecerasSesion()),
        ...(desfase ? { "X-Reloj-Desfase": String(desfase) } : {}),
      },
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

/** Pide `ruta` al abrir y al volver a primer plano. Lo último bueno se queda aunque falle una vuelta. */
export function useCuadrillas<T>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const vigente = useRef(ruta);
  vigente.current = ruta;

  const recargar = useCallback(async () => {
    if (ruta === null) return;
    try {
      const d = await apiCuadrillas<T>("GET", ruta);
      if (vigente.current === ruta) {
        setDatos(d);
        setError(null);
      }
    } catch (e) {
      if (vigente.current === ruta) setError(e as ErrorApi);
    }
  }, [ruta]);

  useEffect(() => {
    setDatos(null);
    setError(null);
    void recargar();
    const alVolver = () => {
      if (document.visibilityState === "visible") void recargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [recargar]);

  return { datos, error, recargar };
}

export const enlaceCuadrilla = (token: string) => `${window.location.origin}/c/${token}`;

/** «3 de marzo» */
export const diaMes = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });

/** «Costalero83 ganó a Capirote_Morado · 6 – 4», con «Tú» donde toca. */
export function textoPartida(p: Cuadrilla["partidas"]["terminadas"][number]): string {
  const [a, b] = p.jugadores;
  const nombre = (i: 0 | 1) => (p.tu === i ? "Tú" : i === 0 ? a : b);
  if (p.ganador === null) return `${nombre(0)} y ${p.tu === 1 ? "tú" : nombre(1)} · cerrada por inactividad`;
  const g = p.ganador;
  const perd: 0 | 1 = g === 0 ? 1 : 0;
  const frase =
    p.tu === g ? `Tú ganaste a ${nombre(perd)}` : p.tu === perd ? `${nombre(g)} te ganó` : `${nombre(g)} ganó a ${nombre(perd)}`;
  if (p.motivo === "rendicion") return `${frase} · ${p.tu === perd ? "te rendiste" : `${nombre(perd)} se rindió`}`;
  return `${frase} · ${p.estrellas[g]} – ${p.estrellas[perd]}`;
}

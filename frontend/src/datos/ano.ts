import { useEffect, useState } from "react";
import { puntosEnTexto } from "./cargo";
import { desfaseReloj } from "./reloj";
import { cabecerasSesion, useSesion } from "./sesion";

/**
 * «Tu Semana Santa» (F-59), de GET /api/yo/semana-santa. El servidor cuenta cada año (de un Domingo de
 * Resurrección al siguiente) y solo devuelve las líneas con algo: nunca un cero ni lo que faltó (R5).
 */
export type ClaveLinea = "vistas" | "fe" | "cirio" | "preguntas" | "partidas" | "estampas";
export type Tarjeta = {
  anio: number;
  alias: string | null;
  numero: number | null;
  /** El cargo al acabar ese Domingo de Resurrección; null sin puntos */
  cargo: string | null;
  lineas: { clave: ClaveLinea; texto: string }[];
};

async function pedir<T>(ruta: string): Promise<T | null> {
  const desfase = desfaseReloj();
  try {
    const r = await fetch(ruta, {
      headers: { Accept: "application/json", ...(await cabecerasSesion()), ...(desfase ? { "X-Reloj-Desfase": String(desfase) } : {}) },
      cache: "no-store",
    });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Los años con tarjeta, del más reciente al más antiguo; null mientras no se sabe o sin cuenta. */
export function useAnos(): number[] | null {
  const { usuario } = useSesion();
  const [anios, setAnios] = useState<number[] | null>(null);
  const id = usuario?.id;
  useEffect(() => {
    setAnios(null);
    if (!id) return;
    let vivo = true;
    void pedir<{ anios: number[] }>("/api/yo/semana-santa").then((r) => vivo && r && setAnios(r.anios));
    return () => {
      vivo = false;
    };
  }, [id]);
  return anios;
}

/** La tarjeta de un año: undefined mientras llega, null si no la hay. */
export function useTarjeta(anio: number | null): Tarjeta | null | undefined {
  const { usuario } = useSesion();
  const [tarjeta, setTarjeta] = useState<Tarjeta | null | undefined>(undefined);
  const id = usuario?.id;
  useEffect(() => {
    setTarjeta(undefined);
    if (!id || anio === null) return;
    let vivo = true;
    void pedir<Tarjeta>(`/api/yo/semana-santa/${anio}`).then((t) => vivo && setTarjeta(t));
    return () => {
      vivo = false;
    };
  }, [id, anio]);
  return tarjeta;
}

/**
 * Si ya abrió la tarjeta de ese año en este teléfono: hasta entonces, la fila dice «Ya está tu tarjeta del
 * año». Es solo una comodidad: en otro teléfono la línea vuelve a salir hasta que la abra.
 */
const claveVista = (usuario: string, anio: number) => `cofradar:tarjeta-vista:${usuario}:${anio}`;
export function tarjetaVista(usuario: string, anio: number): boolean {
  try {
    return localStorage.getItem(claveVista(usuario, anio)) === "1";
  } catch {
    return false;
  }
}
export function apuntarTarjetaVista(usuario: string, anio: number): void {
  try {
    localStorage.setItem(claveVista(usuario, anio), "1");
  } catch {
    /* sin almacenamiento: la línea sigue saliendo, nada más */
  }
}

/** «Hermano nº 214 · Diputado de tramo en Cofradar», sin lo que no haya */
export function lineaHermano(t: Tarjeta): string {
  const numero = t.numero ? `Hermano nº ${puntosEnTexto(t.numero)}` : null;
  const cargo = t.cargo ? `${t.cargo} en Cofradar` : null;
  // Sin alias, el número va de título: aquí solo el cargo
  return [t.alias ? numero : null, cargo].filter(Boolean).join(" · ");
}
export const tituloTarjeta = (t: Tarjeta) => t.alias ?? (t.numero ? `Hermano nº ${puntosEnTexto(t.numero)}` : "Cofradar");

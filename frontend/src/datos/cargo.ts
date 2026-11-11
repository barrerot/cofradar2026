import { useCallback, useEffect, useState } from "react";
import { alCambiarCola } from "./darFe";
import { desfaseReloj } from "./reloj";
import { cabecerasSesion, useSesion } from "./sesion";

/**
 * El cargo: la calle y la casa (F-58), de GET /api/yo/cargo. El servidor lo calcula todo: los puntos de
 * dar fe (la calle), los del trivial online y la pregunta del día con su tope de 10 al día (la casa) y la
 * regla de la mitad desde Diputado de tramo. Siempre «en Cofradar».
 */
export type Cargo = {
  puntos: number;
  calle: number;
  casa: number;
  numero: number;
  nombre: string;
  /** Una frase sobria del puesto */
  frase: string;
  desde: number;
  /** `faltan` es null cuando lo que frena es la regla de la calle */
  siguiente: { nombre: string; desde: number; faltan: number | null } | null;
  /** Hay puntos de la casa que no cuentan hasta que haya más de la calle */
  tope: boolean;
  hoyCasa: number;
  niveles: { nombre: string; desde: number }[];
};

/** Lo que dio a tu cargo una partida ganada o la pregunta del día */
export type LineaCasa = { puntos: number; tope: boolean } | null;

export async function pedirCargo(): Promise<Cargo | null> {
  const desfase = desfaseReloj();
  try {
    const r = await fetch("/api/yo/cargo", {
      headers: { Accept: "application/json", ...(await cabecerasSesion()), ...(desfase ? { "X-Reloj-Desfase": String(desfase) } : {}) },
      cache: "no-store",
    });
    return r.ok ? ((await r.json()) as Cargo) : null;
  } catch {
    return null;
  }
}

/**
 * El cargo, o null mientras no se sabe. Se vuelve a pedir al volver a la app y cuando sale una aportación
 * de la cola de «Dar fe» (puede subir de cargo).
 */
export function useCargo(): { cargo: Cargo | null; recargar: () => void } {
  const { usuario } = useSesion();
  const [cargo, setCargo] = useState<Cargo | null>(null);
  const id = usuario?.id;
  const recargar = useCallback(() => {
    if (!id) return;
    void pedirCargo().then((c) => c && setCargo(c));
  }, [id]);
  useEffect(() => {
    setCargo(null);
    if (!id) return;
    recargar();
    const alVolver = () => {
      if (document.visibilityState === "visible") recargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    const dejar = alCambiarCola(recargar);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      dejar();
    };
  }, [id, recargar]);
  return { cargo, recargar };
}

/**
 * El último cargo que se le enseñó a esta persona en este teléfono, para la hoja «Ahora eres…» (23). Es
 * solo una comodidad: si cambia de teléfono, la primera vez se apunta sin enseñar nada.
 */
const claveVisto = (usuario: string) => `cofradar:cargo-visto:${usuario}`;
export function cargoVisto(usuario: string): number | null {
  try {
    const v = Number(localStorage.getItem(claveVisto(usuario)));
    return Number.isInteger(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}
export function apuntarCargoVisto(usuario: string, numero: number): void {
  try {
    localStorage.setItem(claveVisto(usuario), String(numero));
  } catch {
    /* sin almacenamiento: la hoja puede volver a salir, nada más */
  }
}

/** «1.180» */
export const puntosEnTexto = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

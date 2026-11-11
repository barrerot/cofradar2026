import { useCallback, useEffect, useState } from "react";
import { cabecerasSesion, useSesion } from "./sesion";
import { desfaseReloj } from "./reloj";
import type { Categoria } from "./trivialOnline";
import type { NuevaEnAlbum } from "./album";
import type { LineaCasa } from "./cargo";

/**
 * La pregunta del día y el cirio de Cuaresma (F-55, P-34): lo que se pide a /api/dia. El servidor decide
 * qué día es (a las 00:00 de Madrid), cuál es la pregunta y cómo está tu cirio; la buena no llega hasta
 * contestar. Con el reloj de prueba (?ahora=) se le manda el desfase y lo guarda aparte.
 */

export type EstadoCirio = "encendido" | "pendiente" | "apagado" | "sin_empezar";
export type Cirio = {
  estado: EstadoCirio;
  dias: number;
  apagadoEl: number | null;
  llevaba: number;
  contestadas: number;
  aciertos: number;
  mejor: number;
  marcas: ("acierto" | "fallo" | null)[];
};
export type PreguntaDia = {
  id: number;
  banco: number;
  categoria: Categoria;
  tema: string;
  hermandad: string;
  enunciado: string;
  opciones: { id: string; texto: string }[];
};
export type ResolucionDia = { acierto: boolean; correcta: string; explicacion: string; fuente: string; pregunta: number };
export type VistaDia = {
  fase: "antes" | "cuaresma" | "despues" | null;
  hoy: string;
  inicio: string | null;
  fin: string | null;
  total: number;
  dia: number | null;
  pregunta?: PreguntaDia;
  tuya?: { respuesta: string; resolucion: ResolucionDia };
  cirio?: Cirio;
  /** Lo que dio a tu cargo contestarla (F-58) */
  casa?: LineaCasa;
  /** Solo justo al contestar: las estampas que ha completado en «la conoces» (F-56) */
  album?: NuevaEnAlbum[];
};

async function cabeceras(): Promise<Record<string, string>> {
  const desfase = desfaseReloj();
  return { Accept: "application/json", ...(await cabecerasSesion()), ...(desfase ? { "X-Reloj-Desfase": String(desfase) } : {}) };
}

export class ErrorDia extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

async function pedir(metodo: "GET" | "POST", ruta: string, cuerpo?: unknown): Promise<VistaDia> {
  let r: Response;
  try {
    r = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: { ...(await cabeceras()), ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ErrorDia(0, "Sin conexión. Comprueba la red y vuelve a intentarlo.");
  }
  const j = (await r.json().catch(() => ({}))) as VistaDia & { error?: string };
  if (!r.ok) throw new ErrorDia(r.status, j.error ?? `Error ${r.status}`);
  return j;
}

// Lo último que se supo, por cuenta: la portada, Mi Cofradar y la pregunta lo comparten al navegar
let recordado: { clave: string; vista: VistaDia } | null = null;

/** La vista del día. Se vuelve a pedir al abrir y al volver a primer plano (puede haber cambiado de día). */
export function useDia() {
  const { usuario } = useSesion();
  const cargando = usuario === undefined;
  const clave = `${usuario?.id ?? "-"}:${desfaseReloj()}`;
  const [vista, setVista] = useState<VistaDia | null>(() => (recordado?.clave === clave ? recordado.vista : null));
  const [error, setError] = useState<ErrorDia | null>(null);

  const recargar = useCallback(async () => {
    try {
      const v = await pedir("GET", "/dia");
      recordado = { clave, vista: v };
      setVista(v);
      setError(null);
    } catch (e) {
      setError(e as ErrorDia);
    }
  }, [clave]);

  useEffect(() => {
    if (cargando) return;
    setVista(recordado?.clave === clave ? recordado.vista : null);
    void recargar();
    const alVolver = () => {
      if (document.visibilityState === "visible") void recargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [clave, cargando, recargar]);

  const responder = useCallback(
    async (opcion: string) => {
      if (!vista?.pregunta) return;
      const v = await pedir("POST", "/dia/respuesta", { fecha: vista.hoy, banco: vista.pregunta.banco, opcion });
      recordado = { clave, vista: v };
      setVista(v);
    },
    [vista, clave],
  );

  return { vista, error, recargar, responder, conSesion: !!usuario, cargando };
}

/** «Cofradar · Día 23 de Cuaresma ✅ 🕯️ 23 días cofradar.es/dia»: nunca la respuesta. */
export function textoCompartirDia(vista: VistaDia): string {
  const acierto = vista.tuya?.resolucion.acierto;
  const dias = vista.cirio?.dias ?? 0;
  return `Cofradar · Día ${vista.dia} de Cuaresma ${acierto ? "✅" : "❌"} 🕯️ ${dias === 1 ? "1 día" : `${dias} días`} ${window.location.origin}/dia`;
}

/** «jueves 4 de marzo» de una fecha AAAA-MM-DD (sin que la zona del teléfono la mueva de día) */
export function fechaLarga(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  const semana = d.toLocaleDateString("es-ES", { weekday: "long", timeZone: "UTC" });
  return `${semana} ${d.toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "UTC" })}`;
}

/** «10 de febrero» */
export function fechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "UTC" });
}

export const dias = (n: number) => (n === 1 ? "1 día" : `${n} días`);

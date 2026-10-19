import { useCallback, useEffect, useRef, useState } from "react";
import { guardar, leer } from "./almacen";
import { useSincronizacion } from "./sincronizacion";

/**
 * Pide un dato a la API y lo guarda en el teléfono (§12.1, D18).
 *
 * - Se abre con lo último guardado, si lo hay, y se refresca por detrás: el
 *   contenido nunca desaparece por refrescar ni por perder la conexión.
 * - Se refresca solo cada `cadaMs` (por defecto 45 s, dentro de los 30–60 s del
 *   PRD) mientras la pantalla está a la vista, al volver a ella y al volver la red.
 * - Persistir no es dar por vigente (regla 7): cada dato lleva su `instante`.
 *   Este gancho no calcula nada a partir del horario: devuelve lo que dijo el
 *   servidor y cuándo lo dijo (F-06, D35).
 *
 * `estado` dice cuál de los estados de §12.2 toca pintar:
 *   primera-carga            sin nada guardado y pidiéndolo → skeleton
 *   listo                    dato al día
 *   refrescando              hay dato y se está pidiendo otro → indicador discreto
 *   sin-conexion-con-datos   lo último guardado, congelado, con su antigüedad
 *   sin-conexion-sin-datos   «necesita conexión», que no es «no hay nada»
 *   error                    el servidor contestó mal → mensaje y reintento
 */
export type EstadoDato =
  | "primera-carga"
  | "listo"
  | "refrescando"
  | "sin-conexion-con-datos"
  | "sin-conexion-sin-datos"
  | "error";

export type Dato<T> = {
  datos: T | null;
  /** Cuándo los dio el servidor (no cuándo se pintaron). */
  instante: Date | null;
  estado: EstadoDato;
  /** Para el botón de reintentar: nunca bloquea la interfaz. */
  reintentar: () => void;
};

type Guardado<T> = { datos: T; instante: string };
type Interno<T> = {
  ruta: string;
  datos: T | null;
  instante: Date | null;
  pidiendo: boolean;
  problema: "sin-conexion" | "error" | null;
};

const ESPERA_MAXIMA = 15_000;

function desdeElTelefono<T>(ruta: string): Interno<T> {
  const g = leer<Guardado<T>>(`api:${ruta}`);
  return { ruta, datos: g?.datos ?? null, instante: g ? new Date(g.instante) : null, pidiendo: true, problema: null };
}

export function useDato<T>(ruta: string, { cadaMs = 45_000 }: { cadaMs?: number } = {}): Dato<T> {
  const sync = useSincronizacion();
  const [interno, setInterno] = useState<Interno<T>>(() => desdeElTelefono<T>(ruta));
  const vigente = useRef(ruta);
  vigente.current = ruta;

  // Otra ruta (otra cofradía, otra jornada): se empieza por lo que haya guardado de ella
  if (interno.ruta !== ruta) setInterno(desdeElTelefono<T>(ruta));

  const { empieza, exito, sinRed, termina } = sync;
  const cargar = useCallback(async () => {
    const pedida = ruta;
    setInterno((s) => (s.ruta === pedida ? { ...s, pidiendo: true } : s));
    empieza();
    const corte = new AbortController();
    const reloj = window.setTimeout(() => corte.abort(), ESPERA_MAXIMA);
    try {
      const respuesta = await fetch(`/api${pedida}`, { signal: corte.signal, headers: { Accept: "application/json" } });
      if (!respuesta.ok) throw Object.assign(new Error(`HTTP ${respuesta.status}`), { http: true });
      const datos = (await respuesta.json()) as T;
      const instante = new Date();
      guardar(`api:${pedida}`, { datos, instante: instante.toISOString() } satisfies Guardado<T>);
      exito();
      if (vigente.current === pedida) setInterno({ ruta: pedida, datos, instante, pidiendo: false, problema: null });
    } catch (e) {
      // Sin respuesta (sin red, servidor caído o tarda demasiado) frente a respuesta mala
      const http = typeof e === "object" && e !== null && "http" in e;
      if (!http) sinRed();
      if (vigente.current === pedida) {
        setInterno((s) => ({ ...s, pidiendo: false, problema: http ? "error" : "sin-conexion" }));
      }
    } finally {
      window.clearTimeout(reloj);
      termina();
    }
  }, [ruta, empieza, exito, sinRed, termina]);

  useEffect(() => {
    void cargar();
    const otraVez = () => {
      if (document.visibilityState === "visible") void cargar();
    };
    const id = window.setInterval(otraVez, cadaMs);
    document.addEventListener("visibilitychange", otraVez);
    window.addEventListener("online", otraVez);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", otraVez);
      window.removeEventListener("online", otraVez);
    };
  }, [cargar, cadaMs]);

  const hay = interno.datos !== null;
  const estado: EstadoDato =
    interno.problema === "sin-conexion" || (sync.conexion === "sin-conexion" && !interno.pidiendo)
      ? hay ? "sin-conexion-con-datos" : "sin-conexion-sin-datos"
      : interno.problema === "error" && !interno.pidiendo
        ? "error"
        : interno.pidiendo
          ? hay ? "refrescando" : "primera-carga"
          : "listo";

  return { datos: interno.datos, instante: interno.instante, estado, reintentar: () => void cargar() };
}

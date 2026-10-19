import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { guardar, leer } from "./almacen";

/**
 * Estado global de la sincronización (§7.3, §12).
 *
 *   ultima       cuándo consiguió Cofradar actualizar información por última
 *                vez. Se guarda en el teléfono: al abrir sin conexión, la
 *                cabecera sigue diciendo «hace 12 min» y no «sin sincronizar».
 *   conexion     `sin-conexion` cuando el navegador dice que no hay red o una
 *                petición no llega al servidor. Vuelve a `en-linea` con la
 *                siguiente respuesta buena, no con el evento `online`: tener
 *                red no es lo mismo que llegar a Cofradar.
 *   refrescando  hay alguna petición en curso. Es un indicador discreto,
 *                nunca un bloqueo (§12.1).
 *
 * Que Cofradar se haya sincronizado hace un minuto NO dice que una posición
 * sea de hace un minuto (§7.3): cada dato lleva su propia frescura.
 *
 * Andamio de revisión, para ver los estados sin cortar la red (se lee al
 * cargar la página; ver también /estados):
 *   ?conexion=sin          como si no hubiera conexión
 *   ?sincronizacion=nunca  como si nunca se hubiera sincronizado
 *   ?actualizando=si       como si hubiera una petición en curso
 */
export type Conexion = "en-linea" | "sin-conexion";

type Sincronizacion = {
  ultima: Date | null;
  conexion: Conexion;
  refrescando: boolean;
  /** Para useDato: una petición empieza, sale bien o no llega. */
  empieza: () => void;
  exito: () => void;
  sinRed: () => void;
  termina: () => void;
};

const Contexto = createContext<Sincronizacion | null>(null);

const forzado = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);

export function SincronizacionProvider({ children }: { children: ReactNode }) {
  const [ultima, setUltima] = useState<Date | null>(() => {
    const guardada = leer<string>("ultima-sincronizacion");
    return guardada ? new Date(guardada) : null;
  });
  const [conexion, setConexion] = useState<Conexion>(() =>
    typeof navigator !== "undefined" && navigator.onLine === false ? "sin-conexion" : "en-linea",
  );
  const [enCurso, setEnCurso] = useState(0);

  useEffect(() => {
    const caida = () => setConexion("sin-conexion");
    window.addEventListener("offline", caida);
    return () => window.removeEventListener("offline", caida);
  }, []);

  const empieza = useCallback(() => setEnCurso((n) => n + 1), []);
  const termina = useCallback(() => setEnCurso((n) => Math.max(0, n - 1)), []);
  const sinRed = useCallback(() => setConexion("sin-conexion"), []);
  const exito = useCallback(() => {
    const ahora = new Date();
    setUltima(ahora);
    setConexion("en-linea");
    guardar("ultima-sincronizacion", ahora.toISOString());
  }, []);

  const valor = useMemo(
    () => ({
      ultima: forzado.get("sincronizacion") === "nunca" ? null : ultima,
      conexion: forzado.get("conexion") === "sin" ? ("sin-conexion" as const) : conexion,
      refrescando: forzado.get("actualizando") === "si" || enCurso > 0,
      empieza,
      exito,
      sinRed,
      termina,
    }),
    [ultima, conexion, enCurso, empieza, exito, sinRed, termina],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSincronizacion(): Sincronizacion {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSincronizacion fuera de <SincronizacionProvider>");
  return valor;
}

/** Vuelve a pintar cada `ms` para que «hace 3 min» no se quede quieto. */
export function useReloj(ms = 30_000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return ahora;
}

/** «ahora mismo», «hace 12 min», «hace 3 h», «hace 2 días». */
export function hace(instante: Date, ahora: Date = new Date()): string {
  const minutos = Math.floor((ahora.getTime() - instante.getTime()) / 60_000);
  if (minutos < 1) return "ahora mismo";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

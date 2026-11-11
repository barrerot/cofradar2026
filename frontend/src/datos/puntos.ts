import { useEffect, useState } from "react";
import { alCambiarCola } from "./darFe";
import { cabecerasSesion, useSesion } from "./sesion";

/**
 * Tus aportaciones y los puntos que te han dado (P-22), de GET /api/yo/aportaciones. El cargo, con la calle
 * y la casa (F-58), va aparte: datos/cargo.ts.
 */
export type MiAportacion = {
  id: string;
  clienteId: string;
  cofradia: string | null;
  nombre: string | null;
  jornada: string | null;
  elemento: number | null;
  /** «Cruz de guía», «Primer paso», «La cofradía». */
  etiqueta: string;
  observada: string;
  puntos: number;
  bonus: number;
  contribuyo: boolean;
};

/** null mientras no se sabe (sin sesión o sin respuesta): nunca un 0 que no es. */
export function useMisAportaciones(): { puntos: number; aportaciones: MiAportacion[] } | null {
  const { usuario } = useSesion();
  const [datos, setDatos] = useState<{ puntos: number; aportaciones: MiAportacion[] } | null>(null);
  useEffect(() => {
    setDatos(null);
    if (!usuario) return;
    let vigente = true;
    const pedir = async () => {
      try {
        const r = await fetch("/api/yo/aportaciones", { headers: { Accept: "application/json", ...(await cabecerasSesion()) } });
        if (r.ok && vigente) setDatos(await r.json());
      } catch {
        /* sin conexión: se queda lo que hubiera */
      }
    };
    void pedir();
    // Sin pedirlos cada minuto (en la Madrugá serían miles de consultas, BUL-212): al abrir la pantalla,
    // al volver a la app (por si llegó un bonus) y cuando sale una de la cola de pendientes
    const alVolver = () => {
      if (document.visibilityState === "visible") void pedir();
    };
    document.addEventListener("visibilitychange", alVolver);
    const dejar = alCambiarCola(() => void pedir());
    return () => {
      vigente = false;
      document.removeEventListener("visibilitychange", alVolver);
      dejar();
    };
  }, [usuario?.id]);
  return datos;
}

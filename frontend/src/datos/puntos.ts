import { useEffect, useState } from "react";
import { alCambiarCola } from "./darFe";
import { cabecerasSesion, useSesion } from "./sesion";

/**
 * Tus puntos, tu nivel y tus aportaciones (P-19, P-22), de GET /api/yo/aportaciones.
 *
 * Los niveles son los cargos de una hermandad (BUL-219), siempre «en Cofradar»: nadie es Hermano
 * Mayor de verdad por dar fe. Doce, de Monaguillo (desde 0) a Hermano Mayor (5.500).
 */
export const NIVELES: readonly { nombre: string; desde: number }[] = [
  { nombre: "Monaguillo", desde: 0 },
  { nombre: "Nazareno de cirio", desde: 50 },
  { nombre: "Nazareno de insignia", desde: 120 },
  { nombre: "Acólito", desde: 250 },
  { nombre: "Costalero", desde: 450 },
  { nombre: "Contraguía", desde: 700 },
  { nombre: "Diputado de tramo", desde: 1000 },
  { nombre: "Fiscal de cruz", desde: 1500 },
  { nombre: "Fiscal de paso", desde: 2200 },
  { nombre: "Diputado mayor de gobierno", desde: 3000 },
  { nombre: "Capataz", desde: 4000 },
  { nombre: "Hermano Mayor", desde: 5500 },
];

export type Nivel = { numero: number; nombre: string; siguiente: { nombre: string; faltan: number; desde: number } | null; desde: number };

export function nivelDe(puntos: number): Nivel {
  let i = 0;
  while (i + 1 < NIVELES.length && puntos >= NIVELES[i + 1]!.desde) i++;
  const sig = NIVELES[i + 1];
  return {
    numero: i + 1,
    nombre: NIVELES[i]!.nombre,
    desde: NIVELES[i]!.desde,
    siguiente: sig ? { nombre: sig.nombre, faltan: sig.desde - puntos, desde: sig.desde } : null,
  };
}

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
    const id = window.setInterval(() => void pedir(), 60_000);
    // Cuando sale una de la cola de pendientes, ya está en el servidor
    const dejar = alCambiarCola(() => void pedir());
    return () => {
      vigente = false;
      window.clearInterval(id);
      dejar();
    };
  }, [usuario?.id]);
  return datos;
}

import { useEffect, useState } from "react";
import { cabecerasSesion, useSesion } from "./sesion";

/**
 * Tu número de hermano de Cofradar (F-54), de GET /api/yo/hermano: por orden de llegada, como la
 * antigüedad en una hermandad. No cambia nunca, así que se pide una vez por cuenta y se recuerda.
 */
export type Hermano = { numero: number; desde: string };

const recordado = new Map<string, Hermano>();

/** null mientras no se sabe, sin sesión o si la cuenta no tiene número. */
export function useHermano(): Hermano | null {
  const { usuario } = useSesion();
  const id = usuario?.id;
  const [h, setH] = useState<Hermano | null>(() => (id ? (recordado.get(id) ?? null) : null));
  useEffect(() => {
    if (!id) {
      setH(null);
      return;
    }
    const ya = recordado.get(id);
    setH(ya ?? null);
    if (ya) return;
    let vigente = true;
    void (async () => {
      try {
        const r = await fetch("/api/yo/hermano", { headers: { Accept: "application/json", ...(await cabecerasSesion()) } });
        const d = r.ok ? ((await r.json()) as { numero: number | null; desde: string | null }) : null;
        if (d?.numero && d.desde) {
          recordado.set(id, { numero: d.numero, desde: d.desde });
          if (vigente) setH({ numero: d.numero, desde: d.desde });
        }
      } catch {
        /* sin conexión: no se enseña */
      }
    })();
    return () => {
      vigente = false;
    };
  }, [id]);
  return h;
}

/** «noviembre de 2026» */
export const mesDe = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

/** «12 de noviembre de 2026» */
export const diaDe = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

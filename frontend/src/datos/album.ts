import { useEffect, useState } from "react";
import { cabecerasSesion, useSesion } from "./sesion";

/**
 * El álbum de estampas (F-56, P-35), de GET /api/album. Tres grados por hermandad: la conoces (5 preguntas
 * suyas acertadas con sesión), la has visto (Mi colección) y has dado fe (una aportación tuya ayudó a
 * situarla). Lo que no tienes va en blanco: nunca «te falta» (R5).
 */
export type Estampa = {
  cofradia: string;
  nombre: string;
  /** Dónde pedir el escudo y el titular a grabado; null si no hay */
  escudo: string | null;
  grabado: string | null;
  conoces: boolean;
  vista: number[];
  fe: number[];
};
export type Album = { estampas: number; jornadas: { id: number; nombre: string; orden: number; estampas: Estampa[] }[] };
export type NuevaEnAlbum = { cofradia: string; nombre: string };

export const grados = (e: Estampa) => Number(e.conoces) + Number(e.vista.length > 0) + Number(e.fe.length > 0);

/** El álbum, o null mientras llega; `fallo` si no se ha podido pedir. */
export function useAlbum(): { album: Album | null; fallo: boolean } {
  const { usuario } = useSesion();
  const [album, setAlbum] = useState<Album | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    setAlbum(null);
    setFallo(false);
    if (!usuario) return;
    let vigente = true;
    void (async () => {
      try {
        const r = await fetch("/api/album", { headers: { Accept: "application/json", ...(await cabecerasSesion()) }, cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const a = (await r.json()) as Album;
        if (vigente) setAlbum(a);
      } catch {
        if (vigente) setFallo(true);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [usuario?.id]);
  return { album, fallo };
}

/**
 * Los aciertos del trivial en solitario cuentan para «la conoces» si hay sesión (F-50). Se juega sin
 * conexión, así que los que no se pudieron enviar esperan en este teléfono y salen con el siguiente.
 * Solo se manda la pregunta y el texto elegido: el servidor comprueba que es la buena.
 */
type Acierto = { id: number; respuesta: string };
const clavePendientes = (usuario: string) => `cofradar:aciertos-pendientes:${usuario}`;

function leerPendientes(usuario: string): Acierto[] {
  try {
    const v = JSON.parse(localStorage.getItem(clavePendientes(usuario)) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as Acierto[]).slice(-200) : [];
  } catch {
    return [];
  }
}
function guardarPendientes(usuario: string, lista: Acierto[]) {
  try {
    if (lista.length) localStorage.setItem(clavePendientes(usuario), JSON.stringify(lista.slice(-200)));
    else localStorage.removeItem(clavePendientes(usuario));
  } catch {
    /* sin almacenamiento: se pierde este, nada más */
  }
}

/** Manda el acierto (y los que esperaban). Devuelve las estampas nuevas, o [] si no se pudo. */
export async function apuntarAcierto(usuario: string, acierto: Acierto): Promise<NuevaEnAlbum[]> {
  const lista = [...leerPendientes(usuario).filter((a) => a.id !== acierto.id), acierto];
  guardarPendientes(usuario, lista);
  try {
    const r = await fetch("/api/album/aciertos", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...(await cabecerasSesion()) },
      body: JSON.stringify({ aciertos: lista.slice(0, 50) }),
    });
    if (!r.ok) return [];
    const enviados = new Set(lista.slice(0, 50).map((a) => a.id));
    guardarPendientes(usuario, leerPendientes(usuario).filter((a) => !enviados.has(a.id)));
    return ((await r.json()) as { nuevas: NuevaEnAlbum[] }).nuevas;
  } catch {
    return [];
  }
}

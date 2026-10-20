import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Relacion } from "../componentes";
import { cabecerasSesion, useSesion } from "./sesion";

/**
 * Tu relación con cada cofradía: las que sigues y las que has visto (F-33, F-34).
 *
 * Es de la CUENTA, no del teléfono (decisión del 20/10/2026): sin sesión no hay
 * ninguna y no se guarda nada en el teléfono. Se pide a /api/yo/relaciones al
 * entrar, y cada cambio se ve al momento y se manda al servidor; si el
 * servidor no lo guarda, vuelve a como estaba y `cambiar…` devuelve falso para
 * que la pantalla lo diga.
 *
 * «Vista» es de la edición actual (`anio`): Mi colección (3.8) junta las de
 * todos los años.
 */
type Relaciones = {
  /** La marca de la fila: la vista manda sobre la seguida, porque dice más. */
  marca: (id: string) => Relacion | undefined;
  esSeguida: (id: string) => boolean;
  esVista: (id: string) => boolean;
  /** Hay sesión y ya llegaron del servidor. */
  listas: boolean;
  cambiarSeguida: (id: string, poner: boolean) => Promise<boolean>;
  cambiarVista: (id: string, poner: boolean) => Promise<boolean>;
};

type Estado = { anio: number; seguidas: Set<string>; vistas: Set<string> } | null;

const Contexto = createContext<Relaciones | null>(null);

async function pedir(metodo: "GET" | "PUT" | "DELETE", ruta: string) {
  const respuesta = await fetch(`/api/yo${ruta}`, {
    method: metodo,
    headers: { Accept: "application/json", ...(await cabecerasSesion()) },
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  return respuesta;
}

export function RelacionesProvider({ children }: { children: ReactNode }) {
  const { usuario } = useSesion();
  const [estado, setEstado] = useState<Estado>(null);
  const idUsuario = usuario?.id;

  useEffect(() => {
    setEstado(null);
    if (!idUsuario) return;
    let vigente = true;
    pedir("GET", "/relaciones")
      .then((r) => r.json() as Promise<{ anio: number; seguidas: string[]; vistas: { id: string; anio: number }[] }>)
      .then((d) => {
        if (!vigente) return;
        setEstado({
          anio: d.anio,
          seguidas: new Set(d.seguidas),
          vistas: new Set(d.vistas.filter((v) => v.anio === d.anio).map((v) => v.id)),
        });
      })
      .catch(() => {
        /* sin conexión o fallo: sin marcas hasta la próxima vez */
      });
    return () => {
      vigente = false;
    };
  }, [idUsuario]);

  const cambiar = useCallback(
    async (lista: "seguidas" | "vistas", id: string, poner: boolean) => {
      const tocar = (s: Estado): Estado => {
        if (!s) return s;
        const nueva = new Set(s[lista]);
        if (poner) nueva.add(id);
        else nueva.delete(id);
        return { ...s, [lista]: nueva };
      };
      setEstado(tocar);
      try {
        await pedir(poner ? "PUT" : "DELETE", `/${lista}/${encodeURIComponent(id)}`);
        return true;
      } catch {
        // Vuelve a como estaba
        setEstado((s) => {
          if (!s) return s;
          const nueva = new Set(s[lista]);
          if (poner) nueva.delete(id);
          else nueva.add(id);
          return { ...s, [lista]: nueva };
        });
        return false;
      }
    },
    [],
  );

  const valor = useMemo<Relaciones>(
    () => ({
      marca: (id) => (estado?.vistas.has(id) ? "vista" : estado?.seguidas.has(id) ? "seguida" : undefined),
      esSeguida: (id) => estado?.seguidas.has(id) ?? false,
      esVista: (id) => estado?.vistas.has(id) ?? false,
      listas: estado !== null,
      cambiarSeguida: (id, poner) => cambiar("seguidas", id, poner),
      cambiarVista: (id, poner) => cambiar("vistas", id, poner),
    }),
    [estado, cambiar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useRelaciones(): Relaciones {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useRelaciones fuera de RelacionesProvider");
  return valor;
}

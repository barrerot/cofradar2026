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
 * «Vista» es de la edición actual (`anio`) en las marcas y en «La he visto».
 * Mi colección (3.8) junta las de todos los años y puede añadir una de un año
 * anterior (`cambiarVista(id, true, 2019)`).
 */
type Relaciones = {
  /** La marca de la fila: la vista manda sobre la seguida, porque dice más. */
  marca: (id: string) => Relacion | undefined;
  esSeguida: (id: string) => boolean;
  esVista: (id: string) => boolean;
  /** Hay sesión y ya llegaron del servidor. */
  listas: boolean;
  /** Cuántas sigues y cuántas has visto este año (0 sin sesión). */
  seguidas: number;
  vistas: number;
  /** Sus ids, para Seguidas (3.7) y Mi colección (3.8). */
  idsSeguidas: readonly string[];
  idsVistas: readonly string[];
  /** Cuántas hermandades distintas has visto, cualquier año (Mi colección). */
  coleccion: number;
  /** La edición actual (el año de «La he visto»). */
  anio: number | null;
  /** Los años en que has visto cada una, de más reciente a más antiguo. */
  aniosVista: (id: string) => number[];
  cambiarSeguida: (id: string, poner: boolean) => Promise<boolean>;
  /** Sin `anio`, la edición actual. */
  cambiarVista: (id: string, poner: boolean, anio?: number) => Promise<boolean>;
};

/** `vistas` guarda «id|año». */
type Estado = { anio: number; seguidas: Set<string>; vistas: Set<string> } | null;
const clave = (id: string, anio: number) => `${id}|${anio}`;

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
          vistas: new Set(d.vistas.map((v) => clave(v.id, v.anio))),
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
    async (lista: "seguidas" | "vistas", id: string, poner: boolean, anio?: number) => {
      const k = lista === "vistas" && anio !== undefined ? clave(id, anio) : id;
      const tocar = (s: Estado, añadir: boolean): Estado => {
        if (!s) return s;
        const nueva = new Set(s[lista]);
        if (añadir) nueva.add(k);
        else nueva.delete(k);
        return { ...s, [lista]: nueva };
      };
      setEstado((s) => tocar(s, poner));
      try {
        const q = lista === "vistas" && anio !== undefined ? `?anio=${anio}` : "";
        await pedir(poner ? "PUT" : "DELETE", `/${lista}/${encodeURIComponent(id)}${q}`);
        return true;
      } catch {
        setEstado((s) => tocar(s, !poner)); // vuelve a como estaba
        return false;
      }
    },
    [],
  );

  const valor = useMemo<Relaciones>(() => {
    const esVista = (id: string) => (estado ? estado.vistas.has(clave(id, estado.anio)) : false);
    const idsVistas = estado
      ? [...estado.vistas].filter((k) => k.endsWith(`|${estado.anio}`)).map((k) => k.slice(0, k.lastIndexOf("|")))
      : [];
    return {
      marca: (id) => (esVista(id) ? "vista" : estado?.seguidas.has(id) ? "seguida" : undefined),
      esSeguida: (id) => estado?.seguidas.has(id) ?? false,
      esVista,
      listas: estado !== null,
      seguidas: estado?.seguidas.size ?? 0,
      vistas: idsVistas.length,
      idsSeguidas: estado ? [...estado.seguidas] : [],
      idsVistas,
      anio: estado?.anio ?? null,
      coleccion: estado ? new Set([...estado.vistas].map((k) => k.slice(0, k.lastIndexOf("|")))).size : 0,
      aniosVista: (id) =>
        estado
          ? [...estado.vistas]
              .filter((k) => k.startsWith(`${id}|`))
              .map((k) => Number(k.slice(id.length + 1)))
              .sort((a, b) => b - a)
          : [],
      cambiarSeguida: (id, poner) => cambiar("seguidas", id, poner),
      cambiarVista: (id, poner, anio) => cambiar("vistas", id, poner, anio ?? estado?.anio),
    };
  }, [estado, cambiar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useRelaciones(): Relaciones {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useRelaciones fuera de RelacionesProvider");
  return valor;
}

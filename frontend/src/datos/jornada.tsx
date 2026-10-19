import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useDato, type Dato } from "./useDato";

/**
 * La jornada consultada (§8.2): la que lleva la cabecera de todas las áreas y
 * la que decide qué cofradías van primero. Sale de GET /api/jornadas.
 *
 * Se elige a mano en la hoja «Elegir jornada» (P-06, rutas/SelectorJornada).
 * Mientras no se elige, se consulta la de hoy; si hoy no hay ninguna, la
 * próxima; y si ya han pasado todas (fuera de temporada, con los datos del año
 * anterior), el Domingo de Ramos, que es a la que apunta la cuenta atrás
 * (2-inicio/inicio-D).
 *
 * La elegida se recuerda durante la sesión (sessionStorage): sobrevive a una
 * recarga, pero al día siguiente se vuelve a abrir en la de hoy.
 */
export type Jornada = {
  id: number;
  nombre: string;
  orden: number;
  /** AAAA-MM-DD de la primera salida. La Madrugá cae el mismo día que el Viernes Santo. */
  fecha: string | null;
  cofradias: number;
};

type ContextoJornada = {
  jornadas: Dato<Jornada[]>;
  consultada: Jornada | null;
  /** La de hoy, si hoy hay jornada. Fuera de temporada, ninguna. */
  hoy: Jornada | null;
  elegir: (id: number) => void;
};

const CLAVE_SESION = "cofradar:jornada-elegida";

function leerElegida(): number | null {
  try {
    const v = sessionStorage.getItem(CLAVE_SESION);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

const Contexto = createContext<ContextoJornada | null>(null);

function hoyLocal(ahora: Date): string {
  const d = (n: number) => String(n).padStart(2, "0");
  return `${ahora.getFullYear()}-${d(ahora.getMonth() + 1)}-${d(ahora.getDate())}`;
}

/** La jornada de hoy, si la hay. */
export function jornadaDeHoy(jornadas: readonly Jornada[], ahora: Date): Jornada | null {
  const hoy = hoyLocal(ahora);
  const deHoy = [...jornadas].sort((a, b) => a.orden - b.orden).filter((j) => j.fecha === hoy);
  // Dos jornadas el mismo día (Madrugá y Viernes Santo): hasta las 14:00, la de madrugada
  if (deHoy.length === 0) return null;
  return ahora.getHours() < 14 ? deHoy[0]! : deHoy[deHoy.length - 1]!;
}

export function jornadaPorDefecto(jornadas: readonly Jornada[], ahora: Date): Jornada | null {
  const ordenadas = [...jornadas].sort((a, b) => a.orden - b.orden);
  const hoy = hoyLocal(ahora);
  return (
    jornadaDeHoy(ordenadas, ahora) ??
    ordenadas.find((j) => j.fecha !== null && j.fecha > hoy) ??
    ordenadas.find((j) => j.nombre === "Domingo de Ramos") ??
    ordenadas[0] ??
    null
  );
}

export function JornadaProvider({ children }: { children: ReactNode }) {
  // Las jornadas no cambian durante el día: basta con pedirlas cada 10 minutos
  const jornadas = useDato<Jornada[]>("/jornadas", { cadaMs: 600_000 });
  const [elegida, setElegida] = useState<number | null>(leerElegida);

  const valor = useMemo(() => {
    const lista = jornadas.datos ?? [];
    const ahora = new Date();
    const consultada = lista.find((j) => j.id === elegida) ?? jornadaPorDefecto(lista, ahora);
    const elegir = (id: number) => {
      setElegida(id);
      try {
        sessionStorage.setItem(CLAVE_SESION, String(id));
      } catch {
        /* Sin almacenamiento, se recuerda solo mientras la página esté abierta. */
      }
    };
    return { jornadas, consultada, hoy: jornadaDeHoy(lista, ahora), elegir };
  }, [jornadas, elegida]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useJornada(): ContextoJornada {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useJornada fuera de <JornadaProvider>");
  return valor;
}

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useDato, type Dato } from "./useDato";

/**
 * La jornada consultada (§8.2): la que lleva la cabecera de todas las áreas y
 * la que decide qué cofradías van primero. Sale de GET /api/jornadas.
 *
 * Elegirla a mano es la hoja «Elegir jornada» (P-06, issue 1.6). Mientras no
 * se elige, se consulta la de hoy; si hoy no hay ninguna, la próxima; y si ya
 * han pasado todas (fuera de temporada, con los datos del año anterior), la
 * primera de la semana.
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
  elegir: (id: number) => void;
};

const Contexto = createContext<ContextoJornada | null>(null);

function hoyLocal(ahora: Date): string {
  const d = (n: number) => String(n).padStart(2, "0");
  return `${ahora.getFullYear()}-${d(ahora.getMonth() + 1)}-${d(ahora.getDate())}`;
}

export function jornadaPorDefecto(jornadas: readonly Jornada[], ahora: Date): Jornada | null {
  const ordenadas = [...jornadas].sort((a, b) => a.orden - b.orden);
  const hoy = hoyLocal(ahora);
  const deHoy = ordenadas.filter((j) => j.fecha === hoy);
  // Dos jornadas el mismo día (Madrugá y Viernes Santo): hasta las 14:00, la de madrugada
  if (deHoy.length > 0) return ahora.getHours() < 14 ? deHoy[0]! : deHoy[deHoy.length - 1]!;
  return ordenadas.find((j) => j.fecha !== null && j.fecha > hoy) ?? ordenadas[0] ?? null;
}

export function JornadaProvider({ children }: { children: ReactNode }) {
  // Las jornadas no cambian durante el día: basta con pedirlas cada 10 minutos
  const jornadas = useDato<Jornada[]>("/jornadas", { cadaMs: 600_000 });
  const [elegida, setElegida] = useState<number | null>(null);

  const valor = useMemo(() => {
    const lista = jornadas.datos ?? [];
    const consultada = lista.find((j) => j.id === elegida) ?? jornadaPorDefecto(lista, new Date());
    return { jornadas, consultada, elegir: setElegida };
  }, [jornadas, elegida]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useJornada(): ContextoJornada {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useJornada fuera de <JornadaProvider>");
  return valor;
}

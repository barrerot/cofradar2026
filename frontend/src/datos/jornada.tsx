import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { diaProximo } from "./fechas";
import { ahora as relojAhora } from "./reloj";
import { useDato, type Dato } from "./useDato";

/**
 * La jornada consultada (§8.2): la que lleva la cabecera de todas las áreas y
 * la que decide qué cofradías van primero. Sale de GET /api/jornadas.
 *
 * Se elige a mano en la hoja «Elegir jornada» (P-06, rutas/SelectorJornada).
 * Mientras no se elige, se consulta la de hoy; dentro de la Semana Santa, si
 * hoy no hay ninguna, la siguiente; y fuera de temporada, el Domingo de
 * Ramos, que es a la que apunta la cuenta atrás (2-inicio/inicio-D). Los días
 * son los de la próxima Semana Santa (`dia`), aunque los datos sean de otra.
 *
 * La elegida se recuerda durante la sesión (sessionStorage): sobrevive a una
 * recarga, pero al día siguiente se vuelve a abrir en la de hoy.
 */
export type Jornada = {
  id: number;
  nombre: string;
  orden: number;
  /** AAAA-MM-DD de la primera salida en los datos (su edición). La Madrugá cae el mismo día que el Viernes Santo. */
  fecha: string | null;
  /**
   * El mismo día en la PRÓXIMA Semana Santa (datos/fechas.ts). Es el que vale
   * para «hoy» y para la cuenta atrás: los datos pueden ser del año anterior.
   */
  dia?: string | null;
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

/** El día de la próxima Semana Santa de cada jornada, «2027-03-21». */
function conDia(jornadas: readonly Jornada[], ahora: Date): Jornada[] {
  return jornadas.map((j) => ({ ...j, dia: j.fecha ? hoyLocal(diaProximo(j.fecha, ahora)) : null }));
}

/** La jornada de hoy, si la hay. */
export function jornadaDeHoy(jornadas: readonly Jornada[], ahora: Date): Jornada | null {
  const hoy = hoyLocal(ahora);
  const deHoy = [...jornadas].sort((a, b) => a.orden - b.orden).filter((j) => j.dia === hoy);
  // Dos jornadas el mismo día (Madrugá y Viernes Santo): hasta las 14:00, la de madrugada
  if (deHoy.length === 0) return null;
  return ahora.getHours() < 14 ? deHoy[0]! : deHoy[deHoy.length - 1]!;
}

export function jornadaPorDefecto(jornadas: readonly Jornada[], ahora: Date): Jornada | null {
  const ordenadas = [...jornadas].sort((a, b) => a.orden - b.orden);
  const hoy = hoyLocal(ahora);
  const dias = ordenadas.map((j) => j.dia).filter((d): d is string => !!d).sort();
  // Dentro de la Semana Santa, la siguiente; fuera de ella, el Domingo de Ramos de la cuenta atrás
  const enSemana = dias.length > 0 && hoy >= dias[0]! && hoy <= dias[dias.length - 1]!;
  return (
    jornadaDeHoy(ordenadas, ahora) ??
    (enSemana ? ordenadas.find((j) => j.dia != null && j.dia > hoy) : undefined) ??
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
    const ahora = relojAhora();
    const lista = conDia(jornadas.datos ?? [], ahora);
    const consultada = lista.find((j) => j.id === elegida) ?? jornadaPorDefecto(lista, ahora);
    const elegir = (id: number) => {
      setElegida(id);
      try {
        sessionStorage.setItem(CLAVE_SESION, String(id));
      } catch {
        /* Sin almacenamiento, se recuerda solo mientras la página esté abierta. */
      }
    };
    return { jornadas: { ...jornadas, datos: jornadas.datos ? lista : null }, consultada, hoy: jornadaDeHoy(lista, ahora), elegir };
  }, [jornadas, elegida]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useJornada(): ContextoJornada {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useJornada fuera de <JornadaProvider>");
  return valor;
}

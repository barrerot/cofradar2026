import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Intensidad } from "../fixture";
import { useJornada, type Jornada } from "./jornada";
import { ahora as relojAhora } from "./reloj";
import { useDato } from "./useDato";

/**
 * Qué está pasando hoy SEGÚN EL HORARIO del programa (3.5, sin motor).
 *
 *   fuera-temporada  hoy no es ningún día de la próxima Semana Santa
 *   sin-actividad    es jornada, pero según el horario no hay nadie en la calle
 *                    (antes de la primera salida o después de la última entrada)
 *   activa           entre la primera salida y la última entrada de hoy
 *
 * Es una estimación del programa, no lo que pasa en la calle: el motor (fase
 * 4) la sustituye con lo que la gente ve. Por eso las pantallas que la usan lo
 * dicen («según horario»).
 *
 * Las horas de los datos pueden ser de la edición anterior: cada una se lleva
 * al día de la próxima Semana Santa conservando su hora y su desfase de días
 * respecto a la jornada (la Madrugá entra al día siguiente de salir… o no).
 */
export type SalidaDeHoy = {
  id: string;
  nombre: string;
  templo: string | null;
  salida: Date | null;
  entrada: Date | null;
};

type Actividad = {
  intensidad: Intensidad;
  /** La jornada de hoy, si la hay. */
  hoy: Jornada | null;
  /** Las cofradías de hoy con sus horas llevadas a hoy, por hora de salida. */
  salidas: SalidaDeHoy[];
  ahora: Date;
};

type FilaApi = {
  id: string;
  nombre: string;
  templo: string | null;
  horaSalida: string | null;
  horaEntrada: string | null;
};

const Contexto = createContext<Actividad | null>(null);

/** «2026-04-03T00:30» de la jornada con fecha «2026-04-03» → ese momento en su día de la próxima Semana Santa. */
export function aHoy(hora: string | null, jornada: Jornada): Date | null {
  if (!hora || !jornada.fecha || !jornada.dia) return null;
  const desfase = Math.round((Date.parse(`${hora.slice(0, 10)}T12:00`) - Date.parse(`${jornada.fecha}T12:00`)) / 86_400_000);
  const d = new Date(`${jornada.dia}T${hora.slice(11, 16)}`);
  d.setDate(d.getDate() + desfase);
  return d;
}

export function ActividadProvider({ children }: { children: ReactNode }) {
  const { jornadas, hoy, consultada } = useJornada();
  // Siempre se pide una lista (la de hoy o, si no hay, la consultada, que ya se pide en Agenda)
  const lista = useDato<FilaApi[]>(`/cofradias?jornada=${hoy?.id ?? consultada?.id ?? 0}`, { cadaMs: 600_000 });
  const [ahora, setAhora] = useState(() => relojAhora());

  // El horario avanza solo: se mira cada minuto
  useEffect(() => {
    const id = window.setInterval(() => setAhora(relojAhora()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const valor = useMemo<Actividad>(() => {
    const salidas: SalidaDeHoy[] =
      hoy && lista.datos
        ? lista.datos
            .map((c) => ({ id: c.id, nombre: c.nombre, templo: c.templo, salida: aHoy(c.horaSalida, hoy), entrada: aHoy(c.horaEntrada, hoy) }))
            .sort((a, b) => (a.salida?.getTime() ?? 0) - (b.salida?.getTime() ?? 0))
        : [];
    let intensidad: Intensidad = "fuera-temporada";
    const dias = (jornadas.datos ?? []).map((j) => j.dia).filter((d): d is string => !!d).sort();
    const hoyTexto = ahora.toLocaleDateString("sv-SE");
    if (hoy || (dias.length && hoyTexto >= dias[0]! && hoyTexto <= dias[dias.length - 1]!)) {
      const t = ahora.getTime();
      const enCalle = salidas.some((s) => s.salida && s.entrada && s.salida.getTime() <= t && t < s.entrada.getTime());
      intensidad = enCalle ? "activa" : "sin-actividad";
    }
    return { intensidad, hoy, salidas, ahora };
  }, [hoy, lista.datos, jornadas.datos, ahora]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useActividad(): Actividad {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useActividad fuera de ActividadProvider");
  return valor;
}

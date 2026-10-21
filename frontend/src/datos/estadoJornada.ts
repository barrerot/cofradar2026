import type { CofradiaMapa, EstadoJornadaMotor } from "./mapa";
import { desfaseReloj } from "./reloj";
import { useDato, type Dato } from "./useDato";

/**
 * Lo que dice el motor de una jornada, cada 30 segundos (GET /api/jornadas/:id/estado), y lo que no
 * cambia en toda la noche, los recorridos (GET /api/jornadas/:id/mapa). Lo usan el mapa y «Dar fe».
 *
 * Con el reloj de prueba (?ahora=), se le dice al servidor cuánto va adelantado: así la dirección es
 * siempre la misma y se guarda igual que cualquier otro dato.
 */
export function useEstadoJornada(jornada: number | null | undefined): Dato<EstadoJornadaMotor> {
  const desfase = desfaseReloj();
  return useDato<EstadoJornadaMotor>(`/jornadas/${jornada ?? 0}/estado${desfase ? `?desfase=${desfase}` : ""}`, { cadaMs: 30_000 });
}

export function useMapaJornada(jornada: number | null | undefined): Dato<CofradiaMapa[]> {
  return useDato<CofradiaMapa[]>(`/jornadas/${jornada ?? 0}/mapa`, { cadaMs: 600_000 });
}

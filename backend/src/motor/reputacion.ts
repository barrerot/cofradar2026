/**
 * La reputación de cada persona (4.13; PRD, «Puntos y reputación son dos monedas distintas»).
 *
 * Interna y sin número visible. No se guarda: sale de su historial de aportaciones cada vez.
 *
 *   - Empieza en 0,5 y SUBE DESPACIO con cada aportación que consolida: 10 consolidadas la llevan a
 *     0,67; 50, a 0,86. Nunca pasa de 1.
 *   - SOLO BAJA ANTE PATRONES, nunca por un fallo aislado, mala cobertura o una ubicación imprecisa:
 *     hacen falta al menos PATRON.minimo aportaciones juzgadas y que la mayoría (PATRON.proporcion) sean
 *     contradichas. Con inercia: quien tiene un buen historial necesita muchas más para caer.
 *   - Discrepar de la estimación NO cuenta: «sin resolver» no resta nada. Solo «contradicha», que es lo
 *     que dicen otras personas a la vez.
 *
 * El motor la usa para una sola cosa: alguien por debajo de UMBRAL no cuenta para que un dato consolide.
 * Sus aportaciones se guardan igual y siguen dando puntos base.
 */
export type Historial = { consolidadas: number; contradichas: number };

export const UMBRAL = 0.2;
export const PATRON = { minimo: 8, proporcion: 0.6 };

export function reputacion({ consolidadas, contradichas }: Historial): number {
  const sube = 0.5 + 0.5 * (consolidadas / (consolidadas + 20));
  const juzgadas = consolidadas + contradichas;
  // La inercia: cada consolidada pesa como dos contradichas a la hora de ver un patrón
  const patron = juzgadas >= PATRON.minimo && contradichas >= PATRON.proporcion * (contradichas + 2 * consolidadas);
  return patron ? 0.1 : sube;
}

export const cuenta = (h: Historial) => reputacion(h) >= UMBRAL;

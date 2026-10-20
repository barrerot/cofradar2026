/**
 * El horario de una salida, tal como lo da /api/cofradias/:id: un punto por
 * lugar con la hora prevista de la cruz de guía o del último paso.
 */
export type Punto = { orden: number; lugar: { id: number; nombre: string }; hora: string; publicada: boolean };

export type Fila = { lugar: { id: number; nombre: string }; cruz?: Punto; paso?: Punto };

/*
 * La cruz y el último paso no siempre pasan por los mismos sitios (La
 * Borriquita: la cruz por Amor de Dios, el paso por San Miguel).
 */
/**
 * Cose las dos listas en el orden del recorrido. Si un lugar está en las dos,
 * va en la misma fila; si solo está en una, en la suya, en su sitio.
 */
export function coser(cruz: Punto[], paso: Punto[]): Fila[] {
  const filas: Fila[] = [];
  let i = 0;
  let j = 0;
  const a = [...cruz].sort((x, y) => x.orden - y.orden);
  const b = [...paso].sort((x, y) => x.orden - y.orden);
  while (i < a.length || j < b.length) {
    const c = a[i];
    const p = b[j];
    if (c && p && c.lugar.id === p.lugar.id) {
      filas.push({ lugar: c.lugar, cruz: c, paso: p });
      i++;
      j++;
    } else if (c && p) {
      // Va primero el lugar que el otro no tiene más adelante; si ninguno lo tiene, el de la cruz
      const pasoLoTieneLuego = b.slice(j + 1).some((x) => x.lugar.id === c.lugar.id);
      const cruzLoTieneLuego = a.slice(i + 1).some((x) => x.lugar.id === p.lugar.id);
      if (pasoLoTieneLuego && !cruzLoTieneLuego) {
        filas.push({ lugar: p.lugar, paso: p });
        j++;
      } else {
        filas.push({ lugar: c.lugar, cruz: c });
        i++;
      }
    } else if (c) {
      filas.push({ lugar: c.lugar, cruz: c });
      i++;
    } else if (p) {
      filas.push({ lugar: p.lugar, paso: p });
      j++;
    }
  }
  return filas;
}


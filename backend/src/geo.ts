/**
 * Geometría sencilla sobre el recorrido de una salida (Sevilla cabe en un plano).
 *
 * Una línea es una lista de [longitud, latitud]. Se pasa a metros con una
 * proyección equirectangular centrada en Sevilla: a esta escala (unos pocos
 * kilómetros) el error es de centímetros, y no hace falta ninguna librería.
 */
export type Coord = [number, number];

const LAT0 = (37.39 * Math.PI) / 180;
const M_LON = 111_320 * Math.cos(LAT0);
const M_LAT = 110_540;

const xy = ([lon, lat]: Coord): [number, number] => [lon * M_LON, lat * M_LAT];

/** Metros acumulados en cada vértice de la línea. */
export function acumulados(linea: Coord[]): number[] {
  const res = [0];
  for (let i = 1; i < linea.length; i++) {
    const [ax, ay] = xy(linea[i - 1]!);
    const [bx, by] = xy(linea[i]!);
    res.push(res[i - 1]! + Math.hypot(bx - ax, by - ay));
  }
  return res;
}

/** Cada tramo de la línea: dónde cae el punto sobre él (metros desde el principio) y a qué distancia queda. */
function sobreTramos(linea: Coord[], acum: number[], punto: Coord): { m: number; d: number }[] {
  const [px, py] = xy(punto);
  const res: { m: number; d: number }[] = [];
  for (let i = 1; i < linea.length; i++) {
    const [ax, ay] = xy(linea[i - 1]!);
    const [bx, by] = xy(linea[i]!);
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    res.push({ m: acum[i - 1]! + t * Math.sqrt(l2), d: Math.hypot(ax + t * dx - px, ay + t * dy - py) });
  }
  return res;
}

/**
 * Sitúa una lista ORDENADA de lugares sobre la línea, en metros desde el principio.
 *
 * Un recorrido puede pasar varias veces por el mismo sitio: sale y entra por el
 * mismo templo, o sube y baja por Feria. Mirar cada lugar por separado lo
 * mandaría a la pasada equivocada. Por eso, para cada lugar se toman como
 * candidatas todas las pasadas cercanas (los mínimos locales de distancia), y
 * se elige la combinación que respeta el orden de la lista y queda más cerca
 * en total (programación dinámica; son pocas decenas de lugares).
 *
 * Además, la hora orienta: si un lugar está a mitad de la noche (`fracciones`,
 * de 0 a 1 entre la primera y la última hora), su pasada buena está, más o
 * menos, a mitad del recorrido. Pesa poco (`PESO_HORA`: 1 km de desvío cuenta
 * como 150 m de distancia), lo justo para elegir entre dos pasadas igual de
 * cercanas, como la ida y la vuelta por la misma calle.
 *
 * Los lugares sin coordenadas salen `null`.
 */
const PESO_HORA = 0.15;
/** Lo que cuesta dejar un lugar sin situar: más que cualquier pasada razonable (unos 300 m). */
const COSTE_SALTO = 300;

export function situarEnOrden(linea: Coord[], lugares: (Coord | null)[], fracciones?: number[]): (number | null)[] {
  if (linea.length < 2) return lugares.map(() => null);
  const acum = acumulados(linea);
  const total = acum[acum.length - 1]!;
  const candidatas = lugares.map((p, i) => {
    if (!p) return [];
    const esperado = fracciones?.[i] === undefined ? null : fracciones[i]! * total;
    const tramos = sobreTramos(linea, acum, p).map((t) => ({
      ...t,
      d: t.d,
      coste: t.d + (esperado === null ? 0 : PESO_HORA * Math.abs(t.m - esperado)),
    }));
    const minimo = Math.min(...tramos.map((t) => t.d));
    // Pasadas: mínimos locales de distancia, no mucho peores que la mejor
    const res = tramos.filter(
      (t, i) => (i === 0 || t.d <= tramos[i - 1]!.d) && (i === tramos.length - 1 || t.d <= tramos[i + 1]!.d) && t.d <= Math.max(150, minimo * 2 + 50),
    );
    return res.length ? res : [tramos.reduce((a, b) => (b.d < a.d ? b : a))];
  });

  // Estados: dónde vamos (m), coste acumulado y de qué estado venimos. En cada lugar se puede
  // elegir una de sus pasadas (respetando el orden) o SALTARLO, con un coste fijo: así un lugar
  // que no encaja con el trazado (provisional) se queda sin situar en vez de desordenar el resto.
  type Estado = { m: number; c: number; previo: Estado | null; lugar: number; elegido: boolean };
  let estados: Estado[] = [{ m: 0, c: 0, previo: null, lugar: -1, elegido: false }];
  lugares.forEach((_, i) => {
    const nuevos: Estado[] = estados.map((e) => ({ m: e.m, c: e.c + COSTE_SALTO, previo: e, lugar: i, elegido: false }));
    for (const cand of candidatas[i]!) {
      let mejor: Estado | null = null;
      for (const e of estados) if (cand.m + 5 >= e.m && (!mejor || e.c < mejor.c)) mejor = e;
      if (mejor) nuevos.push({ m: cand.m, c: mejor.c + cand.coste, previo: mejor, lugar: i, elegido: true });
    }
    // Poda: para cada posición basta con el estado más barato, y se quedan los mejores
    nuevos.sort((x, y) => x.c - y.c);
    estados = nuevos.filter((e, k) => nuevos.findIndex((o) => Math.abs(o.m - e.m) < 1) === k).slice(0, 40);
  });

  const res: (number | null)[] = lugares.map(() => null);
  for (let e: Estado | null = estados.reduce((x, y) => (y.c < x.c ? y : x)); e && e.lugar >= 0; e = e.previo) {
    if (e.elegido) res[e.lugar] = e.m;
  }
  return res;
}

/** El punto de la línea a `m` metros del principio. */
export function puntoEn(linea: Coord[], acum: number[], m: number): Coord {
  if (linea.length === 0) throw new Error("Línea vacía");
  if (m <= 0) return linea[0]!;
  const i = acum.findIndex((x) => x >= m);
  if (i <= 0) return linea[linea.length - 1]!;
  const [a, b] = [linea[i - 1]!, linea[i]!];
  const tramo = acum[i]! - acum[i - 1]!;
  const t = tramo === 0 ? 0 : (m - acum[i - 1]!) / tramo;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Las veces que la línea pasa cerca de un punto (metros desde el principio y distancia), de la más
 * cercana a la más lejana. Una calle que se recorre a la ida y a la vuelta da dos pasadas.
 *
 * Cada tramo cercano da una candidata; las que caen a menos de `2 · hasta` metros de recorrido una de
 * otra son la misma pasada (una calle partida en varios tramos) y se queda la más cercana.
 */
export function pasadas(linea: Coord[], acum: number[], punto: Coord, hasta: number): { m: number; d: number }[] {
  const cerca = sobreTramos(linea, acum, punto).filter((t) => t.d <= hasta);
  const res: { m: number; d: number }[] = [];
  for (const t of cerca) {
    const ultima = res[res.length - 1];
    if (ultima && t.m - ultima.m < 2 * hasta) {
      if (t.d < ultima.d) res[res.length - 1] = t;
    } else res.push(t);
  }
  return res.sort((a, b) => a.d - b.d);
}

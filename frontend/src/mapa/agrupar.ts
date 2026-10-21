/**
 * Geometría de pantalla para el mapa (4.4): agrupar marcas que se pisan y situar en el borde las que
 * no caben. Todo en píxeles de pantalla: lo que se pisa depende del zoom, no de los metros.
 */
export type EnPantalla = { id: string; x: number; y: number };

/**
 * Grupos de marcas a menos de `radio` px unas de otras (por cercanía a la primera de cada grupo, que
 * con una docena de cofradías basta). Los grupos de una son marcas sueltas.
 */
export function agrupar(puntos: EnPantalla[], radio: number): EnPantalla[][] {
  const grupos: EnPantalla[][] = [];
  for (const p of puntos) {
    const g = grupos.find((x) => Math.hypot(x[0]!.x - p.x, x[0]!.y - p.y) < radio);
    if (g) g.push(p);
    else grupos.push([p]);
  }
  return grupos;
}

const RUMBOS = ["norte", "noreste", "este", "sureste", "sur", "suroeste", "oeste", "noroeste"];

/** «al noreste»: hacia dónde queda algo, visto desde el centro de la pantalla (y crece hacia abajo). */
export function rumbo(dx: number, dy: number): string {
  const grados = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return `al ${RUMBOS[Math.round(((grados + 360) % 360) / 45) % 8]}`;
}

/**
 * Dónde poner, en el borde de la caja (`ancho` × `alto`, con márgenes), la etiqueta de algo que queda
 * fuera en la dirección (dx, dy) desde el centro.
 */
export function alBorde(
  dx: number,
  dy: number,
  ancho: number,
  alto: number,
  margen: { arriba: number; abajo: number; lados: number },
): { x: number; y: number } {
  const cx = ancho / 2;
  const cy = alto / 2;
  const mx = cx - margen.lados;
  const sy = dy < 0 ? cy - margen.arriba : alto - margen.abajo - cy;
  const t = Math.min(dx === 0 ? Infinity : mx / Math.abs(dx), dy === 0 ? Infinity : sy / Math.abs(dy));
  return { x: cx + dx * t, y: cy + dy * t };
}

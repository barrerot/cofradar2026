import { TRAZOS, type NombreTrazo } from "../marco/trazos";
import { lineaHermano, tituloTarjeta, type ClaveLinea, type Tarjeta } from "./ano";

/**
 * La imagen que se comparte de «Tu Semana Santa» (12-ano-cofrade/27 y 29b): la tarjeta sola, vertical,
 * 1080 × 1920 (estados de WhatsApp e historias). Siempre en claro, aunque el teléfono esté en oscuro. Se
 * dibuja a mano en un canvas con las mismas fuentes e iconos de la app: nada sale del teléfono.
 */
export const ANCHO = 1080;
export const ALTO = 1920;

// Los colores del tema claro (bundle.css y dia.css), fijos: la imagen no cambia con el tema
const C = {
  fondo: "#F7F1E6", // cera-100
  papel: "#FDF9F1", // cera-50
  borde: "#DFD3BE", // cera-300
  divisor: "#C9B896", // cera-400
  tinta: "#1D1A16",
  secundario: "#4A443C",
  marca: "#6E1C2F",
  llama: "#B86B3C",
};

const SANS = '"Inter", system-ui, sans-serif';
const SERIF = '"Newsreader", Georgia, serif';

const ICONO: Record<Exclude<ClaveLinea, "cirio">, { trazo: NombreTrazo; color: string }> = {
  vistas: { trazo: "vista", color: C.marca },
  fe: { trazo: "darFeVerificada", color: C.marca },
  preguntas: { trazo: "trivial", color: C.tinta },
  partidas: { trazo: "trivial", color: C.tinta },
  estampas: { trazo: "album", color: C.marca },
};

/** Parte un texto en renglones que quepan en `ancho`. `corte`: por dónde se puede partir. */
function renglones(ctx: CanvasRenderingContext2D, texto: string, ancho: number, corte: RegExp = / /): string[] {
  const trozos = texto.split(new RegExp(`(?<=${corte.source})`));
  const lineas: string[] = [];
  let actual = "";
  for (const t of trozos) {
    const prueba = actual + t;
    if (actual && ctx.measureText(prueba.trimEnd()).width > ancho) {
      lineas.push(actual.trimEnd());
      actual = t;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual.trimEnd());
  return lineas;
}

function icono(ctx: CanvasRenderingContext2D, nombre: NombreTrazo, x: number, y: number, lado: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(lado / 256, lado / 256);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(TRAZOS[nombre]));
  ctx.restore();
}

/** El cirio encendido de la app (PreguntaDelDia.tsx, viewBox 0 0 20 48), de `alto` píxeles. */
function cirio(ctx: CanvasRenderingContext2D, x: number, y: number, alto: number) {
  const k = alto / 48;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.lineWidth = 3.6 / k;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = C.tinta;
  ctx.beginPath();
  ctx.roundRect(6, 21, 8, 25.5, 1.2);
  ctx.stroke();
  ctx.stroke(new Path2D("M10 21 V18"));
  const llama = new Path2D("M10 4.5 C12.6 8.2 13.6 10.6 13.6 12.7 C13.6 14.9 12 16.6 10 16.6 C8 16.6 6.4 14.9 6.4 12.7 C6.4 10.6 7.4 8.2 10 4.5 Z");
  ctx.fillStyle = C.llama;
  ctx.strokeStyle = C.llama;
  ctx.fill(llama);
  ctx.stroke(llama);
  ctx.restore();
}

function rayita(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = C.tinta;
  ctx.fillRect(ANCHO / 2 - 34, y, 68, 3);
}

export async function dibujarTarjeta(t: Tarjeta): Promise<Blob> {
  // Las fuentes de la app, ya cargadas o a punto: sin ellas, el canvas tiraría de las del sistema
  await Promise.all(
    [`600 48px ${SANS}`, `500 38px ${SANS}`, `600 84px ${SERIF}`, `700 36px ${SANS}`].map((f) => document.fonts.load(f).catch(() => [])),
  );
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext("2d")!;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = C.fondo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  // El papel, su marco fino y el filete de 2 px de la estampa completa (×3)
  ctx.fillStyle = C.papel;
  ctx.beginPath();
  ctx.roundRect(48, 72, ANCHO - 96, ALTO - 144, 12);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.borde;
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = C.tinta;
  ctx.strokeRect(79, 103, ANCHO - 158, ALTO - 206);

  // Arriba: «Cofradar» espaciado y el año
  ctx.textAlign = "center";
  ctx.fillStyle = C.tinta;
  ctx.font = `700 36px ${SANS}`;
  ctx.letterSpacing = "5px";
  ctx.fillText("Cofradar", ANCHO / 2, 220);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = C.secundario;
  ctx.font = `400 36px ${SANS}`;
  ctx.fillText(`Semana Santa de Sevilla · ${t.anio}`, ANCHO / 2, 272);
  rayita(ctx, 333);

  // El alias en Newsreader: si no cabe, se parte por los guiones bajos, nunca a mitad de palabra
  ctx.fillStyle = C.tinta;
  ctx.font = `600 84px ${SERIF}`;
  let y = 450;
  for (const r of renglones(ctx, tituloTarjeta(t), 840, /_/)) {
    ctx.fillText(r, ANCHO / 2, y);
    y += 92;
  }
  const hermano = lineaHermano(t);
  if (hermano) {
    ctx.fillStyle = C.secundario;
    ctx.font = `400 38px ${SANS}`;
    y -= 92 - 72;
    for (const r of renglones(ctx, hermano, 760)) {
      ctx.fillText(r, ANCHO / 2, y);
      y += 56;
    }
  }
  const arriba = y;

  // Las líneas del año, alineadas a la izquierda con su icono, en el centro del hueco que queda
  ctx.font = `600 48px ${SANS}`;
  const partes = t.lineas.map((l) => ({ l, r: renglones(ctx, l.texto, 680) }));
  const RENGLON = 70;
  const ENTRE = 48;
  const alto = 2 + 70 + partes.reduce((s, p) => s + p.r.length * RENGLON, 0) + ENTRE * (partes.length - 1);
  const abajo = 1640;
  y = Math.max(arriba + 60, arriba + (abajo - arriba - alto) / 2);
  ctx.fillStyle = C.divisor;
  ctx.fillRect(144, y, ANCHO - 288, 2);
  y += 72;
  ctx.textAlign = "left";
  for (const { l, r } of partes) {
    if (l.clave === "cirio") cirio(ctx, 158, y - 46, 60);
    else icono(ctx, ICONO[l.clave].trazo, 145, y - 44, 60, ICONO[l.clave].color);
    ctx.fillStyle = C.tinta;
    for (const [i, renglon] of r.entries()) ctx.fillText(renglon, 247, y + 10 + i * RENGLON);
    y += r.length * RENGLON + ENTRE;
  }

  // Al pie
  rayita(ctx, 1680);
  ctx.textAlign = "center";
  ctx.fillStyle = C.secundario;
  ctx.font = `600 36px ${SANS}`;
  ctx.fillText("cofradar.es", ANCHO / 2, 1752);

  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se ha podido hacer la imagen"))), "image/png"));
}

export const nombreImagen = (t: Tarjeta) => `cofradar-semana-santa-${t.anio}.png`;

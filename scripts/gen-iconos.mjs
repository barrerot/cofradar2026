import { mkdirSync, writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";

/* Iconos de la app instalable (PWA) y favicon.

   PROVISIONALES: el design system no trae logotipo. Es una marca de radar
   —un punto con dos ondas a cada lado, «((•))»— en blanco sobre el granate de marca en claro
   (--cf-granate-600). Cuando haya logotipo se cambia aqui y se regenera.

   Sin dependencias: se rasteriza a mano con supermuestreo 4×4 y se escribe el
   PNG con zlib. Lienzo de 512; todo cabe en el 80 % central, la zona segura
   de los iconos «maskable».

   Regenerar: node scripts/gen-iconos.mjs */

const FONDO = [0x6e, 0x1c, 0x2f];
const TINTA = [0xff, 0xff, 0xff];
const CENTRO = [256, 256];
const PUNTO = 44;
const ONDAS = [110, 180];
const GROSOR = 34;
/** Las ondas abren 45° por encima y por debajo de la horizontal, a los dos lados: «((•))». */
const S = Math.SQRT1_2;
const DESTINO = "frontend/public/iconos";

/** ¿Cae el punto (x, y) del lienzo de 512 dentro de la marca? */
function marca(x, y) {
  const dx = x - CENTRO[0];
  const dy = y - CENTRO[1];
  const d = Math.hypot(dx, dy);
  if (d <= PUNTO) return true;
  for (const r of ONDAS) {
    if (Math.abs(dy) <= Math.abs(dx) && Math.abs(d - r) <= GROSOR / 2) return true;
    // Extremos redondeados, en las cuatro diagonales
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      if (Math.hypot(dx - sx * r * S, dy - sy * r * S) <= GROSOR / 2) return true;
    }
  }
  return false;
}

/** ¿Cae dentro del cuadrado de esquinas redondeadas? (radio 0 = cuadrado entero) */
function fondo(x, y, radio) {
  const cx = Math.min(Math.max(x, radio), 512 - radio);
  const cy = Math.min(Math.max(y, radio), 512 - radio);
  return Math.hypot(x - cx, y - cy) <= radio;
}

function png(lado, radio) {
  const escala = 512 / lado;
  const filas = Buffer.alloc(lado * (lado * 4 + 1));
  for (let j = 0; j < lado; j++) {
    filas[j * (lado * 4 + 1)] = 0;
    for (let i = 0; i < lado; i++) {
      let cubre = 0;
      let tinta = 0;
      for (let a = 0; a < 4; a++) {
        for (let b = 0; b < 4; b++) {
          const x = (i + (a + 0.5) / 4) * escala;
          const y = (j + (b + 0.5) / 4) * escala;
          if (fondo(x, y, radio)) {
            cubre++;
            if (marca(x, y)) tinta++;
          }
        }
      }
      const o = j * (lado * 4 + 1) + 1 + i * 4;
      const t = cubre ? tinta / cubre : 0;
      for (let c = 0; c < 3; c++) filas[o + c] = Math.round(FONDO[c] * (1 - t) + TINTA[c] * t);
      filas[o + 3] = Math.round((cubre / 16) * 255);
    }
  }
  const trozo = (tipo, datos) => {
    const largo = Buffer.alloc(4);
    largo.writeUInt32BE(datos.length);
    const td = Buffer.concat([Buffer.from(tipo), datos]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([largo, td, crc]);
  };
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(lado, 0);
  cabecera.writeUInt32BE(lado, 4);
  cabecera.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo("IHDR", cabecera),
    trozo("IDAT", deflateSync(filas)),
    trozo("IEND", Buffer.alloc(0)),
  ]);
}

const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
const [cx, cy] = CENTRO;
const f = (n) => +n.toFixed(2);
const ondas = ONDAS.map((r) => {
  const a = f(r * S);
  return `<path d="M${cx + a} ${cy - a}A${r} ${r} 0 0 1 ${cx + a} ${cy + a}M${cx - a} ${cy - a}A${r} ${r} 0 0 0 ${cx - a} ${cy + a}"/>`;
}).join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="${hex(FONDO)}"/><circle cx="${cx}" cy="${cy}" r="${PUNTO}" fill="${hex(TINTA)}"/><g fill="none" stroke="${hex(TINTA)}" stroke-width="${GROSOR}" stroke-linecap="round">${ondas}</g></svg>\n`;

mkdirSync(DESTINO, { recursive: true });
writeFileSync(`${DESTINO}/icono-192.png`, png(192, 96));
writeFileSync(`${DESTINO}/icono-512.png`, png(512, 96));
writeFileSync(`${DESTINO}/icono-maskable-512.png`, png(512, 0));
writeFileSync(`${DESTINO}/apple-touch-icon.png`, png(180, 0));
writeFileSync(`${DESTINO}/favicon.svg`, svg);
console.log(`iconos escritos en ${DESTINO}`);

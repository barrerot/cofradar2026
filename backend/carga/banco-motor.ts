// TEMPORAL (BUL-212): banco del motor. Inventa N «Dar fe» en memoria para la Madrugá (sin tocar la base
// de datos), compara el motor de antes del arreglo con el de ahora y mide cuánto tardan.
//   npx tsx carga/banco-motor.ts <N>                una jornada mirada a 5 horas
//   npx tsx carga/banco-motor.ts <N> noche <vueltas> un cálculo cada 30 s, con «Dar fe» que llegan tarde
//                                                    y gente que deja de contar
//   DENSO=1: todo entre las 00:00 y las 03:15 · SOLO=1: sin el motor de antes (solo mide el nuevo)
// El historial nuevo va al minuto: se compara minuto a minuto; todo lo demás, byte a byte.
// El motor de antes sale de git (abdeb94) y el mapa de la Madrugá, del servidor publicado (3010).
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as nuevo from "../src/motor/motor.js";
import { acumulados, puntoEn, type Coord } from "../src/geo.js";
import { msPrograma } from "../src/motor/tiempo.js";

const geo = fileURLToPath(new URL("../src/geo.ts", import.meta.url));
const antes = execFileSync("git", ["show", "abdeb94:backend/src/motor/motor.ts"], { encoding: "utf8" }).replace('"../geo.js"', JSON.stringify(geo));
const archivo = join(mkdtempSync(join(tmpdir(), "motor-antes-")), "motor.ts");
writeFileSync(archivo, antes);
const original = (await import(archivo)) as typeof nuevo;

const N = Number(process.argv[2] ?? 2000);
const modo = process.argv[3] ?? "";
const soloNuevo = modo === "solo-nuevo";
const MIN = 60_000;
let semilla = 12345;
const azar = () => {
  semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Hora = { hora: string; m: number | null };
const mapa = await (await fetch("http://127.0.0.1:3010/api/jornadas/8/mapa")).json();
const salidas: nuevo.SalidaMotor[] = mapa.map((c: any) => {
  const situadas = (hs: Hora[]) => hs.filter((h) => h.m !== null).map((h) => ({ t: msPrograma(h.hora), m: h.m! }));
  return {
    id: c.id, pasos: c.nombresPasos, linea: c.linea, cruz: situadas(c.cruzGuia), ultimo: situadas(c.ultimoPaso),
    salida: c.cruzGuia[0] ? msPrograma(c.cruzGuia[0].hora) : null,
    entrada: c.ultimoPaso.length ? msPrograma(c.ultimoPaso.at(-1).hora) : null,
    estadoAdmin: c.estado,
  };
});

function enHorario(h: nuevo.Horario, total: number, t: number) {
  if (h.length < 2) return 0;
  if (t <= h[0]!.t) return h[0]!.m;
  for (let i = 1; i < h.length; i++) { const [a, b] = [h[i - 1]!, h[i]!]; if (t <= b.t) return b.t === a.t ? b.m : a.m + ((b.m - a.m) * (t - a.t)) / (b.t - a.t); }
  return Math.max(h.at(-1)!.m, total);
}

// Cada cofradía con su historia: retraso que va creciendo a saltos, una que se para, una que se desvía
const inicio = msPrograma("2026-04-03T00:00"), fin = msPrograma(process.env.DENSO ? "2026-04-03T03:15" : "2026-04-03T10:00");
const usuarios = Array.from({ length: 1000 }, (_, i) => `u${i}`);
const aportaciones = new Map<string, nuevo.Aportacion[]>(salidas.map((s) => [s.id, []]));
let id = 0;
for (let i = 0; i < N * 3 && id < N; i++) {
  const s = salidas[Math.floor(azar() * salidas.length)]!;
  const acum = acumulados(s.linea), total = acum.at(-1)!, n = Math.max(1, s.pasos.length);
  const t = Math.round(inicio + azar() * (fin - inicio));
  const idx = salidas.indexOf(s);
  // Retraso: 0 al salir, +10 min cada hora y pico; la 2.ª cofradía se queda parada de 03:00 a 03:40
  let retraso = ((t - inicio) / (90 * MIN)) * 10 * MIN * (idx % 3);
  const p0 = msPrograma("2026-04-03T03:00"), p1 = msPrograma("2026-04-03T03:40");
  let tProg = t - retraso;
  if (idx === 1 && t > p0) tProg = t < p1 ? p0 - retraso : tProg - (p1 - p0);
  const k = Math.floor(azar() * (n + 1));
  const cabeza = enHorario(s.cruz, total, tProg), cola = enHorario(s.ultimo, total, tProg);
  const m = k === 0 ? cabeza : cola + ((cabeza - cola) * (n - k)) / n;
  if (m <= 1 || m >= total - 1) continue;
  let punto: Coord | null = puntoEn(s.linea, acum, m);
  const r = azar();
  if (r < 0.05) punto = null; // sin ubicación fiable
  else if (r < 0.1) punto = puntoEn(s.linea, acum, azar() * total); // se equivoca de sitio
  else if (idx === 3 && t > msPrograma("2026-04-03T04:00") && t < msPrograma("2026-04-03T04:30") && r < 0.4) punto = [-5.99, 37.395]; // corrillo fuera
  if (punto) punto = [punto[0] + (azar() - 0.5) * 0.0002, punto[1] + (azar() - 0.5) * 0.0002];
  aportaciones.get(s.id)!.push({
    id: `a${id++}`,
    usuario: usuarios[Math.floor(azar() * usuarios.length)]!,
    t,
    elemento: azar() < 0.05 ? null : k,
    punto,
  });
}

// La noche en directo: un cálculo cada 30 s; cada «Dar fe» llega al servidor de 2 s a 10 min después
// (sin conexión), y de vez en cuando alguien deja de contar (reputación)
if (modo === "noche") {
  const llega = new Map<string, number>();
  for (const xs of aportaciones.values()) for (const a of xs) llega.set(a.id, a.t + (azar() < 0.15 ? azar() * 10 * MIN : 2000));
  const desde = msPrograma("2026-04-03T03:00"), pasos = Number(process.argv[4] ?? 40);
  let [tN, tO, iguales, restoDistinto, minutos, distintos] = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < pasos; i++) {
    const ahora = desde + i * 30_000;
    const fuera = new Set(Array.from({ length: i % 7 === 0 ? 3 : 0 }, () => usuarios[Math.floor(azar() * 1000)]));
    const vistas = (id: string) => aportaciones.get(id)!.filter((a) => llega.get(a.id)! <= ahora && !fuera.has(a.usuario));
    let t0 = performance.now();
    const nn = salidas.map((s) => nuevo.estadoCofradia(s, vistas(s.id), ahora));
    const dt = performance.now() - t0;
    if (i > 0) tN += dt;
    else console.log(`primer cálculo (sin nada recordado): ${Math.round(dt)} ms`);
    if (process.env.SOLO) continue;
    t0 = performance.now();
    const oo = salidas.map((s) => original.estadoCofradia(s, vistas(s.id), ahora));
    tO += performance.now() - t0;
    const r = compara(oo, nn, salidas.map(() => ahora));
    minutos += r.minutos;
    distintos += r.distintos;
    if (!r.resto) restoDistinto++;
    if (r.resto && !r.distintos) iguales++;
    else if (!process.env.VISTO) {
      process.env.VISTO = "1";
      console.log("distinto a las", new Date(ahora).toISOString(), r.ejemplos[0]);
      const [cid, tipo] = r.ejemplos[0]!.split(" ");
      const f = (x: number | null) => (x === null ? "sigue" : new Date(x).toISOString().slice(11, 19));
      const ver = (es: nuevo.EstadoCofradia[]) => es.find((e) => e.id === cid)!.historial.filter((h) => h.tipo === tipo).map((h) => `${f(h.desde)}→${f(h.hasta)}`).join("  ");
      console.log("  original:", ver(oo), "\n  nuevo:   ", ver(nn));
      // cada 5 s, ¿estaba puesta en el original?
      const s0 = salidas.find((x) => x.id === cid)!;
      const xs = vistas(cid!);
      const marcas: string[] = [];
      for (let t = msPrograma("2026-04-03T00:10"); t < msPrograma("2026-04-03T00:18"); t += 5000) {
        const e = original.estadoCofradia(s0, xs.filter((a) => a.t <= t), t);
        if (e.alteraciones.some((a) => a.tipo === tipo)) marcas.push(f(t));
      }
      console.log("  en el original estaba puesta (mirando cada 5 s) a las:", marcas.join(" ") || "nunca");
    }
  }
  console.log(`${id} aportaciones, ${pasos} cálculos cada 30 s · nuevo ${Math.round(tN / (pasos - 1))} ms por cálculo después del primero, original ${Math.round(tO / pasos)} ms`);
  if (!process.env.SOLO) {
    console.log(`posiciones, fases, alteraciones, resultados y bonus: ${restoDistinto ? `DISTINTOS en ${restoDistinto} cálculos ✘` : "IGUALES en todos ✔"}`);
    console.log(`historial: ${iguales} cálculos idénticos al minuto; ${distintos} minutos distintos de ${minutos} con alguna alteración (lo que dura menos de un minuto ya no entra)`);
  }
  process.exit(0);
}

const horas = ["2026-04-03T01:30", "2026-04-03T03:30", "2026-04-03T04:20", "2026-04-03T06:00", "2026-04-03T10:00"].map(msPrograma);
// Todo igual salvo el historial, que ahora va al minuto: se compara minuto a minuto si cada alteración
// estaba en el historial (en el original, lo que dura menos de un minuto puede aparecer y desaparecer)
function sinHistorial(es: nuevo.EstadoCofradia[]) { return JSON.stringify(es.map((e) => ({ ...e, historial: null }))); }
function compara(o: nuevo.EstadoCofradia[], n: nuevo.EstadoCofradia[], ahoras: number[]) {
  const r = { resto: sinHistorial(o) === sinHistorial(n), minutos: 0, distintos: 0, entradasOriginal: 0, entradasNuevo: 0, ejemplos: [] as string[] };
  o.forEach((eo, i) => {
    const en = n[i]!, ahora = ahoras[i]!;
    r.entradasOriginal += eo.historial.length; r.entradasNuevo += en.historial.length;
    const tipos = new Set([...eo.historial, ...en.historial].map((h) => h.tipo));
    const desde = Math.min(...[...eo.historial, ...en.historial].map((h) => h.desde));
    const puesta = (hs: nuevo.EntradaHistorial[], tipo: string, t: number) => hs.some((h) => h.tipo === tipo && h.desde <= t && (h.hasta ?? Infinity) > t);
    for (const tipo of tipos) for (let t = Math.ceil(desde / MIN) * MIN; t < ahora; t += MIN) {
      const [x, y] = [puesta(eo.historial, tipo, t), puesta(en.historial, tipo, t)];
      if (x || y) r.minutos++;
      // a menos de un minuto de un cambio, cualquiera vale
      if (x !== y && puesta(eo.historial, tipo, t - MIN) === puesta(eo.historial, tipo, t + MIN) && puesta(eo.historial, tipo, t - MIN) === x) {
        r.distintos++;
        if (r.ejemplos.length < 4) r.ejemplos.push(`${eo.id} ${tipo} ${new Date(t).toISOString()} original:${x} nuevo:${y}`);
      }
    }
  });
  return r;
}

function corre(motor: typeof nuevo) {
  const salida: unknown[] = [];
  const t0 = performance.now();
  for (const ahora of horas) for (const s of salidas) salida.push(motor.estadoCofradia(s, aportaciones.get(s.id)!, ahora));
  return { ms: performance.now() - t0, json: JSON.stringify(salida) };
}
const b = corre(nuevo);
console.log(`${id} aportaciones · nuevo: ${Math.round(b.ms)} ms en ${horas.length} cálculos de la jornada (${Math.round(b.ms / horas.length)} ms cada uno)`);
if (!soloNuevo) {
  const a = corre(original);
  console.log(`original: ${Math.round(a.ms)} ms (${Math.round(a.ms / horas.length)} ms cada uno)`);
  const ahoras = horas.flatMap((h) => salidas.map(() => h));
  const r = compara(JSON.parse(a.json), JSON.parse(b.json), ahoras);
  console.log(r.resto ? "posiciones, fases, alteraciones, resultados y bonus: IGUALES ✔" : "posiciones, fases…: DISTINTAS ✘");
  console.log(`historial: ${r.minutos} minutos con alguna alteración; ${r.distintos} distintos (entradas: original ${r.entradasOriginal}, nuevo ${r.entradasNuevo})`);
  for (const e of r.ejemplos) console.log("  ", e);
}
const muestra = JSON.parse(b.json) as nuevo.EstadoCofradia[];
const tipos = new Set(muestra.flatMap((e) => e.historial.map((h) => h.tipo)));
console.log("alteraciones vistas en el historial:", [...tipos].join(", "));

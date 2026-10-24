// Prueba de carga (BUL-212), fase 2: gente con cuenta DANDO FE en plena Madrugá.
// Cada persona, como la app (frontend/src/datos/darFe.ts, puntos.ts):
//   - da fe cada `cadaS` segundos de un elemento que está en la calle, donde el motor dice que va
//   - pide /yo/aportaciones cada 60 s (sus puntos)
//   - y mira el estado cada 30 s
// Las sesiones son reales (tokens.json); varias personas simuladas pueden compartir sesión.
// Uso: node darfe.mjs <personas> <segundos> <cadaS> [base]
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const [personas = 100, segundos = 60, cadaS = 30, base = "http://127.0.0.1:3011/api"] = process.argv.slice(2);
const N = Number(personas), DUR = Number(segundos) * 1000;
// Las sesiones, fuera del repositorio (las crea carga-usuarios.ts crear): TOKENS=/ruta/tokens.json
const tokens = JSON.parse(readFileSync(process.env.TOKENS ?? "tokens.json", "utf8"));
const desfase = Date.parse("2026-04-03T00:30:00Z") - Date.now();

const medidas = new Map();
const anota = (tipo, ms, ok) => {
  const m = medidas.get(tipo) ?? { t: [], fallos: 0 };
  m.t.push(ms);
  if (!ok) m.fallos++;
  medidas.set(tipo, m);
};
let enCalle = [];
async function pide(tipo, ruta, init = {}) {
  const t0 = performance.now();
  try {
    const r = await fetch(base + ruta, { ...init, signal: AbortSignal.timeout(15_000) });
    const cuerpo = await r.text();
    anota(tipo, performance.now() - t0, r.ok);
    return r.ok ? cuerpo : null;
  } catch {
    anota(tipo, performance.now() - t0, false);
    return null;
  }
}
async function mirarEstado() {
  const c = await pide("estado", `/jornadas/8/estado?desfase=${desfase}`);
  if (c) enCalle = JSON.parse(c).cofradias.flatMap((x) => x.elementos.map((e) => ({ cofradia: x.id, elemento: e.orden, punto: e.punto })));
}
await mirarEstado();

const fin = Date.now() + DUR;
function cada(ms, fn, primera) {
  setTimeout(function vuelta() {
    if (Date.now() > fin) return;
    fn();
    setTimeout(vuelta, ms);
  }, primera);
}
for (let i = 0; i < N; i++) {
  const { token } = tokens[i % tokens.length];
  const sesion = { "X-Sesion": token, "X-Reloj-Desfase": String(desfase) };
  const llega = Math.random() * Number(cadaS) * 1000;
  cada(Number(cadaS) * 1000, () => {
    const e = enCalle[Math.floor(Math.random() * enCalle.length)];
    if (!e) return;
    void pide("dar fe", "/yo/aportaciones", {
      method: "POST",
      headers: { ...sesion, "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId: randomUUID(),
        cofradia: e.cofradia,
        elemento: e.elemento,
        ubicacion: { latitud: e.punto[1] + (Math.random() - 0.5) * 0.0002, longitud: e.punto[0] + (Math.random() - 0.5) * 0.0002, precision: 15 },
        observada: new Date(Date.now() + desfase).toISOString(),
      }),
    });
  }, llega);
  cada(60_000, () => void pide("mis puntos", "/yo/aportaciones", { headers: sesion }), llega);
  cada(30_000, () => void mirarEstado(), llega);
}

await new Promise((r) => setTimeout(r, DUR + 16_000));
const pct = (xs, p) => xs[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
console.log(`\n${N} personas con cuenta (${tokens.length} sesiones), una fe cada ${cadaS} s, ${segundos} s`);
console.log("tipo        peticiones  fallos   mediana    p95     p99     máx");
for (const [tipo, m] of medidas) {
  const xs = m.t.sort((a, b) => a - b);
  const f = (x) => `${Math.round(x)} ms`.padStart(8);
  console.log(`${tipo.padEnd(12)}${String(xs.length).padStart(10)}${String(m.fallos).padStart(8)}${f(pct(xs, 50))}${f(pct(xs, 95))}${f(pct(xs, 99))}${f(xs.at(-1))}`);
}
process.exit(0);

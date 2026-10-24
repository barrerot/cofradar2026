// Prueba de carga (BUL-212), fase 1: miles de personas CONSULTANDO en plena Madrugá.
// Cada persona hace lo que hace la app con el mapa abierto (frontend/src/datos/*):
//   - /jornadas/8/estado cada 30 s (el motor)
//   - /jornadas/8/mapa, /jornadas y /cofradias?jornada=8 al entrar y cada 10 min
//   - de vez en cuando abre una ficha (/cofradias/:id), ~1 cada 3 min
// Uso: node consultar.mjs <personas> <segundos> [base]
const [personas = 1000, segundos = 90, base = "http://127.0.0.1:3011/api"] = process.argv.slice(2);
const N = Number(personas), DUR = Number(segundos) * 1000;

// Madrugá 2026, 02:30 hora de Sevilla (00:30Z): el reloj de prueba de la web manda ?desfase=
const desfase = Date.parse("2026-04-03T00:30:00Z") - Date.now();
const estado = `/jornadas/8/estado?desfase=${desfase}`;

const fichas = (await (await fetch(`${base}/cofradias?jornada=8`)).json()).map((c) => c.id);

const medidas = new Map(); // tipo → { t: [], fallos, ok }
const anota = (tipo, ms, ok) => {
  const m = medidas.get(tipo) ?? { t: [], fallos: 0, ok: 0 };
  m.t.push(ms);
  ok ? m.ok++ : m.fallos++;
  medidas.set(tipo, m);
};
let atrasoMax = 0;

async function pide(tipo, ruta) {
  const t0 = performance.now();
  try {
    const r = await fetch(base + ruta, { signal: AbortSignal.timeout(15_000) });
    const cuerpo = await r.text();
    anota(tipo, performance.now() - t0, r.ok);
    if (tipo === "estado" && r.ok) {
      // ¿El motor sigue al día? sincronizacion es el corte de 30 s que se ha calculado
      const atraso = Date.now() + desfase - Date.parse(JSON.parse(cuerpo).sincronizacion);
      atrasoMax = Math.max(atrasoMax, atraso);
    }
  } catch {
    anota(tipo, performance.now() - t0, false);
  }
}

const fin = Date.now() + DUR;
const timers = [];
function cada(ms, fn, primeraEn) {
  const t = setTimeout(function vuelta() {
    if (Date.now() > fin) return;
    fn();
    timers.push(setTimeout(vuelta, ms));
  }, primeraEn);
  timers.push(t);
}

// Las personas no llegan todas en el mismo segundo: se reparten en los primeros 30 s
for (let i = 0; i < N; i++) {
  const llega = Math.random() * 30_000;
  setTimeout(() => {
    void pide("mapa", "/jornadas/8/mapa");
    void pide("jornadas", "/jornadas");
    void pide("lista", "/cofradias?jornada=8");
  }, llega);
  cada(30_000, () => void pide("estado", estado), llega);
  cada(180_000, () => void pide("ficha", `/cofradias/${fichas[Math.floor(Math.random() * fichas.length)]}`), llega + Math.random() * 180_000);
}

await new Promise((r) => setTimeout(r, DUR + 16_000));
const pct = (xs, p) => xs[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
let total = 0;
console.log(`\n${N} personas, ${segundos} s`);
console.log("tipo        peticiones  fallos   mediana    p95     p99     máx");
for (const [tipo, m] of medidas) {
  const xs = m.t.sort((a, b) => a - b);
  total += xs.length;
  const f = (x) => `${Math.round(x)} ms`.padStart(8);
  console.log(`${tipo.padEnd(12)}${String(xs.length).padStart(10)}${String(m.fallos).padStart(8)}${f(pct(xs, 50))}${f(pct(xs, 95))}${f(pct(xs, 99))}${f(xs.at(-1))}`);
}
console.log(`total ${total} peticiones · ${(total / Number(segundos)).toFixed(0)} por segundo · motor atrasado como mucho ${Math.round(atrasoMax / 1000)} s`);
process.exit(0);

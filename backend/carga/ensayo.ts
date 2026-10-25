// Ensayo de la administración (BUL-215): una Madrugá de prueba con gente dando fe sola, para que el
// equipo use el panel como si fuera la noche de verdad. Va contra la web publicada (127.0.0.1:3010) con
// el reloj de prueba: todo queda marcado de_prueba y solo se ve con ?ahora=.
//
//   npx tsx carga/ensayo.ts [inicio] [minutos] [personas]
//     inicio    hora de Sevilla en la que empieza («2026-04-03T01:30», por defecto)
//     minutos   cuánto dura (90)
//     personas  cuántas cuentas de carga dan fe (20; como mucho ~25 por el límite de sesiones de Supabase)
//
// Cada persona sigue una cofradía de las que están en la calle y da fe cada 2–4 minutos de alguno de
// sus elementos, donde el horario dice que va. Una cofradía (la primera en la calle) va RETRASADA: quienes
// la siguen la ven donde el horario la ponía 10 minutos antes, para que el motor publique un retraso que
// se pueda retirar.
// Cada minuto escribe la hora simulada y cuántos van.
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

process.loadEnvFile(new URL("../.env", import.meta.url));
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: ws as never } });
const [inicio = "2026-04-03T01:30", minutos = "90", personas = "20"] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://127.0.0.1:3010/api";
const MIN = 60_000;
const desfase = Date.parse(`${inicio}:00+02:00`) - Date.now();
const fin = Date.now() + Number(minutos) * MIN;
const simulada = () => new Date(Date.now() + desfase);
const enSevilla = (d: Date) => d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });

// Sesiones de las cuentas de carga (carga-N@cofradar.invalid); caducan a la hora: se renuevan cada 45 min
type Persona = { token: string; cofradia: string | null; siguiente: number };
const gente: Persona[] = [];
async function sesiones() {
  for (let i = 0; i < Number(personas); i++) {
    const email = `carga-${i}@cofradar.invalid`;
    const enlace = await db.auth.admin.generateLink({ type: "magiclink", email });
    if (enlace.error) throw new Error(`${email}: ${enlace.error.message} (¿existen las cuentas? carga-usuarios.ts cuentas)`);
    const s = await db.auth.verifyOtp({ token_hash: enlace.data.properties.hashed_token, type: "magiclink" });
    if (s.error) throw new Error(`${email}: ${s.error.message}`);
    if (gente[i]) gente[i]!.token = s.data.session!.access_token;
    else gente.push({ token: s.data.session!.access_token, cofradia: null, siguiente: Date.now() + Math.random() * 2 * MIN });
  }
}
await sesiones();
setInterval(() => void sesiones().catch((e) => console.error("renovar sesiones:", e.message)), 45 * MIN).unref();

type Hora = { hora: string; m: number | null };
type Mapa = { id: string; nombre: string; linea: [number, number][]; nombresPasos: string[]; cruzGuia: Hora[]; ultimoPaso: Hora[] };
const mapas = ((await (await fetch(`${BASE}/jornadas/8/mapa`)).json()) as Mapa[]).filter((c) => c.linea.length >= 2);
/** Los metros del recorrido donde el horario pone ese punto del cortejo a esa hora del programa (null: aún no ha salido o ya entró). */
function metroA(hs: Hora[], t: number): number | null {
  const ps = hs.filter((h) => h.m !== null).map((h) => ({ t: Date.parse(`${h.hora.slice(0, 16)}:00Z`), m: h.m! }));
  if (ps.length < 2 || t < ps[0]!.t || t > ps.at(-1)!.t) return null;
  for (let i = 1; i < ps.length; i++) {
    const [a, b] = [ps[i - 1]!, ps[i]!];
    if (t <= b.t) return b.t === a.t ? b.m : a.m + ((b.m - a.m) * (t - a.t)) / (b.t - a.t);
  }
  return null;
}
/**
 * Lo que de verdad se ve en la calle: los elementos que ya han salido y aún no han entrado, donde el
 * horario los pone `retraso` ms tarde. No sale del motor: si la gente diera fe donde el motor estima,
 * el motor se confirmaría a sí mismo (así salió en el primer ensayo un «Retraso +60 min» falso).
 */
function fuera(c: Mapa, retraso: number): { orden: number; m: number }[] {
  const pared = Date.parse(`${simulada().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).replace(" ", "T")}Z`) - retraso;
  const cabeza = metroA(c.cruzGuia, pared), cola = metroA(c.ultimoPaso, pared);
  const n = Math.max(1, c.nombresPasos.length);
  const r: { orden: number; m: number }[] = [];
  if (cabeza !== null) r.push({ orden: 0, m: cabeza });
  if (cabeza === null) return r;
  const arranque = c.ultimoPaso.find((h) => h.m !== null)?.m ?? 0;
  for (let k = 1; k < n; k++) {
    // Los de en medio, como el programa (con el último esperando en la puerta), si ya han salido
    const m = (cola ?? arranque) + ((cabeza - (cola ?? arranque)) * (n - k)) / n;
    if (m > arranque + 20) r.push({ orden: k, m });
  }
  if (cola !== null) r.push({ orden: n, m: cola });
  return r;
}
function puntoEn(linea: [number, number][], m: number): [number, number] {
  let acum = 0;
  for (let i = 1; i < linea.length; i++) {
    const [a, b] = [linea[i - 1]!, linea[i]!];
    const d = Math.hypot((b[0] - a[0]) * 88_500, (b[1] - a[1]) * 110_540);
    if (acum + d >= m) {
      const f = d ? (m - acum) / d : 0;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    acum += d;
  }
  return linea.at(-1)!;
}

let retrasada: string | null = process.env.RETRASADA ?? null;
const retrasoDe = (c: Mapa) => (c.id === retrasada ? 10 * MIN : 0);
const enCalle = () => mapas.filter((c) => fuera(c, retrasoDe(c)).length);
if (!retrasada) {
  const primera = mapas.find((c) => fuera(c, 10 * MIN).length);
  retrasada = primera?.id ?? null;
  if (primera) console.log(`va retrasada: ${primera.nombre}`);
}

let [enviados, fallos] = [0, 0];
async function darFe(p: Persona) {
  const calle = enCalle();
  if (!p.cofradia || !calle.some((c) => c.id === p.cofradia)) {
    // Repartidas entre las que están en la calle; la retrasada, con varias para que se note
    const c = calle[Math.floor(Math.random() * calle.length)];
    p.cofradia = Math.random() < 0.3 && retrasada && calle.some((x) => x.id === retrasada) ? retrasada : (c?.id ?? null);
  }
  const c = calle.find((x) => x.id === p.cofradia);
  const els = c ? fuera(c, retrasoDe(c)) : [];
  const e = els[Math.floor(Math.random() * els.length)];
  if (!c || !e) return;
  const punto = puntoEn(c.linea, e.m);
  const r = await fetch(`${BASE}/yo/aportaciones`, {
    method: "POST",
    headers: { "X-Sesion": p.token, "X-Reloj-Desfase": String(desfase), "Content-Type": "application/json" },
    body: JSON.stringify({
      clienteId: randomUUID(),
      cofradia: c.id,
      elemento: e.orden,
      ubicacion: { latitud: punto[1] + (Math.random() - 0.5) * 0.0002, longitud: punto[0] + (Math.random() - 0.5) * 0.0002, precision: 12 },
      observada: simulada().toISOString(),
    }),
  }).catch(() => null);
  if (r?.ok) enviados++;
  else fallos++;
}

setInterval(() => {
  const ahora = Date.now();
  for (const p of gente) {
    if (p.siguiente > ahora) continue;
    p.siguiente = ahora + (2 + Math.random() * 2) * MIN;
    void darFe(p);
  }
}, 5_000).unref();
setInterval(() => console.log(`${enSevilla(simulada())} (${simulada().toISOString()}) · ${enCalle().length} en la calle · ${enviados} «Dar fe» · ${fallos} fallos`), MIN).unref();

console.log(`Madrugá de prueba desde las ${enSevilla(simulada())}, ${minutos} min, ${gente.length} personas`);
await new Promise((r) => setTimeout(r, fin - Date.now()));
console.log(`fin: ${enviados} «Dar fe», ${fallos} fallos`);
process.exit(0);

// TEMPORAL (BUL-212): mete en `aportacion` muchos «Dar fe» plausibles de la Madrugá, marcados de_prueba,
// a nombre de las cuentas de carga, para ver cómo aguanta el motor una noche llena. Se borra al terminar.
//   npx tsx carga-sembrar.ts <cuentas.json> <cuantas>
// Cada uno va donde el programa dice que estaba su elemento a esa hora (cruz de guía o último paso).
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

process.loadEnvFile(new URL("../.env", import.meta.url));
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: ws as never } });
const [archivo, cuantas = "20000"] = process.argv.slice(2);
const cuentas: string[] = JSON.parse(readFileSync(archivo!, "utf8"));

type Hora = { hora: string; m: number | null };
type C = { id: string; pasos: number; linea: [number, number][]; cruzGuia: Hora[]; ultimoPaso: Hora[] };
const mapa: C[] = await (await fetch("http://127.0.0.1:3010/api/jornadas/8/mapa")).json();
const { data: hs } = await db.from("hermandad").select("id, nombre");
const slug = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const idDe = new Map((hs ?? []).map((h) => [slug(h.nombre), h.id as number]));

// La Madrugá de 2026 en hora de Sevilla (+02:00); de 00:00 a 02:30
const utc = (h: string) => Date.parse(`${h}:00+02:00`);
const desde = utc("2026-04-03T00:00"), hasta = utc("2026-04-03T02:30");

function enLinea(linea: [number, number][], m: number): [number, number] {
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
function metroA(hs: Hora[], t: number): number | null {
  const ps = hs.filter((h) => h.m !== null).map((h) => ({ t: utc(h.hora), m: h.m! }));
  if (!ps.length || t < ps[0]!.t || t > ps.at(-1)!.t) return null;
  for (let i = 1; i < ps.length; i++) {
    const [a, b] = [ps[i - 1]!, ps[i]!];
    if (t <= b.t) return a.m + (b.m - a.m) * ((t - a.t) / (b.t - a.t || 1));
  }
  return null;
}

const filas = [];
for (let k = 0; filas.length < Number(cuantas) && k < Number(cuantas) * 5; k++) {
  const c = mapa[Math.floor(Math.random() * mapa.length)]!;
  const t = desde + Math.random() * (hasta - desde);
  const ultimo = Math.random() < 0.5;
  const m = metroA(ultimo ? c.ultimoPaso : c.cruzGuia, t);
  if (m === null || c.linea.length < 2) continue;
  const [lon, lat] = enLinea(c.linea, m);
  filas.push({
    usuario_id: cuentas[Math.floor(Math.random() * cuentas.length)]!,
    cliente_id: randomUUID(),
    hermandad_id: idDe.get(c.id)!,
    elemento: ultimo ? c.pasos : 0,
    latitud: +(lat + (Math.random() - 0.5) * 0.0002).toFixed(5),
    longitud: +(lon + (Math.random() - 0.5) * 0.0002).toFixed(5),
    precision_m: 10 + Math.floor(Math.random() * 30),
    observada: new Date(t).toISOString(),
    recibida: new Date(t + 2000).toISOString(),
    plausible: true,
    puntos_base: 10,
    de_prueba: true,
  });
}
for (let i = 0; i < filas.length; i += 1000) {
  const { error } = await db.from("aportacion").insert(filas.slice(i, i + 1000));
  if (error) throw error;
}
console.log(`${filas.length} aportaciones de prueba en la Madrugá`);

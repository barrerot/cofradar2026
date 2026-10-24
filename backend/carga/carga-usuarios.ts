// TEMPORAL (BUL-212, prueba de carga de «Dar fe»): se borra al terminar.
//   npx tsx carga-usuarios.ts crear <n> <archivo-tokens>   crea n cuentas carga-N@cofradar.invalid y guarda sus tokens
//   npx tsx carga-usuarios.ts borrar                       borra esas cuentas (y en cascada sus aportaciones)
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

process.loadEnvFile(new URL("../.env", import.meta.url));
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: ws as never } });
const DOMINIO = "@cofradar.invalid";
const [orden, n = "100", archivo] = process.argv.slice(2);

async function deCarga() {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    ids.push(...data.users.filter((u) => u.email?.startsWith("carga-") && u.email.endsWith(DOMINIO)).map((u) => u.id));
    if (data.users.length < 1000) return ids;
  }
}

if (orden === "cuentas") {
  // Solo las cuentas, sin sesión (verifyOtp tiene un límite de 30 cada 5 min): para la copia con puerta de pruebas
  const ids: string[] = [];
  const lotes = Array.from({ length: Number(n) }, (_, i) => i);
  for (let i = 0; i < lotes.length; i += 10) {
    const hechos = await Promise.all(lotes.slice(i, i + 10).map(async (k) => {
      const r = await db.auth.admin.createUser({ email: `carga-${k}${DOMINIO}`, email_confirm: true, user_metadata: { carga: true } });
      if (r.error) throw new Error(`carga-${k}: ${r.error.message}`);
      return r.data.user.id;
    }));
    ids.push(...hechos);
  }
  writeFileSync(archivo!, JSON.stringify(ids));
  console.log(`${ids.length} cuentas en ${archivo}`);
} else if (orden === "crear") {
  const tokens: { id: string; token: string }[] = [];
  for (let i = 0; i < Number(n); i++) {
    const email = `carga-${i}${DOMINIO}`;
    const creado = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { carga: true } });
    if (creado.error && !/already/i.test(creado.error.message)) throw creado.error;
    const enlace = await db.auth.admin.generateLink({ type: "magiclink", email });
    if (enlace.error) throw enlace.error;
    const sesion = await db.auth.verifyOtp({ token_hash: enlace.data.properties.hashed_token, type: "magiclink" });
    // Supabase deja ~30 cada 5 minutos: se espera y se repite
    if (sesion.error && /rate limit/i.test(sesion.error.message)) {
      console.log(`${tokens.length} con sesión; esperando al límite de Supabase…`);
      await new Promise((r) => setTimeout(r, 60_000));
      i--;
      continue;
    }
    if (sesion.error) throw new Error(`${email}: ${sesion.error.message}`);
    tokens.push({ id: sesion.data.user!.id, token: sesion.data.session!.access_token });
    if (i % 50 === 49) console.log(`${i + 1} cuentas`);
  }
  writeFileSync(archivo!, JSON.stringify(tokens));
  console.log(`${tokens.length} cuentas con sesión en ${archivo}`);
} else if (orden === "vaciar") {
  // Solo los «Dar fe» de las cuentas de carga; las cuentas se quedan
  const ids = await deCarga();
  let n = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const { count, error } = await db.from("aportacion").delete({ count: "exact" }).in("usuario_id", ids.slice(i, i + 100));
    if (error) throw error;
    n += count ?? 0;
  }
  console.log(`borradas ${n} aportaciones de las cuentas de carga`);
} else if (orden === "borrar") {
  const ids = await deCarga();
  let count = 0;
  for (let i = 0; i < ids.length; i += 50) {
    const r = await db.from("aportacion").select("id", { count: "exact", head: true }).in("usuario_id", ids.slice(i, i + 50));
    count += r.count ?? 0;
  }
  for (const id of ids) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) throw error;
  }
  console.log(`borradas ${ids.length} cuentas de carga y sus ${count} aportaciones`);
}

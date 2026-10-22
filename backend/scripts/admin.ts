/**
 * Dar o quitar el acceso al panel de administración a una cuenta (5.1). La cuenta tiene que haber
 * entrado antes en Cofradar con Google, al menos una vez.
 *
 * Uso:
 *   npm run admin -w backend -- dar   persona@gmail.com
 *   npm run admin -w backend -- quitar persona@gmail.com
 *   npm run admin -w backend -- lista
 */
import { supabase } from "../src/supabase.js";

process.loadEnvFile(new URL("../.env", import.meta.url));

const [orden, correo] = process.argv.slice(2);

async function todas() {
  const cuentas = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await supabase().auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw error;
    cuentas.push(...data.users);
    if (data.users.length < 1000) return cuentas;
  }
}

if (orden === "lista") {
  const admins = (await todas()).filter((u) => u.app_metadata?.cofradar_admin === true);
  console.log(admins.length ? admins.map((u) => u.email).join("\n") : "Nadie tiene acceso al panel.");
} else if ((orden === "dar" || orden === "quitar") && correo) {
  const cuenta = (await todas()).find((u) => u.email?.toLowerCase() === correo.toLowerCase());
  if (!cuenta) {
    console.error(`No hay ninguna cuenta con ${correo}: tiene que entrar antes en Cofradar con Google.`);
    process.exit(1);
  }
  const { error } = await supabase().auth.admin.updateUserById(cuenta.id, {
    app_metadata: { ...cuenta.app_metadata, cofradar_admin: orden === "dar" },
  });
  if (error) throw error;
  console.log(orden === "dar" ? `${correo} ya entra al panel.` : `${correo} ya no entra al panel.`);
} else {
  console.error("Uso: npm run admin -w backend -- dar|quitar <correo> · lista");
  process.exit(1);
}

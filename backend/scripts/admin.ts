/**
 * Dar o quitar el acceso al panel de administración a una cuenta (5.1). La cuenta tiene que haber
 * entrado antes en Cofradar con Google, al menos una vez.
 *
 * Uso:
 *   npm run admin -w backend -- dar   persona@gmail.com
 *   npm run admin -w backend -- quitar persona@gmail.com
 *   npm run admin -w backend -- lista
 */
import { ponerAdmin, todasLasCuentas as todas } from "../src/admin.js";

process.loadEnvFile(new URL("../.env", import.meta.url));

const [orden, correo] = process.argv.slice(2);

if (orden === "lista") {
  const admins = (await todas()).filter((u) => u.app_metadata?.cofradar_admin === true);
  console.log(admins.length ? admins.map((u) => u.email).join("\n") : "Nadie tiene acceso al panel.");
} else if ((orden === "dar" || orden === "quitar") && correo) {
  const cuenta = (await todas()).find((u) => u.email?.toLowerCase() === correo.toLowerCase());
  if (!cuenta) {
    console.error(`No hay ninguna cuenta con ${correo}: tiene que entrar antes en Cofradar con Google.`);
    process.exit(1);
  }
  await ponerAdmin(cuenta.id, cuenta.app_metadata, orden === "dar");
  console.log(orden === "dar" ? `${correo} ya entra al panel.` : `${correo} ya no entra al panel.`);
} else {
  console.error("Uso: npm run admin -w backend -- dar|quitar <correo> · lista");
  process.exit(1);
}

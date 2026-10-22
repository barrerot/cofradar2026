import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import { routerAdmin } from "./rutas/admin.js";
import { routerAportaciones } from "./rutas/aportaciones.js";
import { routerCofradias } from "./rutas/cofradias.js";
import { routerCuenta } from "./rutas/cuenta.js";
import { routerDatosBase } from "./rutas/datosBase.js";
import { routerEstado } from "./rutas/estado.js";
import { leerSesion } from "./sesion.js";

/**
 * API de Cofradar.
 *
 * Los datos base (jornadas, cofradías, horarios del programa y recorridos) se
 * leen de Supabase. El estado en vivo lo calcula el motor (motor/, rutas/estado.ts) con el
 * horario y los «Dar fe» (rutas/aportaciones.ts).
 *
 * Con SERVIR_WEB=1 sirve también la web compilada (frontend/dist), para
 * publicarla con un solo proceso detrás de Apache (ver despliegue/). En
 * desarrollo no hace falta: la web la sirve Vite y reenvía /api aquí.
 */
const env = new URL("../.env", import.meta.url);
if (existsSync(env)) process.loadEnvFile(env);

const app = express();
const puerto = Number(process.env.PORT ?? 3001);
// Detrás de Apache, HOST=127.0.0.1: desde fuera solo se entra por Apache
const host = process.env.HOST;

app.use(express.json());
app.use("/api", leerSesion);
app.use("/api", routerEstado);
app.use("/api", routerCofradias);
app.use("/api", routerCuenta);
app.use("/api", routerAportaciones);
app.use("/api", routerAdmin);
app.use("/api", routerDatosBase);

app.get("/api/salud", (_peticion, respuesta) => {
  respuesta.json({ ok: true });
});

app.use("/api", (_peticion, respuesta) => {
  respuesta.status(404).json({ error: "Esa ruta de la API no existe" });
});

if (process.env.SERVIR_WEB === "1") {
  const web = fileURLToPath(new URL("../../frontend/dist", import.meta.url));
  if (!existsSync(web)) throw new Error(`SERVIR_WEB=1 pero no existe ${web}: falta npm run build -w frontend`);
  // Las mismas cabeceras que el .htaccess: los assets llevan hash y se guardan
  // para siempre; index.html, el service worker y el manifiesto, nunca.
  app.use(
    express.static(web, {
      index: "index.html",
      setHeaders: (respuesta, ruta) => {
        if (/[\\/]assets[\\/]/.test(ruta)) respuesta.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        else if (/(index\.html|sw\.js|manifest\.webmanifest)$/.test(ruta)) respuesta.setHeader("Cache-Control", "no-cache");
      },
    }),
  );
  // Las rutas de la app (/cofradias, /mapa…) las resuelve el router del navegador
  app.get("*", (_peticion, respuesta) => {
    respuesta.setHeader("Cache-Control", "no-cache");
    respuesta.sendFile("index.html", { root: web });
  });
}

const alEscuchar = () =>
  console.log(`cofradar · ${process.env.SERVIR_WEB === "1" ? "web y api" : "api"} en http://${host ?? "localhost"}:${puerto}`);
if (host) app.listen(puerto, host, alEscuchar);
else app.listen(puerto, alEscuchar);

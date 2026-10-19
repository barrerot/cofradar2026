import { existsSync } from "node:fs";
import express from "express";
import { routerCofradias } from "./rutas/cofradias.js";
import { routerEstado } from "./rutas/estado.js";

/**
 * API de Cofradar.
 *
 * Los datos base (jornadas, cofradías, horarios del programa y recorridos) se
 * leen de Supabase. El motor de estado en vivo llega en la fase 4; hasta
 * entonces /api/estado-jornada responde «sin-motor».
 */
const env = new URL("../.env", import.meta.url);
if (existsSync(env)) process.loadEnvFile(env);

const app = express();
const puerto = Number(process.env.PORT ?? 3001);

app.use(express.json());
app.use("/api", routerEstado);
app.use("/api", routerCofradias);

app.get("/api/salud", (_peticion, respuesta) => {
  respuesta.json({ ok: true });
});

app.listen(puerto, () => {
  console.log(`cofradar · api en http://localhost:${puerto}`);
});

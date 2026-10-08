import express from "express";
import { routerEstado } from "./rutas/estado.js";

/**
 * API de Cofradar.
 *
 * Esqueleto. El motor de estado y los datos son el hito 1 · Datos y motor, que
 * es el camino critico del proyecto; aqui solo esta el seam por el que
 * entraran, para que el frontend tenga a quien preguntar.
 */
const app = express();
const puerto = Number(process.env.PORT ?? 3001);

app.use(express.json());
app.use("/api", routerEstado);

app.get("/api/salud", (_peticion, respuesta) => {
  respuesta.json({ ok: true });
});

app.listen(puerto, () => {
  console.log(`cofradar · api en http://localhost:${puerto}`);
});

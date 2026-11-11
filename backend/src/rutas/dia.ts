import { Router, type Request, type Response } from "express";
import { exigirSesion, type Usuario } from "../sesion.js";
import { ErrorDia, responder, verDia } from "../dia/dia.js";
import { desfaseDe } from "./aportaciones.js";

/**
 * La pregunta del día y el cirio (F-55, P-34).
 *
 *   GET  /api/dia                               fase de la Cuaresma y número de hoy; con sesión, además,
 *                                               la pregunta (sin la buena), lo que contestaste y tu cirio
 *   POST /api/dia/respuesta  { fecha, banco, opcion }  → lo mismo, ya contestada
 *
 * Con el reloj de prueba (X-Reloj-Desfase) el servidor vive en esa hora y guarda aparte (de_prueba).
 */
export const routerDia = Router();

const ruta =
  (fn: (peticion: Request, usuario: Usuario | undefined, ahora: Date, dePrueba: boolean) => Promise<unknown>) =>
  (peticion: Request, respuesta: Response) => {
    const desfase = desfaseDe(peticion);
    Promise.resolve()
      .then(() => fn(peticion, respuesta.locals.usuario as Usuario | undefined, new Date(Date.now() + desfase), desfase !== 0))
      .then((cuerpo) => respuesta.set("Cache-Control", "no-store").json(cuerpo))
      .catch((e: unknown) => {
        if (e instanceof ErrorDia) {
          respuesta.status(e.estado).json({ error: e.message });
          return;
        }
        console.error(e);
        respuesta.status(500).json({ error: "No se ha podido hacer. Vuelve a intentarlo." });
      });
  };

routerDia.get("/dia", ruta((_p, u, ahora, prueba) => verDia(u?.id ?? null, ahora, prueba)));
routerDia.post("/dia/respuesta", exigirSesion, ruta((p, u, ahora, prueba) => responder(u!.id, ahora, prueba, p.body ?? {})));

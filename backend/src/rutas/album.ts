import { Router, type Request, type Response } from "express";
import { exigirSesion, type Usuario } from "../sesion.js";
import { apuntarSolitario, ErrorAlbum, verAlbum } from "../album/album.js";
import { verCargo } from "../cargo/puntos.js";
import { desfaseDe } from "./aportaciones.js";

/**
 * El álbum de estampas (F-56, P-35) y el cargo con la calle y la casa (F-58). Todo con sesión.
 *
 *   GET  /api/album                                  las estampas por jornada, con sus grados
 *   POST /api/album/aciertos  { aciertos: [{ id, respuesta }] }   los aciertos del trivial en solitario
 *                                                    → { apuntados, nuevas: [{ cofradia, nombre }] }
 *   GET  /api/yo/cargo                               el cargo, la calle, la casa y la escalera
 */
export const routerAlbum = Router();

const ruta =
  (fn: (peticion: Request, usuario: Usuario, ahora: Date) => Promise<unknown>) =>
  (peticion: Request, respuesta: Response) => {
    Promise.resolve()
      .then(() => fn(peticion, respuesta.locals.usuario as Usuario, new Date(Date.now() + desfaseDe(peticion))))
      .then((cuerpo) => respuesta.set("Cache-Control", "no-store").json(cuerpo))
      .catch((e: unknown) => {
        if (e instanceof ErrorAlbum) {
          respuesta.status(e.estado).json({ error: e.message });
          return;
        }
        console.error(e);
        respuesta.status(500).json({ error: "No se ha podido hacer. Vuelve a intentarlo." });
      });
  };

routerAlbum.get("/album", exigirSesion, ruta((_p, u) => verAlbum(u.id)));
routerAlbum.post("/album/aciertos", exigirSesion, ruta((p, u) => apuntarSolitario(u.id, p.body ?? {})));
routerAlbum.get("/yo/cargo", exigirSesion, ruta((_p, u, ahora) => verCargo(u.id, ahora)));

import { Router, type Request, type Response } from "express";
import { exigirSesion, type Usuario } from "../sesion.js";
import { apuntarSolitario, ErrorAlbum, verAlbum } from "../album/album.js";
import { verCargo } from "../cargo/puntos.js";
import { desfaseDe } from "./aportaciones.js";
import { ErrorAno, verAnos, verTarjeta } from "../ano/ano.js";

/**
 * El álbum de estampas (F-56, P-35) y el cargo con la calle y la casa (F-58). Todo con sesión.
 *
 *   GET  /api/album                                  las estampas por jornada, con sus grados
 *   POST /api/album/aciertos  { aciertos: [{ id, respuesta }] }   los aciertos del trivial en solitario
 *                                                    → { apuntados, nuevas: [{ cofradia, nombre }] }
 *   GET  /api/yo/cargo                               el cargo, la calle, la casa y la escalera
 *   GET  /api/yo/semana-santa                        los años con tarjeta (F-59) → { anios: [2028, 2027] }
 *   GET  /api/yo/semana-santa/:anio                  la tarjeta de un año → { anio, alias, numero, cargo, lineas }
 */
export const routerAlbum = Router();

const ruta =
  (fn: (peticion: Request, usuario: Usuario, ahora: Date, dePrueba: boolean) => Promise<unknown>) =>
  (peticion: Request, respuesta: Response) => {
    const desfase = desfaseDe(peticion);
    Promise.resolve()
      .then(() => fn(peticion, respuesta.locals.usuario as Usuario, new Date(Date.now() + desfase), desfase !== 0))
      .then((cuerpo) => respuesta.set("Cache-Control", "no-store").json(cuerpo))
      .catch((e: unknown) => {
        if (e instanceof ErrorAlbum || e instanceof ErrorAno) {
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
routerAlbum.get("/yo/semana-santa", exigirSesion, ruta((_p, u, ahora, prueba) => verAnos(u.id, ahora, prueba)));
routerAlbum.get("/yo/semana-santa/:anio", exigirSesion, ruta((p, u, ahora, prueba) => verTarjeta(u.id, Number(p.params.anio), ahora, prueba)));

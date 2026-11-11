import { Router, type Request, type Response } from "express";
import { exigirSesion, type Usuario } from "../sesion.js";
import { ErrorTrivial } from "../trivial/partidas.js";
import {
  aceptarReto,
  anularEnlace,
  cerrarReto,
  crearCuadrilla,
  enlaceDe,
  entrar,
  misCuadrillas,
  quitar,
  renombrar,
  retar,
  salir,
  verCuadrilla,
  verEnlace,
} from "../cuadrillas/cuadrillas.js";
import { desfaseDe } from "./aportaciones.js";

/**
 * Cuadrillas (F-57, P-36). Todo pide sesión salvo ver un enlace de invitación.
 *
 *   GET    /api/cuadrillas                          las tuyas
 *   POST   /api/cuadrillas              { nombre }  crear una → { id }
 *   GET    /api/cuadrillas/:id                      miembros, cirios y partidas
 *   PATCH  /api/cuadrillas/:id          { nombre }  cambiar el nombre (capataz)
 *   POST   /api/cuadrillas/:id/salir
 *   POST   /api/cuadrillas/:id/enlace               el enlace de invitación (el vigente o uno nuevo)
 *   DELETE /api/cuadrillas/:id/enlace               anularlo (capataz)
 *   DELETE /api/cuadrillas/:id/miembros/:alias      quitar a alguien (capataz)
 *   POST   /api/cuadrillas/:id/retos    { alias }   retar a un miembro → { reto }
 *   GET    /api/cuadrillas/enlaces/:token           lo que ve quien abre el enlace
 *   POST   /api/cuadrillas/enlaces/:token/entrar    → { id }
 *   POST   /api/cuadrillas/retos/:id/aceptar        → { partida }
 *   POST   /api/cuadrillas/retos/:id/rechazar       «Ahora no»
 *   DELETE /api/cuadrillas/retos/:id                cancelar el que mandaste
 *
 * Los errores van como { error, ...extra }, como en el trivial online.
 */
export const routerCuadrillas = Router();

const ruta =
  (fn: (peticion: Request, usuario: Usuario) => Promise<unknown>) =>
  (peticion: Request, respuesta: Response) =>
    Promise.resolve()
      .then(() => fn(peticion, respuesta.locals.usuario as Usuario))
      .then((cuerpo) => respuesta.set("Cache-Control", "no-store").json(cuerpo ?? {}))
      .catch((e: unknown) => {
        if (e instanceof ErrorTrivial) {
          respuesta.status(e.estado).json({ error: e.message, ...e.extra });
          return;
        }
        console.error(e);
        respuesta.status(500).json({ error: "No se ha podido hacer. Vuelve a intentarlo." });
      });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{8,64}$/;
const ALIAS = /^[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]{3,20}$/;
const param = (p: Request, nombre: string, forma: RegExp) => {
  const v = String(p.params[nombre] ?? "");
  if (!forma.test(v)) throw new ErrorTrivial(404, "No existe");
  return v;
};

const r = routerCuadrillas;
r.get("/cuadrillas", exigirSesion, ruta((_p, u) => misCuadrillas(u.id)));
r.post("/cuadrillas", exigirSesion, ruta((p, u) => crearCuadrilla(u.id, p.body?.nombre)));
r.get("/cuadrillas/enlaces/:token", ruta((p, u) => verEnlace(param(p, "token", TOKEN), u?.id)));
r.post("/cuadrillas/enlaces/:token/entrar", exigirSesion, ruta((p, u) => entrar(u.id, param(p, "token", TOKEN))));
r.post("/cuadrillas/retos/:id/aceptar", exigirSesion, ruta((p, u) => aceptarReto(u.id, param(p, "id", UUID))));
r.post("/cuadrillas/retos/:id/rechazar", exigirSesion, ruta((p, u) => cerrarReto(u.id, param(p, "id", UUID), "rechazado")));
r.delete("/cuadrillas/retos/:id", exigirSesion, ruta((p, u) => cerrarReto(u.id, param(p, "id", UUID), "cancelado")));
r.get(
  "/cuadrillas/:id",
  exigirSesion,
  ruta((p, u) => {
    const desfase = desfaseDe(p);
    return verCuadrilla(u.id, param(p, "id", UUID), new Date(Date.now() + desfase), desfase !== 0);
  }),
);
r.patch("/cuadrillas/:id", exigirSesion, ruta((p, u) => renombrar(u.id, param(p, "id", UUID), p.body?.nombre)));
r.post("/cuadrillas/:id/salir", exigirSesion, ruta((p, u) => salir(u.id, param(p, "id", UUID))));
r.post("/cuadrillas/:id/enlace", exigirSesion, ruta((p, u) => enlaceDe(u.id, param(p, "id", UUID))));
r.delete("/cuadrillas/:id/enlace", exigirSesion, ruta((p, u) => anularEnlace(u.id, param(p, "id", UUID))));
r.delete("/cuadrillas/:id/miembros/:alias", exigirSesion, ruta((p, u) => quitar(u.id, param(p, "id", UUID), param(p, "alias", ALIAS))));
r.post("/cuadrillas/:id/retos", exigirSesion, ruta((p, u) => retar(u.id, param(p, "id", UUID), String(p.body?.alias ?? ""))));

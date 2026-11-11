import { Router, type Request, type Response } from "express";
import { exigirSesion, type Usuario } from "../sesion.js";
import {
  aceptarInvitacion,
  aceptarRevancha,
  aliasDe,
  bandeja,
  buscarRival,
  cancelarInvitacion,
  cerrarRevancha,
  crearInvitacion,
  dejarDeBuscar,
  ErrorTrivial,
  guardarAlias,
  historial,
  jugar,
  pedirRevancha,
  verInvitacion,
  verPartida,
  type Accion,
} from "../trivial/partidas.js";

/**
 * Trivial online por turnos (F-51, P-33). Todo pide sesión salvo ver una invitación (quien abre el enlace
 * ve el alias del anfitrión antes de entrar). El servidor decide dado, preguntas, plazos y resultado.
 *
 *   GET    /api/trivial/yo                         { alias | null }
 *   PUT    /api/trivial/yo           { alias }     elegir o cambiar el alias
 *   GET    /api/trivial/bandeja                    partidas, invitaciones pendientes y búsqueda activa
 *   POST   /api/trivial/invitaciones               → { token, vence }
 *   DELETE /api/trivial/invitaciones/:token        cancelarla mientras esté pendiente
 *   GET    /api/trivial/invitaciones/:token        { anfitrion, estado, tuya }
 *   POST   /api/trivial/invitaciones/:token/aceptar → { partida }
 *   POST   /api/trivial/cola                       → { partida } o { buscando }
 *   DELETE /api/trivial/cola                       → { cancelada, partida? }
 *   GET    /api/trivial/partidas/:id
 *   POST   /api/trivial/partidas/:id/jugadas  { accionId, version, tipo, destino?, opcion? }
 *                                                  → { resultado, partida }
 *   GET    /api/trivial/partidas/:id/historial     tú y ese rival: marcador, partidas y revancha pendiente
 *   POST   /api/trivial/partidas/:id/revancha      pedírsela al rival de una partida terminada → { revancha }
 *   POST   /api/trivial/revanchas/:id/aceptar      → { partida }
 *   POST   /api/trivial/revanchas/:id/rechazar     «Ahora no»
 *   DELETE /api/trivial/revanchas/:id              cancelar la que pediste
 *
 * Los errores van como { error, ...extra }; un 409 de jugada trae la partida al día para repintarla.
 */
export const routerTrivial = Router();

const ruta =
  (fn: (peticion: Request, respuesta: Response, usuario: Usuario) => Promise<unknown>) =>
  (peticion: Request, respuesta: Response) =>
    Promise.resolve()
      .then(() => fn(peticion, respuesta, respuesta.locals.usuario as Usuario))
      .then((cuerpo) => {
        if (!respuesta.headersSent) respuesta.set("Cache-Control", "no-store").json(cuerpo ?? {});
      })
      .catch((e: unknown) => {
        if (e instanceof ErrorTrivial) {
          respuesta.status(e.estado).json({ error: e.message, ...e.extra });
          return;
        }
        console.error(e);
        respuesta.status(500).json({ error: "No se ha podido hacer. Vuelve a intentarlo." });
      });

const UUID = /^[0-9a-f-]{36}$/i;
const TOKEN = /^[A-Za-z0-9_-]{8,64}$/;
const param = (p: Request, nombre: string, forma: RegExp) => {
  const v = String(p.params[nombre] ?? "");
  if (!forma.test(v)) throw new ErrorTrivial(404, "No existe");
  return v;
};

routerTrivial.get("/trivial/yo", exigirSesion, ruta(async (_p, _r, u) => ({ alias: await aliasDe(u.id) })));
routerTrivial.put(
  "/trivial/yo",
  exigirSesion,
  ruta(async (p, _r, u) => ({ alias: await guardarAlias(u.id, String(p.body?.alias ?? "")) })),
);
routerTrivial.get("/trivial/bandeja", exigirSesion, ruta((_p, _r, u) => bandeja(u.id)));

routerTrivial.post("/trivial/invitaciones", exigirSesion, ruta((_p, _r, u) => crearInvitacion(u.id)));
routerTrivial.delete(
  "/trivial/invitaciones/:token",
  exigirSesion,
  ruta(async (p, _r, u) => {
    await cancelarInvitacion(u.id, param(p, "token", TOKEN));
    return { cancelada: true };
  }),
);
routerTrivial.get(
  "/trivial/invitaciones/:token",
  ruta((p, r) => verInvitacion(param(p, "token", TOKEN), (r.locals.usuario as Usuario | undefined)?.id)),
);
routerTrivial.post(
  "/trivial/invitaciones/:token/aceptar",
  exigirSesion,
  ruta((p, _r, u) => aceptarInvitacion(u.id, param(p, "token", TOKEN))),
);

routerTrivial.post("/trivial/cola", exigirSesion, ruta((_p, _r, u) => buscarRival(u.id)));
routerTrivial.delete("/trivial/cola", exigirSesion, ruta((_p, _r, u) => dejarDeBuscar(u.id)));

routerTrivial.get("/trivial/partidas/:id", exigirSesion, ruta((p, _r, u) => verPartida(u.id, param(p, "id", UUID))));
routerTrivial.post(
  "/trivial/partidas/:id/jugadas",
  exigirSesion,
  ruta((p, _r, u) => {
    const b = (p.body ?? {}) as Partial<Accion>;
    if (typeof b.accionId !== "string" || !/^[A-Za-z0-9_-]{6,64}$/.test(b.accionId) || !Number.isInteger(b.version)) {
      throw new ErrorTrivial(400, "Falta accionId o version");
    }
    if (!["tirar", "mover", "responder", "rendirse"].includes(String(b.tipo))) throw new ErrorTrivial(400, "No conozco esa jugada");
    return jugar(u.id, param(p, "id", UUID), {
      accionId: b.accionId,
      version: b.version!,
      tipo: b.tipo!,
      destino: typeof b.destino === "string" ? b.destino : undefined,
      opcion: typeof b.opcion === "string" ? b.opcion : undefined,
    });
  }),
);

routerTrivial.get("/trivial/partidas/:id/historial", exigirSesion, ruta((p, _r, u) => historial(u.id, param(p, "id", UUID))));
routerTrivial.post("/trivial/partidas/:id/revancha", exigirSesion, ruta((p, _r, u) => pedirRevancha(u.id, param(p, "id", UUID))));
routerTrivial.post("/trivial/revanchas/:id/aceptar", exigirSesion, ruta((p, _r, u) => aceptarRevancha(u.id, param(p, "id", UUID))));
routerTrivial.post(
  "/trivial/revanchas/:id/rechazar",
  exigirSesion,
  ruta(async (p, _r, u) => {
    await cerrarRevancha(u.id, param(p, "id", UUID), "rechazada");
    return { rechazada: true };
  }),
);
routerTrivial.delete(
  "/trivial/revanchas/:id",
  exigirSesion,
  ruta(async (p, _r, u) => {
    await cerrarRevancha(u.id, param(p, "id", UUID), "cancelada");
    return { cancelada: true };
  }),
);

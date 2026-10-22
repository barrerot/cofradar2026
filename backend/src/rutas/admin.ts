import { Router } from "express";
import { exigirAdmin } from "../admin.js";
import type { Usuario } from "../sesion.js";

/**
 * El panel de administración (fase 5). Todas las rutas piden una cuenta del equipo (admin.ts).
 *
 *   GET /api/admin/yo     { email }: la cuenta tiene acceso (403 si no)
 */
export const routerAdmin = Router();

routerAdmin.use("/admin", exigirAdmin);

routerAdmin.get("/admin/yo", (_peticion, respuesta) => {
  const usuario: Usuario = respuesta.locals.usuario;
  respuesta.json({ email: usuario.email ?? null });
});

import type { NextFunction, Request, Response } from "express";
import type { Usuario } from "./sesion.js";
import { supabase } from "./supabase.js";

/**
 * Quién entra al panel de administración (5.1, F-43).
 *
 * El permiso es una marca en la cuenta de Supabase Auth: `app_metadata.cofradar_admin = true`. Va en
 * `app_metadata`, que solo se escribe con la clave secreta (la persona no puede ponérsela a sí misma), y
 * no hace falta ninguna tabla nueva. La da o la quita `npm run admin -w backend` o, más adelante, el
 * propio panel (P-31).
 *
 * No se lee del token: el token lleva una copia que dura hasta que se renueva (una hora), y quitar el
 * acceso tiene que valer al momento. Se pregunta a Supabase por la cuenta y se recuerda 30 segundos.
 */
const VIGENCIA = 30_000;
const recordados = new Map<string, { admin: boolean; hasta: number }>();

export async function esAdmin(id: string): Promise<boolean> {
  const r = recordados.get(id);
  if (r && r.hasta > Date.now()) return r.admin;
  const { data, error } = await supabase().auth.admin.getUserById(id);
  if (error) throw error;
  const admin = data.user?.app_metadata?.cofradar_admin === true;
  recordados.set(id, { admin, hasta: Date.now() + VIGENCIA });
  return admin;
}

/** Todas las cuentas de Supabase Auth (de mil en mil). */
export async function todasLasCuentas() {
  const cuentas = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await supabase().auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw error;
    cuentas.push(...data.users);
    if (data.users.length < 1000) return cuentas;
  }
}

/** Dar o quitar el permiso a una cuenta, sin tocar el resto de su `app_metadata`. */
export async function ponerAdmin(id: string, app: Record<string, unknown> | undefined, admin: boolean) {
  const { error } = await supabase().auth.admin.updateUserById(id, { app_metadata: { ...app, cofradar_admin: admin } });
  if (error) throw error;
  olvidarAdmin(id);
}

/** Al dar o quitar el permiso desde el panel, que se note en la siguiente petición. */
export function olvidarAdmin(id: string) {
  recordados.delete(id);
}

/** Para las rutas de /api/admin: 401 sin sesión, 403 si la cuenta no es del equipo. */
export async function exigirAdmin(_peticion: Request, respuesta: Response, siguiente: NextFunction) {
  const usuario: Usuario | undefined = respuesta.locals.usuario;
  if (!usuario) {
    respuesta.status(401).json({ error: "Hace falta entrar con Google" });
    return;
  }
  try {
    if (!(await esAdmin(usuario.id))) {
      respuesta.status(403).json({ error: "Esta cuenta no tiene acceso al panel" });
      return;
    }
  } catch (e) {
    console.error(e);
    respuesta.status(503).json({ error: "No se ha podido comprobar el permiso" });
    return;
  }
  siguiente();
}

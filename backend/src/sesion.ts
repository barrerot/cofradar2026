import type { NextFunction, Request, Response } from "express";
import { supabase } from "./supabase.js";

/**
 * La sesión de Supabase Auth en el servidor (2.1).
 *
 * La web manda el token de acceso de la persona en la cabecera `X-Sesion`, no
 * en `Authorization`: en cofradar.buluu.es esa cabecera ya la usa la
 * contraseña de Apache, y si la pisáramos Apache rechazaría la petición.
 *
 * `leerSesion` va en todas las rutas y deja `res.locals.usuario` (o nada, sin
 * error: casi todo Cofradar funciona sin cuenta). `exigirSesion` va solo en
 * las rutas que la necesitan y responde 401 si no hay sesión válida.
 */
export type Usuario = { id: string; email?: string };

export async function leerSesion(peticion: Request, respuesta: Response, siguiente: NextFunction) {
  const token = peticion.get("X-Sesion");
  if (token) {
    // getClaims comprueba la firma del token (con las claves públicas del
    // proyecto, o preguntando a Supabase si el proyecto aún firma con secreto)
    try {
      const { data, error } = await supabase().auth.getClaims(token);
      if (!error && data?.claims.sub) {
        respuesta.locals.usuario = { id: data.claims.sub, email: data.claims.email } satisfies Usuario;
      }
    } catch {
      // Si Supabase no responde, se sigue como sin sesión: lo público funciona igual
    }
  }
  siguiente();
}

export function exigirSesion(_peticion: Request, respuesta: Response, siguiente: NextFunction) {
  if (!respuesta.locals.usuario) {
    respuesta.status(401).json({ error: "Hace falta entrar con Google" });
    return;
  }
  siguiente();
}

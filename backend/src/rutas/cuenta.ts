import { Router } from "express";
import { exigirSesion, type Usuario } from "../sesion.js";

export const routerCuenta = Router();

/** Quién soy para el servidor. Sirve para comprobar que la sesión llega y vale. */
routerCuenta.get("/yo", exigirSesion, (_peticion, respuesta) => {
  const usuario: Usuario = respuesta.locals.usuario;
  respuesta.json(usuario);
});

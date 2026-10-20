import { Router, type Request, type Response } from "express";
import { exigirSesion, type Usuario } from "../sesion.js";
import { supabase } from "../supabase.js";
import { hermandadesYEdicion } from "./cofradias.js";

/**
 * Lo de la cuenta de cada persona. Todas las rutas piden sesión (`X-Sesion`) y solo tocan lo suyo.
 *
 *   GET    /api/yo                   quién soy para el servidor
 *   GET    /api/yo/relaciones        { anio, seguidas: [id], vistas: [{ id, anio }] }
 *   PUT    /api/yo/seguidas/:id      seguir  (se puede repetir: no duplica)
 *   DELETE /api/yo/seguidas/:id      dejar de seguir
 *   PUT    /api/yo/vistas/:id        «La he visto» en la edición actual
 *   DELETE /api/yo/vistas/:id        quitarla de la edición actual
 *
 * `:id` es el de la cofradía en la API («la-macarena»). En la base va el id de la hermandad.
 */
export const routerCuenta = Router();

routerCuenta.get("/yo", exigirSesion, (_peticion, respuesta) => {
  const usuario: Usuario = respuesta.locals.usuario;
  respuesta.json(usuario);
});

const ruta =
  (fn: (peticion: Request, respuesta: Response, usuario: Usuario) => Promise<void>) =>
  (peticion: Request, respuesta: Response) =>
    fn(peticion, respuesta, respuesta.locals.usuario as Usuario).catch((e: unknown) => {
      console.error(e);
      respuesta.status(500).json({ error: "No se ha podido guardar" });
    });

routerCuenta.get(
  "/yo/relaciones",
  exigirSesion,
  ruta(async (_peticion, respuesta, usuario) => {
    const { porId, anio } = await hermandadesYEdicion();
    const db = supabase();
    const [seguidas, vistas] = await Promise.all([
      db.from("seguida").select("hermandad_id").eq("usuario_id", usuario.id),
      db.from("vista").select("hermandad_id, anio").eq("usuario_id", usuario.id),
    ]);
    if (seguidas.error) throw seguidas.error;
    if (vistas.error) throw vistas.error;
    respuesta.set("Cache-Control", "no-store").json({
      anio,
      // Una hermandad que ya no está en la última edición no tiene ficha: no se manda
      seguidas: seguidas.data.map((f) => porId.get(f.hermandad_id)).filter(Boolean),
      vistas: vistas.data.flatMap((f) => (porId.has(f.hermandad_id) ? [{ id: porId.get(f.hermandad_id), anio: f.anio }] : [])),
    });
  }),
);

/** PUT añade y DELETE quita, en `tabla`, la cofradía `:id` de quien llama. */
function relacion(tabla: "seguida" | "vista") {
  const cambiar = (poner: boolean) =>
    ruta(async (peticion, respuesta, usuario) => {
      const { porSlug, anio } = await hermandadesYEdicion();
      const hermandad_id = porSlug.get(String(peticion.params.id));
      if (hermandad_id === undefined) {
        respuesta.status(404).json({ error: `No hay ninguna cofradía «${peticion.params.id}»` });
        return;
      }
      const fila: Record<string, string | number> = { usuario_id: usuario.id, hermandad_id };
      if (tabla === "vista") fila.anio = anio;
      const db = supabase().from(tabla);
      const { error } = poner
        ? await db.upsert(fila, { ignoreDuplicates: true })
        : await db.delete().match(fila);
      if (error) throw error;
      respuesta.status(204).end();
    });
  return { poner: cambiar(true), quitar: cambiar(false) };
}

const seguida = relacion("seguida");
const vista = relacion("vista");
routerCuenta.put("/yo/seguidas/:id", exigirSesion, seguida.poner);
routerCuenta.delete("/yo/seguidas/:id", exigirSesion, seguida.quitar);
routerCuenta.put("/yo/vistas/:id", exigirSesion, vista.poner);
routerCuenta.delete("/yo/vistas/:id", exigirSesion, vista.quitar);

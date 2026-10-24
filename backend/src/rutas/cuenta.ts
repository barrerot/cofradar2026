import { Router, type Request, type Response } from "express";
import { exigirSesion, type Usuario } from "../sesion.js";
import { supabase } from "../supabase.js";
import { historias } from "./aportaciones.js";
import { hermandadesYEdicion } from "./cofradias.js";

/**
 * Lo de la cuenta de cada persona. Todas las rutas piden sesión (`X-Sesion`) y solo tocan lo suyo.
 *
 *   GET    /api/yo                   quién soy para el servidor
 *   GET    /api/yo/relaciones        { anio, seguidas: [id], vistas: [{ id, anio }] }
 *   GET    /api/yo/datos             todo lo tuyo, para descargarlo (P-23, RGPD art. 15 y 20)
 *   DELETE /api/yo                   eliminar la cuenta, al momento y sin vuelta atrás (P-24)
 *   PUT    /api/yo/seguidas/:id      seguir  (se puede repetir: no duplica)
 *   DELETE /api/yo/seguidas/:id      dejar de seguir
 *   PUT    /api/yo/vistas/:id        «La he visto» en la edición actual, o en `?anio=` (Mi colección:
 *                                    «Añadir una que vi» de un año anterior)
 *   DELETE /api/yo/vistas/:id        quitarla de la edición actual, o de `?anio=`
 *
 * `:id` es el de la cofradía en la API («la-macarena»). En la base va el id de la hermandad.
 */
export const routerCuenta = Router();

routerCuenta.get("/yo", exigirSesion, (_peticion, respuesta) => {
  const usuario: Usuario = respuesta.locals.usuario;
  respuesta.json(usuario);
});

/**
 * Eliminar la cuenta (P-24). Borra el usuario de Supabase Auth, y con él, por `on delete cascade`, sus
 * seguidas, vistas y aportaciones (supabase/esquema.sql; lo de las aportaciones, decidido por Carlos el
 * 21/10/2026, a revisar en la consulta legal de BUL-223). Es inmediato: no hay papelera ni plazo de gracia.
 */
routerCuenta.delete(
  "/yo",
  exigirSesion,
  async (_peticion, respuesta) => {
    const usuario: Usuario = respuesta.locals.usuario;
    try {
      const { error } = await supabase().auth.admin.deleteUser(usuario.id);
      if (error) throw error;
      historias.olvidar(usuario.id);
      respuesta.status(204).end();
    } catch (e) {
      console.error(e);
      respuesta.status(500).json({ error: "No se ha podido eliminar la cuenta" });
    }
  },
);

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

/**
 * «Descargar mis datos»: TODO lo que Cofradar guarda de la persona, legible y en un solo fichero JSON.
 * La cuenta (de Supabase Auth), las seguidas, las vistas y las aportaciones de «Dar fe», con su ubicación.
 */
routerCuenta.get(
  "/yo/datos",
  exigirSesion,
  ruta(async (_peticion, respuesta, usuario) => {
    const { porId } = await hermandadesYEdicion();
    const db = supabase();
    const [cuenta, seguidas, vistas, nombres, aportaciones] = await Promise.all([
      db.auth.admin.getUserById(usuario.id),
      db.from("seguida").select("hermandad_id, creada").eq("usuario_id", usuario.id).order("creada"),
      db.from("vista").select("hermandad_id, anio, creada").eq("usuario_id", usuario.id).order("anio"),
      db.from("hermandad").select("id, nombre"),
      db
        .from("aportacion")
        .select("hermandad_id, elemento, latitud, longitud, precision_m, observada, recibida, puntos_base, bonus")
        .eq("usuario_id", usuario.id)
        .order("observada"),
    ]);
    for (const r of [seguidas, vistas, nombres, aportaciones]) if (r.error) throw r.error;
    if (cuenta.error) throw cuenta.error;
    const nombre = new Map((nombres.data ?? []).map((h) => [h.id as number, h.nombre as string]));
    const u = cuenta.data.user;
    const cofradia = (id: number) => ({ id: porId.get(id) ?? null, nombre: nombre.get(id) ?? null });
    respuesta
      .set("Cache-Control", "no-store")
      .attachment("cofradar-mis-datos.json")
      .json({
        descargado: new Date().toISOString(),
        explicacion:
          "Todo lo que Cofradar guarda de ti. La cuenta la da Google al entrar; seguidas y vistas, lo que tú has marcado; y cada vez que diste fe, con dónde estabas si tu teléfono lo sabía.",
        cuenta: {
          id: u.id,
          correo: u.email ?? null,
          nombre: (u.user_metadata?.full_name ?? u.user_metadata?.name ?? null) as string | null,
          entra_con: u.app_metadata?.provider ?? "google",
          creada: u.created_at,
          ultima_entrada: u.last_sign_in_at ?? null,
        },
        seguidas: (seguidas.data ?? []).map((f) => ({ ...cofradia(f.hermandad_id), desde: f.creada })),
        vistas: (vistas.data ?? []).map((f) => ({ ...cofradia(f.hermandad_id), anio: f.anio, guardada: f.creada })),
        dar_fe: (aportaciones.data ?? []).map((f) => ({
          ...cofradia(f.hermandad_id),
          // 0 la cruz de guía, 1, 2, 3 los pasos; null, «Estoy viendo la cofradía»
          elemento: f.elemento,
          vista: f.observada,
          recibida: f.recibida,
          ubicacion: f.latitud === null ? null : { latitud: Number(f.latitud), longitud: Number(f.longitud), precision_m: f.precision_m },
          puntos: f.puntos_base + f.bonus,
        })),
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
      if (tabla === "vista") {
        const pedido = peticion.query.anio === undefined ? anio : Number(peticion.query.anio);
        // Desde 1950 hasta la edición actual: no se marca como vista una salida que aún no ha ocurrido
        if (!Number.isInteger(pedido) || pedido < 1950 || pedido > anio) {
          respuesta.status(400).json({ error: `El año tiene que estar entre 1950 y ${anio}` });
          return;
        }
        fila.anio = pedido;
      }
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

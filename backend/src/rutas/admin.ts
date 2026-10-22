import { Router, type Request, type Response } from "express";
import { exigirAdmin } from "../admin.js";
import { registro, vigente, type TipoRegistro } from "../panel.js";
import type { Usuario } from "../sesion.js";
import { supabase } from "../supabase.js";
import { desfaseDe } from "./aportaciones.js";
import { hermandadesYEdicion } from "./cofradias.js";
import { estadoDe, olvidarEstado } from "./estado.js";

/**
 * El panel de administración (fase 5). Todas las rutas piden una cuenta del equipo (admin.ts).
 *
 *   GET  /api/admin/yo                      { email }: la cuenta tiene acceso (403 si no)
 *   GET  /api/admin/jornadas/:id            P-28: las cofradías del día con lo que dice el motor y lo
 *                                           publicado, los avisos de jornada y el registro de hoy
 *   POST /api/admin/jornadas/:id/registro   publicar: { tipo, cofradia?, clase?, detalle?, texto }
 *   POST /api/admin/registro/:id/retirar    retirar algo publicado: { motivo }
 *
 * Nada se borra ni se sobrescribe: publicar añade una fila a `registro_panel` y retirar la cierra con
 * quién, cuándo y por qué (panel.ts). Lo publicado se ve en la app en el siguiente refresco.
 *
 * Reloj de prueba: como en «Dar fe», `?desfase=` al leer y `X-Reloj-Desfase` al publicar (solo con
 * RELOJ_DE_PRUEBA=1); lo publicado así va marcado `de_prueba` y solo se ve con el reloj de prueba.
 */
export const routerAdmin = Router();

routerAdmin.use("/admin", exigirAdmin);

const ruta =
  (fn: (peticion: Request, respuesta: Response, usuario: Usuario) => Promise<void>) =>
  (peticion: Request, respuesta: Response) =>
    fn(peticion, respuesta, respuesta.locals.usuario as Usuario).catch((e: unknown) => {
      console.error(e);
      respuesta.status(500).json({ error: "No se ha podido completar" });
    });

routerAdmin.get("/admin/yo", (_peticion, respuesta) => {
  const usuario: Usuario = respuesta.locals.usuario;
  respuesta.json({ email: usuario.email ?? null });
});

const MIN = 60_000;
const NOMBRE_ELEMENTO = (orden: number, nombre: string) => (orden === 0 ? "Cruz de guía" : nombre);

routerAdmin.get(
  "/admin/jornadas/:id",
  ruta(async (peticion, respuesta) => {
    const jornada = Number(peticion.params.id);
    const desfase = Number(peticion.query.desfase ?? 0) || 0;
    const instante = new Date(Date.now() + desfase);
    const conPruebas = desfase !== 0;
    const estado = await estadoDe(jornada, instante, conPruebas);
    const anotaciones = await registro(jornada, estado.anio, conPruebas);
    const panel = vigente(anotaciones);
    const nombres = new Map(estado.cofradias.map((c) => [c.id, c.nombre]));
    const cofradias = estado.cofradias.map((c) => {
      // La última vez que alguien dio fe: el elemento visto más recientemente o, si solo hay
      // «Estoy viendo la cofradía», la fase confirmada
      const vistos = c.elementos.filter((e) => e.haceMin !== null && e.confianza !== "estimado").sort((a, b) => a.haceMin! - b.haceMin!);
      const v = vistos[0];
      const ultima = v
        ? { que: NOMBRE_ELEMENTO(v.orden, v.nombre), hora: new Date(instante.getTime() - v.haceMin! * MIN).toISOString() }
        : c.fase.haceMin !== null
          ? { que: "Aportación genérica", hora: new Date(instante.getTime() - c.fase.haceMin * MIN).toISOString() }
          : null;
      const de = (tipo: TipoRegistro) => anotaciones.filter((a) => a.tipo === tipo && a.cofradia === c.id && !a.retirada);
      return {
        id: c.id,
        nombre: c.nombre,
        fase: c.fase,
        sale: c.sale,
        // Las del motor: las incidencias van aparte, con su texto
        alteraciones: c.alteraciones.filter((a) => a.tipo !== "incidencia"),
        alteracionesRetiradas: de("retirar_alteracion"),
        incidencias: de("incidencia"),
        cancelada: de("cancelada")[0] ?? null,
        ultima,
      };
    });
    respuesta.setHeader("Cache-Control", "no-store");
    respuesta.json({
      jornada,
      ahora: instante.toISOString(),
      cofradias,
      avisos: panel.avisos,
      registro: anotaciones.map((a) => ({ ...a, nombre: a.cofradia ? (nombres.get(a.cofradia) ?? a.cofradia) : null })),
    });
  }),
);

type Publicar = { tipo?: unknown; cofradia?: unknown; clase?: unknown; detalle?: unknown; texto?: unknown };
const TIPOS: TipoRegistro[] = ["aviso_jornada", "incidencia", "cancelada", "retirar_alteracion"];
const texto = (x: unknown) => (typeof x === "string" ? x.trim() : "");

routerAdmin.post(
  "/admin/jornadas/:id/registro",
  ruta(async (peticion, respuesta, usuario) => {
    const jornada = Number(peticion.params.id);
    const b = (peticion.body ?? {}) as Publicar;
    const tipo = b.tipo as TipoRegistro;
    const t = texto(b.texto).slice(0, 500);
    const mal = (error: string) => void respuesta.status(400).json({ error });
    if (!TIPOS.includes(tipo)) return mal("Tipo desconocido");
    if (!t) return mal(tipo === "cancelada" ? "Falta la nota" : tipo === "retirar_alteracion" ? "Falta el motivo" : "Falta el texto");

    const desfase = desfaseDe(peticion);
    const instante = new Date(Date.now() + desfase);
    const estado = await estadoDe(jornada, instante, desfase !== 0);
    let hermandad: number | null = null;
    let clase: string | null = null;
    let detalle: string | null = null;

    if (tipo === "aviso_jornada") {
      clase = b.clase === "lluvia" ? "lluvia" : "otro";
    } else {
      const c = estado.cofradias.find((x) => x.id === b.cofradia);
      if (!c) return mal("Esa cofradía no sale en esta jornada");
      hermandad = (await hermandadesYEdicion()).porSlug.get(c.id) ?? null;
      if (hermandad === null) return mal("Esa cofradía no existe");
      // Cancelada es no salir: solo antes de que salga (diseño de BUL-200)
      if (tipo === "cancelada" && !["prevista", "inminente"].includes(c.fase.valor))
        return void respuesta.status(409).json({ error: "Solo se puede cancelar una cofradía que aún no ha salido" });
      if (tipo === "retirar_alteracion") {
        const a = c.alteraciones.find((x) => x.tipo === b.clase && x.tipo !== "incidencia");
        if (!a) return void respuesta.status(409).json({ error: "Esa alteración ya no está publicada" });
        clase = a.tipo;
        detalle = texto(b.detalle) || a.tipo;
      }
    }

    const { data, error } = await supabase()
      .from("registro_panel")
      .insert({
        anio: estado.anio,
        jornada_id: jornada,
        tipo,
        hermandad_id: hermandad,
        clase,
        detalle,
        texto: t,
        autor_id: usuario.id,
        autor_email: usuario.email ?? usuario.id,
        creada: instante.toISOString(),
        de_prueba: desfase !== 0,
      })
      .select("id")
      .single();
    if (error) throw error;
    olvidarEstado();
    respuesta.status(201).json({ id: data.id });
  }),
);

routerAdmin.post(
  "/admin/registro/:id/retirar",
  ruta(async (peticion, respuesta, usuario) => {
    const motivo = texto((peticion.body ?? {}).motivo).slice(0, 500);
    if (!motivo) return void respuesta.status(400).json({ error: "Falta el motivo" });
    const cuando = new Date(Date.now() + desfaseDe(peticion)).toISOString();
    const { data, error } = await supabase()
      .from("registro_panel")
      .update({ retirada: cuando, retirada_email: usuario.email ?? usuario.id, retirada_motivo: motivo })
      .eq("id", peticion.params.id)
      .is("retirada", null)
      .select("id");
    if (error) throw error;
    if (!data?.length) return void respuesta.status(409).json({ error: "Ya estaba retirado" });
    olvidarEstado();
    respuesta.status(204).end();
  }),
);

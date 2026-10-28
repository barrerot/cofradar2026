import { Router, type Request, type Response } from "express";
import { exigirAdmin, ponerAdmin, todasLasCuentas } from "../admin.js";
import {
  ALTERACION_MINIMA,
  ALTERACION_SE_QUITA,
  BONUS,
  CERCA_FUERA,
  DESACTUALIZADO,
  MEMORIA,
  MINIMO_INDEPENDIENTES,
  MISMO_SITIO,
  PARADA,
  REDONDEO,
  SALTO,
  SIMULTANEAS,
  TOLERANCIA,
  VENTANA_INMINENTE,
  VIGENTE,
} from "../motor/motor.js";
import { PUNTOS_BASE } from "../motor/plausibilidad.js";
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
 *   POST /api/admin/registro/:id/corregir   corregir un aviso o una incidencia: { texto } (lo retira con
 *                                           el motivo «Corregido» y publica el texto nuevo, en un paso)
 *   GET    /api/admin/permisos              P-31: quién entra al panel y los ajustes del motor (solo lectura)
 *   POST   /api/admin/permisos              dar acceso: { email } de una cuenta que ya ha entrado en Cofradar
 *   DELETE /api/admin/permisos/:id          quitarlo (a uno mismo, no: el panel se quedaría sin nadie)
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
        // Lo que tuvo y ya terminó: lo que sigue está en `alteraciones`
        historial: c.historial.filter((h) => h.hasta !== null),
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

routerAdmin.post(
  "/admin/registro/:id/corregir",
  ruta(async (peticion, respuesta, usuario) => {
    const t = texto((peticion.body ?? {}).texto).slice(0, 500);
    if (!t) return void respuesta.status(400).json({ error: "Falta el texto" });
    const { data, error } = await supabase().rpc("corregir_registro", {
      p_id: peticion.params.id,
      p_texto: t,
      p_autor: usuario.id,
      p_email: usuario.email ?? usuario.id,
      p_cuando: new Date(Date.now() + desfaseDe(peticion)).toISOString(),
    });
    if (error) throw error;
    if (!data) return void respuesta.status(409).json({ error: "Ya estaba retirado" });
    olvidarEstado();
    respuesta.status(201).json({ id: data });
  }),
);

// ── P-31 · Permisos y configuración (5.5) ─────────────────────────────────────────────────────────
const min = (ms: number) => Math.round(ms / MIN);

/**
 * Los ajustes generales se ENSEÑAN pero no se cambian aquí (decisión de Carlos del 22/10/2026): mueven el
 * motor, y se cambian en el código, con sus pruebas (motor/*.test.ts). Salen de las mismas constantes que
 * usa el motor, así que lo que se ve es lo que hay.
 */
function ajustes() {
  return [
    {
      grupo: "Posición estimada",
      valores: [
        { nombre: "Vigente", valor: `menos de ${min(VIGENTE)} min` },
        { nombre: "Desactualizada («hace X min»)", valor: `de ${min(VIGENTE)} a ${min(DESACTUALIZADO)} min` },
        { nombre: "Deja de afirmarse (vuelve a «según horario»)", valor: `a partir de ${min(DESACTUALIZADO)} min` },
      ],
    },
    {
      grupo: "Fases y alteraciones",
      valores: [
        { nombre: "«Sale pronto»", valor: `${min(VENTANA_INMINENTE)} min antes de la salida` },
        { nombre: "Retraso o adelanto", valor: `a partir de ${min(ALTERACION_MINIMA)} min, de ${min(REDONDEO)} en ${min(REDONDEO)}; ya publicado, se quita al bajar de ${min(ALTERACION_SE_QUITA)} min` },
        { nombre: "Interrumpida", valor: `en el mismo sitio (menos de ${MISMO_SITIO} m) ${min(PARADA)} min o más` },
        { nombre: "Cambio de recorrido", valor: `${MINIMO_INDEPENDIENTES} personas a la vez fuera del recorrido, a menos de ${CERCA_FUERA} m entre ellas` },
        { nombre: "Regreso anticipado", valor: `aparece ${min(SALTO)} min o más por delante de lo que tocaba` },
      ],
    },
    {
      grupo: "«Dar fe»",
      valores: [
        { nombre: "Para mover la posición", valor: `${MINIMO_INDEPENDIENTES} personas en ${min(SIMULTANEAS)} min, que coincidan en ${min(TOLERANCIA)} min` },
        { nombre: "Cuánto cuenta una aportación", valor: `${min(MEMORIA) / 60} h` },
        { nombre: "Puntos", valor: `${PUNTOS_BASE} al dar fe; bonus de ${BONUS.base}, ${BONUS.escasez} o ${BONUS.obsoleta}` },
      ],
    },
  ];
}

routerAdmin.get(
  "/admin/permisos",
  ruta(async (_peticion, respuesta, usuario) => {
    const personas = (await todasLasCuentas())
      .filter((u) => u.app_metadata?.cofradar_admin === true)
      .map((u) => ({ id: u.id, email: u.email ?? u.id, yo: u.id === usuario.id }))
      .sort((a, b) => a.email.localeCompare(b.email));
    respuesta.setHeader("Cache-Control", "no-store");
    respuesta.json({ personas, ajustes: ajustes() });
  }),
);

routerAdmin.post(
  "/admin/permisos",
  ruta(async (peticion, respuesta) => {
    const email = texto((peticion.body ?? {}).email).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) return void respuesta.status(400).json({ error: "Escribe un correo" });
    const cuenta = (await todasLasCuentas()).find((u) => u.email?.toLowerCase() === email);
    if (!cuenta)
      return void respuesta.status(404).json({ error: "Esa cuenta no ha entrado nunca en Cofradar. Que entre una vez con Google y vuelve a añadirla." });
    await ponerAdmin(cuenta.id, cuenta.app_metadata, true);
    respuesta.status(204).end();
  }),
);

routerAdmin.delete(
  "/admin/permisos/:id",
  ruta(async (peticion, respuesta, usuario) => {
    if (peticion.params.id === usuario.id) return void respuesta.status(409).json({ error: "No puedes quitarte el acceso a ti mismo" });
    const { data, error } = await supabase().auth.admin.getUserById(peticion.params.id!);
    if (error || !data.user) return void respuesta.status(404).json({ error: "Esa cuenta no existe" });
    await ponerAdmin(data.user.id, data.user.app_metadata, false);
    respuesta.status(204).end();
  }),
);

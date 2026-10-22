import { Router, type Request, type Response } from "express";
import { exigirAdmin } from "../admin.js";
import { supabase } from "../supabase.js";
import { olvidarDatosBase, slug } from "./cofradias.js";
import { olvidarEstado } from "./estado.js";

/**
 * P-29 · Datos base (5.3): corregir desde el panel las cofradías, las jornadas y los horarios.
 *
 * Desde el 22/10/2026 manda Supabase (decisión de Carlos): lo que se corrige aquí es el dato, y los CSV
 * de docs/datos/ son su copia (npm run exportar:datos -w backend). La carga de los CSV se niega a pisar
 * lo que no se haya exportado (scripts/cargar-supabase.ts).
 *
 *   GET /api/admin/datos                  todo lo que enseña la pantalla, de la última edición
 *   PUT /api/admin/datos/hermandad/:id    { nombre, nombre_oficial, web, fundacion, templo_id }
 *   PUT /api/admin/datos/paso/:id         { nombre }
 *   PUT /api/admin/datos/salida/:id       { jornada_id, estado: null | "no_procesiona" }
 *   PUT /api/admin/datos/horario/:id      { punto_geografico_id, fecha_hora: "2026-04-03T02:30", hora_publicada }
 *   PUT /api/admin/datos/jornada/:id      { nombre }
 *
 * Y las taxonomías (P-30, 5.4):
 *   PUT    /api/admin/datos/elemento/:id  { nombre, llano, orden }
 *   POST   /api/admin/datos/elemento      { nombre, llano }  (al final del cortejo)
 *   DELETE /api/admin/datos/elemento/:id  solo si ningún paso es de ese tipo, y nunca la cruz de guía
 *   POST   /api/admin/datos/hito          { punto_geografico_id, carrera_oficial }  (al final)
 *   PUT    /api/admin/datos/hito/:id      { orden, carrera_oficial }
 *   DELETE /api/admin/datos/hito/:id      quitarlo de la lista (el lugar sigue existiendo)
 *   PUT    /api/admin/datos/templo/:id    { nombre }
 *
 * Cada cambio se ve en la app al momento: se olvida lo guardado en memoria.
 */
export const routerDatosBase = Router();
routerDatosBase.use("/admin/datos", exigirAdmin);

const ruta = (fn: (peticion: Request, respuesta: Response) => Promise<void>) => (peticion: Request, respuesta: Response) =>
  fn(peticion, respuesta).catch((e: unknown) => {
    console.error(e);
    respuesta.status(500).json({ error: "No se ha podido completar" });
  });

routerDatosBase.get(
  "/admin/datos",
  ruta(async (_peticion, respuesta) => {
    const db = supabase();
    const { data: ed, error: e1 } = await db.from("edicion").select("id, anio").order("anio", { ascending: false }).limit(1).single();
    if (e1) throw e1;
    const [jornadas, templos, lugares, salidas, recorridos, elementos, hitos] = await Promise.all([
      db.from("jornada").select("id, nombre, orden").order("orden"),
      db.from("templo").select("id, nombre").order("nombre"),
      db.from("punto_geografico").select("id, nombre, tipo, latitud, longitud").order("nombre"),
      db
        .from("salida_procesional")
        .select(
          `id, estado, jornada_id,
           hermandad(id, nombre, nombre_oficial, web, fundacion, templo_id, paso(id, orden, nombre, elemento_id)),
           punto_itinerario(id, referencia, orden, fecha_hora, hora_publicada, punto_geografico_id)`,
        )
        .eq("edicion_id", ed.id),
      db.from("recorrido").select("salida_procesional_id, provisional"),
      db.from("elemento").select("id, nombre, llano, orden, clave").order("orden"),
      db.from("hito").select("id, punto_geografico_id, orden, carrera_oficial").order("orden"),
    ]);
    for (const r of [jornadas, templos, lugares, salidas, recorridos, elementos, hitos]) if (r.error) throw r.error;
    const conRecorrido = new Set((recorridos.data ?? []).map((r) => r.salida_procesional_id as number));
    type S = {
      id: number;
      estado: string | null;
      jornada_id: number;
      hermandad: { id: number; nombre: string; nombre_oficial: string; web: string | null; fundacion: string | null; templo_id: number; paso: { id: number; orden: number; nombre: string; elemento_id: number | null }[] };
      punto_itinerario: { id: number; referencia: string; orden: number; fecha_hora: string; hora_publicada: boolean; punto_geografico_id: number }[];
    };
    const cofradias = ((salidas.data ?? []) as unknown as S[])
      .map((s) => ({
        id: slug(s.hermandad.nombre),
        salidaId: s.id,
        hermandadId: s.hermandad.id,
        nombre: s.hermandad.nombre,
        nombreOficial: s.hermandad.nombre_oficial,
        web: s.hermandad.web,
        fundacion: s.hermandad.fundacion,
        templo: s.hermandad.templo_id,
        jornada: s.jornada_id,
        estado: s.estado,
        pasos: [...s.hermandad.paso].sort((a, b) => a.orden - b.orden),
        horarios: [...s.punto_itinerario]
          .sort((a, b) => (a.referencia === b.referencia ? a.orden - b.orden : a.referencia === "cruz_guia" ? -1 : 1))
          .map((p) => ({
            id: p.id,
            referencia: p.referencia,
            orden: p.orden,
            lugar: p.punto_geografico_id,
            hora: p.fecha_hora.slice(0, 16),
            publicada: p.hora_publicada,
          })),
        itinerario: conRecorrido.has(s.id),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    respuesta.setHeader("Cache-Control", "no-store");
    respuesta.json({
      anio: ed.anio,
      jornadas: jornadas.data,
      templos: templos.data,
      lugares: lugares.data,
      elementos: elementos.data,
      hitos: (hitos.data ?? []).map((h) => ({ id: h.id, lugar: h.punto_geografico_id, orden: h.orden, carreraOficial: h.carrera_oficial })),
      cofradias,
    });
  }),
);

type Campo = "texto" | "texto?" | "entero" | "entero?" | "sino" | "fecha";
const VALIDAR: Record<string, { tabla: string; campos: Record<string, Campo> }> = {
  hermandad: { tabla: "hermandad", campos: { nombre: "texto", nombre_oficial: "texto", web: "texto?", fundacion: "texto?", templo_id: "entero" } },
  paso: { tabla: "paso", campos: { nombre: "texto", elemento_id: "entero?" } },
  salida: { tabla: "salida_procesional", campos: { jornada_id: "entero", estado: "texto?" } },
  horario: { tabla: "punto_itinerario", campos: { punto_geografico_id: "entero", fecha_hora: "fecha", hora_publicada: "sino" } },
  jornada: { tabla: "jornada", campos: { nombre: "texto" } },
  elemento: { tabla: "elemento", campos: { nombre: "texto", llano: "texto", orden: "entero" } },
  hito: { tabla: "hito", campos: { punto_geografico_id: "entero", orden: "entero", carrera_oficial: "sino" } },
  templo: { tabla: "templo", campos: { nombre: "texto" } },
};

/** Lo que llega, limpio; o el porqué no vale. */
function limpiar(campos: Record<string, Campo>, cuerpo: Record<string, unknown>): Record<string, unknown> | string {
  const res: Record<string, unknown> = {};
  for (const [c, tipo] of Object.entries(campos)) {
    if (!(c in cuerpo)) continue;
    const v = cuerpo[c];
    if (tipo === "texto" || tipo === "texto?") {
      const t = typeof v === "string" ? v.trim() : v === null ? "" : null;
      if (t === null) return `${c} no vale`;
      if (!t && tipo === "texto") return `${c} no puede quedar vacío`;
      res[c] = t || null;
    } else if (tipo === "entero" || tipo === "entero?") {
      if (v === null && tipo === "entero?") res[c] = null;
      else if (!Number.isInteger(v)) return `${c} no vale`;
      else res[c] = v;
    } else if (tipo === "sino") {
      if (typeof v !== "boolean") return `${c} no vale`;
      res[c] = v;
    } else {
      if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return `${c} no vale`;
      res[c] = v;
    }
  }
  if (!Object.keys(res).length) return "No hay nada que cambiar";
  return res;
}

routerDatosBase.put(
  "/admin/datos/:que/:id",
  ruta(async (peticion, respuesta) => {
    const def = VALIDAR[peticion.params.que!];
    const id = Number(peticion.params.id);
    if (!def || !Number.isInteger(id)) return void respuesta.status(404).json({ error: "Eso no se puede cambiar" });
    const cambio = limpiar(def.campos, (peticion.body ?? {}) as Record<string, unknown>);
    if (typeof cambio === "string") return void respuesta.status(400).json({ error: cambio });
    if ("estado" in cambio && ![null, "no_procesiona"].includes(cambio.estado as string | null))
      return void respuesta.status(400).json({ error: "El estado solo puede ser vacío o «no procesiona»" });
    const { data, error } = await supabase().from(def.tabla).update(cambio).eq("id", id).select("id");
    if (error) {
      // Clave ajena (un templo o un lugar que no existe) o un nombre repetido
      if (error.code === "23503" || error.code === "23505") return void respuesta.status(400).json({ error: "Ese valor no existe o ya está usado" });
      throw error;
    }
    if (!data?.length) return void respuesta.status(404).json({ error: "No existe" });
    olvidarDatosBase();
    olvidarEstado();
    respuesta.status(204).end();
  }),
);

/** Lo nuevo va al final: id y orden siguientes a los que hay (las tablas base no tienen id automático). */
async function siguiente(tabla: "elemento" | "hito"): Promise<{ id: number; orden: number }> {
  const { data, error } = await supabase().from(tabla).select("id, orden");
  if (error) throw error;
  const max = (k: "id" | "orden") => Math.max(0, ...(data ?? []).map((x) => x[k] as number));
  return { id: max("id") + 1, orden: max("orden") + 1 };
}

routerDatosBase.post(
  "/admin/datos/:que(elemento|hito)",
  ruta(async (peticion, respuesta) => {
    const que = peticion.params.que as "elemento" | "hito";
    const cambio = limpiar(VALIDAR[que]!.campos, (peticion.body ?? {}) as Record<string, unknown>);
    if (typeof cambio === "string") return void respuesta.status(400).json({ error: cambio });
    const falta = que === "elemento" ? (["nombre", "llano"] as const) : (["punto_geografico_id"] as const);
    if (falta.some((c) => cambio[c] === undefined || cambio[c] === null)) return void respuesta.status(400).json({ error: "Faltan datos" });
    const { error } = await supabase().from(que).insert({ ...cambio, ...(await siguiente(que)) });
    if (error) {
      if (error.code === "23503" || error.code === "23505") return void respuesta.status(400).json({ error: "Ese lugar no existe o ya está en la lista" });
      throw error;
    }
    olvidarDatosBase();
    respuesta.status(201).end();
  }),
);

routerDatosBase.delete(
  "/admin/datos/:que(elemento|hito)/:id",
  ruta(async (peticion, respuesta) => {
    const que = peticion.params.que as "elemento" | "hito";
    const id = Number(peticion.params.id);
    let consulta = supabase().from(que).delete().eq("id", id);
    // La cruz de guía la necesita la app: no se quita
    if (que === "elemento") consulta = consulta.is("clave", null);
    const { data, error } = await consulta.select("id");
    if (error) {
      if (error.code === "23503") return void respuesta.status(409).json({ error: "Hay pasos de este tipo: cámbialos antes en Datos base" });
      throw error;
    }
    if (!data?.length) return void respuesta.status(409).json({ error: "Este no se puede quitar" });
    olvidarDatosBase();
    respuesta.status(204).end();
  }),
);

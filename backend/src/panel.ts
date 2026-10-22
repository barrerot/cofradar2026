import { hermandadesYEdicion } from "./rutas/cofradias.js";
import { supabase } from "./supabase.js";

/**
 * El registro del panel (tabla `registro_panel`, 5.2): las excepciones de la jornada que publica el
 * equipo y que el motor no puede deducir. Lo leen el estado de la jornada (rutas/estado.ts), que las
 * aplica, y el panel (rutas/admin.ts), que las enseña con su histórico.
 */
export type TipoRegistro = "aviso_jornada" | "incidencia" | "cancelada" | "retirar_alteracion";

export type Anotacion = {
  id: string;
  tipo: TipoRegistro;
  /** Id público de la cofradía («la-macarena»); null en un aviso de jornada. */
  cofradia: string | null;
  clase: string | null;
  detalle: string | null;
  texto: string;
  autor: string;
  creada: string;
  retirada: { cuando: string; por: string; motivo: string } | null;
};

export async function registro(jornada: number, anio: number, conPruebas: boolean): Promise<Anotacion[]> {
  let consulta = supabase()
    .from("registro_panel")
    .select("id, tipo, hermandad_id, clase, detalle, texto, autor_email, creada, retirada, retirada_email, retirada_motivo")
    .eq("jornada_id", jornada)
    .eq("anio", anio)
    .order("creada");
  if (!conPruebas) consulta = consulta.eq("de_prueba", false);
  const { data, error } = await consulta;
  if (error) throw error;
  const { porId } = await hermandadesYEdicion();
  return (data ?? []).map((f) => ({
    id: f.id,
    tipo: f.tipo,
    cofradia: f.hermandad_id === null ? null : (porId.get(f.hermandad_id) ?? null),
    clase: f.clase,
    detalle: f.detalle,
    texto: f.texto,
    autor: f.autor_email,
    creada: f.creada,
    retirada: f.retirada ? { cuando: f.retirada, por: f.retirada_email, motivo: f.retirada_motivo } : null,
  }));
}

/** Lo que sigue en pie, ordenado para aplicarlo: qué cofradías están canceladas, qué se esconde y qué se avisa. */
export function vigente(anotaciones: Anotacion[]) {
  const activas = anotaciones.filter((a) => !a.retirada);
  const de = (tipo: TipoRegistro) => activas.filter((a) => a.tipo === tipo);
  const suprimidas = new Map<string, Set<string>>();
  for (const a of de("retirar_alteracion")) {
    const s = suprimidas.get(a.cofradia!) ?? new Set<string>();
    s.add(a.clase!);
    suprimidas.set(a.cofradia!, s);
  }
  const incidencias = new Map<string, Anotacion[]>();
  for (const a of de("incidencia")) incidencias.set(a.cofradia!, [...(incidencias.get(a.cofradia!) ?? []), a]);
  return {
    canceladas: new Set(de("cancelada").map((a) => a.cofradia!)),
    suprimidas,
    incidencias,
    avisos: de("aviso_jornada"),
  };
}

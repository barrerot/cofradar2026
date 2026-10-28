import { desfaseReloj } from "../../datos/reloj";
import { cabecerasSesion } from "../../datos/sesion";
import type { AlteracionMotor, Confianza, Fase } from "../../datos/mapa";

/**
 * Las llamadas del panel a /api/admin (backend/src/rutas/admin.ts), siempre con la sesión. Con el reloj
 * de prueba (?ahora=) se manda también el desfase: lo publicado así queda marcado como de prueba.
 */
export type TipoRegistro = "aviso_jornada" | "incidencia" | "cancelada" | "retirar_alteracion";

export type Anotacion = {
  id: string;
  tipo: TipoRegistro;
  cofradia: string | null;
  /** El nombre de la cofradía, en el registro. */
  nombre?: string | null;
  clase: string | null;
  detalle: string | null;
  texto: string;
  autor: string;
  creada: string;
  retirada: { cuando: string; por: string; motivo: string } | null;
};

export type { AlteracionMotor };

export type CofradiaPanel = {
  id: string;
  nombre: string;
  fase: { valor: Fase; confianza: Confianza; haceMin: number | null };
  sale: string | null;
  alteraciones: AlteracionMotor[];
  alteracionesRetiradas: Anotacion[];
  /** Lo que tuvo y ya terminó (4.15). */
  historial: (AlteracionMotor & { desde: string; hasta: string })[];
  incidencias: Anotacion[];
  cancelada: Anotacion | null;
  ultima: { que: string; hora: string } | null;
};

export type JornadaPanel = {
  jornada: number;
  ahora: string;
  cofradias: CofradiaPanel[];
  avisos: Anotacion[];
  registro: Anotacion[];
};

export class ErrorPanel extends Error {}

async function pedir<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  const desfase = desfaseReloj();
  const r = await fetch(`/api/admin${ruta}`, {
    method: cuerpo === undefined ? "GET" : "POST",
    headers: {
      Accept: "application/json",
      ...(cuerpo === undefined ? {} : { "Content-Type": "application/json" }),
      ...(await cabecerasSesion()),
      ...(desfase ? { "X-Reloj-Desfase": String(desfase) } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (!r.ok) {
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    throw new ErrorPanel(d.error ?? "No se ha podido completar. Inténtalo de nuevo.");
  }
  return (r.status === 204 ? undefined : await r.json()) as T;
}

export function leerJornada(jornada: number): Promise<JornadaPanel> {
  const desfase = desfaseReloj();
  return pedir(`/jornadas/${jornada}${desfase ? `?desfase=${desfase}` : ""}`);
}

export function publicar(
  jornada: number,
  a: { tipo: TipoRegistro; cofradia?: string; clase?: string; detalle?: string; texto: string },
): Promise<{ id: string }> {
  return pedir(`/jornadas/${jornada}/registro`, a);
}

export function retirar(id: string, motivo: string): Promise<void> {
  return pedir(`/registro/${id}/retirar`, { motivo });
}

/** Corregir un aviso o una incidencia: lo retira con el motivo «Corregido» y publica el texto nuevo (BUL-329). */
export function corregir(id: string, texto: string): Promise<{ id: string }> {
  return pedir(`/registro/${id}/corregir`, { texto });
}

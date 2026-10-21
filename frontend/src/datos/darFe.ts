import { leer, guardar } from "./almacen";
import { desfaseReloj } from "./reloj";
import { cabecerasSesion } from "./sesion";

/**
 * Enviar un «Dar fe» al servidor (POST /api/yo/aportaciones) y, si no se puede, guardarlo en el teléfono
 * para enviarlo solo cuando vuelva la conexión (F-26).
 *
 * Cada aportación lleva un `clienteId` que pone el teléfono: si se reenvía (se cortó a mitad, se reintenta
 * desde la cola), el servidor devuelve la misma y no la duplica. Y lleva la hora en que se VIO, no la de
 * envío: es la que juzga el motor.
 */
export type Envio = {
  clienteId: string;
  cofradia: string;
  /** Para pintarla sin pedir nada: «La Macarena». */
  nombre: string;
  /** 0 la cruz de guía, 1..n los pasos; null, «Estoy viendo la cofradía». */
  elemento: number | null;
  /** «Cruz de guía», «Primer paso», «La cofradía». */
  etiqueta: string;
  ubicacion: { latitud: number; longitud: number; precision: number } | null;
  /** ISO: cuándo lo vio. */
  observada: string;
};

export type Resultado =
  | { tipo: "hecho"; puntos: number }
  /** Sin conexión: queda en la cola y sale sola. */
  | { tipo: "pendiente" }
  /** La sesión ha caducado: hay que volver a entrar. */
  | { tipo: "sin-cuenta" };

const COLA = "dar-fe:pendientes";

export function pendientes(): Envio[] {
  return leer<Envio[]>(COLA) ?? [];
}

function ponerEnCola(e: Envio) {
  const cola = pendientes().filter((x) => x.clienteId !== e.clienteId);
  guardar(COLA, [...cola, e]);
  avisar();
}

function quitarDeCola(clienteId: string) {
  guardar(
    COLA,
    pendientes().filter((x) => x.clienteId !== clienteId),
  );
  avisar();
}

/** Quien pinta «pendiente de enviar» se entera de los cambios de la cola. */
const oyentes = new Set<() => void>();
function avisar() {
  oyentes.forEach((f) => f());
}
export function alCambiarCola(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

export function nuevoClienteId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function mandar(e: Envio): Promise<Resultado | "fallo"> {
  try {
    const desfase = desfaseReloj();
    const r = await fetch("/api/yo/aportaciones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(await cabecerasSesion()),
        ...(desfase ? { "X-Reloj-Desfase": String(desfase) } : {}),
      },
      body: JSON.stringify({ clienteId: e.clienteId, cofradia: e.cofradia, elemento: e.elemento, ubicacion: e.ubicacion, observada: e.observada }),
    });
    if (r.status === 401) return { tipo: "sin-cuenta" };
    if (r.ok) {
      const d = (await r.json()) as { puntos: number };
      return { tipo: "hecho", puntos: d.puntos };
    }
    // 400: la aportación no tiene arreglo (una cofradía que ya no existe…); no se reintenta
    if (r.status >= 400 && r.status < 500) return { tipo: "hecho", puntos: 0 };
    return "fallo";
  } catch {
    return "fallo";
  }
}

/** Envía; si no hay conexión o el servidor no contesta, a la cola. */
export async function enviar(e: Envio): Promise<Resultado> {
  recordar(e);
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    ponerEnCola(e);
    return { tipo: "pendiente" };
  }
  const r = await mandar(e);
  if (r === "fallo") {
    ponerEnCola(e);
    return { tipo: "pendiente" };
  }
  if (r.tipo !== "sin-cuenta") quitarDeCola(e.clienteId);
  return r;
}

let vaciando = false;
/** Intenta mandar lo que haya en la cola, en orden. Lo llama el proveedor al volver la red y cada poco. */
export async function vaciarCola(): Promise<number> {
  if (vaciando || (typeof navigator !== "undefined" && !navigator.onLine)) return 0;
  vaciando = true;
  let enviadas = 0;
  try {
    for (const e of pendientes()) {
      const r = await mandar(e);
      if (r === "fallo" || r.tipo === "sin-cuenta") break;
      quitarDeCola(e.clienteId);
      enviadas++;
    }
  } finally {
    vaciando = false;
  }
  return enviadas;
}

// ── El bonus, que llega después (4.13) ─────────────────────────────────────────────────────────────
/**
 * Las aportaciones de las dos últimas horas cuyo bonus aún no se ha avisado. El bonus lo da el motor
 * cuando otras personas corroboran lo mismo, a veces minutos después: se pregunta de vez en cuando
 * mientras quede alguna por avisar, y se avisa una sola vez, como buena noticia.
 */
type Reciente = { clienteId: string; nombre: string; enviada: number };
const RECIENTES = "dar-fe:recientes";
const ESPERA_BONUS = 2 * 60 * 60_000;

function recientes(): Reciente[] {
  return (leer<Reciente[]>(RECIENTES) ?? []).filter((r) => Date.now() - r.enviada < ESPERA_BONUS);
}

function recordar(e: Envio) {
  guardar(RECIENTES, [...recientes().filter((r) => r.clienteId !== e.clienteId), { clienteId: e.clienteId, nombre: e.nombre, enviada: Date.now() }]);
}

export const hayBonusPorAvisar = () => recientes().length > 0;

/** Las que acaban de recibir bonus. Las devuelve una sola vez. */
export async function bonusNuevos(): Promise<{ nombre: string; bonus: number }[]> {
  const esperando = recientes();
  guardar(RECIENTES, esperando);
  if (!esperando.length) return [];
  try {
    const r = await fetch("/api/yo/aportaciones", { headers: { Accept: "application/json", ...(await cabecerasSesion()) } });
    if (!r.ok) return [];
    const d = (await r.json()) as { aportaciones: { clienteId: string; bonus: number; contribuyo: boolean }[] };
    const con = new Map(d.aportaciones.filter((a) => a.contribuyo && a.bonus > 0).map((a) => [a.clienteId, a.bonus]));
    const nuevos = esperando.filter((x) => con.has(x.clienteId));
    guardar(
      RECIENTES,
      recientes().filter((x) => !con.has(x.clienteId)),
    );
    return nuevos.map((x) => ({ nombre: x.nombre, bonus: con.get(x.clienteId)! }));
  } catch {
    return [];
  }
}

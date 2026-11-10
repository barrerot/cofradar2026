import { createHash, randomBytes, randomInt } from "node:crypto";
import { consulta, enTransaccion, type Cliente } from "../bd.js";
import {
  categoriaDe,
  empezar,
  JugadaNoValida,
  mover,
  REGLAS,
  rendirse,
  responder,
  tirar,
  vencer,
  type Estado,
  type PreguntaPendiente,
  type Puesto,
} from "./reglas.js";
import { CASILLAS, describir, TABLERO, type Categoria } from "./tablero.js";

/**
 * El trivial online guardado (F-51): alias, invitaciones, búsqueda de rival y partidas. Cada cambio de una
 * partida va en una transacción con la partida bloqueada; antes de nada se aplican los turnos vencidos
 * (reglas.vencer), así que los plazos se cumplen aunque nadie abra la app: los aplica el primero que mire.
 */

export const INVITACION_MS = 72 * 3600_000;
export const COLA_MS = 24 * 3600_000;
export const ELIMINADO = "Jugador eliminado";

export class ErrorTrivial extends Error {
  constructor(
    public estado: number,
    mensaje: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(mensaje);
  }
}

// ── Alias ──

const RESERVADOS = ["cofradar", "admin", "administrador", "moderador", "soporte", "jugadoreliminado", "consejo"];
// Filtro básico (decisión de Carlos, 10/11/2026): no pretende ser completo
const MALSONANTES = [
  "puta", "puto", "mierda", "polla", "cono", "cabron", "maricon", "gilipollas", "joder", "follar", "zorra",
  "subnormal", "retrasado", "nazi", "hitler", "pene", "culo", "picha", "chocho", "hijoputa", "putero", "mamon",
];

/** El alias como se compara: sin tildes, en minúsculas y con los números que imitan letras cambiados. */
function plano(alias: string): string {
  return alias
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/_/g, "");
}

export function problemaDeAlias(alias: string): string | null {
  if (!/^[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]{3,20}$/.test(alias)) return "De 3 a 20 letras, números o _";
  const p = plano(alias);
  if (RESERVADOS.includes(p)) return "Ese alias no se puede usar";
  if (MALSONANTES.some((m) => p.includes(m))) return "Elige otro alias, por favor";
  return null;
}

export async function aliasDe(usuario: string): Promise<string | null> {
  const { rows } = await consulta<{ alias: string }>("select alias from trivial_jugador where usuario_id = $1", [usuario]);
  return rows[0]?.alias ?? null;
}

export async function guardarAlias(usuario: string, alias: string): Promise<string> {
  const limpio = alias.trim();
  const problema = problemaDeAlias(limpio);
  if (problema) throw new ErrorTrivial(400, problema);
  try {
    await consulta(
      `insert into trivial_jugador (usuario_id, alias) values ($1, $2)
       on conflict (usuario_id) do update set alias = excluded.alias, cambiado = now()`,
      [usuario, limpio],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new ErrorTrivial(409, "Ese alias ya está cogido");
    throw e;
  }
  return limpio;
}

async function exigirAlias(usuario: string): Promise<string> {
  const alias = await aliasDe(usuario);
  if (!alias) throw new ErrorTrivial(409, "Antes tienes que elegir un alias", { sinAlias: true });
  return alias;
}

async function bancoActivo(bd: Cliente | typeof consulta = consulta): Promise<number> {
  const q = "select version from trivial_banco where activa";
  const { rows } = typeof bd === "function" ? await bd<{ version: number }>(q) : await bd.query<{ version: number }>(q);
  if (!rows[0]) throw new ErrorTrivial(503, "El trivial online aún no tiene preguntas publicadas");
  return rows[0].version;
}

// ── Partidas: fila ↔ estado ──

type FilaPartida = {
  id: string;
  jugador_0: string | null;
  jugador_1: string | null;
  banco_version: number;
  origen: string;
  estado: "activa" | "finalizada";
  motivo: Estado["motivo"];
  ganador: Puesto | null;
  posiciones: [string, string];
  estrellas: [Categoria[], Categoria[]];
  turno: Puesto;
  turno_n: number;
  turno_desde: Date;
  turno_vence: Date;
  fase: Estado["fase"];
  tirada: number | null;
  destinos: string[] | null;
  pregunta: PreguntaPendiente | null;
  vencimientos_seguidos: number;
  acciones: Record<string, { id: string; huella: string; resultado: unknown }>;
  version: number;
  creada: Date;
  terminada: Date | null;
};

const aEstado = (f: FilaPartida): Estado => ({
  estado: f.estado,
  motivo: f.motivo,
  ganador: f.ganador,
  posiciones: f.posiciones,
  estrellas: f.estrellas,
  turno: f.turno,
  turno_n: f.turno_n,
  turno_desde: new Date(f.turno_desde),
  turno_vence: new Date(f.turno_vence),
  fase: f.fase,
  tirada: f.tirada,
  destinos: f.destinos,
  pregunta: f.pregunta,
  vencimientos_seguidos: f.vencimientos_seguidos,
});

async function guardarEstado(bd: Cliente, id: string, e: Estado, acciones?: FilaPartida["acciones"]): Promise<void> {
  await bd.query(
    `update trivial_partida set estado = $2, motivo = $3, ganador = $4, posiciones = $5, estrellas = $6, turno = $7,
       turno_n = $8, turno_desde = $9, turno_vence = $10, fase = $11, tirada = $12, destinos = $13, pregunta = $14,
       vencimientos_seguidos = $15, acciones = coalesce($16, acciones), version = version + 1,
       terminada = case when $2 = 'finalizada' then coalesce(terminada, now()) else null end
     where id = $1`,
    [
      id, e.estado, e.motivo, e.ganador, JSON.stringify(e.posiciones), JSON.stringify(e.estrellas), e.turno, e.turno_n,
      e.turno_desde, e.turno_vence, e.fase, e.tirada, e.destinos && JSON.stringify(e.destinos),
      e.pregunta && JSON.stringify(e.pregunta), e.vencimientos_seguidos, acciones ? JSON.stringify(acciones) : null,
    ],
  );
}

/** Bloquea la partida y aplica los vencimientos pendientes. Devuelve la fila ya al día. */
async function bloquear(bd: Cliente, id: string): Promise<FilaPartida | null> {
  const { rows } = await bd.query<FilaPartida>("select * from trivial_partida where id = $1 for update", [id]);
  const f = rows[0];
  if (!f) return null;
  if (f.estado !== "activa") return f;
  const { estado, vencidas } = vencer(aEstado(f), new Date());
  if (estado.turno_n === f.turno_n && estado.estado === f.estado) return f;
  if (vencidas.length) {
    await bd.query(`update trivial_jugada set resultado = 'vencida', resuelta = now() where partida_id = $1 and n = any($2) and resultado is null`, [id, vencidas]);
  }
  await guardarEstado(bd, id, estado);
  const { rows: al } = await bd.query<FilaPartida>("select * from trivial_partida where id = $1", [id]);
  return al[0]!;
}

function puestoDe(f: FilaPartida, usuario: string): Puesto | null {
  if (f.jugador_0 === usuario) return 0;
  if (f.jugador_1 === usuario) return 1;
  return null;
}

async function crearPartida(bd: Cliente, a: string, b: string, banco: number, origen: "invitacion" | "cola"): Promise<string> {
  // RF-03: quién es el puesto 0 y quién empieza, al azar en el servidor
  const [j0, j1] = randomInt(2) === 0 ? [a, b] : [b, a];
  const e = empezar(new Date(), randomInt(2) as Puesto);
  const { rows } = await bd.query<{ id: string }>(
    `insert into trivial_partida (jugador_0, jugador_1, banco_version, reglas, tablero, origen, posiciones, estrellas, turno,
       turno_n, turno_desde, turno_vence, fase)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning id`,
    [j0, j1, banco, REGLAS, TABLERO, origen, JSON.stringify(e.posiciones), JSON.stringify(e.estrellas), e.turno, e.turno_n, e.turno_desde, e.turno_vence, e.fase],
  );
  return rows[0]!.id;
}

// ── Lo que ve cada jugador ──

async function aliasDeVarios(ids: (string | null)[]): Promise<Map<string, string>> {
  const validos = [...new Set(ids.filter((x): x is string => !!x))];
  if (!validos.length) return new Map();
  const { rows } = await consulta<{ usuario_id: string; alias: string }>("select usuario_id, alias from trivial_jugador where usuario_id = any($1)", [validos]);
  return new Map(rows.map((r) => [r.usuario_id, r.alias]));
}

export type VistaPartida = ReturnType<typeof vista>;

function vista(f: FilaPartida, yo: Puesto, alias: Map<string, string>, enunciado?: { enunciado: string; hermandad: string }) {
  const nombre = (u: string | null) => (u ? (alias.get(u) ?? ELIMINADO) : ELIMINADO);
  const mia = f.estado === "activa" && f.turno === yo;
  return {
    id: f.id,
    yo,
    jugadores: [nombre(f.jugador_0), nombre(f.jugador_1)] as [string, string],
    estado: f.estado,
    motivo: f.motivo,
    ganador: f.ganador,
    posiciones: f.posiciones,
    estrellas: f.estrellas,
    turno: f.turno,
    turnoVence: new Date(f.turno_vence).toISOString(),
    fase: f.fase,
    tirada: mia ? f.tirada : null,
    destinos: mia && f.destinos ? f.destinos.map((id) => ({ id, texto: describir(id) })) : null,
    // CA-09: solo el jugador activo ve su pregunta, y nunca cuál es la buena
    pregunta:
      mia && f.pregunta && enunciado
        ? {
            categoria: f.pregunta.categoria,
            casilla: f.pregunta.casilla,
            casillaTexto: describir(f.pregunta.casilla),
            estrella: f.pregunta.estrella,
            hermandad: enunciado.hermandad,
            enunciado: enunciado.enunciado,
            opciones: f.pregunta.opciones,
          }
        : null,
    version: f.version,
    creada: new Date(f.creada).toISOString(),
    terminada: f.terminada ? new Date(f.terminada).toISOString() : null,
  };
}

async function vistaDe(bd: Cliente, f: FilaPartida, yo: Puesto) {
  const alias = await aliasDeVarios([f.jugador_0, f.jugador_1]);
  let enunciado: { enunciado: string; hermandad: string } | undefined;
  if (f.pregunta && f.turno === yo) {
    const { rows } = await bd.query<{ enunciado: string; hermandad: string }>(
      "select enunciado, hermandad from trivial_pregunta where banco_version = $1 and id = $2",
      [f.banco_version, f.pregunta.id],
    );
    enunciado = rows[0];
  }
  return vista(f, yo, alias, enunciado);
}

export async function verPartida(usuario: string, id: string) {
  return enTransaccion(async (bd) => {
    const f = await bloquear(bd, id);
    const yo = f && puestoDe(f, usuario);
    // CA-09: a un tercero, lo mismo que si no existiera
    if (!f || yo === null) throw new ErrorTrivial(404, "No existe esa partida");
    return vistaDe(bd, f, yo);
  });
}

// ── Jugadas ──

export type Accion = {
  accionId: string;
  version: number;
  tipo: "tirar" | "mover" | "responder" | "rendirse";
  destino?: string;
  opcion?: string;
};

export type Resolucion = { acierto: boolean; correcta: string; explicacion: string; fuente: string; estrella: Categoria | null };

async function elegirPregunta(bd: Cliente, f: FilaPartida, categoria: Categoria) {
  // RF-05: una que no haya salido en la partida; si la categoría se agota, la que salió hace más tiempo
  const nueva = await bd.query<{ id: number; opciones: { id: string; texto: string }[] }>(
    `select id, opciones from trivial_pregunta p
     where banco_version = $1 and categoria = $2
       and not exists (select 1 from trivial_jugada j where j.partida_id = $3 and j.pregunta_id = p.id)
     order by random() limit 1`,
    [f.banco_version, categoria, f.id],
  );
  if (nueva.rows[0]) return nueva.rows[0];
  const vieja = await bd.query<{ id: number; opciones: { id: string; texto: string }[] }>(
    `select p.id, p.opciones from trivial_pregunta p
     join (select pregunta_id, max(mostrada) as ultima from trivial_jugada where partida_id = $3 group by pregunta_id) j on j.pregunta_id = p.id
     where p.banco_version = $1 and p.categoria = $2
     order by j.ultima asc limit 1`,
    [f.banco_version, categoria, f.id],
  );
  if (!vieja.rows[0]) throw new Error(`Sin preguntas de ${categoria} en el banco ${f.banco_version}`);
  return vieja.rows[0];
}

function barajar<T>(lista: T[]): T[] {
  const c = [...lista];
  for (let i = c.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [c[i], c[j]] = [c[j] as T, c[i] as T];
  }
  return c;
}

export async function jugar(usuario: string, id: string, a: Accion) {
  const huella = createHash("sha256").update(JSON.stringify([a.tipo, a.destino ?? null, a.opcion ?? null])).digest("hex");
  return enTransaccion(async (bd) => {
    const f = await bloquear(bd, id);
    const yo = f && puestoDe(f, usuario);
    if (!f || yo === null) throw new ErrorTrivial(404, "No existe esa partida");

    // CA-08: la misma acción repetida (se cortó la conexión, dos toques) devuelve lo mismo sin repetirla
    const previa = f.acciones[String(yo)];
    if (previa && previa.id === a.accionId) {
      if (previa.huella !== huella) throw new ErrorTrivial(409, "Esa jugada ya se hizo con otro contenido", { partida: await vistaDe(bd, f, yo) });
      return { resultado: previa.resultado, partida: await vistaDe(bd, f, yo) };
    }
    // Una jugada pensada sobre un estado que ya no es el de ahora (vencimiento, otra sesión): se recarga
    if (a.version !== f.version) throw new ErrorTrivial(409, "La partida ha cambiado", { partida: await vistaDe(bd, f, yo) });

    const ahora = new Date();
    let e = aEstado(f);
    let resultado: Record<string, unknown> = {};
    try {
      if (a.tipo === "tirar") {
        e = tirar(e, yo, randomInt(1, 7));
        resultado = { tirada: e.tirada };
      } else if (a.tipo === "mover") {
        if (typeof a.destino !== "string" || !CASILLAS.has(a.destino)) throw new JugadaNoValida("Esa casilla no existe");
        // La comprobación de turno y destino va antes de elegir pregunta, para no apuntar jugadas que no valen
        if (e.estado !== "activa" || e.turno !== yo || e.fase !== "mover" || !e.destinos?.includes(a.destino)) {
          mover(e, yo, a.destino, {} as PreguntaPendiente);
        }
        const categoria = categoriaDe(a.destino, Math.random());
        const p = await elegirPregunta(bd, f, categoria);
        const { rows } = await bd.query<{ n: number }>("select coalesce(max(n), 0) + 1 as n from trivial_jugada where partida_id = $1", [id]);
        const n = rows[0]!.n;
        await bd.query(
          "insert into trivial_jugada (partida_id, n, turno_n, puesto, pregunta_id, categoria, casilla) values ($1, $2, $3, $4, $5, $6, $7)",
          [id, n, e.turno_n, yo, p.id, categoria, a.destino],
        );
        // El orden de las opciones se baraja al asignarla y se queda así al recargar
        e = mover(e, yo, a.destino, { jugada: n, id: p.id, categoria, casilla: a.destino, estrella: CASILLAS.get(a.destino)!.estrella, opciones: barajar(p.opciones) });
        resultado = { destino: a.destino };
      } else if (a.tipo === "responder") {
        const p = e.pregunta;
        if (e.estado !== "activa" || e.turno !== yo || e.fase !== "responder" || !p) responder(e, yo, false, ahora);
        if (!p!.opciones.some((o) => o.id === a.opcion)) throw new JugadaNoValida("Esa respuesta no es de esta pregunta");
        const { rows } = await bd.query<{ correcta: string; explicacion: string; fuente: string }>(
          "select correcta, explicacion, fuente from trivial_pregunta where banco_version = $1 and id = $2",
          [f.banco_version, p!.id],
        );
        const q = rows[0]!;
        const acierto = a.opcion === q.correcta;
        const r = responder(e, yo, acierto, ahora);
        e = r.estado;
        await bd.query(
          "update trivial_jugada set respuesta = $3, acierto = $4, resultado = $5, resuelta = now() where partida_id = $1 and n = $2",
          [id, p!.jugada, a.opcion, acierto, acierto ? "acierto" : "fallo"],
        );
        resultado = { acierto, correcta: q.correcta, explicacion: q.explicacion, fuente: q.fuente, estrella: r.estrella } satisfies Resolucion;
      } else if (a.tipo === "rendirse") {
        e = rendirse(e, yo);
      } else {
        throw new JugadaNoValida("No conozco esa jugada");
      }
    } catch (err) {
      if (err instanceof JugadaNoValida) throw new ErrorTrivial(409, err.message, { partida: await vistaDe(bd, f, yo) });
      throw err;
    }

    const acciones = { ...f.acciones, [String(yo)]: { id: a.accionId, huella, resultado } };
    await guardarEstado(bd, id, e, acciones);
    const { rows: al } = await bd.query<FilaPartida>("select * from trivial_partida where id = $1", [id]);
    return { resultado, partida: await vistaDe(bd, al[0]!, yo) };
  });
}

// ── Invitaciones (RF-01) ──

export async function crearInvitacion(usuario: string) {
  await exigirAlias(usuario);
  const banco = await bancoActivo();
  const token = randomBytes(12).toString("base64url");
  const vence = new Date(Date.now() + INVITACION_MS);
  await consulta("insert into trivial_invitacion (token, anfitrion_id, banco_version, vence) values ($1, $2, $3, $4)", [token, usuario, banco, vence]);
  return { token, vence: vence.toISOString() };
}

export async function cancelarInvitacion(usuario: string, token: string) {
  const { rowCount } = await consulta(
    "update trivial_invitacion set estado = 'cancelada' where token = $1 and anfitrion_id = $2 and estado = 'pendiente'",
    [token, usuario],
  );
  if (!rowCount) throw new ErrorTrivial(404, "Esa invitación ya no está pendiente");
}

type EstadoInvitacion = "pendiente" | "caducada" | "cancelada" | "aceptada";

export async function verInvitacion(token: string, usuario?: string) {
  const { rows } = await consulta<{ anfitrion_id: string; estado: string; vence: Date; partida_id: string | null; alias: string | null }>(
    `select i.anfitrion_id, i.estado, i.vence, i.partida_id, j.alias
     from trivial_invitacion i left join trivial_jugador j on j.usuario_id = i.anfitrion_id where i.token = $1`,
    [token],
  );
  const i = rows[0];
  if (!i) throw new ErrorTrivial(404, "Esa invitación no existe");
  const estado: EstadoInvitacion = i.estado === "pendiente" && new Date(i.vence) <= new Date() ? "caducada" : (i.estado as EstadoInvitacion);
  return {
    anfitrion: i.alias ?? ELIMINADO,
    estado,
    vence: new Date(i.vence).toISOString(),
    tuya: usuario === i.anfitrion_id,
    // A terceros no se les da la partida (RF-01); al anfitrión, sí
    partida: usuario === i.anfitrion_id ? i.partida_id : null,
  };
}

export async function aceptarInvitacion(usuario: string, token: string) {
  await exigirAlias(usuario);
  return enTransaccion(async (bd) => {
    // CA-02: dos que aceptan a la vez: el segundo espera al bloqueo y ya la ve aceptada
    const { rows } = await bd.query<{ anfitrion_id: string; estado: string; vence: Date; banco_version: number; partida_id: string | null }>(
      "select anfitrion_id, estado, vence, banco_version, partida_id from trivial_invitacion where token = $1 for update",
      [token],
    );
    const i = rows[0];
    if (!i) throw new ErrorTrivial(404, "Esa invitación no existe");
    if (i.anfitrion_id === usuario) throw new ErrorTrivial(409, "No puedes aceptar tu propia invitación", { estado: "tuya" });
    if (i.estado === "aceptada") {
      // Quien ya la aceptó y repite (doble toque, recarga) vuelve a su partida
      if (i.partida_id) {
        const { rows: p } = await bd.query("select 1 from trivial_partida where id = $1 and (jugador_0 = $2 or jugador_1 = $2)", [i.partida_id, usuario]);
        if (p[0]) return { partida: i.partida_id };
      }
      throw new ErrorTrivial(410, "Otra persona ya ha aceptado esta invitación", { estado: "aceptada" });
    }
    if (i.estado === "cancelada") throw new ErrorTrivial(410, "Han cancelado esta invitación", { estado: "cancelada" });
    if (new Date(i.vence) <= new Date()) throw new ErrorTrivial(410, "Esta invitación ya ha caducado", { estado: "caducada" });
    const partida = await crearPartida(bd, i.anfitrion_id, usuario, i.banco_version, "invitacion");
    await bd.query("update trivial_invitacion set estado = 'aceptada', partida_id = $2 where token = $1", [token, partida]);
    return { partida };
  });
}

// ── Buscar rival (RF-02) ──

export async function buscarRival(usuario: string) {
  await exigirAlias(usuario);
  return enTransaccion(async (bd) => {
    // Un emparejamiento a la vez en todo el servidor: así nadie queda emparejado dos veces
    await bd.query("select pg_advisory_xact_lock(hashtext('trivial_cola'))");
    const banco = await bancoActivo(bd);
    // CA-03: si ya estaba buscando (doble toque), sigue la misma búsqueda
    const ya = await bd.query<{ id: string; creada: Date; vence: Date }>(
      "select id, creada, vence from trivial_cola where usuario_id = $1 and estado = 'buscando' and vence > now()",
      [usuario],
    );
    if (ya.rows[0]) return { buscando: { desde: new Date(ya.rows[0].creada).toISOString(), vence: new Date(ya.rows[0].vence).toISOString() } };
    await bd.query("update trivial_cola set estado = 'cancelada' where usuario_id = $1 and estado = 'buscando'", [usuario]);
    // El que lleva más tiempo esperando con el mismo banco, de otra cuenta
    const otro = await bd.query<{ id: string; usuario_id: string }>(
      `select id, usuario_id from trivial_cola
       where estado = 'buscando' and vence > now() and banco_version = $1 and usuario_id <> $2
       order by creada limit 1 for update`,
      [banco, usuario],
    );
    if (otro.rows[0]) {
      const partida = await crearPartida(bd, otro.rows[0].usuario_id, usuario, banco, "cola");
      await bd.query("update trivial_cola set estado = 'emparejada', partida_id = $2 where id = $1", [otro.rows[0].id, partida]);
      await bd.query(
        "insert into trivial_cola (usuario_id, banco_version, estado, vence, partida_id) values ($1, $2, 'emparejada', now(), $3)",
        [usuario, banco, partida],
      );
      return { partida };
    }
    const vence = new Date(Date.now() + COLA_MS);
    const { rows } = await bd.query<{ creada: Date }>(
      "insert into trivial_cola (usuario_id, banco_version, vence) values ($1, $2, $3) returning creada",
      [usuario, banco, vence],
    );
    return { buscando: { desde: new Date(rows[0]!.creada).toISOString(), vence: vence.toISOString() } };
  });
}

/** Cancelar la búsqueda. Si justo antes alguien la emparejó, gana el emparejamiento y se dice su partida. */
export async function dejarDeBuscar(usuario: string) {
  return enTransaccion(async (bd) => {
    await bd.query("select pg_advisory_xact_lock(hashtext('trivial_cola'))");
    const { rowCount } = await bd.query("update trivial_cola set estado = 'cancelada' where usuario_id = $1 and estado = 'buscando'", [usuario]);
    if (rowCount) return { cancelada: true };
    const { rows } = await bd.query<{ partida_id: string }>(
      "select partida_id from trivial_cola where usuario_id = $1 and estado = 'emparejada' order by creada desc limit 1",
      [usuario],
    );
    return { cancelada: false, partida: rows[0]?.partida_id ?? null };
  });
}

// ── Bandeja ──

export async function bandeja(usuario: string) {
  // Primero, los vencimientos de las suyas que estén pasadas de plazo
  const vencidas = await consulta<{ id: string }>(
    "select id from trivial_partida where estado = 'activa' and turno_vence <= now() and (jugador_0 = $1 or jugador_1 = $1)",
    [usuario],
  );
  for (const { id } of vencidas.rows) await enTransaccion((bd) => bloquear(bd, id));

  const [partidas, invitaciones, cola, alias] = await Promise.all([
    consulta<FilaPartida>(
      `(select * from trivial_partida where estado = 'activa' and (jugador_0 = $1 or jugador_1 = $1))
       union all
       (select * from trivial_partida where estado = 'finalizada' and (jugador_0 = $1 or jugador_1 = $1) order by terminada desc limit 20)`,
      [usuario],
    ),
    consulta<{ token: string; creada: Date; vence: Date }>(
      "select token, creada, vence from trivial_invitacion where anfitrion_id = $1 and estado = 'pendiente' and vence > now() order by creada desc",
      [usuario],
    ),
    consulta<{ creada: Date; vence: Date }>(
      "select creada, vence from trivial_cola where usuario_id = $1 and estado = 'buscando' and vence > now()",
      [usuario],
    ),
    aliasDe(usuario),
  ]);
  const nombres = await aliasDeVarios(partidas.rows.flatMap((f) => [f.jugador_0, f.jugador_1]));
  const resumen = partidas.rows.map((f) => {
    const yo = puestoDe(f, usuario)!;
    const v = vista(f, yo, nombres);
    return {
      id: v.id,
      rival: v.jugadores[yo === 0 ? 1 : 0],
      estado: v.estado,
      teToca: v.estado === "activa" && v.turno === yo,
      turnoVence: v.turnoVence,
      estrellas: { tuyas: v.estrellas[yo].length, rival: v.estrellas[yo === 0 ? 1 : 0].length },
      motivo: v.motivo,
      ganaste: v.ganador === null ? null : v.ganador === yo,
      terminada: v.terminada,
    };
  });
  return {
    alias,
    partidas: resumen,
    invitaciones: invitaciones.rows.map((i) => ({ token: i.token, creada: new Date(i.creada).toISOString(), vence: new Date(i.vence).toISOString() })),
    busqueda: cola.rows[0] ? { desde: new Date(cola.rows[0].creada).toISOString(), vence: new Date(cola.rows[0].vence).toISOString() } : null,
  };
}

// ── Cuenta ──

/**
 * Antes de borrar una cuenta (decisión de Carlos, «A», 10/11/2026): sus partidas en marcha las gana el
 * rival, como si se hubiera rendido. Lo demás lo hace la base al borrar el usuario: alias, invitaciones y
 * búsquedas se borran, y su puesto en las partidas terminadas queda vacío («Jugador eliminado»).
 */
export async function alBorrarCuenta(usuario: string): Promise<void> {
  const { rows } = await consulta<{ id: string }>(
    "select id from trivial_partida where estado = 'activa' and (jugador_0 = $1 or jugador_1 = $1)",
    [usuario],
  );
  for (const { id } of rows) {
    await enTransaccion(async (bd) => {
      const f = await bloquear(bd, id);
      if (!f || f.estado !== "activa") return;
      await guardarEstado(bd, id, rendirse(aEstado(f), puestoDe(f, usuario)!));
    });
  }
}

/** Lo del trivial para «Descargar mis datos». */
export async function datosDe(usuario: string) {
  const [alias, partidas] = await Promise.all([
    aliasDe(usuario),
    consulta<{ creada: Date; estado: string; motivo: string | null; ganaste: boolean | null }>(
      `select creada, estado, motivo,
         case when ganador is null then null else ganador = (case when jugador_0 = $1 then 0 else 1 end) end as ganaste
       from trivial_partida where jugador_0 = $1 or jugador_1 = $1 order by creada`,
      [usuario],
    ),
  ]);
  return { alias, partidas: partidas.rows.map((p) => ({ empezada: new Date(p.creada).toISOString(), estado: p.estado, motivo: p.motivo, ganaste: p.ganaste })) };
}

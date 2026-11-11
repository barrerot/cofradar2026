import { createHash, randomBytes, randomInt } from "node:crypto";
import { consulta, enTransaccion, type Cliente } from "../bd.js";
import { conocerTras } from "../album/album.js";
import { clavePartida, lineaCasa, puntosDe, type LineaCasa } from "../cargo/puntos.js";
import { diaDeMadrid } from "../dia/cirio.js";
import { numerosDe } from "../hermano.js";
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
export const REVANCHA_MS = 72 * 3600_000;
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

/** Si un texto lleva alguna palabra malsonante (los nombres de cuadrilla, F-57). */
export const malsonante = (texto: string) => MALSONANTES.some((m) => plano(texto.replace(/\s+/g, "")).includes(m));

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

export async function exigirAlias(usuario: string): Promise<string> {
  const alias = await aliasDe(usuario);
  if (!alias) throw new ErrorTrivial(409, "Antes tienes que elegir un alias", { sinAlias: true });
  return alias;
}

export async function bancoActivo(bd: Cliente | typeof consulta = consulta): Promise<number> {
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
export async function bloquear(bd: Cliente, id: string): Promise<FilaPartida | null> {
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

export async function crearPartida(bd: Cliente, a: string, b: string, banco: number, origen: "invitacion" | "cola" | "revancha" | "cuadrilla"): Promise<string> {
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

/** Dentro de una transacción, con su misma conexión (`bd`): pedir otra mientras se tiene una puede atascar el pool. */
export async function aliasDeVarios(ids: (string | null)[], bd?: Cliente): Promise<Map<string, string>> {
  const validos = [...new Set(ids.filter((x): x is string => !!x))];
  if (!validos.length) return new Map();
  const sql = "select usuario_id, alias from trivial_jugador where usuario_id = any($1)";
  const { rows } = bd ? await bd.query<{ usuario_id: string; alias: string }>(sql, [validos]) : await consulta<{ usuario_id: string; alias: string }>(sql, [validos]);
  return new Map(rows.map((r) => [r.usuario_id, r.alias]));
}

export type VistaPartida = ReturnType<typeof vista>;

/** Lo de la pareja que se ve al acabar (F-52): el marcador de todas sus partidas y la revancha pendiente. */
type Pareja = { marcador: { tuyas: number; suyas: number }; revancha: Revancha | null };
export type Revancha = { id: string; tuya: boolean; vence: string };

function vista(
  f: FilaPartida,
  yo: Puesto,
  alias: Map<string, string>,
  extra: { enunciado?: { enunciado: string; hermandad: string }; numeros?: Map<string, number>; pareja?: Pareja | null; casa?: LineaCasa | null } = {},
) {
  const { enunciado, numeros, pareja, casa } = extra;
  const nombre = (u: string | null) => (u ? (alias.get(u) ?? ELIMINADO) : ELIMINADO);
  const numero = (u: string | null) => (u ? (numeros?.get(u) ?? null) : null);
  const mia = f.estado === "activa" && f.turno === yo;
  return {
    id: f.id,
    yo,
    jugadores: [nombre(f.jugador_0), nombre(f.jugador_1)] as [string, string],
    // F-54: el número de hermano de cada uno (null si no tiene o si eliminó su cuenta)
    numeros: [numero(f.jugador_0), numero(f.jugador_1)] as [number | null, number | null],
    eliminados: [!f.jugador_0, !f.jugador_1] as [boolean, boolean],
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
    pareja: pareja ?? null,
    // F-58: lo que dio a tu cargo ganarla («+5 puntos para tu cargo»), solo a quien ganó por estrellas
    casa: casa ?? null,
  };
}

const rivalDe = (f: { jugador_0: string | null; jugador_1: string | null }, yo: Puesto) => (yo === 0 ? f.jugador_1 : f.jugador_0);

/** Las partidas entre dos cuentas, en cualquier puesto. */
export const DE_LA_PAREJA = "((jugador_0 = $1 and jugador_1 = $2) or (jugador_0 = $2 and jugador_1 = $1))";

export async function marcadorDe(bd: Cliente, yo: string, rival: string) {
  const { rows } = await bd.query<{ tuyas: number; suyas: number }>(
    `select count(*) filter (where (ganador = 0 and jugador_0 = $1) or (ganador = 1 and jugador_1 = $1))::int as tuyas,
            count(*) filter (where (ganador = 0 and jugador_0 = $2) or (ganador = 1 and jugador_1 = $2))::int as suyas
     from trivial_partida where estado = 'finalizada' and ${DE_LA_PAREJA}`,
    [yo, rival],
  );
  return rows[0]!;
}

/** La revancha pendiente entre los dos, si la hay y no ha vencido. */
async function revanchaPendiente(bd: Cliente | null, yo: string, rival: string): Promise<Revancha | null> {
  const sql = `select id, de_id, vence from trivial_revancha
     where estado = 'pendiente' and vence > now() and ((de_id = $1 and para_id = $2) or (de_id = $2 and para_id = $1))
     order by creada desc limit 1`;
  const { rows } = bd ? await bd.query<{ id: string; de_id: string; vence: Date }>(sql, [yo, rival]) : await consulta<{ id: string; de_id: string; vence: Date }>(sql, [yo, rival]);
  const r = rows[0];
  return r ? { id: r.id, tuya: r.de_id === yo, vence: new Date(r.vence).toISOString() } : null;
}

async function vistaDe(bd: Cliente, f: FilaPartida, yo: Puesto) {
  const ids = [f.jugador_0, f.jugador_1].filter((x): x is string => !!x);
  const [alias, numeros] = await Promise.all([aliasDeVarios(ids, bd), numerosDe(ids, bd)]);
  const yoId = yo === 0 ? f.jugador_0! : f.jugador_1!;
  const rival = rivalDe(f, yo);
  let pareja: Pareja | null = null;
  if (f.estado === "finalizada" && rival) {
    pareja = { marcador: await marcadorDe(bd, yoId, rival), revancha: await revanchaPendiente(bd, yoId, rival) };
  }
  let enunciado: { enunciado: string; hermandad: string } | undefined;
  if (f.pregunta && f.turno === yo) {
    const { rows } = await bd.query<{ enunciado: string; hermandad: string }>(
      "select enunciado, hermandad from trivial_pregunta where banco_version = $1 and id = $2",
      [f.banco_version, f.pregunta.id],
    );
    enunciado = rows[0];
  }
  let casa: LineaCasa | null = null;
  if (f.estado === "finalizada" && f.motivo === "estrellas" && f.ganador === yo && f.terminada) {
    casa = lineaCasa(await puntosDe(yoId, bd), clavePartida(f.id), diaDeMadrid(new Date(f.terminada)));
  }
  return vista(f, yo, alias, { enunciado, numeros, pareja, casa });
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

/** `pregunta` es su id en el banco: con él se reta a otro a la misma pregunta (F-53, /trivial/r/:id). */
export type Resolucion = {
  acierto: boolean;
  correcta: string;
  explicacion: string;
  fuente: string;
  estrella: Categoria | null;
  pregunta: number;
  /** Las estampas que acaban de llegar a «la conoces» (F-56) */
  album?: { cofradia: string; nombre: string }[];
};

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
        const apuntar = () =>
          bd.query(
            "update trivial_jugada set respuesta = $3, acierto = $4, resultado = $5, resuelta = now() where partida_id = $1 and n = $2",
            [id, p!.jugada, a.opcion, acierto, acierto ? "acierto" : "fallo"],
          );
        // F-56: un acierto puede completar «la conoces» de su hermandad
        const album = acierto ? await conocerTras(bd, usuario, apuntar) : (await apuntar(), []);
        resultado = { acierto, correcta: q.correcta, explicacion: q.explicacion, fuente: q.fuente, estrella: r.estrella, pregunta: p!.id, album } satisfies Resolucion;
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

  const [partidas, invitaciones, cola, alias, revanchas, retos] = await Promise.all([
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
    consulta<{ id: string; de_id: string; para_id: string; vence: Date }>(
      `select id, de_id, para_id, vence from trivial_revancha
       where estado = 'pendiente' and vence > now() and (de_id = $1 or para_id = $1) order by creada desc`,
      [usuario],
    ),
    // F-57: los retos de cuadrilla, como las revanchas
    consulta<{ id: string; de_id: string; para_id: string; vence: Date; cuadrilla: string }>(
      `select r.id, r.de_id, r.para_id, r.vence, c.nombre as cuadrilla from cuadrilla_reto r join cuadrilla c on c.id = r.cuadrilla_id
       where r.estado = 'pendiente' and r.vence > now() and (r.de_id = $1 or r.para_id = $1) order by r.creada desc`,
      [usuario],
    ),
  ]);
  const nombres = await aliasDeVarios([...partidas.rows.flatMap((f) => [f.jugador_0, f.jugador_1]), ...revanchas.rows.flatMap((r) => [r.de_id, r.para_id]), ...retos.rows.flatMap((r) => [r.de_id, r.para_id])]);
  const resumen = partidas.rows.map((f) => {
    const yo = puestoDe(f, usuario)!;
    const v = vista(f, yo, nombres);
    return {
      id: v.id,
      rival: v.jugadores[yo === 0 ? 1 : 0],
      rivalEliminado: v.eliminados[yo === 0 ? 1 : 0],
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
    // F-52: las que te piden (con «Aceptar» y «Ahora no») y las que has pedido tú (con «Cancelar»)
    revanchas: revanchas.rows.map((r) => {
      const tuya = r.de_id === usuario;
      return { id: r.id, tuya, rival: nombres.get(tuya ? r.para_id : r.de_id) ?? ELIMINADO, vence: new Date(r.vence).toISOString() };
    }),
    // F-57: «Costalero83 te reta · Los de la Campana» y los que has mandado tú
    retos: retos.rows.map((r) => {
      const tuyo = r.de_id === usuario;
      return { id: r.id, tuyo, rival: nombres.get(tuyo ? r.para_id : r.de_id) ?? ELIMINADO, cuadrilla: r.cuadrilla, vence: new Date(r.vence).toISOString() };
    }),
  };
}

// ── Revancha (F-52) ──

/** Una a la vez por pareja: dos que la piden a la vez no crean dos. */
export const bloquearPareja = (bd: Cliente, a: string, b: string) =>
  bd.query("select pg_advisory_xact_lock(hashtext($1))", [`revancha:${[a, b].sort().join(":")}`]);

/**
 * Pedir la revancha al rival de una partida terminada. Si ya la habías pedido, la misma (doble toque). Si
 * él te la ha pedido a ti, no se crea otra: se dice, con la suya, para que la aceptes.
 */
export async function pedirRevancha(usuario: string, partidaId: string) {
  await exigirAlias(usuario);
  return enTransaccion(async (bd) => {
    const { rows } = await bd.query<{ jugador_0: string | null; jugador_1: string | null; estado: string }>(
      "select jugador_0, jugador_1, estado from trivial_partida where id = $1",
      [partidaId],
    );
    const f = rows[0];
    const yo = f ? (f.jugador_0 === usuario ? 0 : f.jugador_1 === usuario ? 1 : null) : null;
    if (!f || yo === null) throw new ErrorTrivial(404, "No existe esa partida");
    if (f.estado !== "finalizada") throw new ErrorTrivial(409, "La revancha se pide al acabar la partida");
    const rival = rivalDe(f, yo);
    if (!rival) throw new ErrorTrivial(410, "Tu rival eliminó su cuenta");

    await bloquearPareja(bd, usuario, rival);
    await bd.query(
      `update trivial_revancha set estado = 'caducada'
       where estado = 'pendiente' and vence <= now() and ((de_id = $1 and para_id = $2) or (de_id = $2 and para_id = $1))`,
      [usuario, rival],
    );
    const ya = await revanchaPendiente(bd, usuario, rival);
    if (ya?.tuya) return { revancha: ya };
    if (ya) {
      const alias = (await aliasDeVarios([rival], bd)).get(rival) ?? ELIMINADO;
      throw new ErrorTrivial(409, `${alias} ya te ha pedido la revancha`, { revancha: ya });
    }
    const vence = new Date(Date.now() + REVANCHA_MS);
    const { rows: nueva } = await bd.query<{ id: string }>(
      "insert into trivial_revancha (partida_origen, de_id, para_id, vence) values ($1, $2, $3, $4) returning id",
      [partidaId, usuario, rival, vence],
    );
    return { revancha: { id: nueva[0]!.id, tuya: true, vence: vence.toISOString() } satisfies Revancha };
  });
}

/** Aceptarla empieza una partida normal entre los dos, con el banco activo. Repetir devuelve la misma. */
export async function aceptarRevancha(usuario: string, id: string) {
  return enTransaccion(async (bd) => {
    const { rows } = await bd.query<{ de_id: string; para_id: string; estado: string; vence: Date; partida_id: string | null }>(
      "select de_id, para_id, estado, vence, partida_id from trivial_revancha where id = $1 for update",
      [id],
    );
    const r = rows[0];
    if (!r || r.para_id !== usuario) throw new ErrorTrivial(404, "Esa revancha no existe");
    if (r.estado === "aceptada" && r.partida_id) return { partida: r.partida_id };
    const caducada = r.estado === "caducada" || (r.estado === "pendiente" && new Date(r.vence) <= new Date());
    if (caducada) throw new ErrorTrivial(410, "Esa revancha ya ha caducado", { estado: "caducada" });
    if (r.estado === "cancelada") throw new ErrorTrivial(410, "Han cancelado esa revancha", { estado: "cancelada" });
    if (r.estado !== "pendiente") throw new ErrorTrivial(410, "Esa revancha ya no está pendiente", { estado: r.estado });
    const partida = await crearPartida(bd, r.de_id, r.para_id, await bancoActivo(bd), "revancha");
    await bd.query("update trivial_revancha set estado = 'aceptada', partida_id = $2 where id = $1", [id, partida]);
    return { partida };
  });
}

/** «Ahora no» (quien la recibe) o «Cancelar» (quien la pidió). */
export async function cerrarRevancha(usuario: string, id: string, como: "rechazada" | "cancelada") {
  const quien = como === "rechazada" ? "para_id" : "de_id";
  const { rowCount } = await consulta(
    `update trivial_revancha set estado = $3 where id = $1 and ${quien} = $2 and estado = 'pendiente'`,
    [id, usuario, como],
  );
  if (!rowCount) throw new ErrorTrivial(404, "Esa revancha ya no está pendiente");
}

// ── Historial con un rival (F-52) ──

/** «Tú y Costalero83: 3 – 2», con las partidas una a una. Se pide por una partida entre los dos. */
export async function historial(usuario: string, partidaId: string) {
  const { rows } = await consulta<{ jugador_0: string | null; jugador_1: string | null }>(
    "select jugador_0, jugador_1 from trivial_partida where id = $1",
    [partidaId],
  );
  const f = rows[0];
  const yo = f ? (f.jugador_0 === usuario ? 0 : f.jugador_1 === usuario ? 1 : null) : null;
  if (!f || yo === null) throw new ErrorTrivial(404, "No existe esa partida");
  const rival = rivalDe(f, yo);
  if (!rival) throw new ErrorTrivial(410, "Tu rival eliminó su cuenta");

  // Las que tengan el turno vencido, al día antes de contarlas
  const vencidas = await consulta<{ id: string }>(`select id from trivial_partida where estado = 'activa' and turno_vence <= now() and ${DE_LA_PAREJA}`, [usuario, rival]);
  for (const { id } of vencidas.rows) await enTransaccion((bd) => bloquear(bd, id));

  return enTransaccion(async (bd) => {
    const { rows: todas } = await bd.query<FilaPartida>(
      `select * from trivial_partida where ${DE_LA_PAREJA} order by coalesce(terminada, creada) desc`,
      [usuario, rival],
    );
    const [alias, numeros, marcador, revancha] = [
      await aliasDeVarios([rival], bd),
      await numerosDe([rival], bd),
      await marcadorDe(bd, usuario, rival),
      await revanchaPendiente(bd, usuario, rival),
    ];
    const puesto = (p: FilaPartida): Puesto => (p.jugador_0 === usuario ? 0 : 1);
    return {
      rival: { alias: alias.get(rival) ?? ELIMINADO, numero: numeros.get(rival) ?? null },
      marcador,
      enCurso: todas
        .filter((p) => p.estado === "activa")
        .map((p) => ({ id: p.id, teToca: p.turno === puesto(p), turnoVence: new Date(p.turno_vence).toISOString() })),
      terminadas: todas
        .filter((p) => p.estado === "finalizada")
        .map((p) => {
          const yoP = puesto(p);
          return {
            id: p.id,
            terminada: new Date(p.terminada ?? p.creada).toISOString(),
            motivo: p.motivo,
            ganaste: p.ganador === null ? null : p.ganador === yoP,
            estrellas: { tuyas: p.estrellas[yoP].length, rival: p.estrellas[yoP === 0 ? 1 : 0].length },
          };
        }),
      revancha,
      // Para pedir la revancha desde aquí: la última terminada
      ultima: todas.find((p) => p.estado === "finalizada")?.id ?? null,
    };
  });
}

// ── Cuenta ──

/**
 * Antes de borrar una cuenta (decisión de Carlos, «A», 10/11/2026): sus partidas en marcha las gana el
 * rival, como si se hubiera rendido. Lo demás lo hace la base al borrar el usuario: alias, invitaciones,
 * búsquedas, revanchas y retos se borran, su puesto en las partidas terminadas queda vacío («Jugador eliminado») y
 * su número de hermano se queda sin dueño, sin volver a darse.
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
  const [alias, partidas, revanchas] = await Promise.all([
    aliasDe(usuario),
    consulta<{ creada: Date; estado: string; motivo: string | null; ganaste: boolean | null }>(
      `select creada, estado, motivo,
         case when ganador is null then null else ganador = (case when jugador_0 = $1 then 0 else 1 end) end as ganaste
       from trivial_partida where jugador_0 = $1 or jugador_1 = $1 order by creada`,
      [usuario],
    ),
    consulta<{ creada: Date; estado: string; pedida: boolean }>(
      "select creada, estado, de_id = $1 as pedida from trivial_revancha where de_id = $1 or para_id = $1 order by creada",
      [usuario],
    ),
  ]);
  return {
    alias,
    partidas: partidas.rows.map((p) => ({ empezada: new Date(p.creada).toISOString(), estado: p.estado, motivo: p.motivo, ganaste: p.ganaste })),
    revanchas: revanchas.rows.map((r) => ({ creada: new Date(r.creada).toISOString(), estado: r.estado, laPedisteTu: r.pedida })),
  };
}

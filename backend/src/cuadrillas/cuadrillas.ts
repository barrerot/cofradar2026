import { randomBytes } from "node:crypto";
import { consulta, enTransaccion, type Cliente } from "../bd.js";
import { numerosDe } from "../hermano.js";
import { ciriosDe } from "../dia/dia.js";
import {
  aliasDe,
  aliasDeVarios,
  bancoActivo,
  bloquear,
  bloquearPareja,
  crearPartida,
  DE_LA_PAREJA,
  ELIMINADO,
  ErrorTrivial,
  exigirAlias,
  malsonante,
} from "../trivial/partidas.js";

/**
 * Cuadrillas (F-57, P-36): un grupo privado de amigos, de 2 a 30, para picarse entre ellos.
 *
 * - Quien la crea es el capataz. Entra gente con un enlace (7 días, varios usos) que saca cualquier
 *   miembro; anularlo, cambiar el nombre y quitar a alguien, solo el capataz.
 * - Si el capataz sale, lo es quien lleve más tiempo dentro. Si sale el último, la cuadrilla desaparece.
 * - Dentro se ve de cada uno el alias, el número de hermano, el cirio (en Cuaresma) y las partidas entre
 *   miembros. Por orden alfabético y sin podio. Nunca puntos, nivel ni dónde ha estado nadie.
 * - Se reta a un miembro sin enlace: le llega a su bandeja como la revancha (72 horas, uno pendiente por
 *   pareja); si lo acepta, empieza una partida normal (origen 'cuadrilla').
 *
 * Los cambios de miembros van con la cuadrilla bloqueada (select … for update): dos que entran a la vez
 * con la cuadrilla en 29 no la dejan en 31.
 */

export const MAX_MIEMBROS = 30;
export const MAX_CUADRILLAS = 10;
export const ENLACE_MS = 7 * 24 * 3600_000;
export const RETO_MS = 72 * 3600_000;

const fecha = (d: Date | string) => new Date(d).toISOString();

export function nombreValido(nombre: unknown): string {
  const limpio = String(nombre ?? "").replace(/\s+/g, " ").trim();
  if (!limpio) throw new ErrorTrivial(400, "Ponle un nombre");
  if ([...limpio].length > 30) throw new ErrorTrivial(400, "Hasta 30 letras");
  if (malsonante(limpio)) throw new ErrorTrivial(400, "Elige otro nombre, por favor");
  return limpio;
}

/** La cuadrilla bloqueada y si `usuario` es de ella. 404 si no existe o no es suya (no se dice cuál). */
async function bloquearCuadrilla(bd: Cliente, id: string, usuario: string) {
  const { rows } = await bd.query<{ id: string; nombre: string; capataz_id: string | null }>(
    "select id, nombre, capataz_id from cuadrilla where id = $1 for update",
    [id],
  );
  const c = rows[0];
  if (!c) throw new ErrorTrivial(404, "Esa cuadrilla no existe");
  const { rowCount } = await bd.query("select 1 from cuadrilla_miembro where cuadrilla_id = $1 and usuario_id = $2", [id, usuario]);
  if (!rowCount) throw new ErrorTrivial(404, "Esa cuadrilla no existe");
  return c;
}

function exigirCapataz(c: { capataz_id: string | null }, usuario: string) {
  if (c.capataz_id !== usuario) throw new ErrorTrivial(403, "Eso solo lo puede hacer el capataz");
}

// ── Tus cuadrillas ──

export async function misCuadrillas(usuario: string) {
  const { rows } = await consulta<{ id: string; nombre: string; capataz_id: string | null; miembros: number; desde: Date }>(
    `select c.id, c.nombre, c.capataz_id, (select count(*)::int from cuadrilla_miembro x where x.cuadrilla_id = c.id) as miembros, m.desde
     from cuadrilla c join cuadrilla_miembro m on m.cuadrilla_id = c.id and m.usuario_id = $1
     order by lower(c.nombre), c.id`,
    [usuario],
  );
  const alias = await aliasDeVarios(rows.map((r) => r.capataz_id));
  return {
    cuadrillas: rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      miembros: r.miembros,
      capataz: r.capataz_id ? (alias.get(r.capataz_id) ?? null) : null,
      soyCapataz: r.capataz_id === usuario,
    })),
    max: MAX_CUADRILLAS,
  };
}

export async function crearCuadrilla(usuario: string, nombre: unknown) {
  await exigirAlias(usuario);
  const limpio = nombreValido(nombre);
  return enTransaccion(async (bd) => {
    // Una a la vez por persona, para que el límite se cumpla aunque cree dos a la vez
    await bd.query("select pg_advisory_xact_lock(hashtext($1))", [`cuadrillas:${usuario}`]);
    const { rows: n } = await bd.query<{ n: number }>("select count(*)::int as n from cuadrilla_miembro where usuario_id = $1", [usuario]);
    if (n[0]!.n >= MAX_CUADRILLAS) throw new ErrorTrivial(409, `Puedes estar en ${MAX_CUADRILLAS} cuadrillas como mucho`);
    const { rows } = await bd.query<{ id: string }>("insert into cuadrilla (nombre, capataz_id) values ($1, $2) returning id", [limpio, usuario]);
    const id = rows[0]!.id;
    await bd.query("insert into cuadrilla_miembro (cuadrilla_id, usuario_id) values ($1, $2)", [id, usuario]);
    return { id };
  });
}

// ── Una cuadrilla ──

type Miembro = { usuario_id: string; desde: Date };

export async function verCuadrilla(usuario: string, id: string, ahora: Date, dePrueba: boolean) {
  // Lo de la cuadrilla, en una transacción corta y sin bloquear
  const datos = await enTransaccion(async (bd) => {
    const { rows } = await bd.query<{ id: string; nombre: string; capataz_id: string | null }>("select id, nombre, capataz_id from cuadrilla where id = $1", [id]);
    const c = rows[0];
    if (!c) throw new ErrorTrivial(404, "Esa cuadrilla no existe");
    const { rows: miembros } = await bd.query<Miembro>("select usuario_id, desde from cuadrilla_miembro where cuadrilla_id = $1 order by desde, usuario_id", [id]);
    if (!miembros.some((m) => m.usuario_id === usuario)) throw new ErrorTrivial(404, "Esa cuadrilla no existe");
    return { c, miembros };
  });
  const { c, miembros } = datos;
  const ids = miembros.map((m) => m.usuario_id);
  const otros = ids.filter((x) => x !== usuario);

  // Las partidas tuyas con turnos vencidos, al día antes de contarlas
  if (otros.length) {
    const vencidas = await consulta<{ id: string }>(
      `select id from trivial_partida where estado = 'activa' and turno_vence <= now()
       and ((jugador_0 = $1 and jugador_1 = any($2)) or (jugador_1 = $1 and jugador_0 = any($2)))`,
      [usuario, otros],
    );
    for (const { id: p } of vencidas.rows) await enTransaccion((bd) => bloquear(bd, p));
  }

  const [alias, numeros, cirios, conmigo, terminadas, retos] = await Promise.all([
    aliasDeVarios(ids),
    numerosDe(ids),
    ciriosDe(ids, ahora, dePrueba),
    // Tú y cada uno: el marcador, la partida en curso y la última (para ir a su historial)
    otros.length
      ? consulta<{ rival: string; tuyas: number; suyas: number; ultima: string; en_curso: string | null; te_toca: boolean | null }>(
          `select case when jugador_0 = $1 then jugador_1 else jugador_0 end as rival,
             count(*) filter (where estado = 'finalizada' and ((ganador = 0 and jugador_0 = $1) or (ganador = 1 and jugador_1 = $1)))::int as tuyas,
             count(*) filter (where estado = 'finalizada' and ((ganador = 0 and jugador_0 <> $1) or (ganador = 1 and jugador_1 <> $1)))::int as suyas,
             (array_agg(id order by coalesce(terminada, creada) desc))[1] as ultima,
             (array_agg(id order by creada desc) filter (where estado = 'activa'))[1] as en_curso,
             bool_or(estado = 'activa' and turno = case when jugador_0 = $1 then 0 else 1 end) as te_toca
           from trivial_partida
           where (jugador_0 = $1 and jugador_1 = any($2)) or (jugador_1 = $1 and jugador_0 = any($2))
           group by 1`,
          [usuario, otros],
        )
      : Promise.resolve({ rows: [] }),
    // Las terminadas entre dos miembros cualesquiera, las 20 últimas
    consulta<{ id: string; jugador_0: string; jugador_1: string; ganador: 0 | 1 | null; motivo: string | null; estrellas: string[][]; terminada: Date }>(
      `select id, jugador_0, jugador_1, ganador, motivo, estrellas, terminada from trivial_partida
       where estado = 'finalizada' and jugador_0 = any($1) and jugador_1 = any($1)
       order by terminada desc limit 20`,
      [ids],
    ),
    consulta<{ id: string; de_id: string; para_id: string; vence: Date }>(
      `select id, de_id, para_id, vence from cuadrilla_reto
       where estado = 'pendiente' and vence > now() and ((de_id = $1 and para_id = any($2)) or (para_id = $1 and de_id = any($2)))`,
      [usuario, otros],
    ),
  ]);
  const deCada = new Map(conmigo.rows.map((r) => [r.rival, r]));
  const retoCon = new Map(retos.rows.map((r) => [r.de_id === usuario ? r.para_id : r.de_id, r]));
  const enCuaresma = cirios.size > 0;

  const lista = miembros
    .map((m) => {
      const tu = m.usuario_id === usuario;
      const x = deCada.get(m.usuario_id);
      const reto = retoCon.get(m.usuario_id);
      const cirio = cirios.get(m.usuario_id);
      return {
        alias: alias.get(m.usuario_id) ?? ELIMINADO,
        numero: numeros.get(m.usuario_id) ?? null,
        capataz: m.usuario_id === c.capataz_id,
        tu,
        // De los demás no se dice si han contestado ya hoy: solo los días (nadie se siente vigilado)
        cirio: cirio ? { estado: !tu && cirio.estado === "pendiente" ? "encendido" : cirio.estado, dias: cirio.dias } : null,
        marcador: tu ? null : { tuyas: x?.tuyas ?? 0, suyas: x?.suyas ?? 0 },
        enCurso: tu ? null : (x?.en_curso ?? null),
        historial: tu ? null : (x?.ultima ?? null),
        reto: reto ? { id: reto.id, tuyo: reto.de_id === usuario, vence: fecha(reto.vence) } : null,
      };
    })
    .sort((a, b) => a.alias.localeCompare(b.alias, "es", { sensitivity: "base" }));

  // Si sales siendo capataz, quién lo será: el que más tiempo lleve dentro
  const sucesor = c.capataz_id === usuario ? (miembros.find((m) => m.usuario_id !== usuario)?.usuario_id ?? null) : null;
  return {
    id: c.id,
    nombre: c.nombre,
    capataz: c.capataz_id ? (alias.get(c.capataz_id) ?? null) : null,
    soyCapataz: c.capataz_id === usuario,
    sucesor: sucesor ? (alias.get(sucesor) ?? null) : null,
    total: miembros.length,
    max: MAX_MIEMBROS,
    cuaresma: enCuaresma,
    miembros: lista,
    partidas: {
      enCurso: conmigo.rows
        .filter((r) => r.en_curso)
        .map((r) => ({ id: r.en_curso!, rival: alias.get(r.rival) ?? ELIMINADO, teToca: !!r.te_toca }))
        .sort((a, b) => Number(b.teToca) - Number(a.teToca) || a.rival.localeCompare(b.rival, "es")),
      terminadas: terminadas.rows.map((p) => ({
        id: p.id,
        terminada: fecha(p.terminada),
        jugadores: [alias.get(p.jugador_0) ?? ELIMINADO, alias.get(p.jugador_1) ?? ELIMINADO] as [string, string],
        tu: p.jugador_0 === usuario ? 0 : p.jugador_1 === usuario ? 1 : null,
        ganador: p.ganador,
        motivo: p.motivo,
        estrellas: [p.estrellas[0]?.length ?? 0, p.estrellas[1]?.length ?? 0] as [number, number],
      })),
    },
  };
}

export async function renombrar(usuario: string, id: string, nombre: unknown) {
  const limpio = nombreValido(nombre);
  return enTransaccion(async (bd) => {
    const c = await bloquearCuadrilla(bd, id, usuario);
    exigirCapataz(c, usuario);
    await bd.query("update cuadrilla set nombre = $2 where id = $1", [id, limpio]);
    return { nombre: limpio };
  });
}

/** Salir (o que te quiten): se cancelan sus retos de esta cuadrilla y, si era el capataz, pasa al más antiguo. */
async function sacar(bd: Cliente, id: string, usuario: string) {
  await bd.query("delete from cuadrilla_miembro where cuadrilla_id = $1 and usuario_id = $2", [id, usuario]);
  await bd.query("update cuadrilla_reto set estado = 'cancelado' where cuadrilla_id = $1 and estado = 'pendiente' and (de_id = $2 or para_id = $2)", [id, usuario]);
  const { rows } = await bd.query<{ usuario_id: string }>("select usuario_id from cuadrilla_miembro where cuadrilla_id = $1 order by desde, usuario_id limit 1", [id]);
  if (!rows[0]) {
    await bd.query("delete from cuadrilla where id = $1", [id]);
    return { desaparece: true };
  }
  await bd.query("update cuadrilla set capataz_id = $2 where id = $1 and (capataz_id is null or capataz_id = $3)", [id, rows[0].usuario_id, usuario]);
  return { desaparece: false };
}

export async function salir(usuario: string, id: string) {
  return enTransaccion(async (bd) => {
    await bloquearCuadrilla(bd, id, usuario);
    return sacar(bd, id, usuario);
  });
}

async function miembroPorAlias(bd: Cliente, id: string, alias: string): Promise<string> {
  const { rows } = await bd.query<{ usuario_id: string }>(
    `select m.usuario_id from cuadrilla_miembro m join trivial_jugador j on j.usuario_id = m.usuario_id
     where m.cuadrilla_id = $1 and lower(j.alias) = lower($2)`,
    [id, alias],
  );
  if (!rows[0]) throw new ErrorTrivial(404, "Esa persona ya no está en la cuadrilla");
  return rows[0].usuario_id;
}

export async function quitar(usuario: string, id: string, alias: string) {
  return enTransaccion(async (bd) => {
    const c = await bloquearCuadrilla(bd, id, usuario);
    exigirCapataz(c, usuario);
    const otro = await miembroPorAlias(bd, id, alias);
    if (otro === usuario) throw new ErrorTrivial(400, "Para irte tú, usa «Salir de la cuadrilla»");
    await sacar(bd, id, otro);
    return {};
  });
}

// ── El enlace de invitación ──

export async function enlaceDe(usuario: string, id: string) {
  return enTransaccion(async (bd) => {
    await bloquearCuadrilla(bd, id, usuario);
    const { rows } = await bd.query<{ token: string; vence: Date }>(
      "select token, vence from cuadrilla_enlace where cuadrilla_id = $1 and not anulado and vence > now() order by creado desc limit 1",
      [id],
    );
    if (rows[0]) return { token: rows[0].token, vence: fecha(rows[0].vence) };
    const token = randomBytes(12).toString("base64url");
    const vence = new Date(Date.now() + ENLACE_MS);
    await bd.query("insert into cuadrilla_enlace (token, cuadrilla_id, creado_por, vence) values ($1, $2, $3, $4)", [token, id, usuario, vence]);
    return { token, vence: fecha(vence) };
  });
}

export async function anularEnlace(usuario: string, id: string) {
  return enTransaccion(async (bd) => {
    const c = await bloquearCuadrilla(bd, id, usuario);
    exigirCapataz(c, usuario);
    await bd.query("update cuadrilla_enlace set anulado = true where cuadrilla_id = $1 and not anulado", [id]);
    return {};
  });
}

type FilaEnlace = { cuadrilla_id: string; creado_por: string | null; vence: Date; anulado: boolean; nombre: string; miembros: number };

async function leerEnlace(bd: Cliente | null, token: string): Promise<FilaEnlace | null> {
  const sql = `select e.cuadrilla_id, e.creado_por, e.vence, e.anulado, c.nombre,
       (select count(*)::int from cuadrilla_miembro m where m.cuadrilla_id = c.id) as miembros
     from cuadrilla_enlace e join cuadrilla c on c.id = e.cuadrilla_id where e.token = $1`;
  const { rows } = bd ? await bd.query<FilaEnlace>(sql, [token]) : await consulta<FilaEnlace>(sql, [token]);
  return rows[0] ?? null;
}

/** Lo que ve quien abre el enlace, con o sin cuenta. */
export async function verEnlace(token: string, usuario?: string) {
  const e = await leerEnlace(null, token);
  if (!e) throw new ErrorTrivial(404, "Esa invitación no existe");
  const dentro = usuario
    ? !!(await consulta("select 1 from cuadrilla_miembro where cuadrilla_id = $1 and usuario_id = $2", [e.cuadrilla_id, usuario])).rowCount
    : false;
  const estado = e.anulado ? "anulado" : new Date(e.vence) <= new Date() ? "caducado" : e.miembros >= MAX_MIEMBROS ? "llena" : "valido";
  return {
    cuadrilla: e.nombre,
    invita: e.creado_por ? ((await aliasDe(e.creado_por)) ?? null) : null,
    miembros: e.miembros,
    max: MAX_MIEMBROS,
    estado,
    dentro,
    id: dentro ? e.cuadrilla_id : null,
  };
}

export async function entrar(usuario: string, token: string) {
  await exigirAlias(usuario);
  return enTransaccion(async (bd) => {
    const antes = await leerEnlace(bd, token);
    if (!antes) throw new ErrorTrivial(404, "Esa invitación no existe");
    await bd.query("select 1 from cuadrilla where id = $1 for update", [antes.cuadrilla_id]);
    await bd.query("select pg_advisory_xact_lock(hashtext($1))", [`cuadrillas:${usuario}`]);
    const e = (await leerEnlace(bd, token))!;
    const ya = await bd.query("select 1 from cuadrilla_miembro where cuadrilla_id = $1 and usuario_id = $2", [e.cuadrilla_id, usuario]);
    if (ya.rowCount) return { id: e.cuadrilla_id };
    if (e.anulado) throw new ErrorTrivial(410, "Han anulado este enlace", { estado: "anulado" });
    if (new Date(e.vence) <= new Date()) throw new ErrorTrivial(410, "Este enlace ha caducado", { estado: "caducado" });
    if (e.miembros >= MAX_MIEMBROS) throw new ErrorTrivial(409, `Esta cuadrilla ya tiene ${MAX_MIEMBROS} personas`, { estado: "llena" });
    const { rows: n } = await bd.query<{ n: number }>("select count(*)::int as n from cuadrilla_miembro where usuario_id = $1", [usuario]);
    if (n[0]!.n >= MAX_CUADRILLAS) throw new ErrorTrivial(409, `Puedes estar en ${MAX_CUADRILLAS} cuadrillas como mucho`);
    await bd.query("insert into cuadrilla_miembro (cuadrilla_id, usuario_id) values ($1, $2)", [e.cuadrilla_id, usuario]);
    return { id: e.cuadrilla_id };
  });
}

// ── Retar a un miembro ──

type Reto = { id: string; tuyo: boolean; vence: string };

async function retoPendiente(bd: Cliente, yo: string, otro: string): Promise<Reto | null> {
  const { rows } = await bd.query<{ id: string; de_id: string; vence: Date }>(
    `select id, de_id, vence from cuadrilla_reto
     where estado = 'pendiente' and vence > now() and ((de_id = $1 and para_id = $2) or (de_id = $2 and para_id = $1))
     order by creada desc limit 1`,
    [yo, otro],
  );
  const r = rows[0];
  return r ? { id: r.id, tuyo: r.de_id === yo, vence: fecha(r.vence) } : null;
}

export async function retar(usuario: string, id: string, alias: string) {
  await exigirAlias(usuario);
  return enTransaccion(async (bd) => {
    await bloquearCuadrilla(bd, id, usuario);
    const otro = await miembroPorAlias(bd, id, alias);
    if (otro === usuario) throw new ErrorTrivial(400, "No puedes retarte a ti mismo");
    await bloquearPareja(bd, usuario, otro);
    await bd.query(
      `update cuadrilla_reto set estado = 'caducado'
       where estado = 'pendiente' and vence <= now() and ((de_id = $1 and para_id = $2) or (de_id = $2 and para_id = $1))`,
      [usuario, otro],
    );
    const { rows: activa } = await bd.query<{ id: string }>(`select id from trivial_partida where estado = 'activa' and ${DE_LA_PAREJA} limit 1`, [usuario, otro]);
    if (activa[0]) throw new ErrorTrivial(409, "Ya tenéis una partida en curso", { partida: activa[0].id });
    const ya = await retoPendiente(bd, usuario, otro);
    if (ya?.tuyo) return { reto: ya };
    if (ya) throw new ErrorTrivial(409, `${alias} ya te ha retado`, { reto: ya });
    const vence = new Date(Date.now() + RETO_MS);
    const { rows } = await bd.query<{ id: string }>(
      "insert into cuadrilla_reto (cuadrilla_id, de_id, para_id, vence) values ($1, $2, $3, $4) returning id",
      [id, usuario, otro, vence],
    );
    return { reto: { id: rows[0]!.id, tuyo: true, vence: fecha(vence) } satisfies Reto };
  });
}

/** Aceptarlo empieza una partida entre los dos. Repetir devuelve la misma. */
export async function aceptarReto(usuario: string, id: string) {
  return enTransaccion(async (bd) => {
    const { rows } = await bd.query<{ de_id: string; para_id: string; estado: string; vence: Date; partida_id: string | null }>(
      "select de_id, para_id, estado, vence, partida_id from cuadrilla_reto where id = $1 for update",
      [id],
    );
    const r = rows[0];
    if (!r || r.para_id !== usuario) throw new ErrorTrivial(404, "Ese reto no existe");
    if (r.estado === "aceptado" && r.partida_id) return { partida: r.partida_id };
    const caducado = r.estado === "caducado" || (r.estado === "pendiente" && new Date(r.vence) <= new Date());
    if (caducado) throw new ErrorTrivial(410, "Ese reto ya ha caducado", { estado: "caducado" });
    if (r.estado !== "pendiente") throw new ErrorTrivial(410, "Ese reto ya no está pendiente", { estado: r.estado });
    const partida = await crearPartida(bd, r.de_id, r.para_id, await bancoActivo(bd), "cuadrilla");
    await bd.query("update cuadrilla_reto set estado = 'aceptado', partida_id = $2 where id = $1", [id, partida]);
    return { partida };
  });
}

/** «Ahora no» (quien lo recibe) o «Cancelar» (quien lo mandó). */
export async function cerrarReto(usuario: string, id: string, como: "rechazado" | "cancelado") {
  const quien = como === "rechazado" ? "para_id" : "de_id";
  const { rowCount } = await consulta(`update cuadrilla_reto set estado = $3 where id = $1 and ${quien} = $2 and estado = 'pendiente'`, [id, usuario, como]);
  if (!rowCount) throw new ErrorTrivial(404, "Ese reto ya no está pendiente");
}

// ── Cuenta ──

/** Antes de borrar una cuenta: sale de sus cuadrillas como si se fuera (el capataz pasa al siguiente). */
export async function alBorrarCuenta(usuario: string): Promise<void> {
  const { rows } = await consulta<{ cuadrilla_id: string }>("select cuadrilla_id from cuadrilla_miembro where usuario_id = $1", [usuario]);
  for (const { cuadrilla_id } of rows) await salir(usuario, cuadrilla_id).catch(() => undefined);
}

/** Para «Descargar mis datos». */
export async function datosDe(usuario: string) {
  const { rows } = await consulta<{ nombre: string; desde: Date; capataz: boolean }>(
    `select c.nombre, m.desde, c.capataz_id = $1 as capataz from cuadrilla_miembro m join cuadrilla c on c.id = m.cuadrilla_id
     where m.usuario_id = $1 order by m.desde`,
    [usuario],
  );
  return rows.map((r) => ({ cuadrilla: r.nombre, desde: fecha(r.desde), capataz: r.capataz }));
}

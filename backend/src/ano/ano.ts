import { consulta } from "../bd.js";
import { hermandadDePregunta, PARA_CONOCER } from "../album/album.js";
import { puntosDe } from "../cargo/puntos.js";
import { calcularCirio, cuaresmaDe, diaDeMadrid } from "../dia/cirio.js";
import { leerCalendario } from "../dia/dia.js";
import { hermanoDe } from "../hermano.js";
import { anioDe, anioDeDia, entradasAlbum, lineasDe, PRIMER_ANIO, resurreccion, ultimoAnio, vacia, type Cuenta, type Linea } from "./tarjeta.js";

/**
 * «Tu Semana Santa» (F-59), de la base de datos. Nada se guarda aparte: la tarjeta se cuenta cada vez con
 * lo que ya hay (Mi colección, las aportaciones, la pregunta del día, las partidas y el álbum).
 */

export class ErrorAno extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export type Tarjeta = {
  anio: number;
  /** El alias del trivial, si tiene */
  alias: string | null;
  numero: number | null;
  /** El cargo que tenía al acabar ese Domingo de Resurrección; null sin puntos */
  cargo: string | null;
  lineas: Linea[];
};

/** Lo de cada año, contado. `dePrueba`: con el reloj de prueba, las preguntas del día de prueba. */
async function cuentas(usuario: string, dePrueba: boolean): Promise<Map<number, Cuenta>> {
  const [vistas, aportaciones, dias, partidas, aciertos, mapa, calendario] = await Promise.all([
    consulta<{ hermandad_id: number; anio: number }>("select hermandad_id, anio from vista where usuario_id = $1", [usuario]),
    consulta<{ hermandad_id: number; observada: Date; consolidada: boolean }>(
      "select hermandad_id, observada, coalesce(resultado = 'consolidada', false) as consolidada from aportacion where usuario_id = $1",
      [usuario],
    ),
    consulta<{ fecha: string }>("select to_char(fecha, 'YYYY-MM-DD') as fecha from dia_respuesta where usuario_id = $1 and de_prueba = $2", [usuario, dePrueba]),
    consulta<{ terminada: Date; gano: boolean }>(
      `select terminada, (jugador_0 = $1 and ganador = 0) or (jugador_1 = $1 and ganador = 1) as gano from trivial_partida
       where estado = 'finalizada' and ganador is not null and terminada is not null and (jugador_0 = $1 or jugador_1 = $1)`,
      [usuario],
    ),
    // Cuándo acertó cada pregunta por primera vez, de las tres fuentes del álbum
    consulta<{ id: number; cuando: Date }>(
      `select id, min(cuando) as cuando from (
         select pregunta_id as id, creado as cuando from trivial_acierto where usuario_id = $1
         union all
         select pregunta_id, creada from dia_respuesta where usuario_id = $1 and acierto
         union all
         select j.pregunta_id, coalesce(j.resuelta, j.mostrada) from trivial_jugada j join trivial_partida p on p.id = j.partida_id
         where j.acierto and ((j.puesto = 0 and p.jugador_0 = $1) or (j.puesto = 1 and p.jugador_1 = $1))
       ) a group by id`,
      [usuario],
    ),
    hermandadDePregunta(),
    leerCalendario(),
  ]);

  const porAnio = new Map<number, Cuenta>();
  const de = (anio: number) => porAnio.get(anio) ?? porAnio.set(anio, vacia()).get(anio)!;

  for (const v of vistas.rows) de(v.anio).vistas++;
  for (const a of aportaciones.rows) {
    const c = de(anioDe(new Date(a.observada)));
    c.fe++;
    if (a.consolidada) c.ayudaron++;
  }
  // La pregunta del día solo hay en Cuaresma: su año es el de la fecha
  const contestadas = new Map<number, Map<string, boolean>>();
  for (const d of dias.rows) {
    const anio = anioDeDia(d.fecha);
    contestadas.set(anio, (contestadas.get(anio) ?? new Map()).set(d.fecha, true));
  }
  for (const [anio, respuestas] of contestadas) {
    const cuaresma = cuaresmaDe(calendario, `${anio}-01-01`);
    const c = de(anio);
    if (cuaresma.length) {
      const cirio = calcularCirio(cuaresma, respuestas, cuaresma.at(-1)!.fecha);
      c.contestadas = cirio.contestadas;
      c.diasCuaresma = cuaresma.length;
    } else c.contestadas = respuestas.size;
  }
  for (const p of partidas.rows) {
    const c = de(anioDe(new Date(p.terminada)));
    c.partidas++;
    if (p.gano) c.ganadas++;
  }
  const entradas = entradasAlbum(
    aciertos.rows.flatMap((a) => (mapa.has(a.id) ? [{ hermandad: mapa.get(a.id)!, cuando: new Date(a.cuando) }] : [])),
    vistas.rows.map((v) => ({ hermandad: v.hermandad_id, anio: v.anio })),
    aportaciones.rows.filter((a) => a.consolidada).map((a) => ({ hermandad: a.hermandad_id, cuando: new Date(a.observada) })),
    PARA_CONOCER,
  );
  for (const anio of entradas.values()) de(anio).estampas++;
  return porAnio;
}

/** Los años con tarjeta, del más reciente al más antiguo. Solo los que ya han salido y tienen algo. */
export async function verAnos(usuario: string, ahora: Date, dePrueba: boolean): Promise<{ anios: number[] }> {
  const hasta = ultimoAnio(diaDeMadrid(ahora));
  const porAnio = await cuentas(usuario, dePrueba);
  const anios = [...porAnio].filter(([anio, c]) => anio >= PRIMER_ANIO && anio <= hasta && lineasDe(c).length).map(([anio]) => anio);
  return { anios: anios.sort((a, b) => b - a) };
}

export async function verTarjeta(usuario: string, anio: number, ahora: Date, dePrueba: boolean): Promise<Tarjeta> {
  if (!Number.isInteger(anio) || anio < PRIMER_ANIO || anio > ultimoAnio(diaDeMadrid(ahora))) throw new ErrorAno(404, "Esa tarjeta aún no ha salido");
  const c = (await cuentas(usuario, dePrueba)).get(anio);
  const lineas = c ? lineasDe(c) : [];
  if (!lineas.length) throw new ErrorAno(404, "Ese año no tiene tarjeta");
  const [hermano, alias, puntos] = await Promise.all([
    hermanoDe(usuario),
    consulta<{ alias: string }>("select alias from trivial_jugador where usuario_id = $1", [usuario]),
    puntosDe(usuario, consulta, resurreccion(anio)),
  ]);
  return {
    anio,
    alias: alias.rows[0]?.alias ?? null,
    numero: hermano?.numero ?? null,
    cargo: puntos.cargo.puntos > 0 ? puntos.cargo.nombre : null,
    lineas,
  };
}

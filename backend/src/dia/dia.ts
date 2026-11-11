import { consulta } from "../bd.js";
import { calcularCirio, cuaresmaDe, diaDeMadrid, faseDe, type Cirio, type Dia, type Fase } from "./cirio.js";

/**
 * La pregunta del día y el cirio encendido (F-55, P-34). La pregunta sale del banco del trivial (la versión
 * activa; si ya no la tiene, la última que la tenga), con las opciones de ids opacos: la buena no llega al
 * móvil antes de contestar. Una respuesta por persona y día; reenviarla devuelve la que ya había.
 *
 * `dePrueba`: con el reloj de prueba (RELOJ_DE_PRUEBA y la cabecera X-Reloj-Desfase) todo va aparte, en
 * filas marcadas de_prueba, para revisar la Cuaresma en noviembre sin tocar los cirios de verdad.
 */

export class ErrorDia extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export type PreguntaDia = {
  id: number;
  banco: number;
  categoria: string;
  tema: string;
  hermandad: string;
  enunciado: string;
  opciones: { id: string; texto: string }[];
};
export type ResolucionDia = { acierto: boolean; correcta: string; explicacion: string; fuente: string; pregunta: number };

export type VistaDia = {
  fase: Fase | null;
  hoy: string;
  inicio: string | null;
  fin: string | null;
  total: number;
  /** El número de hoy en la Cuaresma («Día 23»), o null fuera de ella */
  dia: number | null;
  pregunta?: PreguntaDia;
  tuya?: { respuesta: string; resolucion: ResolucionDia };
  cirio?: Cirio;
};

// El calendario cambia una vez al año: se recuerda un minuto
let calendario: { cuando: number; dias: (Dia & { pregunta: number })[] } | null = null;
async function leerCalendario() {
  if (calendario && Date.now() - calendario.cuando < 60_000) return calendario.dias;
  const { rows } = await consulta<{ fecha: string; dia: number; pregunta_id: number }>(
    "select to_char(fecha, 'YYYY-MM-DD') as fecha, dia, pregunta_id from dia_pregunta order by fecha",
  );
  calendario = { cuando: Date.now(), dias: rows.map((r) => ({ fecha: r.fecha, dia: r.dia, pregunta: r.pregunta_id })) };
  return calendario.dias;
}
/** Para el script que carga el calendario y las pruebas. */
export const olvidarCalendario = () => {
  calendario = null;
};

async function respuestasDe(usuarios: string[], dePrueba: boolean, cuaresma: Dia[]) {
  const porUsuario = new Map<string, Map<string, boolean>>(usuarios.map((u) => [u, new Map()]));
  if (!usuarios.length || !cuaresma.length) return porUsuario;
  const { rows } = await consulta<{ usuario_id: string; fecha: string; acierto: boolean }>(
    `select usuario_id, to_char(fecha, 'YYYY-MM-DD') as fecha, acierto from dia_respuesta
     where usuario_id = any($1) and de_prueba = $2 and fecha between $3 and $4`,
    [usuarios, dePrueba, cuaresma[0]!.fecha, cuaresma.at(-1)!.fecha],
  );
  for (const r of rows) porUsuario.get(r.usuario_id)?.set(r.fecha, r.acierto);
  return porUsuario;
}

async function preguntaDelBanco(id: number, banco?: number) {
  const { rows } = await consulta<{
    banco_version: number;
    categoria: string;
    tema: string;
    hermandad: string;
    enunciado: string;
    opciones: { id: string; texto: string }[];
    correcta: string;
    explicacion: string;
    fuente: string;
  }>(
    `select p.banco_version, p.categoria, p.tema, p.hermandad, p.enunciado, p.opciones, p.correcta, p.explicacion, p.fuente
     from trivial_pregunta p join trivial_banco b on b.version = p.banco_version
     where p.id = $1 and ($2::int is null or p.banco_version = $2)
     order by b.activa desc, p.banco_version desc limit 1`,
    [id, banco ?? null],
  );
  return rows[0] ?? null;
}

export async function verDia(usuario: string | null, ahora: Date, dePrueba: boolean): Promise<VistaDia> {
  const hoy = diaDeMadrid(ahora);
  const todos = await leerCalendario();
  const cuaresma = cuaresmaDe(todos, hoy);
  const fase = faseDe(cuaresma, hoy);
  const deHoy = fase === "cuaresma" ? todos.find((d) => d.fecha === hoy) : undefined;
  const vista: VistaDia = {
    fase,
    hoy,
    inicio: cuaresma[0]?.fecha ?? null,
    fin: cuaresma.at(-1)?.fecha ?? null,
    total: cuaresma.length,
    dia: deHoy?.dia ?? null,
  };
  if (!usuario || !fase) return vista;

  const respuestas = (await respuestasDe([usuario], dePrueba, cuaresma)).get(usuario)!;
  vista.cirio = calcularCirio(cuaresma, respuestas, hoy);
  if (!deHoy) return vista;

  const p = await preguntaDelBanco(deHoy.pregunta);
  if (!p) return vista; // ninguna versión del banco la tiene: lo evita scripts/importar-cuaresma.ts
  vista.pregunta = {
    id: deHoy.pregunta,
    banco: p.banco_version,
    categoria: p.categoria,
    tema: p.tema,
    hermandad: p.hermandad,
    enunciado: p.enunciado,
    opciones: p.opciones,
  };
  const { rows } = await consulta<{ respuesta: string; banco_version: number }>(
    "select respuesta, banco_version from dia_respuesta where usuario_id = $1 and de_prueba = $2 and fecha = $3",
    [usuario, dePrueba, hoy],
  );
  const mia = rows[0];
  if (mia) {
    // Se enseña con las opciones de la versión con la que contestó
    const suya = mia.banco_version === p.banco_version ? p : await preguntaDelBanco(deHoy.pregunta, mia.banco_version);
    if (suya) {
      vista.pregunta.banco = suya.banco_version;
      vista.pregunta.opciones = suya.opciones;
      vista.tuya = { respuesta: mia.respuesta, resolucion: resolucionDe(suya, mia.respuesta, deHoy.pregunta) };
    }
  }
  return vista;
}

function resolucionDe(p: { correcta: string; explicacion: string; fuente: string }, respuesta: string, id: number): ResolucionDia {
  return { acierto: respuesta === p.correcta, correcta: p.correcta, explicacion: p.explicacion, fuente: p.fuente, pregunta: id };
}

/** Contestar la de hoy. Si ya había contestado, devuelve lo que contestó entonces (sin cambiarlo). */
export async function responder(
  usuario: string,
  ahora: Date,
  dePrueba: boolean,
  cuerpo: { fecha?: unknown; banco?: unknown; opcion?: unknown },
): Promise<VistaDia> {
  const hoy = diaDeMadrid(ahora);
  if (cuerpo.fecha !== hoy) throw new ErrorDia(409, "Ya es otro día: hay pregunta nueva.");
  const deHoy = cuaresmaDe(await leerCalendario(), hoy).find((d) => d.fecha === hoy);
  if (!deHoy) throw new ErrorDia(404, "Hoy no hay pregunta del día.");
  const banco = Number(cuerpo.banco);
  const opcion = String(cuerpo.opcion ?? "");
  const p = Number.isInteger(banco) ? await preguntaDelBanco(deHoy.pregunta, banco) : null;
  if (!p) throw new ErrorDia(409, "La pregunta ha cambiado. Vuelve a abrirla.");
  if (!p.opciones.some((o) => o.id === opcion)) throw new ErrorDia(400, "Esa respuesta no es de esta pregunta.");
  await consulta(
    `insert into dia_respuesta (usuario_id, de_prueba, fecha, pregunta_id, banco_version, respuesta, acierto)
     values ($1, $2, $3, $4, $5, $6, $7) on conflict (usuario_id, de_prueba, fecha) do nothing`,
    [usuario, dePrueba, hoy, deHoy.pregunta, banco, opcion, opcion === p.correcta],
  );
  return verDia(usuario, ahora, dePrueba);
}

/** El cirio de varios a la vez (las cuadrillas, F-57). Fuera de la Cuaresma, un mapa vacío. */
export async function ciriosDe(usuarios: string[], ahora: Date, dePrueba: boolean): Promise<Map<string, Cirio>> {
  const hoy = diaDeMadrid(ahora);
  const cuaresma = cuaresmaDe(await leerCalendario(), hoy);
  if (faseDe(cuaresma, hoy) !== "cuaresma") return new Map();
  const respuestas = await respuestasDe(usuarios, dePrueba, cuaresma);
  return new Map(usuarios.map((u) => [u, calcularCirio(cuaresma, respuestas.get(u)!, hoy)]));
}

/** Para «Descargar mis datos» (F-35). */
export async function datosDe(usuario: string) {
  const { rows } = await consulta<{ fecha: string; pregunta_id: number; acierto: boolean; de_prueba: boolean; creada: Date }>(
    `select to_char(fecha, 'YYYY-MM-DD') as fecha, pregunta_id, acierto, de_prueba, creada from dia_respuesta
     where usuario_id = $1 order by de_prueba, fecha`,
    [usuario],
  );
  return rows.map((r) => ({ fecha: r.fecha, pregunta: r.pregunta_id, acierto: r.acierto, ...(r.de_prueba ? { de_prueba: true } : {}), contestada: r.creada }));
}

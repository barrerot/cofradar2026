/**
 * El cirio de Cuaresma (F-55), sin base de datos: a partir del calendario y de lo que ha contestado una
 * persona, en qué fase está la Cuaresma y cómo está su cirio. Las fechas son días de Madrid, «AAAA-MM-DD».
 *
 *   encendido   ha contestado hoy
 *   pendiente   contestó ayer y hoy aún no: sigue encendido hasta las 00:00
 *   apagado     contestó algún día, pero ni hoy ni ayer
 *   sin_empezar no ha contestado ningún día (o es el primero y aún no)
 *
 * Fallar no apaga nada: solo cuenta que haya contestado.
 */

export type Fase = "antes" | "cuaresma" | "despues";
export type EstadoCirio = "encendido" | "pendiente" | "apagado" | "sin_empezar";
export type Marca = "acierto" | "fallo" | null;

export type Dia = { fecha: string; dia: number };

export type Cirio = {
  estado: EstadoCirio;
  /** Días seguidos con el cirio encendido, contando hoy si ya ha contestado */
  dias: number;
  /** Si está apagado: el día en que se apagó (el primero sin contestar) y cuántos llevaba */
  apagadoEl: number | null;
  llevaba: number;
  contestadas: number;
  aciertos: number;
  /** La racha más larga de la Cuaresma («Mantuviste el cirio 39 días») */
  mejor: number;
  /** Una por día, del 1 a hoy */
  marcas: Marca[];
};

/** Días antes del Miércoles de Ceniza en que ya se anuncia, y días después del Sábado de Pasión en que se recuerda. */
export const ANUNCIO_DIAS = 9;
export const RECUERDO_DIAS = 8; // hasta el Domingo de Resurrección

const DIA_MS = 86_400_000;
export const sumarDias = (fecha: string, n: number) => new Date(Date.parse(`${fecha}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);

/** El día de Madrid de un instante. */
export function diaDeMadrid(t: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(t);
}

/** La Cuaresma de este año: los días del calendario del mismo año que `hoy`, en orden. */
export function cuaresmaDe<T extends Dia>(calendario: T[], hoy: string): T[] {
  return calendario.filter((d) => d.fecha.slice(0, 4) === hoy.slice(0, 4)).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function faseDe(cuaresma: Dia[], hoy: string): Fase | null {
  const inicio = cuaresma[0]?.fecha;
  const fin = cuaresma.at(-1)?.fecha;
  if (!inicio || !fin) return null;
  if (hoy < inicio) return hoy >= sumarDias(inicio, -ANUNCIO_DIAS) ? "antes" : null;
  if (hoy <= fin) return "cuaresma";
  return hoy <= sumarDias(fin, RECUERDO_DIAS) ? "despues" : null;
}

/** Cómo está el cirio de alguien. `respuestas`: fecha → acierto, solo las de esta Cuaresma. */
export function calcularCirio(cuaresma: Dia[], respuestas: Map<string, boolean>, hoy: string): Cirio {
  const pasados = cuaresma.filter((d) => d.fecha <= hoy);
  const marcas: Marca[] = pasados.map((d) => (respuestas.has(d.fecha) ? (respuestas.get(d.fecha) ? "acierto" : "fallo") : null));
  let contestadas = 0;
  let aciertos = 0;
  let mejor = 0;
  let racha = 0;
  for (const m of marcas) {
    if (m) {
      contestadas++;
      if (m === "acierto") aciertos++;
      racha++;
      mejor = Math.max(mejor, racha);
    } else racha = 0;
  }

  // La racha que sigue viva: la que acaba hoy, o ayer si hoy aún no ha contestado
  const hoyDia = pasados.at(-1)?.fecha === hoy ? pasados.length - 1 : -1;
  const hoyHecho = hoyDia >= 0 && marcas[hoyDia] !== null;
  const desde = hoyHecho ? hoyDia : hoyDia >= 0 ? hoyDia - 1 : marcas.length - 1;
  let dias = 0;
  for (let i = desde; i >= 0 && marcas[i]; i--) dias++;

  let estado: EstadoCirio;
  if (hoyHecho) estado = "encendido";
  else if (dias > 0) estado = "pendiente";
  else if (contestadas > 0) estado = "apagado";
  else estado = "sin_empezar";

  let apagadoEl: number | null = null;
  let llevaba = 0;
  if (estado === "apagado") {
    const ultima = marcas.reduce((u, m, i) => (m ? i : u), -1);
    apagadoEl = (pasados[ultima + 1]?.dia ?? null);
    for (let i = ultima; i >= 0 && marcas[i]; i--) llevaba++;
  }
  // Pasada la Cuaresma no hay «pendiente»: lo que queda es lo que hubo
  if (hoy > (cuaresma.at(-1)?.fecha ?? hoy)) {
    estado = contestadas ? "apagado" : "sin_empezar";
    dias = 0;
  }
  return { estado, dias, apagadoEl, llevaba, contestadas, aciertos, mejor, marcas };
}

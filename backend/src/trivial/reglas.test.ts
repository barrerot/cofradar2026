import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { empezar, mover, rendirse, responder, tirar, vencer, JugadaNoValida, PLAZO_TURNO_MS, type Estado, type PreguntaPendiente } from "./reglas.js";
import { CASILLAS, describir, destinos } from "./tablero.js";

const H = 3600_000;
const t0 = new Date("2026-11-10T10:00:00Z");
const en = (h: number) => new Date(t0.getTime() + h * H);

const pregunta = (casilla: string, jugada = 1): PreguntaPendiente => {
  const c = CASILLAS.get(casilla)!;
  return { jugada, id: 1, categoria: c.categoria ?? "historia", casilla, estrella: c.estrella, opciones: [] };
};

describe("tablero", () => {
  it("tiene 43 casillas y seis estrellas", () => {
    assert.equal(CASILLAS.size, 43);
    assert.equal([...CASILLAS.values()].filter((c) => c.estrella).length, 6);
  });

  it("desde cualquier casilla y con cualquier tirada hay destino (RF-04)", () => {
    for (const c of CASILLAS.keys()) for (let n = 1; n <= 6; n++) assert.ok(destinos(c, n).length >= 1, `${c} con ${n}`);
  });

  it("un 4 desde la segunda casilla tras La Campana da los tres destinos del diseño", () => {
    assert.deepEqual(destinos("A2", 4), ["A6", "A34", "C0-1"]);
    assert.equal(describir("A6"), "Sierpes · estrella de Imágenes");
    assert.equal(describir("A34"), "Jornadas y sedes, entre Puerta de San Miguel y La Campana");
    assert.equal(describir("C0-1"), "Música y literatura, en la calle de La Campana a la Salida");
  });

  it("después de cada estrella vienen las otras cinco categorías", () => {
    const tras = (i: number) => [1, 2, 3, 4, 5].map((j) => CASILLAS.get(`A${i + j}`)!.categoria);
    assert.deepEqual(tras(0), ["imagenes", "patrimonio_simbolos", "jornadas_sedes", "musica_literatura", "tradiciones_curiosidades"]);
    assert.deepEqual(tras(6), ["patrimonio_simbolos", "jornadas_sedes", "musica_literatura", "tradiciones_curiosidades", "historia"]);
  });
});

describe("reglas", () => {
  it("CA-05: acierto en normal sigue tirando, fallo pasa el turno, acierto en estrella la gana", () => {
    let e: Estado = empezar(t0, 0);
    e = tirar(e, 0, 2);
    e = mover(e, 0, "C0-2", pregunta("C0-2"));
    e = responder(e, 0, true, en(1)).estado;
    assert.equal(e.turno, 0);
    assert.equal(e.fase, "tirar");
    e = tirar(e, 0, 1);
    e = mover(e, 0, "A0", pregunta("A0", 2));
    e = responder(e, 0, false, en(2)).estado;
    assert.equal(e.turno, 1);
    assert.equal(e.turno_vence.getTime(), en(2).getTime() + PLAZO_TURNO_MS);
    e = tirar(e, 1, 2);
    e = mover(e, 1, "C0-2", pregunta("C0-2", 3));
    e = responder(e, 1, false, en(3)).estado;
    e = tirar(e, 0, 1);
    e = mover(e, 0, "A1", pregunta("A1", 4));
    e = responder(e, 0, true, en(4)).estado;
    e = tirar(e, 0, 1);
    e = mover(e, 0, "A0", pregunta("A0", 5));
    const r = responder(e, 0, true, en(5));
    assert.equal(r.estrella, "historia");
    assert.deepEqual(r.estado.estrellas[0], ["historia"]);
  });

  it("solo el jugador activo puede tirar, y solo a un destino válido", () => {
    const e = empezar(t0, 1);
    assert.throws(() => tirar(e, 0, 3), JugadaNoValida);
    const t = tirar(e, 1, 3);
    assert.throws(() => mover(t, 1, "A10", pregunta("A10")), JugadaNoValida);
  });

  it("la sexta estrella gana y cierra la partida", () => {
    let e: Estado = { ...empezar(t0, 0), estrellas: [["historia", "imagenes", "patrimonio_simbolos", "jornadas_sedes", "musica_literatura"], []], posiciones: ["A29", "S"] };
    e = tirar(e, 0, 1);
    e = mover(e, 0, "A30", pregunta("A30"));
    const r = responder(e, 0, true, en(1)).estado;
    assert.equal(r.estado, "finalizada");
    assert.equal(r.motivo, "estrellas");
    assert.equal(r.ganador, 0);
    assert.throws(() => tirar(r, 0, 1), JugadaNoValida);
  });

  it("CA-07: vence con pregunta pendiente: se cierra y pasa el turno con plazo desde el vencimiento", () => {
    let e = tirar(empezar(t0, 0), 0, 2);
    e = mover(e, 0, "C0-2", pregunta("C0-2", 7));
    const v = vencer(e, en(50));
    assert.deepEqual(v.vencidas, [7]);
    assert.equal(v.estado.turno, 1);
    assert.equal(v.estado.turno_desde.getTime(), en(48).getTime());
    assert.equal(v.estado.turno_vence.getTime(), en(96).getTime());
    assert.equal(v.estado.pregunta, null);
    assert.equal(v.estado.posiciones[0], "C0-2");
    assert.equal(v.estado.estado, "activa");
  });

  it("dos vencimientos seguidos sin jugar cierran por inactividad, aunque se procesen tarde", () => {
    const v = vencer(empezar(t0, 0), en(200));
    assert.equal(v.estado.estado, "finalizada");
    assert.equal(v.estado.motivo, "inactividad");
    assert.equal(v.estado.ganador, null);
  });

  it("una jugada entre dos vencimientos reinicia la cuenta", () => {
    let e = vencer(empezar(t0, 0), en(49)).estado;
    e = tirar(e, 1, 1);
    const v = vencer(e, en(97));
    assert.equal(v.estado.estado, "activa");
    assert.equal(v.estado.vencimientos_seguidos, 1);
  });

  it("rendirse da la victoria al rival", () => {
    const r = rendirse(empezar(t0, 0), 0);
    assert.equal(r.ganador, 1);
    assert.equal(r.motivo, "rendicion");
  });
});

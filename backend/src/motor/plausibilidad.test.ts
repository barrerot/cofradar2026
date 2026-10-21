import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { juzgar, type Hecho } from "./plausibilidad.js";

const MIN = 60_000;
const M_LON = 111_320 * Math.cos((37.39 * Math.PI) / 180);
/** Un punto a `m` metros al este de un origen en Sevilla. */
const al = (m: number): [number, number] => [-6 + m / M_LON, 37.39];
const hecho = (hermandadId: number, elemento: number | null, min: number, metro: number): Hecho => ({ hermandadId, elemento, t: min * MIN, zona: [al(metro)] });
const ventana = { sale: 0, entra: 300 * MIN };

describe("plausibilidad en el momento", () => {
  it("la primera de la noche, a su hora, pasa", () => {
    assert.deepEqual(juzgar(hecho(1, 0, 60, 0), [], ventana), { plausible: true });
  });

  it("la misma cofradía y el mismo elemento al minuto: repetición", () => {
    assert.deepEqual(juzgar(hecho(1, 0, 61, 0), [hecho(1, 0, 60, 0)], ventana), { plausible: false, motivo: "repeticion" });
  });

  it("otro paso de la misma cofradía al minuto sí vale (pasa la cruz y luego el Cristo)", () => {
    assert.equal(juzgar(hecho(1, 1, 61, 0), [hecho(1, 0, 60, 0)], ventana).plausible, true);
  });

  it("dos cofradías a 3 km en 2 minutos: teletransporte", () => {
    assert.deepEqual(juzgar(hecho(2, 0, 62, 3000), [hecho(1, 0, 60, 0)], ventana), { plausible: false, motivo: "teletransporte" });
  });

  it("dos cofradías a 3 km en 40 minutos: se puede ir andando", () => {
    assert.equal(juzgar(hecho(2, 0, 100, 3000), [hecho(1, 0, 60, 0)], ventana).plausible, true);
  });

  it("dos cofradías que se cruzan en la misma calle: no es teletransporte", () => {
    assert.equal(juzgar(hecho(2, 0, 61, 150), [hecho(1, 0, 60, 0)], ventana).plausible, true);
  });

  it("seis en diez minutos: ritmo que no es humano", () => {
    const previas = [1, 2, 3, 4, 5, 6].map((k) => hecho(k, null, 60 + k, 0));
    assert.deepEqual(juzgar(hecho(7, null, 67, 0), previas, ventana), { plausible: false, motivo: "ritmo" });
  });

  it("de una cofradía que aún no ha salido ni de lejos: fuera de ventana", () => {
    assert.deepEqual(juzgar(hecho(1, 0, -90, 0), [], ventana), { plausible: false, motivo: "ventana" });
  });

  it("con un retraso grande, entrando una hora tarde, aún vale", () => {
    assert.equal(juzgar(hecho(1, 2, 360, 0), [], ventana).plausible, true);
  });
});

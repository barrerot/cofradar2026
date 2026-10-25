import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { msPrograma, paredSevilla } from "../motor/tiempo.js";
import { anioPorDefecto, porHoras } from "./metricas.js";

describe("métricas (BUL-213)", () => {
  it("¿llegamos a todas?: cada hora, las que están en la calle y las que tienen algo confirmado", () => {
    const h = (x: string) => msPrograma(`2026-04-03T${x}`);
    const horas = porHoras(
      [
        { id: "a", salida: h("00:00"), entrada: h("02:30") },
        { id: "b", salida: h("01:15"), entrada: h("03:00") },
        { id: "sin-horario", salida: null, entrada: null },
      ],
      new Map([
        ["a", [h("00:10"), h("00:50"), h("02:05")]],
        ["b", [h("01:59")]],
      ]),
    );
    assert.deepEqual(horas, [
      { hora: "00:00", enLaCalle: 1, confirmadas: 1 },
      { hora: "01:00", enLaCalle: 2, confirmadas: 1 },
      { hora: "02:00", enLaCalle: 2, confirmadas: 1 },
    ]);
  });

  it("sin cofradías con horario, ninguna hora", () => {
    assert.deepEqual(porHoras([{ id: "a", salida: null, entrada: null }], new Map()), []);
  });

  it("el año por defecto es la Semana Santa en curso o, si aún no ha empezado, la anterior", () => {
    const en = (iso: string) => anioPorDefecto(paredSevilla(new Date(iso)));
    assert.equal(en("2026-10-25T10:00:00Z"), 2026); // la de 2027 aún no ha empezado
    assert.equal(en("2027-03-21T10:00:00Z"), 2027); // Domingo de Ramos de 2027
    assert.equal(en("2027-03-29T10:00:00Z"), 2027); // lunes de Pascua: sigue enseñando 2027
    assert.equal(en("2027-12-01T10:00:00Z"), 2027);
  });
});

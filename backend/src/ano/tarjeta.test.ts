import { test } from "node:test";
import assert from "node:assert/strict";
import { anioDeDia, entradasAlbum, lineasDe, resurreccion, ultimoAnio, vacia } from "./tarjeta.js";

test("el Domingo de Resurrección de cada año", () => {
  assert.equal(resurreccion(2026), "2026-04-05");
  assert.equal(resurreccion(2027), "2027-03-28");
  assert.equal(resurreccion(2028), "2028-04-16");
});

test("el año cofrade va de un Domingo de Resurrección al siguiente", () => {
  assert.equal(anioDeDia("2026-11-11"), 2027);
  assert.equal(anioDeDia("2027-03-28"), 2027);
  assert.equal(anioDeDia("2027-03-29"), 2028);
  assert.equal(ultimoAnio("2027-03-27"), 2026);
  assert.equal(ultimoAnio("2027-03-28"), 2027);
  assert.equal(ultimoAnio("2028-01-10"), 2027);
});

test("la tarjeta del ejemplo", () => {
  const l = lineasDe({ vistas: 14, fe: 22, ayudaron: 9, contestadas: 39, diasCuaresma: 39, partidas: 9, ganadas: 6, estampas: 5 });
  assert.deepEqual(l.map((x) => x.texto), [
    "Viste 14 cofradías",
    "Diste fe 22 veces · 9 ayudaron a situar un paso",
    "Mantuviste el cirio encendido los 39 días de la Cuaresma",
    "Ganaste 6 de 9 partidas",
    "5 estampas nuevas en tu álbum",
  ]);
});

test("un año con poco: solo lo que hizo, sin ceros", () => {
  const l = lineasDe({ ...vacia(), vistas: 3, contestadas: 12, diasCuaresma: 39 });
  assert.deepEqual(l.map((x) => [x.clave, x.texto]), [
    ["vistas", "Viste 3 cofradías"],
    ["preguntas", "Contestaste 12 preguntas del día"],
  ]);
  assert.deepEqual(lineasDe(vacia()), []);
});

test("singulares y partidas sin ganar", () => {
  const l = lineasDe({ ...vacia(), vistas: 1, fe: 1, ayudaron: 1, contestadas: 1, partidas: 3, estampas: 1 });
  assert.deepEqual(l.map((x) => x.texto), [
    "Viste 1 cofradía",
    "Diste fe 1 vez · ayudó a situar un paso",
    "Contestaste 1 pregunta del día",
    "Jugaste 3 partidas",
    "1 estampa nueva en tu álbum",
  ]);
  assert.equal(lineasDe({ ...vacia(), partidas: 1, ganadas: 1 })[0]!.texto, "Ganaste tu partida");
  assert.equal(lineasDe({ ...vacia(), fe: 4, ayudaron: 1 })[0]!.texto, "Diste fe 4 veces · 1 ayudó a situar un paso");
  for (const x of lineasDe({ ...vacia(), vistas: 2, fe: 3, partidas: 2 })) assert.doesNotMatch(x.texto, /\b0\b/);
});

test("cada estampa cuenta el año de su primer grado", () => {
  const d = (s: string) => new Date(s);
  const e = entradasAlbum(
    [1, 2, 3, 4].map((i) => ({ hermandad: 7, cuando: d(`2027-0${i}-01T12:00:00Z`) })).concat([{ hermandad: 7, cuando: d("2027-05-01T12:00:00Z") }]),
    [{ hermandad: 8, anio: 2027 }, { hermandad: 8, anio: 2028 }],
    [{ hermandad: 9, cuando: d("2028-04-13T20:00:00Z") }],
    5,
  );
  // La quinta, en mayo de 2027: ya cuenta para la de 2028
  assert.equal(e.get(7), 2028);
  assert.equal(e.get(8), 2027);
  assert.equal(e.get(9), 2028);
  // Con cuatro no la conoces
  assert.equal(entradasAlbum([1, 2, 3, 4].map(() => ({ hermandad: 1, cuando: d("2027-01-01") })), [], [], 5).size, 0);
});

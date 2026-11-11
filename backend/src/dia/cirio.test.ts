import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calcularCirio, cuaresmaDe, diaDeMadrid, faseDe, sumarDias, type Dia } from "./cirio.js";

// La Cuaresma de 2027: del Miércoles de Ceniza (10/02) al Sábado de Pasión (20/03), 39 días
const CUARESMA: Dia[] = Array.from({ length: 39 }, (_, i) => ({ fecha: sumarDias("2027-02-10", i), dia: i + 1 }));
const fecha = (dia: number) => CUARESMA[dia - 1]!.fecha;
/** Contestadas los días dados; las de `fallos`, falladas. */
const resp = (dias: number[], fallos: number[] = []) => new Map(dias.map((d) => [fecha(d), !fallos.includes(d)]));

test("las fechas: día 23 es el 4 de marzo y el 39 el Sábado de Pasión", () => {
  assert.equal(fecha(23), "2027-03-04");
  assert.equal(fecha(39), "2027-03-20");
});

test("el día de Madrid cambia a las 00:00 de Madrid, no a las de Londres", () => {
  assert.equal(diaDeMadrid(new Date("2027-03-03T23:30:00Z")), "2027-03-04"); // 00:30 en Madrid
  assert.equal(diaDeMadrid(new Date("2027-03-03T22:59:00Z")), "2027-03-03");
  // Tras el cambio de hora (28/03/2027), Madrid va dos horas por delante
  assert.equal(diaDeMadrid(new Date("2027-03-28T22:30:00Z")), "2027-03-29");
});

test("las fases: anuncio desde 9 días antes, recuerdo hasta el Domingo de Resurrección", () => {
  assert.equal(faseDe(CUARESMA, "2027-01-31"), null);
  assert.equal(faseDe(CUARESMA, "2027-02-01"), "antes");
  assert.equal(faseDe(CUARESMA, "2027-02-10"), "cuaresma");
  assert.equal(faseDe(CUARESMA, "2027-03-20"), "cuaresma");
  assert.equal(faseDe(CUARESMA, "2027-03-21"), "despues");
  assert.equal(faseDe(CUARESMA, "2027-03-28"), "despues");
  assert.equal(faseDe(CUARESMA, "2027-03-29"), null);
  assert.equal(faseDe([], "2027-03-01"), null);
});

test("la Cuaresma es la del año de hoy", () => {
  const otra = [...CUARESMA, { fecha: "2028-03-01", dia: 1 }];
  assert.equal(cuaresmaDe(otra, "2027-03-04").length, 39);
  assert.equal(cuaresmaDe(otra, "2028-03-01").length, 1);
});

const dias = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

test("contestó del 1 al 22 y hoy (23) aún no: pendiente, 22 días", () => {
  const c = calcularCirio(CUARESMA, resp(dias(1, 22), [4, 9, 13, 17, 20]), fecha(23));
  assert.equal(c.estado, "pendiente");
  assert.equal(c.dias, 22);
  assert.equal(c.contestadas, 22);
  assert.equal(c.aciertos, 17);
  assert.equal(c.marcas.length, 23);
  assert.equal(c.marcas[22], null);
  assert.equal(c.marcas[3], "fallo");
});

test("y al contestar hoy: encendido, 23 días; fallar no apaga", () => {
  const c = calcularCirio(CUARESMA, resp(dias(1, 23), [4, 9, 13, 17, 20, 23]), fecha(23));
  assert.equal(c.estado, "encendido");
  assert.equal(c.dias, 23);
  assert.equal(c.aciertos, 17);
});

test("no contestó el 22: apagado, se apagó el día 22 tras 21 seguidos; al contestar, 1 día", () => {
  const antes = calcularCirio(CUARESMA, resp(dias(1, 21)), fecha(23));
  assert.equal(antes.estado, "apagado");
  assert.equal(antes.dias, 0);
  assert.equal(antes.apagadoEl, 22);
  assert.equal(antes.llevaba, 21);
  const despues = calcularCirio(CUARESMA, resp([...dias(1, 21), 23]), fecha(23));
  assert.equal(despues.estado, "encendido");
  assert.equal(despues.dias, 1);
  assert.equal(despues.mejor, 21);
});

test("sin contestar nunca: sin empezar, también el primer día", () => {
  assert.equal(calcularCirio(CUARESMA, new Map(), fecha(1)).estado, "sin_empezar");
  assert.equal(calcularCirio(CUARESMA, new Map(), fecha(23)).estado, "sin_empezar");
  const primero = calcularCirio(CUARESMA, resp([1]), fecha(1));
  assert.equal(primero.estado, "encendido");
  assert.equal(primero.dias, 1);
});

test("empezó tarde (el 20): 3 días el 22", () => {
  const c = calcularCirio(CUARESMA, resp([20, 21, 22]), fecha(22));
  assert.equal(c.estado, "encendido");
  assert.equal(c.dias, 3);
});

test("acabada la Cuaresma: lo que hubo, sin pendiente", () => {
  const todos = calcularCirio(CUARESMA, resp(dias(1, 39)), "2027-03-22");
  assert.equal(todos.estado, "apagado");
  assert.equal(todos.mejor, 39);
  assert.equal(todos.marcas.length, 39);
  const nada = calcularCirio(CUARESMA, new Map(), "2027-03-22");
  assert.equal(nada.estado, "sin_empezar");
});

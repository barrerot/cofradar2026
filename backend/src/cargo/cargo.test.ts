import { test } from "node:test";
import assert from "node:assert/strict";
import { cargoDe, NIVELES, repartirCasa } from "./cargo.js";

test("los doce cargos, de Monaguillo a Hermano Mayor, cada uno con su frase", () => {
  assert.equal(NIVELES.length, 12);
  assert.equal(NIVELES[0]!.nombre, "Monaguillo");
  assert.equal(NIVELES[11]!.desde, 5500);
  for (const n of NIVELES) assert.ok(n.frase.length > 20, n.nombre);
});

test("el ejemplo del diseño: 620 de la calle y 560 de la casa es Diputado de tramo, faltan 320", () => {
  const c = cargoDe(620, 560);
  assert.equal(c.puntos, 1180);
  assert.equal(c.nombre, "Diputado de tramo");
  assert.deepEqual(c.siguiente, { nombre: "Fiscal de cruz", desde: 1500, faltan: 320 });
  assert.equal(c.tope, false);
});

test("el tope de la calle: 400 y 780 se quedan en Contraguía, sin «faltan»", () => {
  const c = cargoDe(400, 780);
  assert.equal(c.puntos, 1180);
  assert.equal(c.nombre, "Contraguía");
  assert.equal(c.tope, true);
  assert.deepEqual(c.siguiente, { nombre: "Diputado de tramo", desde: 1000, faltan: null });
});

test("desde el sofá se llega a Contraguía y no más", () => {
  assert.equal(cargoDe(0, 999).nombre, "Contraguía");
  assert.equal(cargoDe(0, 999).tope, false);
  assert.equal(cargoDe(0, 5000).nombre, "Contraguía");
  assert.equal(cargoDe(0, 5000).tope, true);
});

test("por debajo de 1.000 la casa cuenta entera", () => {
  assert.equal(cargoDe(100, 400).nombre, "Costalero");
  assert.equal(cargoDe(0, 50).nombre, "Nazareno de cirio");
  assert.equal(cargoDe(0, 0).nombre, "Monaguillo");
});

test("solo la calle llega a Hermano Mayor", () => {
  const c = cargoDe(5500, 0);
  assert.equal(c.nombre, "Hermano Mayor");
  assert.equal(c.siguiente, null);
});

test("sumar de la casa nunca baja de cargo (R6)", () => {
  for (let calle = 0; calle <= 3000; calle += 37) {
    let antes = 0;
    for (let casa = 0; casa <= 3000; casa += 23) {
      const n = cargoDe(calle, casa).numero;
      assert.ok(n >= antes, `calle ${calle}, casa ${casa}`);
      antes = n;
    }
  }
  for (let casa = 0; casa <= 3000; casa += 41) {
    let antes = 0;
    for (let calle = 0; calle <= 3000; calle += 19) {
      const n = cargoDe(calle, casa).numero;
      assert.ok(n >= antes, `casa ${casa}, calle ${calle}`);
      antes = n;
    }
  }
});

test("con 1.000 o más que cuentan, al menos la mitad es de la calle", () => {
  for (let calle = 0; calle <= 3000; calle += 29) {
    for (let casa = 0; casa <= 3000; casa += 31) {
      const c = cargoDe(calle, casa);
      if (c.desde >= 1000) assert.ok(calle * 2 >= c.desde, `calle ${calle}, casa ${casa} → ${c.nombre}`);
    }
  }
});

test("la casa: hasta 10 al día, por orden de llegada", () => {
  const r = repartirCasa([
    { clave: "dia", dia: "2027-03-04", cuando: 1, valor: 2 },
    { clave: "p1", dia: "2027-03-04", cuando: 2, valor: 5 },
    { clave: "p2", dia: "2027-03-04", cuando: 3, valor: 5 },
    { clave: "p3", dia: "2027-03-04", cuando: 4, valor: 5 },
    { clave: "p4", dia: "2027-03-05", cuando: 5, valor: 5 },
  ]);
  assert.equal(r.dio.get("dia"), 2);
  assert.equal(r.dio.get("p1"), 5);
  assert.equal(r.dio.get("p2"), 3);
  assert.equal(r.dio.get("p3"), 0);
  assert.equal(r.dio.get("p4"), 5);
  assert.equal(r.total, 15);
  assert.equal(r.porDia.get("2027-03-04"), 10);
});

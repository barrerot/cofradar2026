import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { leerBanco } from "./banco.js";

const csv = readFileSync(new URL("../../../docs/datos/trivial/todas-las-preguntas.csv", import.meta.url), "utf8");

describe("banco del trivial online", () => {
  it("CA-12: el CSV de referencia da 1.261 preguntas en las seis categorías", () => {
    const b = leerBanco(csv);
    assert.deepEqual(b.errores, []);
    assert.equal(b.preguntas.length, 1261);
    assert.deepEqual(b.porCategoria, {
      historia: 453,
      imagenes: 292,
      patrimonio_simbolos: 153,
      jornadas_sedes: 189,
      musica_literatura: 88,
      tradiciones_curiosidades: 86,
    });
    assert.equal(b.preguntas.filter((p) => !p.explicacion).length, 5);
  });

  it("los ids de opción no dicen cuál es la buena", () => {
    const b = leerBanco(csv);
    const primeras = b.preguntas.map((p) => p.opciones.findIndex((o) => o.id === p.correcta));
    // Barajadas: la buena no va siempre en el mismo sitio
    assert.ok(new Set(primeras).size === 4);
    for (const p of b.preguntas.slice(0, 50)) assert.match(p.opciones[0]!.id, /^[0-9a-f]{8}$/);
  });

  it("CA-13: un tema sin categoría o una opción repetida es un error con su id", () => {
    const cabecera = csv.split(/\r?\n/)[0];
    const malo = `${cabecera}\n9001,1,La Macarena,astronomía,fácil,¿Una?,A,B,C,D,,https://x.es,\n9002,1,La Macarena,historia,fácil,¿Otra?,A,a ,C,D,,https://x.es,historia\n`;
    const b = leerBanco(malo);
    assert.equal(b.errores.filter((e) => e.includes("id 9001") && e.includes("tema sin categoría")).length, 1);
    assert.equal(b.errores.filter((e) => e.includes("id 9002") && e.includes("opciones repetidas")).length, 1);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crearHistorias, crearLotes, type Guardada, type Reciente } from "./recientes.js";

const MIN = 60_000;
const hecha = (id: string): Guardada => ({ id, puntos: 10, observada: "2026-04-03T00:30:00.000Z" });
const reciente = (clienteId: string, t: number): Reciente => ({ clienteId, hermandadId: 1, elemento: 0, t, guardada: Promise.resolve(hecha(clienteId)) });

describe("lotes (BUL-212)", () => {
  it("lo que llega a la vez sale en una sola escritura", async () => {
    const escrituras: string[][] = [];
    const lotes = crearLotes<string>(async (fs) => {
      escrituras.push(fs);
      return new Map(fs.map((f) => [f, hecha(`id-${f}`)]));
    }, (f) => f, { espera: 5 });
    const r = await Promise.all(["a", "b", "c"].map((f) => lotes.guardar(f)));
    assert.deepEqual(escrituras, [["a", "b", "c"]]);
    assert.deepEqual(r.map((g) => g.id), ["id-a", "id-b", "id-c"]);
  });

  it("nunca dos a la vez: lo que llega mientras se escribe va en el siguiente, y no pasa del máximo", async () => {
    const escrituras: string[][] = [];
    let soltar!: () => void;
    const lotes = crearLotes<string>(async (fs) => {
      escrituras.push(fs);
      if (escrituras.length === 1) await new Promise<void>((r) => (soltar = r));
      return new Map(fs.map((f) => [f, hecha(f)]));
    }, (f) => f, { espera: 5, maximo: 2 });
    const primeras = ["a", "b"].map((f) => lotes.guardar(f)); // llena el lote: sale ya
    const despues = ["c", "d", "e"].map((f) => lotes.guardar(f));
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(escrituras.length, 1, "espera a que acabe la primera");
    soltar();
    await Promise.all([...primeras, ...despues]);
    assert.deepEqual(escrituras, [["a", "b"], ["c", "d"], ["e"]]);
  });

  it("si la escritura falla, fallan las de ese lote y el siguiente va bien", async () => {
    let vez = 0;
    const lotes = crearLotes<string>(async (fs) => {
      if (vez++ === 0) throw new Error("Supabase no responde");
      return new Map(fs.map((f) => [f, hecha(f)]));
    }, (f) => f, { espera: 5 });
    await assert.rejects(lotes.guardar("a"), /no responde/);
    assert.equal((await lotes.guardar("b")).id, "b");
  });

  it("la que el lote no devuelve no se da por guardada", async () => {
    const lotes = crearLotes<string>(async () => new Map([["a", hecha("a")]]), (f) => f, { espera: 5 });
    const [a, b] = await Promise.allSettled([lotes.guardar("a"), lotes.guardar("b")]);
    assert.equal(a.status, "fulfilled");
    assert.equal(b.status, "rejected");
  });
});

describe("historia de cada persona (BUL-212)", () => {
  const t0 = Date.parse("2026-04-03T00:30:00Z");

  it("se lee una vez, con horas hacia atrás, y lo siguiente sale de memoria", async () => {
    const lecturas: [number, number][] = [];
    const h = crearHistorias(async (_u, d, a) => {
      lecturas.push([d, a]);
      return [reciente("vieja", t0 - 30 * MIN)];
    });
    const xs = await h.de("ana", t0 - 60 * MIN, t0 + 60 * MIN);
    assert.deepEqual(xs.map((r) => r.clienteId), ["vieja"]);
    h.anotar("ana", reciente("nueva", t0));
    const ys = await h.de("ana", t0 + 5 * MIN - 60 * MIN, t0 + 5 * MIN + 60 * MIN);
    assert.deepEqual(ys.map((r) => r.clienteId), ["vieja", "nueva"]);
    assert.equal(lecturas.length, 1);
    assert.ok(lecturas[0]![0] <= t0 - 3 * 60 * MIN, "lee varias horas hacia atrás");
  });

  it("dos peticiones a la vez esperan a la misma lectura", async () => {
    let n = 0;
    const h = crearHistorias(async () => {
      n++;
      await new Promise((r) => setTimeout(r, 10));
      return [];
    });
    await Promise.all([h.de("ana", t0, t0 + MIN), h.de("ana", t0, t0 + MIN)]);
    assert.equal(n, 1);
  });

  it("si llega una de otra hora, lee lo que falta sin perder lo que aún no está escrito", async () => {
    const lecturas: [number, number][] = [];
    const h = crearHistorias(async (_u, d, a) => {
      lecturas.push([d, a]);
      return lecturas.length === 1 ? [] : [reciente("de-ayer", t0 - 20 * 60 * MIN)];
    });
    await h.de("ana", t0 - 60 * MIN, t0 + 60 * MIN);
    h.anotar("ana", reciente("en-el-lote", t0));
    const xs = await h.de("ana", t0 - 21 * 60 * MIN, t0 - 19 * 60 * MIN);
    assert.deepEqual(xs.map((r) => r.clienteId).sort(), ["de-ayer", "en-el-lote"]);
    assert.equal(lecturas.length, 2);
  });

  it("quitar, olvidar y limpiar", async () => {
    const h = crearHistorias(async () => [], { olvidarTras: 60 * MIN });
    await h.de("ana", t0, t0 + MIN);
    h.anotar("ana", reciente("x", t0));
    h.quitar("ana", "x");
    assert.deepEqual(await h.de("ana", t0, t0 + MIN), []);
    await h.de("luis", t0, t0 + MIN);
    h.olvidar("luis");
    assert.equal(h.cuantas(), 1);
    h.limpiar(Date.now() + 2 * 60 * MIN);
    assert.equal(h.cuantas(), 0);
  });
});

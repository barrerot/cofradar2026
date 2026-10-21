import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { cuenta, reputacion } from "./reputacion.js";

describe("reputación", () => {
  it("quien empieza cuenta", () => {
    assert.equal(reputacion({ consolidadas: 0, contradichas: 0 }), 0.5);
    assert.ok(cuenta({ consolidadas: 0, contradichas: 0 }));
  });

  it("sube despacio", () => {
    assert.ok(Math.abs(reputacion({ consolidadas: 10, contradichas: 0 }) - 0.667) < 0.01);
    assert.ok(reputacion({ consolidadas: 50, contradichas: 0 }) < 0.9);
  });

  it("un fallo aislado no baja nada", () => {
    assert.equal(reputacion({ consolidadas: 0, contradichas: 3 }), 0.5);
    assert.ok(cuenta({ consolidadas: 2, contradichas: 5 }));
  });

  it("un patrón, sí: casi todo lo que dice lo contradicen otros", () => {
    assert.equal(cuenta({ consolidadas: 0, contradichas: 8 }), false);
    assert.equal(cuenta({ consolidadas: 1, contradichas: 9 }), false);
  });

  it("con buen historial hace falta mucho más para caer", () => {
    assert.ok(cuenta({ consolidadas: 30, contradichas: 20 }));
  });
});

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { estadoCofradia, type Aportacion, type SalidaMotor } from "./motor.js";
import { ahoraEnPrograma, msPrograma } from "./tiempo.js";

/**
 * Un recorrido de prueba: 2 km en línea recta hacia el este. La cruz sale a las 00:00 y entra a las
 * 01:40 (100 min); el último paso sale a la 01:00 y entra a las 02:40. Dos pasos: Cristo y Virgen.
 * Las horas, en minutos: así los ejemplos se leen solos.
 */
const MIN = 60_000;
const M_LON = 111_320 * Math.cos((37.39 * Math.PI) / 180);
const LON0 = -6;
const enMetro = (m: number, apartado = 0): [number, number] => [LON0 + m / M_LON, 37.39 + apartado / 110_540];

const salida = (cambios: Partial<SalidaMotor> = {}): SalidaMotor => ({
  id: "prueba",
  pasos: ["Cristo", "Virgen"],
  linea: [enMetro(0), enMetro(1000), enMetro(2000)],
  cruz: [
    { t: 0, m: 0 },
    { t: 100 * MIN, m: 2000 },
  ],
  ultimo: [
    { t: 60 * MIN, m: 0 },
    { t: 160 * MIN, m: 2000 },
  ],
  salida: 0,
  entrada: 160 * MIN,
  estadoAdmin: null,
  ...cambios,
});

let n = 0;
const fe = (usuario: string, min: number, elemento: number | null, metro: number | null, apartado = 0): Aportacion => ({
  id: `a${++n}`,
  usuario,
  t: min * MIN,
  elemento,
  punto: metro === null ? null : enMetro(metro, apartado),
});

const cruz = (e: ReturnType<typeof estadoCofradia>) => e.elementos.find((x) => x.orden === 0);

describe("sin aportaciones: el horario", () => {
  it("antes de la media hora previa está prevista, y es un dato confirmado", () => {
    const e = estadoCofradia(salida(), [], -60 * MIN);
    assert.deepEqual(e.fase, { valor: "prevista", confianza: "confirmado", haceMin: null });
    assert.equal(e.elementos.length, 0);
  });

  it("en la media hora previa, inminente", () => {
    assert.equal(estadoCofradia(salida(), [], -10 * MIN).fase.valor, "inminente");
  });

  it("en la calle según horario: estimado, la cruz donde dice el programa y el paso de en medio repartido", () => {
    const e = estadoCofradia(salida(), [], 50 * MIN);
    assert.deepEqual(e.fase, { valor: "en_calle", confianza: "estimado", haceMin: null });
    assert.equal(cruz(e)?.m, 1000);
    assert.equal(cruz(e)?.confianza, "estimado");
    // El último paso aún no ha salido (sale a la 01:00); el de Cristo, entre la cruz y el templo
    assert.deepEqual(
      e.elementos.map((x) => [x.nombre, x.m]),
      [
        ["Cruz de guía", 1000],
        ["Cristo", 500],
      ],
    );
    assert.deepEqual(e.progreso, { m: 1000, total: 2000 });
  });

  it("la última media hora del último paso, próxima a entrar; después, finalizada", () => {
    assert.equal(estadoCofradia(salida(), [], 140 * MIN).fase.valor, "proxima_entrada");
    assert.equal(estadoCofradia(salida(), [], 170 * MIN).fase.valor, "finalizada");
  });

  it("cancelada solo desde administración", () => {
    const e = estadoCofradia(salida({ estadoAdmin: "cancelada" }), [], 50 * MIN);
    assert.deepEqual(e.fase, { valor: "cancelada", confianza: "confirmado", haceMin: null });
    assert.equal(e.elementos.length, 0);
  });
});

describe("con aportaciones", () => {
  it("una sola no mueve nada: queda sin resolver", () => {
    const a = fe("ana", 50, 0, 600);
    const e = estadoCofradia(salida(), [a], 50 * MIN);
    assert.equal(cruz(e)?.m, 1000);
    assert.equal(e.resultados[a.id], "sin_resolver");
    assert.deepEqual(e.alteraciones, []);
  });

  it("la misma persona dos veces tampoco", () => {
    const e = estadoCofradia(salida(), [fe("ana", 48, 0, 580), fe("ana", 50, 0, 600)], 50 * MIN);
    assert.equal(cruz(e)?.m, 1000);
  });

  it("dos personas que coinciden: la cruz va 20 minutos tarde, confirmado, y el retraso se publica", () => {
    const [a, b] = [fe("ana", 49, 0, 590), fe("benito", 50, 0, 600)];
    const e = estadoCofradia(salida(), [a, b], 50 * MIN);
    assert.ok(Math.abs(cruz(e)!.m - 600) <= 10, `cruz en ${cruz(e)?.m}`);
    assert.equal(cruz(e)?.confianza, "confirmado");
    assert.equal(e.resultados[a.id], "consolidada");
    assert.equal(e.resultados[b.id], "consolidada");
    assert.deepEqual(e.alteraciones, [{ tipo: "retraso", minutos: 20 }]);
    // El resto del cortejo hereda el retraso: la entrada se va a las 03:00
    assert.ok(Math.abs(e.entra! - 180 * MIN) < MIN);
    assert.deepEqual(e.fase, { valor: "en_calle", confianza: "confirmado", haceMin: 0 });
  });

  it("sin más aportaciones, la estimación sigue avanzando con su retraso y envejece", () => {
    const aps = [fe("ana", 49, 0, 590), fe("benito", 50, 0, 600)];
    const e = estadoCofradia(salida(), aps, 75 * MIN);
    // 75 − 20 = 55 min de horario → metro 1100
    assert.ok(Math.abs(cruz(e)!.m - 1100) <= 10);
    assert.equal(cruz(e)?.confianza, "desactualizado");
    assert.equal(cruz(e)?.haceMin, 25);
    // Pasada la media hora ya no se afirma: vuelve a «estimado», pero sigue con el retraso
    const tarde = estadoCofradia(salida(), aps, 90 * MIN);
    assert.equal(cruz(tarde)?.confianza, "estimado");
    assert.ok(Math.abs(cruz(tarde)!.m - 1400) <= 10);
  });

  it("si la gente sigue viendo otra cosa, manda lo más reciente", () => {
    const aps = [fe("ana", 30, 0, 200), fe("benito", 31, 0, 210), fe("carmen", 50, 0, 700), fe("david", 50, 0, 710)];
    const e = estadoCofradia(salida(), aps, 50 * MIN);
    assert.ok(Math.abs(cruz(e)!.m - 705) <= 10);
  });

  it("una que discrepa de un grupo a la vez queda contradicha, sin mover el dato", () => {
    const disidente = fe("eva", 50, 0, 1900);
    const e = estadoCofradia(salida(), [fe("ana", 49, 0, 590), fe("benito", 50, 0, 600), disidente], 50 * MIN);
    assert.equal(e.resultados[disidente.id], "contradicha");
    assert.ok(Math.abs(cruz(e)!.m - 600) <= 10);
  });

  it("lejos del recorrido queda fuera del cálculo de la posición, pero cuenta como presencia", () => {
    const [a, b] = [fe("ana", 49, 0, 600, 300), fe("benito", 50, 0, 600, 300)];
    const e = estadoCofradia(salida(), [a, b], 50 * MIN);
    assert.equal(e.resultados[a.id], "fuera_del_calculo");
    assert.equal(cruz(e)?.m, 1000);
    assert.equal(e.fase.confianza, "confirmado");
  });

  it("«Estoy viendo la cofradía» sin ubicación confirma la fase, nunca la posición", () => {
    const e = estadoCofradia(salida(), [fe("ana", 48, null, null), fe("benito", 49, null, null)], 50 * MIN);
    assert.deepEqual(e.fase, { valor: "en_calle", confianza: "confirmado", haceMin: 1 });
    assert.equal(cruz(e)?.confianza, "estimado");
  });

  it("si la gente la ve antes de su hora, está en la calle aunque el horario diga otra cosa", () => {
    const e = estadoCofradia(salida(), [fe("ana", -14, null, null), fe("benito", -12, null, null)], -10 * MIN);
    assert.equal(e.fase.valor, "en_calle");
  });

  it("un paso nunca adelanta al de delante", () => {
    // Dicen haber visto la Virgen en el metro 1500 cuando la cruz, por horario, va por el 1000
    const e = estadoCofradia(salida(), [fe("ana", 50, 2, 1500), fe("benito", 50, 2, 1500)], 50 * MIN);
    const ms = e.elementos.map((x) => x.m);
    assert.deepEqual(ms, [...ms].sort((a, b) => b - a));
  });

  it("en una calle de ida y vuelta, elige la pasada que casa con la hora", () => {
    // Ida hasta el metro 1000 y vuelta por la misma calle: el punto del metro 300 se pasa dos veces
    const s = salida({
      linea: [enMetro(0), enMetro(1000), enMetro(0, 1)],
      cruz: [
        { t: 0, m: 0 },
        { t: 100 * MIN, m: 2000 },
      ],
    });
    // A los 85 min, la cruz pasa por el metro 300 de vuelta (m = 1700)
    const e = estadoCofradia(s, [fe("ana", 85, 0, 300), fe("benito", 85, 0, 300)], 85 * MIN);
    assert.ok(Math.abs(cruz(e)!.m - 1700) <= 10, `cruz en ${cruz(e)?.m}`);
    assert.deepEqual(e.alteraciones, []);
  });
});

describe("el reloj", () => {
  it("la Madrugá de 2027 es la del programa de 2026", () => {
    // 26 de marzo de 2027, 02:40 en Sevilla (aún es horario de invierno, UTC+1)
    assert.equal(ahoraEnPrograma(new Date("2027-03-26T01:40:00Z"), 2026), msPrograma("2026-04-03T02:40"));
  });

  it("fuera de temporada, «ahora» cae antes de todas las salidas", () => {
    assert.ok(ahoraEnPrograma(new Date("2026-10-21T18:00:00Z"), 2026) < msPrograma("2026-03-27T00:00"));
  });
});

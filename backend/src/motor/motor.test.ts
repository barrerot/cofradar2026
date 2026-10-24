import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { estadoCofradia, olvidarCalculado, type Aportacion, type SalidaMotor } from "./motor.js";
import { ahoraEnPrograma, aReal, msPrograma } from "./tiempo.js";

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

  it("de vuelta a hora real, aunque haya un cambio de hora por medio", () => {
    // Desde octubre (UTC+2), las 00:00 de la Madrugá de 2027 (UTC+1) son las 23:00 UTC del 25
    const instante = new Date("2026-10-22T12:00:00Z");
    const ahora = ahoraEnPrograma(instante, 2026);
    assert.equal(aReal(msPrograma("2026-04-03T00:00"), ahora, instante).toISOString(), "2027-03-25T23:00:00.000Z");
    // Y en plena Madrugá, sin cambio de hora, igual que antes
    const enLaMadruga = new Date("2027-03-26T01:40:00Z");
    assert.equal(aReal(msPrograma("2026-04-03T03:00"), ahoraEnPrograma(enLaMadruga, 2026), enLaMadruga).toISOString(), "2027-03-26T02:00:00.000Z");
  });

  it("fuera de temporada, «ahora» cae antes de todas las salidas", () => {
    assert.ok(ahoraEnPrograma(new Date("2026-10-21T18:00:00Z"), 2026) < msPrograma("2026-03-27T00:00"));
  });
});

describe("bonus de las que consolidan", () => {
  it("las primeras en ver que va 20 minutos tarde: la estimación se había quedado vieja, el máximo", () => {
    const [a, b] = [fe("ana", 49, 0, 590), fe("benito", 50, 0, 600)];
    const e = estadoCofradia(salida(), [a, b], 50 * MIN);
    assert.equal(e.bonus[a.id], 20);
    assert.equal(e.bonus[b.id], 20);
  });

  it("las primeras en situarla, si va a su hora: había poca información", () => {
    const [a, b] = [fe("ana", 50, 0, 1000), fe("benito", 50, 0, 1000)];
    assert.equal(estadoCofradia(salida(), [a, b], 50 * MIN).bonus[a.id], 10);
  });

  it("las que confirman lo que ya se sabía hace un rato: el bonus base", () => {
    const antes = [fe("ana", 30, 0, 200), fe("benito", 30, 0, 200)]; // ya iba 20 min tarde
    const [c, d] = [fe("carmen", 50, 0, 600), fe("david", 50, 0, 600)];
    const e = estadoCofradia(salida(), [...antes, c, d], 50 * MIN);
    assert.equal(e.bonus[c.id], 5);
  });

  it("una sola, sin bonus (todavía)", () => {
    const a = fe("ana", 50, 0, 600);
    assert.equal(estadoCofradia(salida(), [a], 50 * MIN).bonus[a.id], undefined);
  });
});

describe("las otras alteraciones (4.15)", () => {
  const tipos = (e: ReturnType<typeof estadoCofradia>) => e.alteraciones.map((a) => a.tipo);

  it("el retraso se publica de 5 en 5: 12 minutos son 10 y 13 son 15", () => {
    // La cruz debería estar en el metro 800 a los 40 min
    const doce = estadoCofradia(salida(), [fe("ana", 52, 0, 800), fe("luis", 52, 0, 800)], 53 * MIN);
    assert.deepEqual(doce.alteraciones, [{ tipo: "retraso", minutos: 10 }]);
    const trece = estadoCofradia(salida(), [fe("ana", 53, 0, 800), fe("luis", 53, 0, 800)], 54 * MIN);
    assert.deepEqual(trece.alteraciones, [{ tipo: "retraso", minutos: 15 }]);
    // La hora estimada sigue al minuto
    assert.equal(cruz(trece)?.retrasoMin, 13);
  });

  // La cruz, parada en el metro 600 (donde el programa la ponía a los 30 min): a los 40 y a los 60
  const parada = () => [fe("ana", 40, 0, 600), fe("luis", 40, 0, 600), fe("eva", 60, 0, 600), fe("pepe", 60, 0, 600)];

  it("interrumpida: vista en el mismo sitio 20 minutos, y no se estima que avance", () => {
    const e = estadoCofradia(salida(), parada(), 70 * MIN);
    assert.deepEqual(e.alteraciones[0], { tipo: "interrumpida", desde: 40 * MIN });
    assert.equal(cruz(e)?.m, 600);
    assert.deepEqual(e.historial.map((h) => [h.tipo, h.hasta]).sort(), [["interrumpida", null], ["retraso", null]]);
  });

  it("con una sola vez en el sitio no hay interrumpida, solo retraso", () => {
    const e = estadoCofradia(salida(), parada().slice(2), 62 * MIN);
    assert.deepEqual(tipos(e), ["retraso"]);
  });

  it("interrumpida: cuando la ven más adelante se quita, y queda en el historial", () => {
    const sigue = [...parada(), fe("ana", 80, 0, 900), fe("luis", 80, 0, 900)];
    const e = estadoCofradia(salida(), sigue, 82 * MIN);
    assert.ok(!tipos(e).includes("interrumpida"));
    const h = e.historial.find((x) => x.tipo === "interrumpida");
    assert.deepEqual([h?.desde, h?.hasta], [40 * MIN, 80 * MIN]);
  });

  it("cambio de recorrido: dos personas a la vez fuera del recorrido, y hasta dónde se sabía", () => {
    const fuera = [fe("ana", 30, 0, 600), fe("luis", 30, 0, 600), fe("eva", 50, null, 1000, 200), fe("pepe", 51, null, 1030, 200)];
    const e = estadoCofradia(salida(), fuera, 55 * MIN);
    const cambio = e.alteraciones.find((a) => a.tipo === "cambio_recorrido");
    assert.equal(cambio?.desde, 50 * MIN);
    assert.equal(cambio?.mDesde, 600);
    assert.ok(cambio?.fuera);
  });

  it("cambio de recorrido: una sola persona fuera no basta", () => {
    const e = estadoCofradia(salida(), [fe("eva", 50, null, 1000, 200)], 55 * MIN);
    assert.deepEqual(tipos(e), []);
  });

  it("cambio de recorrido: vuelve cuando un elemento consolida en el recorrido, y queda dónde volvió", () => {
    const fuera = [fe("eva", 50, null, 1000, 200), fe("pepe", 51, null, 1030, 200), fe("ana", 70, 0, 1300), fe("luis", 70, 0, 1300)];
    const e = estadoCofradia(salida(), fuera, 72 * MIN);
    assert.ok(!tipos(e).includes("cambio_recorrido"));
    const h = e.historial.find((x) => x.tipo === "cambio_recorrido");
    assert.deepEqual([h?.desde, h?.hasta, h?.mHasta], [50 * MIN, 70 * MIN, 1300]);
  });

  it("un adelanto de 30 minutos o más es regreso anticipado, no adelanto", () => {
    // La cruz debería estar en el metro 1600 a los 80 min: la ven ahí a los 45
    const e = estadoCofradia(salida(), [fe("ana", 45, 0, 1600), fe("luis", 45, 0, 1600)], 46 * MIN);
    assert.deepEqual(tipos(e), ["regreso_anticipado"]);
  });

  it("caso de referencia: sale, se refugia y vuelve antes → finalizada, con interrumpida y regreso anticipado en el historial", () => {
    // Parada en el 600 y, a los 70, la Virgen cerca de la entrada (el programa la ponía ahí a los 155)
    const dia = [...parada(), fe("ana", 70, 2, 1900), fe("luis", 70, 2, 1900)];
    const enCamino = estadoCofradia(salida(), dia, 72 * MIN);
    assert.ok(tipos(enCamino).includes("regreso_anticipado"));
    assert.ok(!tipos(enCamino).includes("interrumpida"));

    const e = estadoCofradia(salida(), dia, 95 * MIN);
    assert.equal(e.fase.valor, "finalizada");
    assert.deepEqual(e.alteraciones, []);
    const h = e.historial.map((x) => x.tipo);
    assert.ok(h.includes("interrumpida") && h.includes("regreso_anticipado"));
    assert.ok(e.historial.every((x) => x.hasta !== null));
  });
});

describe("lo ya calculado (BUL-212)", () => {
  it("calcular cada 30 segundos, recordando lo de antes, da lo mismo que calcularlo todo de nuevo", () => {
    // La cruz se para en el 600 y luego sigue; una aportación llega tarde (teléfono sin conexión)
    const dia = [
      fe("ana", 40, 0, 600),
      fe("luis", 40, 0, 600),
      fe("eva", 60, 0, 600),
      fe("pepe", 60, 0, 600),
      fe("ana", 80, 0, 900),
      fe("luis", 80, 0, 900),
      fe("rosa", 85, 1, 700),
      fe("juan", 86, 1, 700),
    ];
    const tarde = fe("mar", 55, 0, 600);
    for (let t = 30 * MIN; t <= 120 * MIN; t += MIN / 2) {
      const vistas = [...dia, ...(t >= 75 * MIN ? [tarde] : [])].filter((a) => a.t <= t);
      // A los 90 min, Ana y Luis dejan de contar (reputación): sin ellos no hubo interrumpida, tampoco antes
      const cuentan = t === 90 * MIN ? vistas.filter((a) => a.usuario !== "ana" && a.usuario !== "luis") : vistas;
      const recordando = estadoCofradia(salida(), cuentan, t);
      olvidarCalculado();
      const deNuevo = estadoCofradia(salida(), cuentan, t);
      assert.deepEqual(recordando, deNuevo, `a los ${t / MIN} min`);
      // Se vuelve a calcular recordando lo de esta vez, para la siguiente
      estadoCofradia(salida(), cuentan, t);
    }
  });
});

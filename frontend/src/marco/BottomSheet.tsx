import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type PointerEvent as PointerEventReact,
  type ReactNode,
} from "react";
import { Boton } from "./Boton";
import { Icono } from "./Icono";

/**
 * Bottom sheet / panel de ficha (§9.9).
 *
 * Dos comportamientos, y la diferencia la marca el export, no una preferencia:
 *
 *   modo="convive"  sin atenuacion, role="region". Es el de 3-mapa: el mapa
 *                   «sigue visible y operable en asomado y medio», asi que
 *                   poner un scrim lo contradiria. Las capturas de 3-mapa no
 *                   llevan scrim y usan role="region". Es el valor por defecto.
 *
 *   modo="bloquea"  con atenuacion y role="dialog", Esc cierra. Es el de
 *                   1-marco/05, para detalle que si tapa lo de debajo.
 *
 * Para decisiones bloqueantes esto NO es el componente: eso es modal (§9.10).
 *
 * Tres alturas con ajuste por imanes, arrastrable por el tirador. El tirador
 * tambien responde a teclado: sin eso, las alturas solo existirian para quien
 * pueda arrastrar.
 */
export type AlturaSheet = "asomado" | "medio" | "expandido";

/** §9.9 da estos valores como aproximados («~20%», «~55%», «~90%»). */
const ALTURAS: Record<AlturaSheet, number> = {
  asomado: 20,
  medio: 55,
  expandido: 90,
};

const ORDEN: readonly AlturaSheet[] = ["asomado", "medio", "expandido"];

export function BottomSheet({
  abierto,
  titulo,
  children,
  modo = "convive",
  alturaInicial = "asomado",
  anclaje = "sheet",
  alCerrar,
}: {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  modo?: "convive" | "bloquea";
  alturaInicial?: AlturaSheet;
  /** `panel` es el anclaje de lg+: sin alturas ni arrastre (§9.9). */
  anclaje?: "sheet" | "panel";
  alCerrar: () => void;
}) {
  const [altura, setAltura] = useState<AlturaSheet>(alturaInicial);
  const [arrastre, setArrastre] = useState<number | null>(null);

  // Al abrir, el sheet vuelve a su altura de entrada.
  useEffect(() => {
    if (abierto) setAltura(alturaInicial);
  }, [abierto, alturaInicial]);

  // Esc cierra, pero solo cuando bloquea: si el mapa sigue operable, Esc es
  // del mapa, no del sheet.
  useEffect(() => {
    if (!abierto || modo !== "bloquea") return;
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") alCerrar();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [abierto, modo, alCerrar]);

  const mover = useCallback((pasos: number) => {
    setAltura((actual) => {
      const siguiente = ORDEN.indexOf(actual) + pasos;
      return ORDEN[Math.min(Math.max(siguiente, 0), ORDEN.length - 1)] ?? actual;
    });
  }, []);

  if (!abierto) return null;

  if (anclaje === "panel") {
    return (
      <aside className="cf-panel" role="region" aria-label={titulo}>
        <CabeceraSheet titulo={titulo} alCerrar={alCerrar} />
        {children}
      </aside>
    );
  }

  const alto = arrastre ?? ALTURAS[altura];

  /** Arrastre del tirador con ajuste al iman mas cercano al soltar. */
  const alBajarPuntero = (evento: PointerEventReact<HTMLButtonElement>) => {
    evento.currentTarget.setPointerCapture(evento.pointerId);
    const inicioY = evento.clientY;
    const altoInicial = ALTURAS[altura];
    const altoVentana = window.innerHeight;

    const alMover = (e: PointerEvent) => {
      const delta = ((inicioY - e.clientY) / altoVentana) * 100;
      setArrastre(Math.min(Math.max(altoInicial + delta, 10), 95));
    };

    const alSoltar = (e: PointerEvent) => {
      const delta = ((inicioY - e.clientY) / altoVentana) * 100;
      const destino = altoInicial + delta;
      const iman = ORDEN.reduce((mejor, clave) =>
        Math.abs(ALTURAS[clave] - destino) < Math.abs(ALTURAS[mejor] - destino) ? clave : mejor,
      );
      setArrastre(null);
      setAltura(iman);
      document.removeEventListener("pointermove", alMover);
      document.removeEventListener("pointerup", alSoltar);
    };

    document.addEventListener("pointermove", alMover);
    document.addEventListener("pointerup", alSoltar);
  };

  return (
    <>
      {modo === "bloquea" ? (
        <button
          type="button"
          className="cf-marco-scrim cf-scrim"
          aria-label="Cerrar"
          onClick={alCerrar}
        />
      ) : null}

      <div
        className="cf-marco-dock"
        data-entrada={arrastre === null ? "si" : "no"}
        data-arrastre={arrastre === null ? "no" : "si"}
      >
        <div
          className="cf-sheet"
          role={modo === "bloquea" ? "dialog" : "region"}
          aria-modal={modo === "bloquea" ? true : undefined}
          aria-label={titulo}
          data-altura={altura}
          style={{ "--cf-marco-alto-sheet": `${alto}dvh` } as CSSProperties}
        >
          <button
            type="button"
            className="cf-handle"
            aria-label={`Altura del panel: ${altura}`}
            onPointerDown={alBajarPuntero}
            onKeyDown={(evento) => {
              if (evento.key === "ArrowUp") mover(1);
              if (evento.key === "ArrowDown") mover(-1);
            }}
          />
          <CabeceraSheet titulo={titulo} alCerrar={alCerrar} />
          <div className="cf-marco-sheet-cuerpo">{children}</div>
        </div>
      </div>
    </>
  );
}

function CabeceraSheet({ titulo, alCerrar }: { titulo: string; alCerrar: () => void }) {
  return (
    <div className="cf-marco-sheet-cabecera">
      <h2>{titulo}</h2>
      <Boton variante="terciario" tamano="36" onClick={alCerrar}>
        <Icono nombre="cerrar" tamano={16} />
        <span>Cerrar</span>
      </Boton>
    </div>
  );
}

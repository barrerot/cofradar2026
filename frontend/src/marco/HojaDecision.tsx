import { useEffect, useId, useRef, type ReactNode } from "react";
import { EnCapaDelMarco } from "./CapaMarco";

/**
 * La hoja que interrumpe y espera respuesta (README de 8-acceso: «Dar fe,
 * ubicación»): llega hasta abajo y TAPA la barra de navegación, con el fondo
 * oscurecido. No es el BottomSheet: no tiene alturas ni se arrastra, mide lo
 * que su contenido, y la cierra la persona con uno de sus botones, tocando
 * fuera o con Esc.
 *
 * Al abrirse lleva el foco a la primera acción, y al cerrarse lo devuelve a lo
 * que se pulsó para abrirla.
 */
export function HojaDecision({
  abierta,
  titulo,
  icono,
  children,
  acciones,
  nota,
  alCerrar,
}: {
  abierta: boolean;
  titulo: string;
  icono?: ReactNode;
  children?: ReactNode;
  acciones: ReactNode;
  nota?: ReactNode;
  alCerrar: () => void;
}) {
  const id = useId();
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierta) return;
    const antes = document.activeElement as HTMLElement | null;
    caja.current?.querySelector<HTMLElement>(".cf-hoja-decision-acciones button")?.focus();
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
    };
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("keydown", alPulsar);
      antes?.focus?.();
    };
  }, [abierta, alCerrar]);

  if (!abierta) return null;
  return (
    <EnCapaDelMarco>
      <button type="button" className="cf-hoja-decision-scrim cf-scrim" aria-label="Cerrar" tabIndex={-1} onClick={alCerrar} />
      <div ref={caja} className="cf-hoja-decision cf-sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}>
        <span className="cf-handle" aria-hidden="true" />
        {icono ? <div className="cf-hoja-decision-icono">{icono}</div> : null}
        <h2 id={`${id}-t`}>{titulo}</h2>
        {children}
        <div className="cf-hoja-decision-acciones">{acciones}</div>
        {nota ? <p className="cf-hoja-decision-nota">{nota}</p> : null}
      </div>
    </EnCapaDelMarco>
  );
}

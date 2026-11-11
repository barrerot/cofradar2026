import { useContext, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CapaMarco } from "./CapaMarco";

/**
 * La hoja que interrumpe y espera respuesta (README de 8-acceso: «Dar fe,
 * ubicación»): llega hasta abajo y TAPA la barra de navegación, con el fondo
 * oscurecido. No es el BottomSheet: no tiene alturas ni se arrastra, mide lo
 * que su contenido, y la cierra la persona con uno de sus botones, tocando
 * fuera o con Esc.
 *
 * Va en la capa del marco; fuera de una pantalla (la que abre «Dar fe» tras
 * subir de cargo, que vive por encima de las rutas), en el cuerpo.
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
  tituloOculto = false,
  alCerrar,
}: {
  abierta: boolean;
  titulo: string;
  /** El título lo lee el lector de pantalla, pero no se ve (la estampa del álbum ya lo enseña) */
  tituloOculto?: boolean;
  icono?: ReactNode;
  children?: ReactNode;
  acciones: ReactNode;
  nota?: ReactNode;
  alCerrar: () => void;
}) {
  const id = useId();
  const capa = useContext(CapaMarco);
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

  // Dentro del marco, en su capa (en cuanto exista); fuera de todo marco, en el cuerpo
  const destino = capa === undefined ? document.body : capa;
  if (!abierta || !destino) return null;
  return createPortal(
    <>
      <button type="button" className="cf-hoja-decision-scrim cf-scrim" aria-label="Cerrar" tabIndex={-1} onClick={alCerrar} />
      <div ref={caja} className="cf-hoja-decision cf-sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}>
        <span className="cf-handle" aria-hidden="true" />
        {icono ? <div className="cf-hoja-decision-icono">{icono}</div> : null}
        <h2 id={`${id}-t`} className={tituloOculto ? "cf-oculto-visual" : undefined}>
          {titulo}
        </h2>
        {children}
        <div className="cf-hoja-decision-acciones">{acciones}</div>
        {nota ? <p className="cf-hoja-decision-nota">{nota}</p> : null}
      </div>
    </>,
    destino,
  );
}

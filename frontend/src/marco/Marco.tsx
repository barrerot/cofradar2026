import type { CSSProperties, ReactNode } from "react";
import { AvisoSinConexion } from "./AvisoSinConexion";
import { FranjaAccion } from "./FranjaAccion";
import { NavegacionPrincipal } from "./NavegacionPrincipal";
import { useAltoZonaInferior, useAnclajeNavegacion } from "./ganchos";

/**
 * El armazon de la app. Define las zonas y el apilado; no sabe nada del
 * contenido de ninguna de ellas.
 *
 *   area segura superior
 *   cabecera                 sticky, z-sticky   ← la compone cada ruta
 *   aviso sin conexion       solo sin conexion  ← «Sin conexion · ultimo dato hace…»
 *   contenido                z-base, scrollea
 *   franja de accion         z-action           ← solo si hay algo que hacer
 *   navegacion               z-nav              ← nunca se oculta
 *   area segura inferior
 *
 * La barra no se oculta al hacer scroll y eso no se implementa: queda fuera
 * del contenedor que scrollea, asi que no puede ocultarse (§8.2).
 *
 * A partir de lg la navegacion pasa a rail lateral (§8.4). Mismo componente,
 * distinto anclaje.
 */
export function Marco({
  cabecera,
  accion,
  children,
  sheet,
  sangrado,
  registro,
}: {
  /** La cabecera de esta ruta. Normalmente un <Cabecera …/>. */
  cabecera: ReactNode;
  /** Contenido de la franja de accion. Sin esto, la franja no se pinta. */
  accion?: ReactNode;
  children: ReactNode;
  /** Sheet o panel acoplado, si la ruta tiene uno abierto. */
  sheet?: ReactNode;
  /** `completo` quita el padding y el scroll: es lo que necesita el mapa. */
  sangrado?: "completo";
  /**
   * Registro visual (§3). `funcional` es el valor por defecto del sistema y
   * por eso no se escribe: lo lleva todo lo operativo —Inicio, mapa, agenda,
   * horarios, estados—. `editorial` es para identidad: ficha de hermandad,
   * cabeceras de identidad, Mi Cofradar, celebracion tras «Dar fe».
   *
   * Se declara en el contenedor y los componentes HEREDAN. Esta prohibido
   * alternarlo componente a componente: produce la sensacion de dos sistemas
   * de diseno conviviendo.
   */
  registro?: "editorial";
}) {
  const anclaje = useAnclajeNavegacion();
  const { ref, alto } = useAltoZonaInferior<HTMLDivElement>();

  return (
    <div
      className="cf-marco"
      data-register={registro}
      style={{ "--cf-marco-alto-inferior": `${alto}px` } as CSSProperties}
    >
      <a className="cf-salto" href="#contenido">
        Saltar al contenido
      </a>

      {anclaje === "rail" ? (
        <div className="cf-marco-rail">
          <NavegacionPrincipal anclaje="rail" />
        </div>
      ) : null}

      <div className="cf-marco-columna">
        <div className="cf-marco-safe" data-borde="superior" />

        {cabecera}

        <AvisoSinConexion />

        <main id="contenido" className="cf-marco-contenido" data-sangrado={sangrado}>
          {children}
        </main>

        <div className="cf-marco-inferior" ref={ref}>
          <FranjaAccion>{accion}</FranjaAccion>

          {anclaje === "barra" ? (
            <div className="cf-marco-navz">
              <NavegacionPrincipal />
            </div>
          ) : null}

          <div className="cf-marco-safe" data-borde="inferior" />
        </div>
      </div>

      {sheet}
    </div>
  );
}

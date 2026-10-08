import type { ReactNode } from "react";
import { Icono } from "../marco";
import { Contorno } from "./Contorno";

/**
 * Aviso e incidencia: `.cf-notice`.
 *
 * Explica que ha pasado Y que significa para ti. Las dos cosas: un aviso que
 * solo enuncia el hecho obliga a deducir las consecuencias.
 *
 * `.cf-notice` es una rejilla de tres columnas (`auto 1fr auto`): icono,
 * cuerpo y la ranura de descarte. La tercera se pinta vacia cuando el aviso
 * no es descartable, para que el cuerpo no se ensanche al perderla.
 */
export type TipoAviso = "atencion" | "critico" | "informativo";

/** De donde sale el dato. Es propiedad del DATO, nunca juicio sobre nadie. */
export type Procedencia = "cofradar" | "usuarios";

const TRAZO_PROCEDENCIA = {
  cofradar: "procedenciaCofradar",
  usuarios: "procedenciaUsuarios",
} as const;

/**
 * Iconos por tipo, extraidos de la ficha. `critico` comparte glifo con la
 * alteracion `incidencia` y `atencion` con `retraso`: en el export son el
 * mismo triangulo y el mismo reloj.
 */
const TRAZO_TIPO = {
  critico: "critico",
  atencion: "retraso",
  informativo: "informativo",
} as const;

const ETIQUETA_PROCEDENCIA = {
  cofradar: "Publicado por Cofradar",
  usuarios: "Información de usuarios · sin confirmar",
} as const;

export function Aviso({
  tipo,
  titulo,
  cuerpo,
  procedencia = "cofradar",
  accion,
}: {
  tipo: TipoAviso;
  titulo: string;
  cuerpo: string;
  procedencia?: Procedencia;
  accion?: ReactNode;
}) {
  return (
    <div
      className="cf-notice"
      data-tipo={tipo}
      /* El critico no es descartable mientras siga activo y se anuncia solo:
         `alert`. El resto informa sin interrumpir: `status`. */
      role={tipo === "critico" ? "alert" : "status"}
    >
      <Icono nombre={TRAZO_TIPO[tipo]} tamano={20} />

      <div>
        <div className="tt">{titulo}</div>
        <div className="bd">{cuerpo}</div>

        {/* El trazo de la procedencia es discontinuo para `usuarios`: lo hace
            el bundle por `data-procedencia`, via .cf-outline. */}
        <span className="src" data-procedencia={procedencia}>
          <Contorno />
          <Icono nombre={TRAZO_PROCEDENCIA[procedencia]} tamano={16} />
          {ETIQUETA_PROCEDENCIA[procedencia]}
        </span>
      </div>

      {accion ? <div className="acts">{accion}</div> : <span />}
    </div>
  );
}

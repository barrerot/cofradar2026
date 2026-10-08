import type { ReactNode } from "react";
import { Icono } from "../marco";
import type { NombreTrazo } from "../marco";

/**
 * Marca de relacion con una cofradia: `.cf-rel`.
 *
 * Dice que relacion tienes TU con ella, no en que estado esta. Van en el
 * hueco fijo de la izquierda de la tarjeta (`.cf-slot`), que existe tengas
 * relacion o no para que los nombres queden alineados en toda la lista.
 *
 * El bundle no distingue por `data-relacion`: le da a todas el color de marca
 * y un cuadro de 1.5rem. Lo que cambia es el icono. El atributo se escribe
 * igual que en el export, porque es lo que lee quien inspecciona el marcado y
 * es el gancho si alguna relacion pasa a tener color propio.
 */
export type Relacion = "vista" | "seguida" | "dar-fe";
/** Solo aplica a `dar-fe`. */
export type Verificacion = "verificada" | "no-verificable";

/** `seguida` y `vista` se identifican por glifo; `dar-fe`, por relleno. */
function trazo(relacion: Relacion, verificacion?: Verificacion): NombreTrazo {
  if (relacion === "vista") return "vista";
  if (relacion === "seguida") return "seguida";
  return verificacion === "no-verificable" ? "darFeNoVerificable" : "darFeVerificada";
}

const ETIQUETA: Record<Relacion, string> = {
  vista: "Vista",
  seguida: "Seguida",
  "dar-fe": "Has dado fe",
};

/**
 * La etiqueta accesible nunca es negativa (regla de la ficha): de ahi que
 * `no-verificable` NO se traduzca a «no verificada».
 */
export function MarcaRelacion({
  relacion,
  verificacion,
}: {
  relacion: Relacion;
  /**
   * Solo para `dar-fe`. La verificacion es diferencia de FORMA, no de color:
   * `verificada` va en relleno y `no-verificable` en contorno.
   */
  verificacion?: Verificacion;
}) {
  const etiqueta =
    relacion === "dar-fe" && verificacion === "verificada"
      ? `${ETIQUETA[relacion]} · verificada`
      : ETIQUETA[relacion];

  return (
    <span
      className="cf-rel"
      data-relacion={relacion}
      data-verificacion={verificacion}
      role="img"
      aria-label={etiqueta}
    >
      <Icono nombre={trazo(relacion, verificacion)} tamano={16} />
    </span>
  );
}

/**
 * El hueco de la izquierda de la tarjeta. Se pinta SIEMPRE, con marca o sin
 * ella: es lo que mantiene los nombres a la misma sangria (§9.4).
 */
export function HuecoRelacion({ children }: { children?: ReactNode }) {
  return <span className="cf-slot">{children}</span>;
}

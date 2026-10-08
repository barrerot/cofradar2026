import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Variantes y tamanos tal como los declara bundle.css (§9.1). */
export type VarianteBoton = "primario" | "secundario" | "terciario" | "peligro";
export type TamanoBoton = "36" | "44" | "52";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variante?: VarianteBoton;
  /** 44 es la altura por defecto de .cf-btn y no lleva atributo. */
  tamano?: TamanoBoton;
  cargando?: boolean;
  children: ReactNode;
};

/**
 * Envoltorio fino de `.cf-btn`. No anade estilo propio: traduce props a los
 * atributos de datos que el design system ya entiende.
 *
 * Los estados van como `data-state`, no como clases (regla dura de §4). El
 * area tactil de 48px la garantiza el ::before de .cf-btn aunque el boton
 * mida 36, asi que aqui no se toca.
 */
export function Boton({
  variante = "secundario",
  tamano = "44",
  cargando = false,
  disabled,
  children,
  ...resto
}: Props) {
  return (
    <button
      className="cf-btn"
      type="button"
      data-variant={variante}
      {...(tamano === "44" ? {} : { "data-size": tamano })}
      {...(cargando ? { "data-state": "loading", "aria-busy": true } : {})}
      disabled={disabled ?? cargando}
      {...resto}
    >
      {children}
    </button>
  );
}

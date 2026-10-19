import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Boton } from "./Boton";
import { Cabecera } from "./Cabecera";
import { Icono } from "./Icono";
import { Marco } from "./Marco";

/**
 * Pantalla secundaria: la ficha de una cofradia, un detalle, un ajuste.
 *
 * Lo que cambia respecto a una raiz es SOLO la cabecera: vuelta al origen
 * nombrado y titulo en serif en su propia fila. La navegacion inferior sigue
 * ahi —comprobado en 1-marco/04— porque la barra no se oculta nunca y el
 * usuario no queda atrapado en una rama.
 *
 * La vuelta lleva el nombre del sitio al que vuelve, no un «Atras» pelado:
 * el export rotula el boton «Cofradias» en la ficha de La Macarena.
 */
export function PantallaSecundaria({
  titulo,
  vuelta,
  acciones,
  accion,
  children,
  sheet,
  registro,
}: {
  titulo: string;
  /** A donde vuelve y como se llama ese sitio. */
  vuelta: { etiqueta: string; ruta?: string };
  acciones?: ReactNode;
  accion?: ReactNode;
  children: ReactNode;
  sheet?: ReactNode;
  /** §3. La ficha de hermandad va en `editorial`. */
  registro?: "editorial";
}) {
  const navegar = useNavigate();

  return (
    <Marco
      accion={accion}
      sheet={sheet}
      registro={registro}
      cabecera={
        <Cabecera
          etiqueta="Cabecera de pantalla secundaria"
          titulo={titulo}
          acciones={acciones}
          principal={
            <Boton
              variante="secundario"
              tamano="36"
              onClick={() => (vuelta.ruta ? navegar(vuelta.ruta) : navegar(-1))}
            >
              <Icono nombre="flechaIzquierda" tamano={16} />
              <span>{vuelta.etiqueta}</span>
            </Boton>
          }
        />
      }
    >
      {children}
    </Marco>
  );
}

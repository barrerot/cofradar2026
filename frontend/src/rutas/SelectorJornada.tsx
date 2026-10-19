import { Boton, Icono } from "../marco";
import { useJornada } from "../datos/jornada";

/**
 * La jornada consultada, arriba a la izquierda en todas las áreas (§8.2). Al
 * tocarla abre la hoja «Elegir jornada» (P-06, issue 1.6); hasta entonces el
 * botón solo declara que abre un diálogo, como en el export.
 *
 * Vive en rutas/ y no en marco/: el marco no sabe que existe una jornada.
 *
 * Antes de que lleguen las jornadas, y si no hay ninguna guardada, dice
 * «Jornada»: nunca un nombre inventado.
 */
export function SelectorJornada() {
  const { consultada } = useJornada();

  return (
    <Boton variante="secundario" tamano="36" aria-haspopup="dialog" data-jornada="">
      <span>{consultada?.nombre ?? "Jornada"}</span>
      <Icono nombre="chevronAbajo" tamano={16} />
    </Boton>
  );
}

import { useState } from "react";
import { BottomSheet, Boton, EnCapaDelMarco, Icono } from "../marco";
import { useJornada, type Jornada } from "../datos/jornada";

/**
 * La jornada consultada, arriba a la izquierda en todas las áreas (§8.2), y la
 * hoja P-06 «Elegir jornada» que abre al tocarla (2-inicio/inicio-elegir-jornada).
 *
 * La hoja lista las once jornadas con su fecha: ✓ y negrita en la consultada,
 * la etiqueta «hoy» en la de hoy (fuera de temporada, en ninguna). Elegir una
 * cambia la cabecera y lo que muestran las áreas, y cierra la hoja.
 *
 * Vive en rutas/ y no en marco/: el marco no sabe que existe una jornada.
 * Antes de que lleguen las jornadas, y si no hay ninguna guardada, el botón
 * dice «Jornada»: nunca un nombre inventado.
 */
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «2026-03-27» → «27 mar». */
function fechaCorta(fecha: string | null): string {
  if (!fecha) return "";
  const [, mes, dia] = fecha.split("-").map(Number);
  return `${dia} ${MESES[(mes ?? 1) - 1]}`;
}

export function SelectorJornada() {
  const { jornadas, consultada, hoy, elegir } = useJornada();
  const [abierta, setAbierta] = useState(false);
  const lista = [...(jornadas.datos ?? [])].sort((a, b) => a.orden - b.orden);

  const alElegir = (j: Jornada) => {
    elegir(j.id);
    setAbierta(false);
  };

  return (
    <>
      <Boton
        variante="secundario"
        tamano="36"
        aria-haspopup="dialog"
        aria-expanded={abierta}
        data-jornada=""
        onClick={() => setAbierta(true)}
      >
        <span>{consultada?.nombre ?? "Jornada"}</span>
        <Icono nombre="chevronAbajo" tamano={16} />
      </Boton>

      <EnCapaDelMarco>
        <BottomSheet
          abierto={abierta}
          titulo="Jornada"
          modo="bloquea"
          alturaInicial="expandido"
          alCerrar={() => setAbierta(false)}
        >
          <div className="cf-jornadas" role="radiogroup" aria-label="Jornada">
            {lista.map((j) => {
              const marcada = j.id === consultada?.id;
              return (
                <button
                  key={j.id}
                  type="button"
                  role="radio"
                  aria-checked={marcada}
                  className="cf-jornadas-opcion"
                  onClick={() => alElegir(j)}
                >
                  <span className="cf-jornadas-marca">{marcada ? <Icono nombre="check" tamano={20} /> : null}</span>
                  <span className="cf-jornadas-nombre">
                    {j.nombre}
                    {j.id === hoy?.id ? <span className="cf-jornadas-hoy">hoy</span> : null}
                  </span>
                  <span className="cf-jornadas-fecha">{fechaCorta(j.fecha)}</span>
                </button>
              );
            })}
          </div>
        </BottomSheet>
      </EnCapaDelMarco>
    </>
  );
}

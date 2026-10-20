import { useState } from "react";
import { usePedirUbicacion } from "../componentes";
import { BottomSheet, Boton, Cabecera, Icono, Marco } from "../marco";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { Relleno } from "./Relleno";
import { SelectorJornada } from "./SelectorJornada";

/**
 * Mapa · «¿Donde esta la cruz de guia y donde estan los pasos?»
 *
 * La cartografia es OpenStreetMap con MapLibre (D36) y llega en la fase 4
 * (P-07); aqui hay el hueco con sangrado completo que el mapa ocupara y un
 * boton de andamio para abrir la hoja inferior y revisar el marco.
 *
 * El sheet va en modo `convive`: sin atenuacion y role="region", porque el
 * mapa «sigue visible y operable en asomado y medio» (§9.9), y las capturas
 * de 3-mapa no llevan scrim.
 *
 * «Centrar en mi ubicación» (P-04, 8-acceso/acceso-4a) ya es de verdad: es lo
 * que pide la ubicación en el mapa, nunca al abrirlo. Si la persona dijo que
 * no o el navegador la tiene bloqueada, el botón no aparece (mapa-1a). Centrar
 * de verdad llega con el mapa.
 */
export function Mapa({ estado }: { estado: EstadoJornada }) {
  const [fichaAbierta, setFichaAbierta] = useState(false);
  const { ubicacion, solicitar, hoja } = usePedirUbicacion({
    nota: "Tu posición no sale de tu teléfono para dibujar el mapa.",
  });
  const conCentrar =
    (ubicacion.estado === "no-permitida" && !ubicacion.rechazada) || ubicacion.estado === "permitida";

  return (
    <Marco
      sangrado="completo"
      cabecera={
        <Cabecera principal={<SelectorJornada />} />
      }
      accion={estado.activa ? <DarFe /> : undefined}
      sheet={
        <BottomSheet
          abierto={fichaAbierta}
          titulo="La Macarena"
          modo="convive"
          alturaInicial="asomado"
          alCerrar={() => setFichaAbierta(false)}
        >
          <Relleno>Vista rápida de la cofradía</Relleno>
        </BottomSheet>
      }
    >
      <div className="cf-mapa-hueco">
        <Relleno>Mapa · llega en la fase 4</Relleno>
        {conCentrar ? (
          <button
            type="button"
            className="cf-locate"
            aria-label="Centrar en mi ubicación"
            // 4.4: al concederla, centrar el mapa en la posición
            onClick={() => solicitar()}
          >
            <Icono nombre="centrar" tamano={24} />
          </button>
        ) : null}
      </div>
      {hoja}
      <Boton variante="secundario" onClick={() => setFichaAbierta(true)}>
        Abrir la hoja inferior (ejemplo)
      </Boton>
    </Marco>
  );
}

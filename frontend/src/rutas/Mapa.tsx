import { useState } from "react";
import { BottomSheet, Boton, Cabecera, Marco } from "../marco";
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
 */
export function Mapa({ estado }: { estado: EstadoJornada }) {
  const [fichaAbierta, setFichaAbierta] = useState(false);

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
      <Relleno>Mapa · llega en la fase 4</Relleno>
      <Boton variante="secundario" onClick={() => setFichaAbierta(true)}>
        Abrir la hoja inferior (ejemplo)
      </Boton>
    </Marco>
  );
}

import { useState } from "react";
import { BottomSheet, Boton, Cabecera, Icono, Marco } from "../marco";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { Relleno } from "./Relleno";

/**
 * Mapa · «¿Donde esta la cruz de guia y donde estan los pasos?»
 *
 * El proveedor de cartografia NO esta decidido (§10.1 y §21: Google Maps
 * Platform u OpenStreetMap + MapLibre), asi que aqui no hay mapa: hay el
 * hueco con sangrado completo que el mapa ocupara.
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
        <Cabecera
          sincronizacion={estado.sincronizacion}
          principal={
            <Boton variante="secundario" tamano="36" aria-haspopup="dialog">
              <span>{estado.jornada.nombre}</span>
              <Icono nombre="chevronAbajo" tamano={16} />
            </Boton>
          }
          acciones={
            <Boton variante="terciario" tamano="36" onClick={() => setFichaAbierta(true)}>
              <Icono nombre="buscar" tamano={16} />
              <span>Buscar</span>
            </Boton>
          }
        />
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
      <Relleno>Mapa · cartografía por decidir</Relleno>
    </Marco>
  );
}

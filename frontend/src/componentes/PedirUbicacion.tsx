import { useCallback, useState, type ReactNode } from "react";
import { Boton, HojaDecision, Icono } from "../marco";
import { PARA_QUE_UBICACION, useUbicacion, type Ubicacion } from "../datos/ubicacion";

/**
 * P-04 Permiso de ubicación (8-acceso/acceso-4a, 4b y 4c; F-48).
 *
 * La ubicación se pide en contexto, cuando la persona toca algo que la
 * necesita («Centrar en mi ubicación», «cerca de ti»…), nunca al arrancar.
 * Quien la necesita llama a `solicitar(seguir)` y pinta `hoja`:
 *
 *   permitida      `seguir` al momento, sin hoja
 *   no permitida   4b «¿Usar tu ubicación?». «Permitir» lanza el aviso del
 *                  navegador y, si dice que sí, `seguir`. «Ahora no» cierra la
 *                  hoja y todo sigue igual: puede volver a tocarlo.
 *   bloqueada      4c, que solo explica: sin pasos de ningún navegador
 *   no disponible  nada: Cofradar funciona igual
 *
 * Si en el aviso del navegador dice que no, `ubicacion.rechazada` pasa a
 * verdadero y quien pinta el botón lo quita (no se insiste). Desde Ajustes,
 * «Permitir» lanza el aviso directamente, sin esta hoja.
 */
export function usePedirUbicacion({ nota }: { nota?: ReactNode } = {}): {
  ubicacion: Ubicacion;
  solicitar: (seguir?: () => void) => void;
  hoja: ReactNode;
} {
  const ubicacion = useUbicacion();
  const [abierta, setAbierta] = useState<null | { tipo: "pedir" | "bloqueada"; seguir?: () => void }>(null);
  const cerrar = useCallback(() => setAbierta(null), []);

  const solicitar = (seguir?: () => void) => {
    if (ubicacion.estado === "permitida") seguir?.();
    else if (ubicacion.estado === "bloqueada") setAbierta({ tipo: "bloqueada" });
    else if (ubicacion.estado === "no-permitida") setAbierta({ tipo: "pedir", seguir });
  };

  const permitir = () => {
    const seguir = abierta?.seguir;
    setAbierta(null);
    ubicacion.pedir(seguir);
  };

  const icono = <Icono nombre="ubicacion" tamano={24} />;
  const hoja =
    abierta?.tipo === "bloqueada" ? (
      <HojaDecision
        abierta
        icono={icono}
        titulo="Tu navegador tiene bloqueada la ubicación para Cofradar."
        alCerrar={cerrar}
        acciones={
          <Boton variante="primario" tamano="52" onClick={cerrar}>
            Entendido
          </Boton>
        }
      >
        <p>Puedes cambiarlo en sus permisos. Sin ella, Cofradar funciona igual y puedes dar fe.</p>
      </HojaDecision>
    ) : (
      <HojaDecision
        abierta={abierta?.tipo === "pedir"}
        icono={icono}
        titulo="¿Usar tu ubicación?"
        alCerrar={cerrar}
        nota={nota}
        acciones={
          <>
            <Boton variante="primario" tamano="52" onClick={permitir}>
              Permitir
            </Boton>
            <Boton variante="secundario" tamano="52" onClick={cerrar}>
              Ahora no
            </Boton>
          </>
        }
      >
        <p>{PARA_QUE_UBICACION}</p>
      </HojaDecision>
    );

  return { ubicacion, solicitar, hoja };
}

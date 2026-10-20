import { useEffect, useRef } from "react";
import { Icono } from "../marco";
import { useSesion } from "../datos/sesion";

/**
 * Aviso de vuelta de Google (P-03; 8-acceso/acceso-3b y acceso-3c).
 *
 * Lo pinta la pantalla que pidió la cuenta, solo para SU `motivo`:
 *   entrado     «Has entrado con tu cuenta de Google.» Se va solo.
 *   no-entrado  azul, nunca rojo ni «error»: lo que la persona iba a hacer
 *               sigue ahí. Se queda hasta que se cierra o se vuelve a intentar.
 *
 * Al aparecer se trae a la vista: al volver de Google el navegador restaura el
 * desplazamiento, y la persona puede estar abajo, junto al botón que pulsó.
 *
 * Quien retoma una acción (seguir, dar fe…) puede pasar sus textos.
 */
const SE_VA_SOLO_MS = 6000;

export function AvisoEntrada({
  motivo,
  entrado = "Has entrado con tu cuenta de Google.",
  noEntrado = "No has entrado con Google. Todo sigue igual.",
}: {
  motivo: string;
  entrado?: string;
  noEntrado?: string;
}) {
  const { entrada, olvidarEntrada } = useSesion();
  const mio = entrada?.motivo === motivo ? entrada : null;
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mio) return;
    // Un fotograma después, para ir detrás de la restauración del desplazamiento
    const id = window.requestAnimationFrame(() => caja.current?.scrollIntoView({ block: "nearest" }));
    return () => window.cancelAnimationFrame(id);
  }, [mio]);

  useEffect(() => {
    if (mio?.resultado !== "entrado") return;
    const id = window.setTimeout(olvidarEntrada, SE_VA_SOLO_MS);
    return () => window.clearTimeout(id);
  }, [mio, olvidarEntrada]);

  if (!mio) return null;
  return (
    <div ref={caja} className="cf-aviso-entrada" role="status">
      <Icono nombre="informativo" tamano={20} />
      <p>{mio.resultado === "entrado" ? entrado : noEntrado}</p>
      <button type="button" aria-label="Cerrar aviso" onClick={olvidarEntrada}>
        <Icono nombre="cerrar" tamano={20} />
      </button>
    </div>
  );
}

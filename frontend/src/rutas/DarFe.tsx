import { Boton, Icono } from "../marco";
import { useActividad } from "../datos/actividad";
import { useDarFe } from "./FlujoDarFe";

/**
 * «Dar fe» en la franja de acción: aparece cuando hay cofradías en la calle (§8.3) y abre el flujo
 * (FlujoDarFe.tsx). Desde la ficha o el recorrido de una cofradía lleva su `cofradia`, y el flujo se
 * salta «¿Qué cofradía?», pero solo si esa cofradía sale hoy: si no, se elige de la lista como siempre.
 * Con `elemento` (uno que se ha tocado en el mapa) va directo a «¿Das fe de esto?».
 */
export function DarFe({ cofradia, elemento }: { cofradia?: string; elemento?: number }) {
  const { abrir } = useDarFe();
  const { salidas } = useActividad();
  const deHoy = cofradia && salidas.some((s) => s.id === cofradia) ? cofradia : undefined;
  return (
    <Boton variante="primario" tamano="36" onClick={() => abrir(deHoy, deHoy ? elemento : undefined)}>
      <Icono nombre="ojo" tamano={20} />
      <span>Dar fe</span>
    </Boton>
  );
}

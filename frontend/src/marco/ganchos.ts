import { useEffect, useRef, useState } from "react";

/**
 * Mide la zona inferior (franja + barra + area segura) y publica su alto en
 * `--cf-marco-alto-inferior`.
 *
 * El export acopla el sheet con `bottom:90px` a mano. 90px es la suma de esa
 * pantalla concreta: deja de valer en cuanto la franja desaparece, el area
 * segura cambia de dispositivo o el texto crece por ajuste de tamano. Medir
 * en vivo cuesta un ResizeObserver y no vuelve a fallar.
 */
export function useAltoZonaInferior<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [alto, setAlto] = useState(0);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    const observador = new ResizeObserver((entradas) => {
      const entrada = entradas[0];
      if (entrada) setAlto(entrada.contentRect.height);
    });
    observador.observe(nodo);
    setAlto(nodo.getBoundingClientRect().height);

    return () => observador.disconnect();
  }, []);

  return { ref, alto };
}

/**
 * Anclaje de la navegacion segun el espacio disponible (§8.4).
 *
 * `base`/`md` → barra inferior · `lg`/`xl` → rail lateral. Se decide en JS y
 * no en CSS a proposito: con CSS habria que pintar las dos y dejar dos <nav>
 * en el arbol, y eso es un problema de accesibilidad, no un detalle.
 *
 * El breakpoint esta duplicado respecto a marco.css. Es el unico sitio donde
 * ocurre y va anotado en los dos lados; design.md §4.9 da 1024px como valor
 * candidato, asi que cambiara a la vez en ambos.
 */
const CONSULTA_RAIL = "(min-width: 64rem)"; /* lg · ver marco.css */

export function useAnclajeNavegacion(): "barra" | "rail" {
  const [esRail, setEsRail] = useState(
    () => typeof window !== "undefined" && window.matchMedia(CONSULTA_RAIL).matches,
  );

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_RAIL);
    const alCambiar = (evento: MediaQueryListEvent) => setEsRail(evento.matches);
    consulta.addEventListener("change", alCambiar);
    setEsRail(consulta.matches);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  return esRail ? "rail" : "barra";
}

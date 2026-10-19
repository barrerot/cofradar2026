import { useNavigate } from "react-router-dom";
import { guardar } from "../datos/almacen";
import { Boton } from "../marco";
import { Relleno } from "./Relleno";

/**
 * P-02 Introducción · ANDAMIO hasta la issue 2.2.
 *
 * La primera vez que se abre Cofradar por la portada, el arranque da paso
 * aquí (8-acceso/acceso-2). La pantalla de verdad es editorial, con tres ideas
 * y un único botón, «Empezar», sin «Saltar». De momento solo existe el botón,
 * para que el recorrido de la primera vez funcione de punta a punta.
 */
export function Introduccion() {
  const navegar = useNavigate();

  return (
    <main className="cf-introduccion" data-register="editorial">
      <Relleno>Introducción · P-02, issue 2.2</Relleno>
      <Boton
        variante="primario"
        onClick={() => {
          guardar("introduccion-vista", true);
          navegar("/", { replace: true });
        }}
      >
        Empezar
      </Boton>
    </main>
  );
}

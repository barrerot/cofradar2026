import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { leer } from "./datos/almacen";
import { leerEstadoJornada } from "./fixture";
import { Agenda } from "./rutas/Agenda";
import { Ajustes } from "./rutas/Ajustes";
import { Ayuda } from "./rutas/Ayuda";
import { Cofradias } from "./rutas/Cofradias";
import { Estados } from "./rutas/Estados";
import { FichaCofradia } from "./rutas/FichaCofradia";
import { Recorrido } from "./rutas/Recorrido";
import { Inicio } from "./rutas/Inicio";
import { Introduccion } from "./rutas/Introduccion";
import { Mapa } from "./rutas/Mapa";
import { MiCofradar } from "./rutas/MiCofradar";
import { AvisoLegal, Privacidad } from "./rutas/Privacidad";

/**
 * Las cinco areas, en el orden en que viven en la barra.
 *
 * El estado de jornada baja por props desde aqui porque el marco entero
 * depende de el: decide si aparece la franja de accion (§8.3). Cuando haya
 * motor, esto sale del backend; hoy es fixture.
 */
export function App() {
  const { search } = useLocation();
  const estado = leerEstadoJornada(queryEfectiva(search));

  return (
    <Routes>
      {/* La primera vez que se entra por la portada, el arranque (P-01) da paso a
          la Introducción (P-02). Un enlace directo a una cofradía no la impone. */}
      <Route
        path="/"
        element={leer("introduccion-vista") ? <Inicio estado={estado} /> : <Navigate to="/introduccion" replace />}
      />
      <Route path="/introduccion" element={<Introduccion />} />
      <Route path="/mapa" element={<Mapa estado={estado} />} />
      <Route path="/cofradias" element={<Cofradias estado={estado} />} />
      <Route path="/cofradias/:id" element={<FichaCofradia estado={estado} />} />
      <Route path="/cofradias/:id/recorrido" element={<Recorrido />} />
      <Route path="/agenda" element={<Agenda estado={estado} />} />
      <Route path="/mi-cofradar" element={<MiCofradar />} />
      <Route path="/mi-cofradar/ajustes" element={<Ajustes estado={estado} />} />
      <Route path="/mi-cofradar/ajustes/privacidad" element={<Privacidad desde="ajustes" />} />
      <Route path="/mi-cofradar/ayuda" element={<Ayuda estado={estado} />} />
      <Route path="/mi-cofradar/ayuda/privacidad" element={<Privacidad desde="ayuda" />} />
      <Route path="/mi-cofradar/ayuda/aviso-legal" element={<AvisoLegal />} />
      {/* Andamio de revisión: los ocho estados (issue 1.4). */}
      <Route path="/estados" element={<Estados />} />
    </Routes>
  );
}

/**
 * La query de la que salen los interruptores del fixture.
 *
 * `useLocation().search` es relativo al ROUTER, y con enrutado de hash eso
 * significa lo que haya detras del «#». Pero `?tema=` lo lee tema.ts de
 * `window.location.search`, que es lo de delante. Sin esto, en la demo
 * compilada con hash habria que saber de memoria a que lado del «#» va cada
 * parametro, y la mitad de los enlaces no harian nada.
 *
 * Se unen los dos lados y gana el del router, que es el que el usuario
 * cambia navegando.
 */
function queryEfectiva(deRouter: string): string {
  const parametros = new URLSearchParams(window.location.search);
  for (const [clave, valor] of new URLSearchParams(deRouter)) {
    parametros.set(clave, valor);
  }
  return parametros.toString();
}

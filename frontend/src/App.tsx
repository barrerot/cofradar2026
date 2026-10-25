import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useActividad } from "./datos/actividad";
import { useContarApertura } from "./datos/aperturas";
import { tocaIntroduccion } from "./datos/introduccion";
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
import { Cuenta } from "./rutas/Cuenta";
import { EliminarCuenta } from "./rutas/EliminarCuenta";
import { MisAportaciones } from "./rutas/MisAportaciones";
import { Seguidas } from "./rutas/Seguidas";
import { Coleccion } from "./rutas/Coleccion";
import { AvisoLegal, Privacidad } from "./rutas/Privacidad";
import { Panel } from "./rutas/admin/Panel";

/**
 * Las cinco areas, en el orden en que viven en la barra.
 *
 * El estado de jornada baja por props desde aqui porque el marco entero
 * depende de el: decide si aparece la franja de accion (§8.3). Hoy sale del
 * horario del programa (datos/actividad.tsx); con el motor, del backend.
 */
export function App() {
  const { search, pathname } = useLocation();
  const { intensidad } = useActividad();
  // El panel no cuenta como abrir Cofradar
  useContarApertura(!pathname.startsWith("/admin"));
  const estado = leerEstadoJornada(queryEfectiva(search), intensidad);

  return (
    <Routes>
      {/* En cada visita nueva por la portada, el arranque (P-01) da paso a la
          Introducción (P-02), salvo «No volver a mostrar» (datos/introduccion.ts).
          Un enlace directo a una cofradía no la impone. */}
      <Route
        path="/"
        element={!tocaIntroduccion() ? <Inicio estado={estado} /> : <Navigate to="/introduccion" replace />}
      />
      <Route path="/introduccion" element={<Introduccion />} />
      <Route path="/mapa" element={<Mapa estado={estado} />} />
      <Route path="/cofradias" element={<Cofradias estado={estado} />} />
      <Route path="/cofradias/:id" element={<FichaCofradia estado={estado} />} />
      <Route path="/cofradias/:id/recorrido" element={<Recorrido estado={estado} />} />
      <Route path="/agenda" element={<Agenda estado={estado} />} />
      <Route path="/mi-cofradar" element={<MiCofradar estado={estado} />} />
      <Route path="/mi-cofradar/seguidas" element={<Seguidas estado={estado} />} />
      <Route path="/mi-cofradar/coleccion" element={<Coleccion estado={estado} />} />
      <Route path="/mi-cofradar/aportaciones" element={<MisAportaciones estado={estado} />} />
      <Route path="/mi-cofradar/cuenta" element={<Cuenta />} />
      <Route path="/mi-cofradar/cuenta/eliminar" element={<EliminarCuenta />} />
      <Route path="/mi-cofradar/ajustes" element={<Ajustes estado={estado} />} />
      <Route path="/mi-cofradar/ajustes/privacidad" element={<Privacidad desde="ajustes" />} />
      <Route path="/mi-cofradar/ayuda" element={<Ayuda estado={estado} />} />
      <Route path="/mi-cofradar/ayuda/privacidad" element={<Privacidad desde="ayuda" />} />
      <Route path="/mi-cofradar/ayuda/aviso-legal" element={<AvisoLegal />} />
      {/* El panel de administración (fase 5): fuera del marco de la app */}
      <Route path="/admin/*" element={<Panel />} />
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

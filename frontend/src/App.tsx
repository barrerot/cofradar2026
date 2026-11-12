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
import { Trivial } from "./rutas/Trivial";
import { RedirigirInvitacion, TrivialAlias, TrivialHistorial, TrivialInvitacion, TrivialInvitar, TrivialPartida, TrivialPortada, TrivialVestibulo } from "./rutas/TrivialOnline";
import { RedirigirReto, TrivialReto } from "./rutas/RetoTrivial";
import { PreguntaDelDia, RedirigirDia } from "./rutas/PreguntaDelDia";
import { CrearCuadrilla, InvitacionCuadrilla, InvitarCuadrilla, LaCuadrilla, RedirigirCuadrilla, TusCuadrillas } from "./rutas/Cuadrillas";
import { Album } from "./rutas/Album";
import { TuCargo } from "./rutas/Cargo";
import { SemanaSantaDe, TuSemanaSanta } from "./rutas/TuSemanaSanta";
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
      <Route path="/cofradias/:id/trivial" element={<Trivial estado={estado} />} />
      <Route path="/agenda" element={<Agenda estado={estado} />} />
      <Route path="/mi-cofradar" element={<MiCofradar estado={estado} />} />
      <Route path="/mi-cofradar/seguidas" element={<Seguidas estado={estado} />} />
      <Route path="/mi-cofradar/coleccion" element={<Coleccion estado={estado} />} />
      <Route path="/mi-cofradar/aportaciones" element={<MisAportaciones estado={estado} />} />
      <Route path="/mi-cofradar/trivial" element={<TrivialPortada estado={estado} />} />
      <Route path="/mi-cofradar/trivial/solo" element={<Trivial estado={estado} />} />
      <Route path="/mi-cofradar/trivial/online" element={<TrivialVestibulo estado={estado} />} />
      <Route path="/mi-cofradar/trivial/online/:id" element={<TrivialPartida estado={estado} />} />
      <Route path="/mi-cofradar/trivial/online/:id/historial" element={<TrivialHistorial estado={estado} />} />
      <Route path="/mi-cofradar/trivial/alias" element={<TrivialAlias estado={estado} />} />
      <Route path="/mi-cofradar/trivial/invitar/:token" element={<TrivialInvitar estado={estado} />} />
      <Route path="/mi-cofradar/trivial/i/:token" element={<TrivialInvitacion estado={estado} />} />
      <Route path="/trivial/i/:token" element={<RedirigirInvitacion />} />
      <Route path="/mi-cofradar/trivial/reto/:id" element={<TrivialReto estado={estado} />} />
      <Route path="/trivial/r/:id" element={<RedirigirReto />} />
      <Route path="/mi-cofradar/trivial/dia" element={<PreguntaDelDia estado={estado} />} />
      <Route path="/dia" element={<RedirigirDia />} />
      <Route path="/mi-cofradar/album" element={<Album estado={estado} />} />
      <Route path="/mi-cofradar/cargo" element={<TuCargo estado={estado} />} />
      <Route path="/mi-cofradar/semana-santa" element={<TuSemanaSanta estado={estado} />} />
      <Route path="/mi-cofradar/semana-santa/:anio" element={<SemanaSantaDe estado={estado} />} />
      <Route path="/mi-cofradar/cuadrillas" element={<TusCuadrillas estado={estado} />} />
      <Route path="/mi-cofradar/cuadrillas/nueva" element={<CrearCuadrilla estado={estado} />} />
      <Route path="/mi-cofradar/cuadrillas/i/:token" element={<InvitacionCuadrilla estado={estado} />} />
      <Route path="/mi-cofradar/cuadrillas/:id" element={<LaCuadrilla estado={estado} />} />
      <Route path="/mi-cofradar/cuadrillas/:id/invitar" element={<InvitarCuadrilla estado={estado} />} />
      <Route path="/c/:token" element={<RedirigirCuadrilla />} />
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

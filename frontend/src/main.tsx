import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { App } from "./App";
import { JornadaProvider } from "./datos/jornada";
import { SincronizacionProvider } from "./datos/sincronizacion";
import { registrarServiceWorker } from "./pwa";
import { iniciarTema } from "./tema";

/* Orden de carga deliberado: base primero, para que cualquier regla de
   componente del design system gane sobre ella. bundle.css es generado y no
   se edita; marco.css es nuestro. */
import "./estilos/base.css";
import "./estilos/bundle.css";
import "./estilos/marco.css";
import "./estilos/listas.css";
import "./estilos/inicio.css";
import "./estilos/cofradias.css";
import "./estilos/relleno.css";

iniciarTema();
registrarServiceWorker();

/*
 * Enrutado segun el build (ver vite-env.d.ts).
 *
 * Por defecto, URL limpias. Con VITE_ROUTER=hash se compila para hosting
 * estatico sin reescritura: el servidor solo ve «/» y las rutas viven detras
 * del «#», asi que no hacen falta reglas de Apache ni de nginx.
 *
 * Es decision de BUILD y no de codigo a proposito: asi la demo no obliga a
 * dejar un parche en el repositorio ni a acordarse de revertirlo.
 */
const Router = import.meta.env.VITE_ROUTER === "hash" ? HashRouter : BrowserRouter;

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("Falta #raiz en index.html");

createRoot(raiz).render(
  <StrictMode>
    <SincronizacionProvider>
      <JornadaProvider>
        <Router>
          <App />
        </Router>
      </JornadaProvider>
    </SincronizacionProvider>
  </StrictMode>,
);

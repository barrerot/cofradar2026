import { useSyncExternalStore } from "react";
import { guardar, leer } from "./datos/almacen";

/**
 * Tema y contraste (§5, D16). Son atributos en <html>, no clases:
 *
 *   data-theme     light | dark
 *   data-contrast  max         (opcional)
 *   data-register  editorial   (opcional, por zona)
 *
 * Dos ejes independientes:
 *   · Tema: por defecto, el del sistema. Cualquier elección manual prevalece
 *     y se recuerda. No hay cambio automático por hora.
 *   · Contraste: normal por defecto; el máximo es elección manual y
 *     persistente. No se adivina si el usuario está al sol.
 *
 * Las preferencias se guardan en el teléfono. Las elige el usuario en Ajustes
 * (P-25, issue 1.7) con `cambiarPreferencias`.
 *
 * Andamio de revisión, que no se guarda: `?tema=oscuro` o `?tema=claro` fuerza
 * el tema para mirar una pantalla en los dos sin tocar nada más.
 */
export type Tema = "light" | "dark";
export type PreferenciaTema = "sistema" | "claro" | "oscuro";
export type Contraste = "normal" | "max";
export type Preferencias = { tema: PreferenciaTema; contraste: Contraste };

const POR_DEFECTO: Preferencias = { tema: "sistema", contraste: "normal" };
const sistemaOscuro = () => window.matchMedia("(prefers-color-scheme: dark)");

let actuales: Preferencias = { ...POR_DEFECTO, ...leer<Partial<Preferencias>>("preferencias") };
const oyentes = new Set<() => void>();

/** El tema forzado por query, si lo hay. */
function temaForzado(busqueda: string): Tema | null {
  const valor = new URLSearchParams(busqueda).get("tema");
  if (valor === "oscuro" || valor === "dark") return "dark";
  if (valor === "claro" || valor === "light") return "light";
  return null;
}

function aplicar(): void {
  const raiz = document.documentElement;
  const tema =
    temaForzado(window.location.search) ??
    (actuales.tema === "claro" ? "light" : actuales.tema === "oscuro" ? "dark" : sistemaOscuro().matches ? "dark" : "light");
  raiz.dataset.theme = tema;
  if (actuales.contraste === "max") raiz.dataset.contrast = "max";
  else delete raiz.dataset.contrast;
  // La barra del navegador y la de la app instalada, del color del fondo
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tema === "dark" ? "#1D1A16" : "#FFFFFF");
}

/** Se llama una vez al arrancar: aplica lo guardado y sigue al sistema mientras el tema sea «sistema». */
export function iniciarTema(): void {
  aplicar();
  sistemaOscuro().addEventListener("change", aplicar);
}

export function cambiarPreferencias(cambio: Partial<Preferencias>): void {
  actuales = { ...actuales, ...cambio };
  guardar("preferencias", actuales);
  aplicar();
  oyentes.forEach((o) => o());
}

/** Para Ajustes: las preferencias actuales, que se repintan al cambiar. */
export function usePreferencias(): Preferencias {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => actuales,
  );
}

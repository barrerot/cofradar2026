import { useState } from "react";
import { cabecerasSesion } from "./sesion";

/**
 * «Descargar mis datos» (P-23, P-24): pide GET /api/yo/datos con la sesión y
 * lo guarda como cofradar-mis-datos.json. `estado` sirve para el botón
 * («Preparando…») y para avisar si falla.
 */
export function useDescargarDatos() {
  const [estado, setEstado] = useState<"lista" | "bajando" | "fallo">("lista");

  const descargar = async () => {
    setEstado("bajando");
    try {
      const r = await fetch("/api/yo/datos", { headers: await cabecerasSesion() });
      if (!r.ok) throw new Error(String(r.status));
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "cofradar-mis-datos.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setEstado("lista");
    } catch {
      setEstado("fallo");
    }
  };

  return { estado, descargar };
}

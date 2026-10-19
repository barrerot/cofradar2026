import { useCallback, useEffect, useState } from "react";

/**
 * Estado REAL del permiso de ubicación del navegador (P-25 Ajustes, P-04).
 *
 *   permitida      el navegador ya la concedió
 *   no-permitida   no se ha pedido, o se cerró el aviso sin contestar: «Permitir» la pide
 *   bloqueada      dijo que no y el navegador ya no vuelve a preguntar: solo se
 *                  cambia en los permisos del navegador
 *   no-disponible  el navegador no tiene geolocalización
 *
 * La ubicación nunca es obligatoria y nunca se pide antes de hacer falta: aquí
 * solo se pide cuando la persona pulsa «Permitir». La posición que devuelve
 * el navegador al pedir el permiso se descarta: esto no guarda ni envía nada.
 */
export type EstadoUbicacion = "permitida" | "no-permitida" | "bloqueada" | "no-disponible";

const DE_PERMISO: Record<PermissionState, EstadoUbicacion> = {
  granted: "permitida",
  prompt: "no-permitida",
  denied: "bloqueada",
};

export function useUbicacion(): { estado: EstadoUbicacion; pidiendo: boolean; pedir: () => void } {
  const disponible = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [estado, setEstado] = useState<EstadoUbicacion>(disponible ? "no-permitida" : "no-disponible");
  const [pidiendo, setPidiendo] = useState(false);

  // El navegador avisa si el permiso cambia (también si se cambia en sus ajustes)
  useEffect(() => {
    if (!disponible || !navigator.permissions?.query) return;
    let permiso: PermissionStatus | undefined;
    const leer = () => permiso && setEstado(DE_PERMISO[permiso.state]);
    navigator.permissions
      .query({ name: "geolocation" })
      .then((p) => {
        permiso = p;
        leer();
        p.addEventListener("change", leer);
      })
      .catch(() => {
        /* Safari antiguo no deja consultarlo: se queda en «no permitida» hasta pedirlo. */
      });
    return () => permiso?.removeEventListener("change", leer);
  }, [disponible]);

  const pedir = useCallback(() => {
    if (!disponible) return;
    setPidiendo(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setPidiendo(false);
        setEstado("permitida");
      },
      (error) => {
        setPidiendo(false);
        // Sin la API de permisos no se distingue «cerró el aviso» de «bloqueada»: se trata como bloqueada
        if (error.code === error.PERMISSION_DENIED && !navigator.permissions?.query) setEstado("bloqueada");
      },
      { maximumAge: Infinity, timeout: 30_000 },
    );
  }, [disponible]);

  return { estado, pidiendo, pedir };
}

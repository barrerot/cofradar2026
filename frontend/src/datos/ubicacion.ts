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
 *
 * `rechazada` recuerda en el teléfono que dijo que no en el aviso del
 * navegador. Hace falta porque algunos navegadores (Safari, Firefox sin
 * «recordar») vuelven a decir «no se ha pedido»: así no se le insiste desde el
 * mapa (P-04: nunca dos veces). Desde Ajustes sí puede volver a permitirla.
 */
export type EstadoUbicacion = "permitida" | "no-permitida" | "bloqueada" | "no-disponible";

const DE_PERMISO: Record<PermissionState, EstadoUbicacion> = {
  granted: "permitida",
  prompt: "no-permitida",
  denied: "bloqueada",
};

/** Para qué la pedimos: el mismo texto en Ajustes y en la hoja (8-acceso/acceso-4b). */
export const PARA_QUE_UBICACION =
  "Para decirte a qué distancia te queda cada cofradía y para situar en el mapa lo que ves cuando das fe. Sin ella, Cofradar funciona igual y puedes dar fe.";

const RECHAZADA = "cofradar:ubicacion-rechazada";

function leerRechazada() {
  try {
    return localStorage.getItem(RECHAZADA) === "true";
  } catch {
    return false;
  }
}

function guardarRechazada(valor: boolean) {
  try {
    if (valor) localStorage.setItem(RECHAZADA, "true");
    else localStorage.removeItem(RECHAZADA);
  } catch {
    /* sin almacenamiento solo se olvida */
  }
}

export type Ubicacion = {
  estado: EstadoUbicacion;
  /** Dijo que no en el aviso del navegador (ver arriba). */
  rechazada: boolean;
  pidiendo: boolean;
  /** Lanza el aviso del navegador. `alConceder` sigue con lo que la persona iba a hacer. */
  pedir: (alConceder?: () => void) => void;
};

export function useUbicacion(): Ubicacion {
  const disponible = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [estado, setEstado] = useState<EstadoUbicacion>(disponible ? "no-permitida" : "no-disponible");
  const [pidiendo, setPidiendo] = useState(false);
  const [rechazada, setRechazada] = useState(leerRechazada);

  // Si se permite (aquí, en Ajustes o en el navegador), se olvida el «no»
  useEffect(() => {
    if (estado === "permitida" && rechazada) {
      guardarRechazada(false);
      setRechazada(false);
    }
  }, [estado, rechazada]);

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

  const pedir = useCallback(
    (alConceder?: () => void) => {
      if (!disponible) return;
      setPidiendo(true);
      navigator.geolocation.getCurrentPosition(
        () => {
          setPidiendo(false);
          setEstado("permitida");
          alConceder?.();
        },
        (error) => {
          setPidiendo(false);
          if (error.code !== error.PERMISSION_DENIED) return;
          guardarRechazada(true);
          setRechazada(true);
          // Sin la API de permisos no se distingue «cerró el aviso» de «bloqueada»: se trata como bloqueada
          if (!navigator.permissions?.query) setEstado("bloqueada");
        },
        { maximumAge: Infinity, timeout: 30_000 },
      );
    },
    [disponible],
  );

  return { estado, rechazada, pidiendo, pedir };
}

export type Posicion = { latitud: number; longitud: number; precision: number };

/**
 * Dónde estás, SOLO si ya diste permiso: nunca lo pide (eso es de P-04, en contexto). Se refresca cada
 * minuto mientras la pantalla está abierta. Sin permiso, `null` y la pantalla hace como si no la hubiera.
 */
export function usePosicion(): Posicion | null {
  const { estado } = useUbicacion();
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  useEffect(() => {
    if (estado !== "permitida") {
      setPosicion(null);
      return;
    }
    const tomar = () =>
      navigator.geolocation.getCurrentPosition(
        (p) => setPosicion({ latitud: p.coords.latitude, longitud: p.coords.longitude, precision: Math.round(p.coords.accuracy) }),
        () => {},
        { maximumAge: 30_000, timeout: 15_000 },
      );
    tomar();
    const id = window.setInterval(tomar, 60_000);
    return () => window.clearInterval(id);
  }, [estado]);
  return posicion;
}

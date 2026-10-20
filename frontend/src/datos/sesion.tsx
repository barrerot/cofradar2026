import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * La sesión de la persona: entrar y salir con Google (2.1, Supabase Auth).
 *
 *   Solo Google    sin contraseña ni código por correo. La misma acción crea
 *                  la cuenta o entra.
 *   Persistente    la sesión se guarda en el teléfono y el cliente renueva el
 *                  token solo, también al volver a la app tras horas en
 *                  segundo plano: no caduca a las 3 de la Madrugá.
 *   Salir          cierra la sesión y no borra nada (los ajustes siguen en el
 *                  teléfono; lo personal vive en la cuenta).
 *   Al participar  la cuenta se pide en el momento de la acción personal
 *                  (seguir, marcar como vista, dar fe), nunca para consultar
 *                  (decisión del 20/10/2026, BUL-222). `entrar` guarda qué
 *                  acción esperaba y dónde; al volver de Google, `entrada`
 *                  dice cómo fue para que esa pantalla la retome o avise.
 *
 * El cliente usa la clave PUBLICABLE de Supabase, que está hecha para ir en el
 * navegador. Las tablas siguen cerradas (RLS sin políticas): los datos se
 * piden siempre a nuestra API, que comprueba la sesión con `X-Sesion`.
 */
export type Usuario = { id: string; email?: string; nombre?: string; foto?: string };

/**
 * Lo que esperaba la persona al ir a Google: `motivo` lo pone quien pide la
 * cuenta («mi-cofradar», «seguir:la-macarena», «dar-fe»…) y es quien lo lee
 * al volver para retomar la acción.
 */
export type Entrada = { motivo: string; resultado: "entrado" | "no-entrado" };

type Sesion = {
  /** `undefined` mientras se lee la sesión guardada; `null` sin sesión. */
  usuario: Usuario | null | undefined;
  /** Falso si esta build no tiene Supabase configurado. */
  disponible: boolean;
  /** Abre Google. Al volver, la persona aterriza en `volverA` (por defecto, donde estaba). */
  entrar: (motivo: string, volverA?: string) => Promise<void>;
  salir: () => Promise<void>;
  /** Cómo fue la vuelta de Google, hasta que la pantalla que la pidió la da por vista. */
  entrada: Entrada | null;
  olvidarEntrada: () => void;
  /** Hace `accion` si hay sesión; si no, pide la cuenta con ese `motivo` para retomarla al volver. */
  conCuenta: (motivo: string, accion: () => void) => void;
};

const PENDIENTE = "cofradar:entrada-pendiente";
const ERRORES_URL = ["error", "error_code", "error_description"];

/** Lee y borra la entrada pendiente una sola vez por carga (StrictMode monta dos veces). */
let pendiente: { motivo: string } | null | undefined;
function tomarPendiente() {
  if (pendiente === undefined) {
    try {
      pendiente = JSON.parse(sessionStorage.getItem(PENDIENTE) ?? "null");
      sessionStorage.removeItem(PENDIENTE);
    } catch {
      pendiente = null;
    }
  }
  return pendiente;
}

/** Quita de la URL lo que añade la vuelta de Google: «?code=…» ya canjeado o el error. */
function limpiarUrl() {
  const url = new URL(window.location.href);
  const sobra = ["code", ...ERRORES_URL].filter((p) => url.searchParams.has(p));
  if (!sobra.length) return;
  sobra.forEach((p) => url.searchParams.delete(p));
  window.history.replaceState(window.history.state, "", url);
}

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL;
const CLAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let cliente: SupabaseClient | null | undefined;

function auth() {
  if (cliente === undefined) {
    cliente =
      URL_SUPABASE && CLAVE
        ? createClient(URL_SUPABASE, CLAVE, {
            auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
          })
        : null;
  }
  return cliente?.auth ?? null;
}

/** Cabeceras para las rutas de la API que necesitan saber quién es. Vacías sin sesión. */
export async function cabecerasSesion(): Promise<Record<string, string>> {
  const a = auth();
  if (!a) return {};
  const { data } = await a.getSession();
  return data.session ? { "X-Sesion": data.session.access_token } : {};
}

function deSesion(sesion: Session | null): Usuario | null {
  if (!sesion) return null;
  const { id, email, user_metadata: m } = sesion.user;
  return { id, email, nombre: m?.full_name ?? m?.name, foto: m?.avatar_url ?? m?.picture };
}

const Contexto = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const a = auth();
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(a ? undefined : null);
  const [entrada, setEntrada] = useState<Entrada | null>(null);

  useEffect(() => {
    if (!a) return;
    // Avisa con la sesión guardada al arrancar (ya con la vuelta de Google
    // canjeada, si la había) y en cada renovación
    const { data } = a.onAuthStateChange((evento, sesion) => {
      setUsuario(deSesion(sesion));
      if (evento !== "INITIAL_SESSION") return;
      const esperaba = tomarPendiente();
      // Cancelada, denegada o vuelta atrás sin terminar: aviso azul y todo sigue igual
      if (esperaba) setEntrada({ motivo: esperaba.motivo, resultado: sesion ? "entrado" : "no-entrado" });
      limpiarUrl();
    });
    // Vuelta atrás desde Google sin recargar: el navegador puede devolver la
    // página tal cual estaba (pageshow persistida) o, si Google se abrió en una
    // pestaña encima de la app, la app solo vuelve a verse (visibilitychange).
    // Si lo pendiente sigue guardado, no se entró: al entrar, la página se
    // recarga y lo recoge INITIAL_SESSION.
    const revisar = () => {
      try {
        const esperaba = JSON.parse(sessionStorage.getItem(PENDIENTE) ?? "null") as { motivo: string } | null;
        if (!esperaba) return;
        sessionStorage.removeItem(PENDIENTE);
        setEntrada({ motivo: esperaba.motivo, resultado: "no-entrado" });
      } catch {
        /* sin sessionStorage no hay aviso */
      }
    };
    const atras = (e: PageTransitionEvent) => {
      if (e.persisted) revisar();
    };
    const vuelve = () => {
      if (document.visibilityState === "visible") revisar();
    };
    window.addEventListener("pageshow", atras);
    document.addEventListener("visibilitychange", vuelve);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("pageshow", atras);
      document.removeEventListener("visibilitychange", vuelve);
    };
  }, [a]);

  const entrar = useCallback(
    async (motivo: string, volverA?: string) => {
      if (!a) return;
      const destino = new URL(volverA ?? window.location.pathname + window.location.search, window.location.origin);
      try {
        sessionStorage.setItem(PENDIENTE, JSON.stringify({ motivo }));
      } catch {
        /* sin sessionStorage se entra igual; solo no habrá aviso al volver */
      }
      const { error } = await a.signInWithOAuth({ provider: "google", options: { redirectTo: destino.href } });
      // Ni siquiera se pudo salir hacia Google (sin conexión): se avisa aquí mismo
      if (error) {
        sessionStorage.removeItem(PENDIENTE);
        setEntrada({ motivo, resultado: "no-entrado" });
      }
    },
    [a],
  );

  const valor = useMemo<Sesion>(
    () => ({
      usuario,
      disponible: a !== null,
      entrar,
      salir: async () => {
        if (!a) return;
        // Solo en este teléfono: no cierra la sesión en los demás dispositivos
        await a.signOut({ scope: "local" });
      },
      entrada,
      olvidarEntrada: () => setEntrada(null),
      conCuenta: (motivo, accion) => {
        if (usuario) accion();
        else void entrar(motivo);
      },
    }),
    [a, usuario, entrada, entrar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): Sesion {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSesion fuera de SesionProvider");
  return valor;
}

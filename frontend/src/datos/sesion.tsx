import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * La sesión de la persona: entrar y salir con Google (2.1, Supabase Auth).
 *
 *   Solo Google    sin contraseña ni código por correo. La misma acción crea
 *                  la cuenta o entra.
 *   Persistente    la sesión se guarda en el teléfono y el cliente renueva el
 *                  token solo, también al volver a la app tras horas en
 *                  segundo plano: no caduca a las 3 de la Madrugá.
 *   Salir          cierra la sesión y no borra nada de lo guardado en el
 *                  teléfono (seguidas, vistas, ajustes).
 *
 * El cliente usa la clave PUBLICABLE de Supabase, que está hecha para ir en el
 * navegador. Las tablas siguen cerradas (RLS sin políticas): los datos se
 * piden siempre a nuestra API, que comprueba la sesión con `X-Sesion`.
 */
export type Usuario = { id: string; email?: string; nombre?: string; foto?: string };

type Sesion = {
  /** `undefined` mientras se lee la sesión guardada; `null` sin sesión. */
  usuario: Usuario | null | undefined;
  /** Falso si esta build no tiene Supabase configurado. */
  disponible: boolean;
  /** Abre Google. Al volver, la persona aterriza en `volverA` (por defecto, donde estaba). */
  entrar: (volverA?: string) => Promise<void>;
  salir: () => Promise<void>;
};

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

  useEffect(() => {
    if (!a) return;
    // Avisa con la sesión guardada al arrancar, al volver de Google y en cada renovación
    const { data } = a.onAuthStateChange((_evento, sesion) => {
      setUsuario(deSesion(sesion));
      // Al volver de Google la URL trae «?code=…»: ya se ha canjeado, se limpia
      const url = new URL(window.location.href);
      if (sesion && url.searchParams.has("code")) {
        url.searchParams.delete("code");
        window.history.replaceState(window.history.state, "", url);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [a]);

  const valor = useMemo<Sesion>(
    () => ({
      usuario,
      disponible: a !== null,
      entrar: async (volverA) => {
        if (!a) return;
        const destino = new URL(volverA ?? window.location.pathname + window.location.search, window.location.origin);
        await a.signInWithOAuth({ provider: "google", options: { redirectTo: destino.href } });
      },
      salir: async () => {
        if (!a) return;
        // Solo en este teléfono: no cierra la sesión en los demás dispositivos
        await a.signOut({ scope: "local" });
      },
    }),
    [a, usuario],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): Sesion {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSesion fuera de SesionProvider");
  return valor;
}

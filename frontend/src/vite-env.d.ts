/// <reference types="vite/client" />

/**
 * Variables de build que usa la app. Solo las nuestras: las de Vite las trae
 * la referencia de arriba.
 */
interface ImportMetaEnv {
  /**
   * Enrutado. Vacio o `history` —lo normal— da URL limpias: /cofradias.
   *
   * `hash` las pasa a /#/cofradias, que funciona en CUALQUIER hosting
   * estatico sin configurar nada, porque el servidor solo ve «/». Es para
   * publicar demos en sitios donde no se puede tocar la reescritura del
   * servidor. En produccion NO se usa: las URL de hash no se comparten bien.
   */
  readonly VITE_ROUTER?: "history" | "hash";
  /** De backend/.env (vite.config.ts). Vacías: la app funciona sin cuenta y no deja entrar. */
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

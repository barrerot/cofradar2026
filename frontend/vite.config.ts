import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // La URL del proyecto y la clave publicable de Supabase viven en backend/.env
  // con las demás. Se pasan a la web SOLO estas dos, una a una: la clave secreta
  // y la de la base de datos nunca llegan al navegador.
  const env = loadEnv(mode, "../backend", "");
  return {
    plugins: [react()],
    // El worker de MapLibre se empaqueta aparte como módulo (src/mapa/worker.ts)
    worker: { format: "es" },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.SUPABASE_URL ?? ""),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY ?? ""),
    },
    server: {
      port: 5173,
      // El backend de Express vive aparte; /api se reenvia en desarrollo.
      proxy: {
        "/api": { target: "http://localhost:3001", changeOrigin: true },
      },
    },
  };
});

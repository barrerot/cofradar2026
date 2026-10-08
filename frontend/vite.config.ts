import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // El backend de Express vive aparte; /api se reenvia en desarrollo.
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});

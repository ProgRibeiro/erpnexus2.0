import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/static/" : "/",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://demo.localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../erp_backend/frontend_dist",
    emptyOutDir: true,
    assetsDir: "assets",
  },
}));

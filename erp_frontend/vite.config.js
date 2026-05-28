import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => {
  const isMobile = process.env.MOBILE === "true";
  return {
    plugins: [react()],
    base: isMobile ? "./" : command === "build" ? "/static/" : "/",
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: isMobile ? "frontend_dist_mobile" : "../erp_backend/frontend_dist",
      emptyOutDir: true,
      assetsDir: "assets",
    },
  };
});

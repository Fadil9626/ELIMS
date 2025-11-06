// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  // ============================================================
  // 🌐 Dev Server (works in Docker + LAN)
  // ============================================================
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    open: false,

    proxy: {
      // ✅ Automatically forward `/api` → backend server running inside Docker
      "/api": {
        target: "http://api:5000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://api:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // ============================================================
  // 🧭 Alias Support
  // ============================================================
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ============================================================
  // 🧱 Build Output
  // ============================================================
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});

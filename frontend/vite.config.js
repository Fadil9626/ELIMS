import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    open: false,
    // We are running on http, not https
    https: false, // <-- ✅ ADD THIS to fix the SSL error from before

    proxy: {
      "/api": {
        // ❌ WRONG: 'api' is not a hostname on your computer
        // target: "http://api:5000", 
        
        // ✅ CORRECT: Point to the port exposed on localhost
        target: "http://localhost:5000", 
        
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // ... rest of your file
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});
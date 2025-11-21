import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");

  // Define API target for Local Development Proxy
  // Priority: VITE_API_URL -> Docker Service Name -> Localhost
  const apiTarget =
    env.VITE_API_URL ||
    (env.DOCKER === "true" ? "http://api:5000" : "http://localhost:5000");

  console.log("🚀 [Vite] Proxying /api requests to:", apiTarget);

  return {
    plugins: [react()],

    // Server config is only used during 'npm run dev'
    server: {
      host: true, // Listen on all addresses (0.0.0.0)
      port: 5173,
      watch: {
        usePolling: true, // Fixes hot reload in some Docker environments
      },
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    // Optimization for production build
    build: {
      outDir: "dist",
      sourcemap: false, // Disable source maps in production for security/size
    },
  };
});
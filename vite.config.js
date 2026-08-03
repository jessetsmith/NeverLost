import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Base path for GitHub Pages (use repository name if not using custom domain)
  // If your repo is at github.com/username/NeverLost, the base should be "/NeverLost/"
  base: mode === "production" ? "/NeverLost/" : "/",
  server: {
    define: {
      "process.env": process.env,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
}));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function vendorChunk(id) {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (id.includes("three") || id.includes("three-stdlib")) {
    return "three";
  }

  if (id.includes("@react-three")) {
    return "r3f";
  }

  // Keep leva with its lazy route chunk — isolating it caused a circular
  // import with react-vendor (React undefined at leva init time).

  if (
    id.includes("react-dom")
    || id.includes("react-router")
    || id.includes("/react/")
  ) {
    return "react-vendor";
  }

  return undefined;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
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
    // three.js alone is ~950 kB; it loads on-demand via lazy routes / Home3D
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
}));

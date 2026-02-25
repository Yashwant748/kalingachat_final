import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@hooks": path.resolve(__dirname, "src/hooks"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@lib": path.resolve(__dirname, "src/lib"),
    },
  },
  server: {
    host: true, // Exposes the server to the LAN (0.0.0.0) automatically
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      "/generated-images": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/generated-excel": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/generated-files": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: { usePolling: true },
    proxy: {
      // API proxy — bypass returns index.html for browser page navigations
      // so React Router handles the route client-side instead.
      "/auth":       { target: "http://localhost:8001", changeOrigin: true },
      "/health":     { target: "http://localhost:8001", changeOrigin: true },
      "/ingest":     { target: "http://localhost:8001", changeOrigin: true },
      "/timeseries": { target: "http://localhost:8001", changeOrigin: true },
      // Paths shared by both frontend routes AND API sub-paths
      "/ontology": {
        target: "http://localhost:8001", changeOrigin: true,
        bypass: (req) => req.headers.accept?.includes("text/html") ? "/index.html" : undefined,
      },
      "/governance": {
        target: "http://localhost:8001", changeOrigin: true,
        bypass: (req) => req.headers.accept?.includes("text/html") ? "/index.html" : undefined,
      },
      "/ai": {
        target: "http://localhost:8001", changeOrigin: true,
        bypass: (req) => req.headers.accept?.includes("text/html") ? "/index.html" : undefined,
      },
      "/analytics": {
        target: "http://localhost:8001", changeOrigin: true,
        bypass: (req) => req.headers.accept?.includes("text/html") ? "/index.html" : undefined,
      },
    },
  },
});

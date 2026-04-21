import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  // Em produção, remove console.* e debugger para reduzir bundle e ruído.
  esbuild: mode === "production"
    ? { drop: ["console", "debugger"] }
    : undefined,
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    // Sem manualChunks: deixa o Vite decidir splitting automático para evitar
    // conflitos de resolução com query-core / dedupe.
    chunkSizeWarningLimit: 800,
  },
}));

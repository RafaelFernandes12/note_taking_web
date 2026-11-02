import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // O Excalidraw lê essa variável (é a recomendação deles para o Vite).
  define: { "process.env.IS_PREACT": JSON.stringify("false") },
  server: {
    port: 3000,
    // O front chama `/api/...`; em desenvolvimento o Vite repassa para o
    // Spring. No app desktop o próprio Spring serve o front (mesma origem).
    proxy: { "/api": "http://localhost:8080" },
  },
});

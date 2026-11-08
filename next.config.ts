import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // O navegador fala com o backend pela mesma origem: o upload de imagens
  // precisa ler a resposta (o backend não libera CORS) e as notas guardam
  // só `/api/files/{id}`, sem o host do backend.
  async rewrites() {
    return [
      {
        source: "/api/files/:path*",
        destination: "http://localhost:8080/api/files/:path*",
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

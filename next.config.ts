import type { NextConfig } from "next";

// Cache Components desactivado (plan.md, KTD1): casi todo BUDDY es por usuario y dinámico,
// y nunca se cachean datos de usuario con 'use cache'.
const nextConfig: NextConfig = {
  typedRoutes: true,
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El cliente de Turso trae binarios nativos para el modo archivo local: no se empaqueta
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;

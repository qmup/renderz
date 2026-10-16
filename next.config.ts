import type { NextConfig } from "next";

const usesAurora = Boolean(process.env.AURORA_HOST);

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  ...(usesAurora
    ? {}
    : {
        outputFileTracingIncludes: {
          "*": ["./data/catalog.snapshot.sqlite", "./drizzle/**"],
        },
      }),
};

export default nextConfig;

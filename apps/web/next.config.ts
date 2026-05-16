import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@trade/shared", "@trade/db", "@trade/config"],
};

export default nextConfig;

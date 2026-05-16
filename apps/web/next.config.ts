import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trade/shared", "@trade/db", "@trade/config"],
};

export default nextConfig;

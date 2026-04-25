import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow streaming AI responses
  },
  // Don't fail builds on missing DATABASE_URL — lazy init pattern handles it
  env: {},
};

export default nextConfig;

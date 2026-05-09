import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from the storage API domain
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;

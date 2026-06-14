import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-a34aa2cb-57c9-43c5-abfb-5a9837238b0b.space-z.ai",
    "[::1]",
  ],
};

export default nextConfig;

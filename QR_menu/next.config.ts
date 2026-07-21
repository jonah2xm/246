import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Menu photos are stored in Cloudflare R2 and served from its public
    // r2.dev domain (or a custom domain, if one gets attached later).
    remotePatterns: [{ protocol: "https", hostname: "*.r2.dev", pathname: "/**" }],
  },
};

export default nextConfig;

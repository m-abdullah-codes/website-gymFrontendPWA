import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // OpenNext reads the standalone trace output when bundling for Workers.
  output: "standalone",
  // Cache Components + per-route `unstable_instant` exports: every page must
  // produce an instant static shell, validated at build time. Client state
  // hydrates in after paint — navigation never waits on data.
  cacheComponents: true,
};

export default nextConfig;

initOpenNextCloudflareForDev();

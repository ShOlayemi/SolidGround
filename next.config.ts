import type { NextConfig } from "next";

// ── Bundle analysis (optional) ───────────────────────────────────
// Enable temporarily to inspect bundle sizes:
//   1. `bun add -d @next/bundle-analyzer`
//   2. uncomment the block below
//   3. run `ANALYZE=true bun run build`
//   4. open .next/analyze/*.html
// const withBundleAnalyzer = require("@next/bundle-analyzer")({
//   enabled: process.env.ANALYZE === "true",
// });

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  // Cache-Control for static routes/ISR pages. Legal & landing pages use
  // `export const revalidate` (stale-while-revalidate via ISR), which is
  // the preferred pattern in the App Router — keep header overrides here
  // for anything that needs a stricter directive than the default.
  // headers: async () => [
  //   {
  //     source: "/og.png",
  //     headers: [
  //       { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
  //     ],
  //   },
  // ],
};

export default nextConfig;

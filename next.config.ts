import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — no serverless functions, no Vercel GB-Hrs consumed.
  // The entire site is pre-built HTML/JS/CSS served from Vercel's CDN edge.
  // This is correct for a fully "use client" app with no API routes or SSR pages.
  output: "export",
  trailingSlash: true,   // /quiz/ instead of /quiz — cleaner CDN caching
};

export default nextConfig;

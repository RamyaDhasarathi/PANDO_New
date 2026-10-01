import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the supplied AGENTS.md exactly as provided in the spec package.
  agentRules: false,
};

export default nextConfig;

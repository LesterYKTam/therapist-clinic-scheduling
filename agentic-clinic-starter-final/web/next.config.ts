import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF report reads assets/fonts/* from process.cwd() at runtime; make sure it ships with the serverless function.
  outputFileTracingIncludes: {
    "/api/clinic/report": ["./assets/fonts/**/*"],
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
};

export default nextConfig;

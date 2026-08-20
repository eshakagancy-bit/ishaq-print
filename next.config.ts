import type { NextConfig } from "next";
import { getSecurityHeaders } from "./app/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: getSecurityHeaders() }];
  },
  images: {
    localPatterns: [
      { pathname: "/api/media/**", search: "" },
      { pathname: "/brand/**", search: "" },
      { pathname: "/hero/**", search: "" },
      { pathname: "/products/**", search: "" },
    ],
  },
};

export default nextConfig;

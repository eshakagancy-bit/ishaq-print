import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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

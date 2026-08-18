import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lujkxtqtqcqyilsculcy.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;

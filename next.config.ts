import type { NextConfig } from "next";

const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: urlSupabase
      ? [
          {
            protocol: "https",
            hostname: new URL(urlSupabase).hostname,
            pathname: "/storage/v1/object/public/productos/**",
          },
        ]
      : [],
  },
};

export default nextConfig;

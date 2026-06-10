import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    unmanaged: true,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
}

export default nextConfig

/** @type {import('next').NextConfig} */
// Force reload - 2026-01-30
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

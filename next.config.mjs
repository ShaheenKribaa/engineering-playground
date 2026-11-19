/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    '172.19.128.1',
    '172.19.128.1:4500',
    'localhost:4500',
    'localhost',
    '127.0.0.1',
  ],
}

export default nextConfig

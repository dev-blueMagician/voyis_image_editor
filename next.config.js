/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
    ],
  },
  webpack: (config) => {
    config.cache = { type: 'filesystem' }; // safer caching
    // Prevent loading canvas/node binary
    config.externals.push({
      canvas: "commonjs canvas",
    });

    return config;
  },
}

module.exports = nextConfig
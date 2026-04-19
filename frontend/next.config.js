/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
  async redirects() {
    return [
      { source: '/', destination: '/dashboard', permanent: false },
    ];
  },
};

module.exports = nextConfig;

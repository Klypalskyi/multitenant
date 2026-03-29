import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@multitenant/core',
    '@multitenant/config',
    '@multitenant/react',
    '@multitenant/next-app',
    '@multitenant/next',
  ],
};

export default nextConfig;

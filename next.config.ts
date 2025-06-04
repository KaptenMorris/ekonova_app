
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, 
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {}, // Added empty experimental block
};

export default nextConfig;

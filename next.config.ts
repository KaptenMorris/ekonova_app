
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // Explicitly set reactStrictMode
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
  env: {
    NEXT_PUBLIC_FORCE_REBUILD_NUDGE: Date.now().toString(), // Adding a changing env variable
  },
};

export default nextConfig;

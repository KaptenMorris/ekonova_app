/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // Add the allowedDevOrigins configuration for development
  experimental: {
    allowedDevOrigins: [
      'https://6000-firebase-studio-1747855461592.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev',
      // Du kan lägga till fler domäner här om det behövs för andra utvecklingsmiljöer
    ],
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'fluent-ffmpeg'],
  },
};

module.exports = nextConfig;

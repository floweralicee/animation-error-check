/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'fluent-ffmpeg', 'ffmpeg-static', 'ffprobe-static'],
  },
};

module.exports = nextConfig;

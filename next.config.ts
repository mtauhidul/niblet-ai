/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  eslint: {
    dirs: ["pages", "components", "lib"], // Specify which directories to lint
    ignoreDuringBuilds: true, // Ignore ESLint errors in production builds
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly configure the app directory
  experimental: {
    appDir: true,
  },
  // Configure Next.js to look in src directory
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig

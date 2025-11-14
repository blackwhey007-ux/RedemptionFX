/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure Next.js to look in src directory
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  reactStrictMode: true,
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize MetaAPI SDK for server-side to avoid "window is not defined" error
      // We'll use dynamic import with special handling instead
      config.externals = config.externals || []
      config.externals.push({
        'metaapi.cloud-sdk': 'commonjs metaapi.cloud-sdk'
      })
    }
    
    // Configure jspdf to only be bundled for client-side
    if (!isServer) {
      config.resolve.alias = config.resolve.alias || {}
      // jspdf should work fine on client side, but we ensure it's not processed for SSR
    }
    
    return config
  },
}

module.exports = nextConfig

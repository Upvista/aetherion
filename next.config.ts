import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Exclude whatsapp-web.js from bundling (it's Node.js only, not compatible with Next.js bundler)
  serverExternalPackages: ['whatsapp-web.js', 'qrcode-terminal'],
  // Also configure webpack to treat these as externals
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark as external to prevent bundling
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('whatsapp-web.js', 'qrcode-terminal');
      } else {
        config.externals = [
          ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
          'whatsapp-web.js',
          'qrcode-terminal',
        ];
      }
    }
    return config;
  },
};

// Only apply PWA config in production
// For Vercel/deployment: Use webpack mode explicitly
if (process.env.NODE_ENV === 'production') {
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: false,
    buildExcludes: [/middleware-manifest.json$/],
  });
  
  module.exports = withPWA(nextConfig);
} else {
  module.exports = nextConfig;
}

export default nextConfig;

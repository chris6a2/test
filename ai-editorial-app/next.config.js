/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output as static site for PWA deployment
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Trailing slashes for better static hosting compatibility
  trailingSlash: true,
};

module.exports = nextConfig;

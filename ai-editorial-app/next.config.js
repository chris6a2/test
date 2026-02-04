/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server-side features for SQLite
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

module.exports = nextConfig;

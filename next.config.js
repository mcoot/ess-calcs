/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for hosting on static file servers
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Optional: Add a trailing slash to all paths
  trailingSlash: true,

  // Optional: Change the output directory (default is 'out')
  distDir: 'out',
}

export default nextConfig

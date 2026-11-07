/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compress static and dynamic response bodies
  compress: true,

  // Power modern image formats
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // HTTP Security and SEO Headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Permanent 308 redirects from legacy Vercel domain and www to canonical production domain
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "viral-thread-generator.vercel.app",
          },
        ],
        destination: "https://viralthreads.agnivon.dev/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.viralthreads.agnivon.dev",
          },
        ],
        destination: "https://viralthreads.agnivon.dev/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

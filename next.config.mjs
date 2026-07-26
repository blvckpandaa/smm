/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    const longCache = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      { source: "/favicon.ico", headers: longCache },
      { source: "/favicon-16x16.png", headers: longCache },
      { source: "/favicon-32x32.png", headers: longCache },
      { source: "/favicon-48x48.png", headers: longCache },
      { source: "/favicon-96x96.png", headers: longCache },
      { source: "/apple-icon.png", headers: longCache },
      { source: "/icon-192.png", headers: longCache },
      { source: "/icon-512.png", headers: longCache },
      { source: "/og.png", headers: longCache },
      {
        source: "/site.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

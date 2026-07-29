/** @type {import('next').NextConfig} */
const BACKEND_URL =
  process.env.BACKEND_URL ?? "http://localhost:5000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy all API calls through the Next.js server so requests are
    // same-origin. This makes the Better Auth session cookie first-party,
    // which keeps users logged in across reloads (cross-site cookies are
    // blocked by modern browsers).
    return [
      {
        source: "/backend-api/:path*",
        destination: `${BACKEND_URL}/:path*`,
        
      },
    ];
  },
};

export default nextConfig;

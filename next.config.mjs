/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "n2tlbqzcitr6ajqd.public.blob.vercel-storage.com",
        port: "",
      },
    ],
  },
};

export default nextConfig;

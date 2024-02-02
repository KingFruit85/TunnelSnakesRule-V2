/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'n2tlbqzcitr6ajqd.public.blob.vercel-storage.com',
          port: '',
        },
      ],
    },
  };
   
  export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  trailingSlash: true, // Helps with IIS routing
  images: {
    unoptimized: true, // Needed for static export if using next/image
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;


// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   output: "export", // Required for static export
  // trailingSlash: true, // Helps with IIS routing
  // images: {
  //   unoptimized: true, // Needed for static export if using next/image
  // },
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
// };

// module.exports = nextConfig;
/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@mui/material', '@mui/system', '@mui/utils', '@mui/icons-material', '@mui/styles', '@mui/x-date-pickers'],
  webpack: (config, { isServer }) => {
    // Fix for ES modules directory import issues
    if (isServer) {
      // This is a more comprehensive approach to handle all MUI icon imports
      config.module.rules.push({
        test: /@mui\/icons-material\/(.*)$/,
        issuer: /\.[jt]sx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['next/babel'],
              plugins: [
                [
                  'module-resolver',
                  {
                    alias: {
                      '^@mui/icons-material/(.+)': '@mui/icons-material/\\1.js',
                    },
                  },
                ],
              ],
            },
          },
        ],
      });

      // Handle specific utils imports
      config.resolve.alias = {
        ...config.resolve.alias,
        '@mui/utils/formatMuiErrorMessage': '@mui/utils/formatMuiErrorMessage/index.js'
      };
    }

    // This helps with resolving all MUI packages correctly
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.js', '.ts', '.tsx']
    };

    // Add specific resolution for the Menu icon
    config.resolve.alias = {
      ...config.resolve.alias,
      '@mui/icons-material/Menu': path.resolve(__dirname, 'node_modules/@mui/icons-material/Menu.js')
    };

    return config;
  },
  // This is needed to ensure Next.js doesn't try to use ES modules directly
  experimental: {
    esmExternals: false
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

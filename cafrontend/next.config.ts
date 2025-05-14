import type { NextConfig } from "next";
import path from 'path';
import fs from 'fs';

// Create a custom formatMuiErrorMessage implementation
const muiErrorMessagePath = path.resolve(__dirname, 'node_modules/@mui/utils/formatMuiErrorMessage');
if (!fs.existsSync(path.join(muiErrorMessagePath, 'index.js'))) {
  // Create the directory if it doesn't exist
  if (!fs.existsSync(muiErrorMessagePath)) {
    fs.mkdirSync(muiErrorMessagePath, { recursive: true });
  }
  
  // Write the implementation file
  fs.writeFileSync(
    path.join(muiErrorMessagePath, 'index.js'),
    `'use strict';

module.exports = function formatMuiErrorMessage(code) {
  let url = 'https://mui.com/production-error/?code=' + code;

  for (let i = 1; i < arguments.length; i += 1) {
    url += '&args[]=' + encodeURIComponent(arguments[i]);
  }

  return 'Minified MUI error #' + code + '; visit ' + url + ' for the full message.';
};`
  );
}

const nextConfig: NextConfig = {
  // output: "export", // Required for static export - LIKELY CAUSING ISSUES WITH 'next dev'
  // trailingSlash: true, // Ensures IIS routing works with trailing slashes - Commented out for debugging
  // images: {
  //   unoptimized: true, // Disables image optimization for static export - Related to 'output: export'
  // },
  // reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Fix for ERR_UNSUPPORTED_DIR_IMPORT with MUI
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.mts', '.mtsx'],
      '.cjs': ['.cjs', '.cts', '.ctsx'],
    };
    
    return config;
  },
};

export default nextConfig;
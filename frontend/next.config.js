const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, '..', 'VERSION');

let appVersion = 'unknown';

try {
  appVersion = fs.readFileSync(versionFilePath, 'utf8').trim();
} catch (error) {
  console.warn(`Unable to read application version from ${versionFilePath}:`, error);
}

console.log(`Frontend server starting with version ${appVersion}`);

// Reminder: update the top-level VERSION file when making user-visible changes.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

module.exports = nextConfig;

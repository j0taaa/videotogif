const { readAppVersion, FALLBACK_VERSION } = require('./scripts/readVersion');

const appVersion = readAppVersion();

if (appVersion && appVersion !== FALLBACK_VERSION) {
  console.log(`Loaded application version ${appVersion}`);
} else {
  console.warn('Unable to determine application version during configuration.');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

module.exports = nextConfig;

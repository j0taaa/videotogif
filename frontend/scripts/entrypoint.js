const path = require('path');
const fs = require('fs');

const { readAppVersion, FALLBACK_VERSION } = require('./readVersion');

function resolveStandaloneMarker() {
  const currentDir = __dirname;
  const candidates = [
    path.resolve(currentDir, 'APP_VERSION'),
    path.resolve(currentDir, '..', 'APP_VERSION'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const contents = fs.readFileSync(candidate, 'utf8').trim();
        if (contents.length > 0) {
          return contents;
        }
      } catch (error) {
        console.warn(`Unable to read version marker at ${candidate}:`, error);
      }
    }
  }

  return null;
}

const markerVersion = resolveStandaloneMarker();
const appVersion = markerVersion || readAppVersion();

if (appVersion && appVersion !== FALLBACK_VERSION) {
  console.log(`Frontend server starting with version ${appVersion}`);
} else {
  console.warn('Frontend server starting without a resolved version number.');
}

process.env.APP_VERSION = appVersion;
process.env.NEXT_PUBLIC_APP_VERSION = appVersion;

const serverPath = path.resolve(__dirname, 'server.js');
require(serverPath);

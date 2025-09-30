const fs = require('fs');
const path = require('path');

const FALLBACK_VERSION = 'unknown';

// Reminder for all contributors (humans and LLMs alike):
// update the top-level VERSION file whenever you make user-visible changes.

function resolveCandidatePaths() {
  const projectRoot = path.resolve(__dirname, '..');
  return [
    process.env.APP_VERSION_FILE && path.resolve(process.env.APP_VERSION_FILE),
    path.resolve(projectRoot, 'VERSION'),
    path.resolve(projectRoot, '..', 'VERSION'),
    path.resolve(process.cwd(), 'VERSION'),
    path.resolve(process.cwd(), '..', 'VERSION'),
  ].filter(Boolean);
}

function readVersionFromFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const contents = fs.readFileSync(filePath, 'utf8').trim();
      if (contents.length > 0) {
        return contents;
      }
    }
  } catch (error) {
    console.warn(`Unable to read version from ${filePath}:`, error);
  }
  return null;
}

function readAppVersion() {
  const fromEnv = process.env.APP_VERSION || process.env.NEXT_PUBLIC_APP_VERSION;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  const candidatePaths = resolveCandidatePaths();
  for (const candidate of candidatePaths) {
    const version = readVersionFromFile(candidate);
    if (version) {
      return version;
    }
  }

  return FALLBACK_VERSION;
}

module.exports = {
  readAppVersion,
  FALLBACK_VERSION,
};

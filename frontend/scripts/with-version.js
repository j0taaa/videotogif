const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const { readAppVersion } = require('./readVersion');

const [, , command, ...commandArgs] = process.argv;

if (!command) {
  console.error('Usage: node scripts/with-version.js <next-command> [args...]');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const nextBinary = process.platform === 'win32' ? 'next.cmd' : 'next';
const nextExecutable = path.join(projectRoot, 'node_modules', '.bin', nextBinary);
const hasLocalNext = fs.existsSync(nextExecutable);
const commandToRun = hasLocalNext ? nextExecutable : `npx${process.platform === 'win32' ? '.cmd' : ''}`;

const appVersion = readAppVersion();
process.env.APP_VERSION = appVersion;
process.env.NEXT_PUBLIC_APP_VERSION = appVersion;

const displayVersion = appVersion || 'unknown';
const banner = `Frontend server starting with version ${displayVersion}`;
console.log(banner);

function persistVersionForStandaloneBuild(version) {
  if (command !== 'build') {
    return;
  }

  const standaloneDir = path.join(projectRoot, '.next', 'standalone');
  const markers = [path.join(projectRoot, '.next', 'APP_VERSION')];

  if (fs.existsSync(standaloneDir)) {
    markers.push(path.join(standaloneDir, 'APP_VERSION'));
  }

  for (const marker of markers) {
    try {
      const markerDir = path.dirname(marker);
      fs.mkdirSync(markerDir, { recursive: true });
      fs.writeFileSync(marker, version, 'utf8');
    } catch (error) {
      console.warn(`Unable to persist version marker at ${marker}:`, error);
    }
  }
}

const childArgs = hasLocalNext ? [command, ...commandArgs] : ['next', command, ...commandArgs];

const child = spawn(commandToRun, childArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (typeof code === 'number' && code === 0) {
    persistVersionForStandaloneBuild(appVersion);
  }

  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

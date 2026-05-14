import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = packageJson.version || 'unknown';

const addonSourceDir = path.join(root, 'addon');
const packageRoot = path.join(root, 'customer-packages', `haui-addon-v${version}`);
const addonTargetDir = path.join(packageRoot, 'haui_dashboard');

const addonRuntimeEntries = [
  'CHANGELOG.md',
  'DOCS.md',
  'Dockerfile',
  'config.yaml',
  'dist',
  'icon.png',
  'nginx.conf',
  'package-lock.json',
  'package.json',
  'run.sh',
  'server.js',
];

function runBuildAddon() {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-addon.mjs')], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyEntry(name) {
  const source = path.join(addonSourceDir, name);
  const target = path.join(addonTargetDir, name);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing required add-on runtime entry: ${source}`);
  }
  console.log(`Copying add-on runtime entry: ${name}`);
  copyRecursive(source, target);
}

function copyRecursive(source, destination) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }
  fs.copyFileSync(source, destination);
}

function writeCustomerInstallGuide() {
  const guide = `# HAUI Customer Package v${version}

This package is a runtime delivery package only. It intentionally excludes:

- HAUI development source code such as src/, public/, scripts/ and tests.
- Git metadata, local .env files, node_modules and development caches.
- License generation tools and private signing keys.

## Install

Copy the haui_dashboard directory to the Home Assistant host:

\`\`\`text
/addons/local/haui_dashboard
\`\`\`

Then open Home Assistant:

1. Settings -> Add-ons -> Add-on Store.
2. More menu -> Check for updates.
3. Local add-ons -> HAUI - 智能家庭中枢.
4. Fill HAUI_LICENSE_PUBLIC_KEY if Pro licensing is used.
5. Start the add-on and open the Web UI.

## License Activation

Customers should only see the machine code and the activation input in HAUI.
The developer generates the license code privately outside this package.
`;

  fs.writeFileSync(path.join(packageRoot, 'INSTALL.md'), guide);
}

runBuildAddon();

fs.rmSync(packageRoot, { recursive: true, force: true });
fs.mkdirSync(addonTargetDir, { recursive: true });

try {
  for (const entry of addonRuntimeEntries) {
    copyEntry(entry);
  }

  writeCustomerInstallGuide();

  console.log(`Customer package created: ${packageRoot}`);
  console.log('Runtime add-on directory:', addonTargetDir);
  console.log('Excluded from package: src, scripts, tests, node_modules, .git, .env, license tools and private keys.');
} catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
}

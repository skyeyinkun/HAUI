import { createSign, generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs';

function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`)
    .join(',')}}`;
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function usage() {
  console.log(`
Usage:
  node scripts/generate-license.mjs --machine=HAUI-MACHINE-XXXX-XXXX-XXXX --buyer="张三" --updatesUntil=2027-05-04

Optional:
  --licenseId=HAUI-20260503-001
  --features=pro,ai,camera_grid,wall_panel
  --privateKey=license-private.pem
  --initKeys=1
`);
}

const shouldInitKeys = getArg('initKeys') === '1';
const privateKeyPath = getArg('privateKey', 'license-private.pem');

if (shouldInitKeys) {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
  fs.writeFileSync('license-public.pem', publicKey);
  console.log(`Created ${privateKeyPath} and license-public.pem`);
  console.log('Put license-public.pem content into VITE_HAUI_LICENSE_PUBLIC_KEY for production builds.');
  process.exit(0);
}

const machineCode = getArg('machine');
if (!machineCode) {
  usage();
  process.exit(1);
}

if (!fs.existsSync(privateKeyPath)) {
  console.error(`Missing private key: ${privateKeyPath}`);
  console.error(`Run: node scripts/generate-license.mjs --initKeys=1`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const payload = {
  product: 'HAUI',
  edition: 'pro',
  licenseId: getArg('licenseId', `HAUI-${today.replaceAll('-', '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`),
  machineCode,
  buyer: getArg('buyer', ''),
  issuedAt: today,
  updatesUntil: getArg('updatesUntil', today),
  features: getArg('features', 'pro,ai,camera_grid,wall_panel')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
};

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const sign = createSign('SHA256');
sign.update(canonicalStringify(payload));
sign.end();

const license = {
  algorithm: 'ECDSA_P256_SHA256',
  payload,
  signature: sign.sign(privateKey).toString('base64url'),
};

console.log(base64Url(canonicalStringify(license)));

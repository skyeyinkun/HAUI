import { SignedLicense } from './license-types';
import { DEFAULT_HAUI_LICENSE_PUBLIC_KEY } from './default-public-key';

const LICENSE_PRODUCT = 'HAUI';
const LICENSE_ALGORITHM = 'ECDSA_P256_SHA256';
const PUBLIC_KEY_PEM = import.meta.env.VITE_HAUI_LICENSE_PUBLIC_KEY || DEFAULT_HAUI_LICENSE_PUBLIC_KEY;

export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`)
    .join(',')}}`;
}

function bytesToString(bytes: Uint8Array): string {
  let result = '';
  bytes.forEach((byte) => {
    result += String.fromCharCode(byte);
  });
  return result;
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function base64UrlToText(value: string): string {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

export function parseLicenseInput(input: string): SignedLicense {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('请输入授权码或授权文件内容');

  try {
    return JSON.parse(trimmed) as SignedLicense;
  } catch {
    return JSON.parse(base64UrlToText(trimmed)) as SignedLicense;
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
  return bytesToArrayBuffer(base64UrlToBytes(clean.replace(/\+/g, '-').replace(/\//g, '_')));
}

async function verifySignature(license: SignedLicense): Promise<boolean> {
  if (!PUBLIC_KEY_PEM.trim()) {
    throw new Error('授权公钥未配置');
  }

  const publicKey = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(PUBLIC_KEY_PEM),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );

  const data = new TextEncoder().encode(canonicalStringify(license.payload));
  const signature = base64UrlToBytes(license.signature);

  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    bytesToArrayBuffer(signature),
    bytesToArrayBuffer(data),
  );
}

export async function verifyLicenseInput(input: string, machineCode: string): Promise<SignedLicense> {
  const license = parseLicenseInput(input);

  if (license.algorithm !== LICENSE_ALGORITHM) {
    throw new Error('授权算法不匹配');
  }
  if (license.payload?.product !== LICENSE_PRODUCT) {
    throw new Error('授权产品不匹配');
  }
  if (license.payload.machineCode !== machineCode) {
    throw new Error('授权文件与当前机器码不匹配');
  }
  if (!license.payload.licenseId || !license.payload.issuedAt || !license.payload.updatesUntil) {
    throw new Error('授权文件缺少必要字段');
  }

  const signatureOk = await verifySignature(license);
  if (!signatureOk) throw new Error('授权签名验证失败');

  return license;
}

export function encodeLicensePackage(license: SignedLicense): string {
  const text = canonicalStringify(license);
  const bytes = new TextEncoder().encode(text);
  return btoa(bytesToString(bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

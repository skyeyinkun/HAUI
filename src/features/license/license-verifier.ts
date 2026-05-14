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

function trimDerInteger(bytes: Uint8Array): Uint8Array {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start += 1;
  return bytes.slice(start);
}

function leftPad32(bytes: Uint8Array): Uint8Array {
  const trimmed = trimDerInteger(bytes);
  if (trimmed.length > 32) throw new Error('授权签名格式不正确');
  const output = new Uint8Array(32);
  output.set(trimmed, 32 - trimmed.length);
  return output;
}

function readDerLength(bytes: Uint8Array, offset: number): { length: number; offset: number } {
  const first = bytes[offset];
  if (first === undefined) throw new Error('授权签名格式不正确');
  if (first < 0x80) return { length: first, offset: offset + 1 };

  const lengthBytes = first & 0x7f;
  if (lengthBytes < 1 || lengthBytes > 2 || offset + lengthBytes >= bytes.length) {
    throw new Error('授权签名格式不正确');
  }

  let length = 0;
  for (let index = 0; index < lengthBytes; index += 1) {
    length = (length << 8) | bytes[offset + 1 + index];
  }
  return { length, offset: offset + 1 + lengthBytes };
}

function derEcdsaSignatureToRaw(signature: Uint8Array): Uint8Array {
  if (signature.length === 64) return signature;
  if (signature[0] !== 0x30) throw new Error('授权签名格式不正确');

  const sequenceLength = readDerLength(signature, 1);
  let offset = sequenceLength.offset;
  if (offset + sequenceLength.length !== signature.length) throw new Error('授权签名格式不正确');

  if (signature[offset] !== 0x02) throw new Error('授权签名格式不正确');
  const rLength = readDerLength(signature, offset + 1);
  offset = rLength.offset;
  const r = signature.slice(offset, offset + rLength.length);
  offset += rLength.length;

  if (signature[offset] !== 0x02) throw new Error('授权签名格式不正确');
  const sLength = readDerLength(signature, offset + 1);
  offset = sLength.offset;
  const s = signature.slice(offset, offset + sLength.length);
  offset += sLength.length;
  if (offset !== signature.length) throw new Error('授权签名格式不正确');

  const raw = new Uint8Array(64);
  raw.set(leftPad32(r), 0);
  raw.set(leftPad32(s), 32);
  return raw;
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
  const signature = derEcdsaSignatureToRaw(base64UrlToBytes(license.signature));

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

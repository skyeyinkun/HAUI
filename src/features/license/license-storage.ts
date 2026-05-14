import { LicenseStatus, SignedLicense, StoredLicense } from './license-types';
import { verifyLicenseInput } from './license-verifier';

const LICENSE_STORAGE_KEY = 'haui_pro_license';

export function getStoredLicense(): StoredLicense | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredLicense;
  } catch {
    return null;
  }
}

export function getLicenseStatus(): LicenseStatus {
  const stored = getStoredLicense();
  if (!stored?.license?.payload) {
    return {
      edition: 'free',
      active: false,
      message: '系统未授权',
    };
  }

  const payload = stored.license.payload;
  return {
    edition: payload.edition,
    active: payload.edition === 'pro',
    payload,
    message: '系统已授权',
  };
}

export async function activateLicense(input: string, machineCode: string): Promise<LicenseStatus> {
  const license = await verifyLicenseInput(input, machineCode);
  saveLicense(license);
  return getLicenseStatus();
}

export function saveLicense(license: SignedLicense): void {
  const stored: StoredLicense = {
    license,
    activatedAt: new Date().toISOString(),
  };
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(stored));
}

export function clearLicense(): void {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
}

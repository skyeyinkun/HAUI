export type LicenseEdition = 'free' | 'pro';

export interface LicensePayload {
  product: 'HAUI';
  edition: LicenseEdition;
  licenseId: string;
  machineCode: string;
  buyer?: string;
  issuedAt: string;
  updatesUntil: string;
  features: string[];
}

export interface SignedLicense {
  algorithm: 'ECDSA_P256_SHA256';
  payload: LicensePayload;
  signature: string;
}

export interface StoredLicense {
  license: SignedLicense;
  activatedAt: string;
}

export interface LicenseStatus {
  edition: LicenseEdition;
  active: boolean;
  message: string;
  payload?: LicensePayload;
  machineCode?: string;
}

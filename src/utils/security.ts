import CryptoJS from 'crypto-js';

// In a real production app with a backend, this key should not be client-side.
// For a client-side only app, this prevents plain text storage but isn't bulletproof.
const SECRET_KEY = 'ha-dashboard-secure-key-v1-super-secret';

export const encryptToken = (token: string): string => {
  if (!token) return '';
  try {
    return CryptoJS.AES.encrypt(token, SECRET_KEY).toString();
  } catch (e) {
    console.error('Encryption failed', e);
    return token;
  }
};

export const decryptToken = (encryptedToken: string): string => {
  if (!encryptedToken) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption results in empty string but input wasn't, it might be plain text (or invalid key)
    // However, for migration purposes, if we can't decrypt it properly, we might assume it's plain text
    // BUT AES.decrypt usually returns empty string for non-encrypted text.
    if (!originalText && encryptedToken.length > 0) {
        // Fallback: assume it is plain text if it doesn't look like an encrypted string
        // Simple heuristic: encrypted strings (Base64) usually don't have spaces, etc.
        // But for safety, let's just return the input if decryption fails to produce output
        return encryptedToken;
    }
    return originalText;
  } catch (e) {
    console.warn('Decryption failed, assuming plain text', e);
    return encryptedToken; 
  }
};

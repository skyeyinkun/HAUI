export interface SafeStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => boolean;
  removeItem: (key: string) => boolean;
  clear: () => boolean;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function' ||
      typeof storage.removeItem !== 'function'
    ) {
      return null;
    }
    return storage;
  } catch {
    return null;
  }
}

export const safeLocalStorage: SafeStorage = {
  getItem(key) {
    try {
      return getStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      getStorage()?.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  removeItem(key) {
    try {
      getStorage()?.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  clear() {
    try {
      getStorage()?.clear();
      return true;
    } catch {
      return false;
    }
  },
};

export function readJsonFromStorage<T>(key: string, fallback: T): T {
  const raw = safeLocalStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonToStorage(key: string, value: unknown): boolean {
  try {
    return safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

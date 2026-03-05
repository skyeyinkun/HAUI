interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class CacheManager {
  private static readonly TTL_MS = 30 * 60 * 1000; // 30 minutes

  static get<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') return null;
    
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();

      if (now - entry.timestamp > this.TTL_MS) {
        // Optionally return stale data if needed, but for now just expire it
        // Or we could implement a "stale-while-revalidate" strategy in the hook
        // For simplicity, strict expiration here, but we can expose isStale later
        return null; 
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  static set<T>(key: string, data: T): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      console.warn('Cache write failed', e);
    }
  }

  static getStale<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      const entry: CacheEntry<T> = JSON.parse(item);
      return entry.data;
    } catch {
      return null;
    }
  }
}

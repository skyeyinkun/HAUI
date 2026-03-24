interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

/**
 * 缓存类型配置
 * 不同类型的数据有不同的过期时间
 */
export const CACHE_CONFIG = {
  /** 设备状态 - 2 分钟，适合实时性要求 */
  device_state: { stale: 2 * 60 * 1000, max: 10 * 60 * 1000 },
  /** 天气数据 - 30 分钟 */
  weather: { stale: 30 * 60 * 1000, max: 60 * 60 * 1000 },
  /** 实体注册表 - 30 分钟 */
  entity_registry: { stale: 30 * 60 * 1000, max: 60 * 60 * 1000 },
  /** 区域注册表 - 1 小时 */
  area_registry: { stale: 60 * 60 * 1000, max: 24 * 60 * 60 * 1000 },
  /** 用户配置 - 7 天 */
  user_config: { stale: 7 * 24 * 60 * 60 * 1000, max: 30 * 24 * 60 * 60 * 1000 },
  /** 场景数据 - 5 分钟 */
  scenes: { stale: 5 * 60 * 1000, max: 30 * 60 * 1000 },
  /** 默认 - 30 分钟 */
  default: { stale: 30 * 60 * 1000, max: 60 * 60 * 1000 }
} as const;

export type CacheType = keyof typeof CACHE_CONFIG;

export class CacheManager {
  private static readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

  /**
   * 获取缓存
   * @param key 缓存键
   * @param type 缓存类型（影响 TTL）
   * @returns 缓存数据或 null
   */
  static get<T>(key: string, type: CacheType = 'default'): { data: T | null; isStale: boolean } {
    if (typeof localStorage === 'undefined') return { data: null, isStale: false };
    
    try {
      const item = localStorage.getItem(key);
      if (!item) return { data: null, isStale: false };

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();
      const config = CACHE_CONFIG[type] || CACHE_CONFIG.default;
      
      // 检查是否超过最大时间
      if (now - entry.timestamp > config.max) {
        localStorage.removeItem(key);
        return { data: null, isStale: false };
      }
      
      // 返回数据并标记是否过期
      const isStale = now - entry.timestamp > config.stale;
      return { data: entry.data, isStale };
    } catch {
      return { data: null, isStale: false };
    }
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 要缓存的数据
   * @param type 缓存类型
   */
  static set<T>(key: string, data: T, type: CacheType = 'default'): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      // 检查存储空间
      const estimatedSize = JSON.stringify(data).length;
      if (estimatedSize > this.MAX_STORAGE_SIZE / 10) {
        console.warn(`Cache entry too large (${estimatedSize} bytes), skipping`);
        return;
      }

      const config = CACHE_CONFIG[type] || CACHE_CONFIG.default;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttlMs: config.stale
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      console.warn('Cache write failed', e);
    }
  }

  /**
   * 获取过期数据（不检查过期）
   * @param key 缓存键
   * @returns 缓存数据或 null
   */
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

  /**
   * 清除指定类型的缓存
   * @param pattern 可选的匹配模式
   */
  static invalidate(pattern?: string): void {
    if (typeof localStorage === 'undefined') return;

    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (!pattern || key.includes(pattern))) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));
  }

  /**
   * 清除所有缓存
   */
  static clear(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.clear();
  }
}

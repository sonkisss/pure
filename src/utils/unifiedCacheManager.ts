import { localForage } from "@/utils/localforage";

export interface CacheOptions {
  enablePersistence?: boolean;
  ttl?: number; // minutes, default 0 (forever)
}

export interface CacheStats {
  hits: number;
  misses: number;
  totalEntries: number; // Replaced size
  memoryUsage: number; // Approximate memory usage in bytes
}

export class UnifiedCache<T> {
  private namespace: string;
  private keyPrefix: string;
  private options: CacheOptions;
  private memoryCache: Map<string, { data: T; expires: number }>;
  private storage = localForage();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalEntries: 0,
    memoryUsage: 0
  };

  constructor(
    namespace: string,
    keyPrefix: string,
    options: CacheOptions = {}
  ) {
    this.namespace = namespace;
    this.keyPrefix = keyPrefix;
    this.options = options;
    this.memoryCache = new Map();

    // Register to global manager
    globalCacheManager.register(this);
  }

  get id(): string {
    return `${this.namespace}:${this.keyPrefix}`;
  }

  /**
   * 生成统一的缓存键
   */
  private generateKey(params: any): string {
    let paramStr = "";
    if (params && typeof params === "object") {
      const sortedKeys = Object.keys(params).sort();
      const sortedObj: Record<string, any> = {};
      sortedKeys.forEach(key => {
        sortedObj[key] = params[key];
      });
      paramStr = JSON.stringify(sortedObj);
    } else {
      paramStr = String(params);
    }
    return `${this.namespace}:${this.keyPrefix}:${paramStr}`;
  }

  private updateMemoryUsage(key: string, data: T, isAdd: boolean) {
    // Simple approximation: length of JSON string
    try {
      const size = JSON.stringify(data).length;
      if (isAdd) {
        this.stats.memoryUsage += size;
      } else {
        this.stats.memoryUsage = Math.max(0, this.stats.memoryUsage - size);
      }
    } catch {
      // Ignore serialization errors
    }
  }

  get(params: any): T | null {
    const key = this.generateKey(params);
    const item = this.memoryCache.get(key);

    if (item) {
      if (item.expires === 0 || item.expires > Date.now()) {
        this.stats.hits++;
        return item.data;
      } else {
        this.updateMemoryUsage(key, item.data, false);
        this.memoryCache.delete(key);
        this.stats.totalEntries = this.memoryCache.size;
      }
    }

    this.stats.misses++;
    return null;
  }

  async getAsync(params: any): Promise<T | null> {
    const memoryResult = this.get(params);
    if (memoryResult) return memoryResult;

    if (this.options.enablePersistence) {
      const key = this.generateKey(params);
      try {
        const stored = await this.storage.getItem<T>(key);
        if (stored) {
          this.memoryCache.set(key, {
            data: stored,
            expires: this.options.ttl
              ? Date.now() + this.options.ttl * 60 * 1000
              : 0
          });
          this.updateMemoryUsage(key, stored, true);
          this.stats.totalEntries = this.memoryCache.size;
          this.stats.hits++;
          return stored;
        }
      } catch (err) {
        console.warn("[UnifiedCache] persistence read error:", err);
      }
    }
    return null;
  }

  set(data: T, params: any): void {
    const key = this.generateKey(params);
    const expires = this.options.ttl
      ? Date.now() + this.options.ttl * 60 * 1000
      : 0;

    // Check if exists to update memory usage correctly
    const existing = this.memoryCache.get(key);
    if (existing) {
      this.updateMemoryUsage(key, existing.data, false);
    }

    this.memoryCache.set(key, { data, expires });
    this.updateMemoryUsage(key, data, true);
    this.stats.totalEntries = this.memoryCache.size;

    if (this.options.enablePersistence) {
      this.storage.setItem(key, data, this.options.ttl).catch(err => {
        console.warn("[UnifiedCache] persistence write error:", err);
      });
    }
  }

  has(params: any): boolean {
    const key = this.generateKey(params);
    const item = this.memoryCache.get(key);
    if (item) {
      if (item.expires === 0 || item.expires > Date.now()) {
        return true;
      } else {
        this.updateMemoryUsage(key, item.data, false);
        this.memoryCache.delete(key);
        this.stats.totalEntries = this.memoryCache.size;
      }
    }
    return false;
  }

  size(): number {
    return this.memoryCache.size;
  }

  clear(): void {
    this.memoryCache.clear();
    this.stats.totalEntries = 0;
    this.stats.memoryUsage = 0;

    if (this.options.enablePersistence) {
      this.clearPersistenceByPrefix(`${this.namespace}:${this.keyPrefix}`);
    }
  }

  clearByPrefix(prefix: string): void {
    for (const [key, value] of this.memoryCache.entries()) {
      if (key.includes(prefix)) {
        this.updateMemoryUsage(key, value.data, false);
        this.memoryCache.delete(key);
      }
    }
    this.stats.totalEntries = this.memoryCache.size;

    if (this.options.enablePersistence) {
      this.clearPersistenceByPrefix(prefix);
    }
  }

  private async clearPersistenceByPrefix(prefix: string) {
    try {
      const keys = await this.storage.keys();
      const keysToDelete = keys.filter(k => k.includes(prefix));
      for (const k of keysToDelete) {
        await this.storage.removeItem(k);
      }
    } catch {
      // 降级处理：如果数据库无法连接，尝试直接清理 LocalStorage
      localStorage.clear();
    }
  }

  getKeys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }
}

class GlobalCacheManager {
  private caches: Map<string, UnifiedCache<any>> = new Map();

  register(cache: UnifiedCache<any>) {
    this.caches.set(cache.id, cache);
  }

  getGlobalStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [id, cache] of this.caches.entries()) {
      stats[id] = cache.getStats();
    }
    return stats;
  }

  clearAll() {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }
}

export const globalCacheManager = new GlobalCacheManager();

export function createCache<T>(
  namespace: string,
  keyPrefix: string,
  options: CacheOptions = {}
) {
  return new UnifiedCache<T>(namespace, keyPrefix, options);
}

import { loggingService } from './LoggingService';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
}

export interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * In-memory cache service with TTL and LRU eviction
 * For production, consider using Redis for distributed caching
 */
class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize = 1000; // Maximum cache items
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired items every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);

    loggingService.info('Cache service initialized', {
      defaultTTL: this.defaultTTL,
      maxSize: this.maxSize
    });
  }

  /**
   * Set a value in cache
   */
  public set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const now = Date.now();

    // Check if we need to evict items due to size limit
    if (this.cache.size >= (options.maxSize || this.maxSize)) {
      this.evictLRU();
    }

    const item: CacheItem<T> = {
      value,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, item);

    loggingService.debug('Cache item set', {
      key,
      ttl,
      cacheSize: this.cache.size
    });
  }

  /**
   * Get a value from cache
   */
  public get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      loggingService.debug('Cache miss', { key });
      return null;
    }

    const now = Date.now();

    // Check if item has expired
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      loggingService.debug('Cache item expired', { key });
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = now;

    loggingService.debug('Cache hit', {
      key,
      accessCount: item.accessCount,
      age: now - item.timestamp
    });

    return item.value;
  }

  /**
   * Check if key exists in cache
   */
  public has(key: string): boolean {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key
   */
  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);

    if (deleted) {
      loggingService.debug('Cache item deleted', { key });
    }

    return deleted;
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();

    loggingService.info('Cache cleared', { previousSize: size });
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
    oldestItem: number;
    newestItem: number;
  } {
    const now = Date.now();
    let totalAccess = 0;
    let totalHits = 0;
    let oldestTimestamp = now;
    let newestTimestamp = 0;

    for (const [, item] of this.cache) {
      totalAccess++;
      totalHits += item.accessCount;

      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
      }

      if (item.timestamp > newestTimestamp) {
        newestTimestamp = item.timestamp;
      }
    }

    return {
      size: this.cache.size,
      hitRate: totalAccess > 0 ? (totalHits / totalAccess) * 100 : 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestItem: oldestTimestamp,
      newestItem: newestTimestamp
    };
  }

  /**
   * Get cache contents for debugging
   */
  public getContents(): Array<{
    key: string;
    age: number;
    ttl: number;
    accessCount: number;
    size: number;
  }> {
    const now = Date.now();
    const contents: Array<any> = [];

    for (const [key, item] of this.cache) {
      contents.push({
        key,
        age: now - item.timestamp,
        ttl: item.ttl,
        accessCount: item.accessCount,
        size: this.estimateItemSize(item.value)
      });
    }

    return contents.sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      loggingService.debug('Cache cleanup completed', {
        expiredItems: expiredCount,
        remainingItems: this.cache.size
      });
    }
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, item] of this.cache) {
      if (item.lastAccessed < lruTime) {
        lruTime = item.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      loggingService.debug('LRU eviction', { evictedKey: lruKey });
    }
  }

  /**
   * Estimate memory usage of cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, item] of this.cache) {
      totalSize += key.length * 2; // String characters are 2 bytes
      totalSize += this.estimateItemSize(item.value);
      totalSize += 64; // Overhead for CacheItem structure
    }

    return totalSize;
  }

  /**
   * Estimate size of a cached item
   */
  private estimateItemSize(value: any): number {
    if (typeof value === 'string') {
      return value.length * 2;
    } else if (typeof value === 'number') {
      return 8;
    } else if (typeof value === 'boolean') {
      return 4;
    } else if (Buffer.isBuffer(value)) {
      return value.length;
    } else if (typeof value === 'object') {
      return JSON.stringify(value).length * 2;
    }
    return 0;
  }

  /**
   * Graceful shutdown
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const stats = this.getStats();
    loggingService.info('Cache service shutdown', stats);

    this.clear();
  }
}

// Specific cache instances for different data types
export class ResponseCache extends CacheService {
  constructor() {
    super();
  }

  public cacheResponse(endpoint: string, params: any, response: any, ttl: number = 5 * 60 * 1000): void {
    const key = this.generateResponseKey(endpoint, params);
    this.set(key, response, { ttl });
  }

  public getCachedResponse(endpoint: string, params: any): any | null {
    const key = this.generateResponseKey(endpoint, params);
    return this.get(key);
  }

  private generateResponseKey(endpoint: string, params: any): string {
    const paramString = JSON.stringify(params);
    return `response:${endpoint}:${Buffer.from(paramString).toString('base64')}`;
  }
}

export class LicenseCache extends CacheService {
  constructor() {
    super();
  }

  public cacheLicense(licenseKey: string, license: any, ttl: number = 10 * 60 * 1000): void {
    this.set(`license:${licenseKey}`, license, { ttl });
  }

  public getCachedLicense(licenseKey: string): any | null {
    return this.get(`license:${licenseKey}`);
  }

  public invalidateLicense(licenseKey: string): void {
    this.delete(`license:${licenseKey}`);
  }
}

export class RateLimitCache extends CacheService {
  constructor() {
    super();
  }

  public cacheRateLimit(licenseId: string, rateLimitData: any, ttl: number = 60 * 1000): void {
    this.set(`ratelimit:${licenseId}`, rateLimitData, { ttl });
  }

  public getCachedRateLimit(licenseId: string): any | null {
    return this.get(`ratelimit:${licenseId}`);
  }
}

// Export singleton instances
export const responseCache = new ResponseCache();
export const licenseCache = new LicenseCache();
export const rateLimitCache = new RateLimitCache();

export default CacheService;
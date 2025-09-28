
// 🎯 SHERLOCK v33.0 - Unified Cache Manager
// مدیریت مرکزی تمام کش‌ها و بروزرسانی‌های هوشمند

export interface CacheConfig {
  ttl: number; // Time to live در میلی‌ثانیه
  maxSize: number;
  autoRefresh: boolean;
  dependencies: string[]; // کلیدهای وابسته
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  dependencies: string[];
  accessCount: number;
  lastAccess: number;
}

export class UnifiedCacheManager {
  private static instance: UnifiedCacheManager;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private refreshQueue: Set<string> = new Set();
  private refreshTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 300000);
  }

  public static getInstance(): UnifiedCacheManager {
    if (!UnifiedCacheManager.instance) {
      UnifiedCacheManager.instance = new UnifiedCacheManager();
    }
    return UnifiedCacheManager.instance;
  }

  /**
   * 🎯 تنظیم کش با پیکربندی پیشرفته
   */
  set<T>(
    key: string, 
    data: T, 
    config: Partial<CacheConfig> = {}
  ): void {
    const defaultConfig: CacheConfig = {
      ttl: 300000, // 5 minutes default
      maxSize: 1000,
      autoRefresh: false,
      dependencies: []
    };

    const finalConfig = { ...defaultConfig, ...config };

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: finalConfig.ttl,
      dependencies: finalConfig.dependencies,
      accessCount: 0,
      lastAccess: Date.now()
    };

    this.cache.set(key, entry);

    // ثبت وابستگی‌ها
    finalConfig.dependencies.forEach(dep => {
      if (!this.dependencyGraph.has(dep)) {
        this.dependencyGraph.set(dep, new Set());
      }
      this.dependencyGraph.get(dep)!.add(key);
    });

    console.log(`✅ SHERLOCK v33.0: Cached ${key} with TTL ${finalConfig.ttl}ms`);
  }

  /**
   * 🎯 دریافت از کش با آمارگیری
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // بررسی انقضا
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.invalidate(key);
      return null;
    }

    // آپدیت آمار دسترسی
    entry.accessCount++;
    entry.lastAccess = Date.now();

    console.log(`📊 SHERLOCK v33.0: Cache hit for ${key} (${entry.accessCount} accesses)`);
    return entry.data as T;
  }

  /**
   * 🎯 بروزرسانی هوشمند بر اساس وابستگی‌ها
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    
    // بروزرسانی کلیدهای وابسته
    const dependents = this.dependencyGraph.get(key);
    if (dependents) {
      dependents.forEach(depKey => {
        this.cache.delete(depKey);
        console.log(`🔄 SHERLOCK v33.0: Auto-invalidated dependent cache ${depKey}`);
      });
    }

    console.log(`❌ SHERLOCK v33.0: Invalidated cache ${key}`);
  }

  /**
   * 🎯 بروزرسانی انتخابی بر اساس تغییرات
   */
  conditionalRefresh(
    key: string, 
    condition: () => boolean, 
    refreshFn: () => Promise<any>
  ): void {
    if (condition()) {
      this.refreshQueue.add(key);
      this.scheduleRefresh();
    }
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) return;

    this.refreshTimer = setTimeout(async () => {
      const keysToRefresh = Array.from(this.refreshQueue);
      this.refreshQueue.clear();
      this.refreshTimer = null;

      console.log(`🔄 SHERLOCK v33.0: Batch refreshing ${keysToRefresh.length} cache entries`);
      
      // پردازش batch برای بهینه‌سازی عملکرد
      await Promise.allSettled(
        keysToRefresh.map(key => this.refreshCacheEntry(key))
      );
    }, 100); // 100ms delay برای batch processing
  }

  private async refreshCacheEntry(key: string): Promise<void> {
    try {
      // این متد باید توسط سرویس‌های مختلف پیاده‌سازی شود
      console.log(`🔄 SHERLOCK v33.0: Refreshing cache entry ${key}`);
    } catch (error) {
      console.error(`❌ SHERLOCK v33.0: Failed to refresh cache ${key}:`, error);
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 SHERLOCK v33.0: Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * 🎯 آمار کش برای مونیتورینگ
   */
  getStats(): any {
    const totalEntries = this.cache.size;
    const totalMemory = JSON.stringify([...this.cache.values()]).length;
    
    return {
      totalEntries,
      totalMemoryKB: Math.round(totalMemory / 1024),
      hitRate: this.calculateHitRate(),
      mostAccessed: this.getMostAccessedKeys(),
      oldestEntry: this.getOldestEntry()
    };
  }

  private calculateHitRate(): number {
    const entries = Array.from(this.cache.values());
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    return totalAccesses > 0 ? Math.round((totalAccesses / entries.length) * 100) / 100 : 0;
  }

  private getMostAccessedKeys(): Array<{key: string, accessCount: number}> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 5);
  }

  private getOldestEntry(): string | null {
    let oldest: [string, CacheEntry<any>] | null = null;
    
    for (const entry of this.cache.entries()) {
      if (!oldest || entry[1].timestamp < oldest[1].timestamp) {
        oldest = entry;
      }
    }
    
    return oldest ? oldest[0] : null;
  }
}

// Export singleton instance
export const unifiedCache = UnifiedCacheManager.getInstance();

/**
 * E-B8 Representative Metrics Refresh Optimization Service
 * 
 * هدف: کاهش زمان رفرش پس از Reset/Sync از N ثانیه به <2s
 * Strategy: Hook invalidate مرکزی، clearAllCaches(reason)، رویداد progress
 * 
 * Decision D27: E-B8 implementation following E-B7 dependency completion
 */

import { QueryClient } from '@tanstack/react-query';

interface RefreshMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  cacheKeysInvalidated: number;
  queriesRefetched: number;
  reason: string;
  representativeId?: number;
  success: boolean;
  errors?: string[];
}

interface OptimizedRefreshOptions {
  representativeId?: number;
  reason: string;
  cascadeGlobal?: boolean;
  immediate?: boolean;
  batchSize?: number;
  progressCallback?: (progress: number, stage: string) => void;
}

/**
 * E-B8 Optimized Cache Refresh Manager
 * Centralized and intelligent cache invalidation with performance tracking
 */
export class OptimizedCacheRefreshManager {
  private static instance: OptimizedCacheRefreshManager;
  private activeRefreshes = new Map<string, RefreshMetrics>();
  private refreshHistory: RefreshMetrics[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private pendingRefreshes: Set<string> = new Set();

  // E-B8 Performance Targets
  private static readonly PERFORMANCE_TARGETS = {
    MAX_REFRESH_TIME_MS: 2000, // <2s target
    MAX_CACHE_KEYS_PER_BATCH: 10,
    DEBOUNCE_WINDOW_MS: 100,
    MAX_CONCURRENT_REFRESHES: 3
  };

  static getInstance(): OptimizedCacheRefreshManager {
    if (!this.instance) {
      this.instance = new OptimizedCacheRefreshManager();
    }
    return this.instance;
  }

  /**
   * E-B8 Core: Intelligent cache refresh with performance optimization
   */
  async refreshRepresentativeMetrics(
    queryClient: QueryClient,
    options: OptimizedRefreshOptions
  ): Promise<RefreshMetrics> {
    const refreshId = `${options.representativeId || 'global'}_${Date.now()}`;
    const startTime = performance.now();

    const metrics: RefreshMetrics = {
      startTime,
      cacheKeysInvalidated: 0,
      queriesRefetched: 0,
      reason: options.reason,
      representativeId: options.representativeId,
      success: false
    };

    this.activeRefreshes.set(refreshId, metrics);

    try {
      console.log(`🚀 E-B8: Starting optimized cache refresh - ${refreshId} (${options.reason})`);

      // Stage 1: Debounced invalidation (prevent duplicate requests)
      if (this.pendingRefreshes.has(refreshId.split('_')[0])) {
        console.log(`⏭️ E-B8: Skipping duplicate refresh for ${options.representativeId}`);
        return metrics;
      }

      this.pendingRefreshes.add(refreshId.split('_')[0]);
      options.progressCallback?.(10, 'Preparing cache refresh');

      // Stage 2: Strategic cache key selection (avoid over-invalidation)
      const cacheKeys = this.getOptimalCacheKeys(options);
      metrics.cacheKeysInvalidated = cacheKeys.length;

      console.log(`📋 E-B8: Selected ${cacheKeys.length} optimal cache keys`);
      options.progressCallback?.(30, 'Invalidating cache entries');

      // Stage 3: Batch invalidation with timing control
      await this.performBatchInvalidation(queryClient, cacheKeys, options);
      options.progressCallback?.(70, 'Refreshing active queries');

      // Stage 4: Selective refetch (only active/visible queries)
      const refetchCount = await this.performSelectiveRefetch(queryClient, cacheKeys, options);
      metrics.queriesRefetched = refetchCount;

      options.progressCallback?.(90, 'Finalizing refresh');

      // Stage 5: Performance validation
      const endTime = performance.now();
      metrics.endTime = endTime;
      metrics.duration = endTime - startTime;
      metrics.success = metrics.duration <= OptimizedCacheRefreshManager.PERFORMANCE_TARGETS.MAX_REFRESH_TIME_MS;

      console.log(`✅ E-B8: Refresh completed in ${Math.round(metrics.duration)}ms (Target: <2000ms)`);
      
      if (!metrics.success) {
        console.warn(`⚠️ E-B8: Refresh exceeded target time: ${Math.round(metrics.duration)}ms > 2000ms`);
      }

      options.progressCallback?.(100, 'Complete');

      // Update history for analytics
      this.refreshHistory.push({ ...metrics });
      if (this.refreshHistory.length > 100) {
        this.refreshHistory.shift(); // Keep last 100 entries
      }

      return metrics;

    } catch (error) {
      console.error(`❌ E-B8: Cache refresh failed for ${refreshId}:`, error);
      metrics.success = false;
      metrics.errors = [error.message];
      return metrics;

    } finally {
      this.activeRefreshes.delete(refreshId);
      this.pendingRefreshes.delete(refreshId.split('_')[0]);
    }
  }

  /**
   * E-B8 Strategy: Intelligent cache key selection to avoid over-invalidation
   */
  private getOptimalCacheKeys(options: OptimizedRefreshOptions): string[] {
    const keys: string[] = [];

    if (options.representativeId) {
      // Representative-specific keys (high priority)
      keys.push(
        `/representatives/${options.representativeId}`,
        `unified-financial-representative-${options.representativeId}`,
        `rep_calc_${options.representativeId}`,
        `rep_financial_${options.representativeId}`
      );

      // Related keys (medium priority)
      if (options.cascadeGlobal) {
        keys.push(
          '/representatives',
          '/api/dashboard',
          '/api/unified-financial/summary'
        );
      }
    } else {
      // Global refresh keys
      keys.push(
        '/representatives',
        '/api/dashboard',
        '/api/unified-financial/summary',
        '/api/unified-financial/debtors',
        'global_summary',
        'all_representatives'
      );
    }

    // Limit batch size for performance
    return keys.slice(0, OptimizedCacheRefreshManager.PERFORMANCE_TARGETS.MAX_CACHE_KEYS_PER_BATCH);
  }

  /**
   * E-B8 Performance: Batch invalidation with timing control
   */
  private async performBatchInvalidation(
    queryClient: QueryClient,
    cacheKeys: string[],
    options: OptimizedRefreshOptions
  ): Promise<void> {
    const batchSize = options.batchSize || 5;
    
    for (let i = 0; i < cacheKeys.length; i += batchSize) {
      const batch = cacheKeys.slice(i, i + batchSize);
      
      // Parallel invalidation for batch
      await Promise.all(
        batch.map(async (key) => {
          try {
            queryClient.removeQueries({ queryKey: [key] });
            queryClient.invalidateQueries({ queryKey: [key] });
          } catch (error) {
            console.warn(`⚠️ E-B8: Failed to invalidate key ${key}:`, error);
          }
        })
      );

      // Small delay between batches to prevent overwhelming
      if (i + batchSize < cacheKeys.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  /**
   * E-B8 Efficiency: Selective refetch (only active/visible queries)
   */
  private async performSelectiveRefetch(
    queryClient: QueryClient,
    cacheKeys: string[],
    options: OptimizedRefreshOptions
  ): Promise<number> {
    let refetchCount = 0;

    // Only refetch active queries to avoid unnecessary network requests
    for (const key of cacheKeys) {
      try {
        const queryState = queryClient.getQueryState([key]);
        
        // Only refetch if query is actively used or stale
        if (queryState && (queryState.dataUpdatedAt === 0 || Date.now() - queryState.dataUpdatedAt > 30000)) {
          await queryClient.refetchQueries({
            queryKey: [key],
            type: 'active' // Only active queries
          });
          refetchCount++;
        }
      } catch (error) {
        console.warn(`⚠️ E-B8: Failed to refetch key ${key}:`, error);
      }
    }

    return refetchCount;
  }

  /**
   * E-B8 Analytics: Performance metrics for monitoring
   */
  getPerformanceMetrics(): {
    averageRefreshTime: number;
    successRate: number;
    recentRefreshes: RefreshMetrics[];
    targetsAchieved: boolean;
  } {
    const recent = this.refreshHistory.slice(-10);
    const successful = recent.filter(r => r.success);
    
    return {
      averageRefreshTime: successful.reduce((sum, r) => sum + (r.duration || 0), 0) / Math.max(successful.length, 1),
      successRate: successful.length / Math.max(recent.length, 1),
      recentRefreshes: recent,
      targetsAchieved: successful.every(r => (r.duration || 0) <= OptimizedCacheRefreshManager.PERFORMANCE_TARGETS.MAX_REFRESH_TIME_MS)
    };
  }

  /**
   * E-B8 Monitoring: Clear all caches with reason tracking
   */
  async clearAllCaches(queryClient: QueryClient, reason: string): Promise<RefreshMetrics> {
    return this.refreshRepresentativeMetrics(queryClient, {
      reason: `clear_all_${reason}`,
      cascadeGlobal: true,
      immediate: true,
      batchSize: 8
    });
  }
}

// Export for use in components
export const optimizedCacheRefresh = OptimizedCacheRefreshManager.getInstance();
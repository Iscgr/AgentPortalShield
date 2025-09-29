/**
 * E-B8 React Hook for Optimized Cache Refresh
 * 
 * Usage: const { refreshMetrics, clearAllCaches, isRefreshing } = useOptimizedCacheRefresh();
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { optimizedCacheRefresh, OptimizedCacheRefreshManager } from '@/services/optimized-cache-refresh';

interface UseOptimizedCacheRefreshReturn {
  refreshMetrics: (options: {
    representativeId?: number;
    reason: string;
    cascadeGlobal?: boolean;
    onProgress?: (progress: number, stage: string) => void;
  }) => Promise<void>;
  clearAllCaches: (reason: string) => Promise<void>;
  isRefreshing: boolean;
  lastRefreshDuration: number | null;
  performanceMetrics: ReturnType<OptimizedCacheRefreshManager['getPerformanceMetrics']> | null;
}

export function useOptimizedCacheRefresh(): UseOptimizedCacheRefreshReturn {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshDuration, setLastRefreshDuration] = useState<number | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<ReturnType<OptimizedCacheRefreshManager['getPerformanceMetrics']> | null>(null);

  const refreshMetrics = useCallback(async (options: {
    representativeId?: number;
    reason: string;
    cascadeGlobal?: boolean;
    onProgress?: (progress: number, stage: string) => void;
  }) => {
    if (isRefreshing) {
      console.log('🔄 E-B8: Refresh already in progress, skipping duplicate request');
      return;
    }

    setIsRefreshing(true);
    try {
      const result = await optimizedCacheRefresh.refreshRepresentativeMetrics(queryClient, {
        ...options,
        immediate: true,
        progressCallback: options.onProgress
      });

      setLastRefreshDuration(result.duration || null);
      setPerformanceMetrics(optimizedCacheRefresh.getPerformanceMetrics());

      console.log(`✅ E-B8: Cache refresh completed - Duration: ${result.duration}ms, Success: ${result.success}`);
    } catch (error) {
      console.error('❌ E-B8: Cache refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, isRefreshing]);

  const clearAllCaches = useCallback(async (reason: string) => {
    if (isRefreshing) {
      console.log('🔄 E-B8: Refresh already in progress, skipping clear all request');
      return;
    }

    setIsRefreshing(true);
    try {
      const result = await optimizedCacheRefresh.clearAllCaches(queryClient, reason);
      setLastRefreshDuration(result.duration || null);
      setPerformanceMetrics(optimizedCacheRefresh.getPerformanceMetrics());

      console.log(`✅ E-B8: Clear all caches completed - Duration: ${result.duration}ms`);
    } catch (error) {
      console.error('❌ E-B8: Clear all caches failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, isRefreshing]);

  return {
    refreshMetrics,
    clearAllCaches,
    isRefreshing,
    lastRefreshDuration,
    performanceMetrics
  };
}
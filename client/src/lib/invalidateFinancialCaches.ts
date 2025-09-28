// Centralized cache invalidation utility
// SHERLOCK v1.0: Unified financial cache invalidation
import { QueryClient } from '@tanstack/react-query';

interface InvalidateOptions {
  representativeId?: number | string;
  representativeCode?: string | number;
  includeDashboard?: boolean;
  includePayments?: boolean;
  includeStatistics?: boolean;
  reason?: string;
}

export async function invalidateFinancialCaches(queryClient: QueryClient, opts: InvalidateOptions = {}) {
  const { representativeId, representativeCode, includeDashboard = true, includePayments = true, includeStatistics = true } = opts;

  const keys: any[] = [
    ['/representatives'],
    ['representatives'], // legacy
    ['/api/unified-financial/debtors']
  ];

  if (representativeId) {
    keys.push([`unified-financial-representative-${representativeId}`]);
    keys.push([`/api/representatives/${representativeCode || representativeId}`]);
  }

  if (includeDashboard) {
    keys.push(['/api/dashboard']);
    keys.push(['/api/unified-financial/summary']);
  }

  if (includePayments) {
    keys.push(['/api/payments']);
  }

  if (includeStatistics) {
    keys.push(['/api/unified-statistics']);
  }

  for (const key of keys) {
    try {
      queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      // Swallow individual errors to continue other invalidations
      console.warn('Cache invalidation warning for key', key, e);
    }
  }
}

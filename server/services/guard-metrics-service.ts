/**
 * GuardMetricsService
 * ثبت شمارنده ساده در حافظه برای violation ها (موقت تا افزوده شدن پایگاه metrics دائمی).
 */

import { GuardMetricsPersistenceService } from './guard-metrics-persistence-service.js';
import { featureFlagManager } from './feature-flag-manager.js';

interface ViolationRecord {
  type: string;
  timestamp: number;
  context?: any;
}

class GuardMetricsServiceClass {
  private counters: Record<string, number> = {};
  private recent: ViolationRecord[] = [];
  private maxRecent = 200;

  record(type: string, context?: any) {
    this.counters[type] = (this.counters[type] || 0) + 1;
    const rec = { type, timestamp: Date.now(), context };
    this.recent.push(rec);
    if (this.recent.length > this.maxRecent) this.recent.shift();
    // Persistence (shadow/enforce)
    const persistState = featureFlagManager.getMultiStageFlagState('guard_metrics_persistence');
    if (persistState === 'shadow' || persistState === 'enforce') {
      // سطح (level) فعلاً نامشخص؛ بعداً می‌تواند بر اساس گارد runtime تعیین شود
      GuardMetricsPersistenceService.enqueue(type, undefined, context);
    }
  }

  snapshot() {
    return {
      counters: { ...this.counters },
      recent: [...this.recent]
    };
  }

  reset() {
    this.counters = {};
    this.recent = [];
  }
}

export const GuardMetricsService = new GuardMetricsServiceClass();

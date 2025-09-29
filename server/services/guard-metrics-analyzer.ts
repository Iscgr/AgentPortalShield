import { GuardMetricsPersistenceService } from './guard-metrics-persistence-service.js';
import { getThresholdFor } from './guard-metrics-thresholds.js';

export interface GuardAlert {
  type: string;
  countLastHour: number;
  level: 'warn' | 'critical';
  threshold: number;
}

/**
 * GuardMetricsAnalyzer: تولید alert ها بر اساس window 60 دقیقه اخیر.
 */
export class GuardMetricsAnalyzer {
  static async computeCurrentAlerts(): Promise<GuardAlert[]> {
    const hourSummary = await GuardMetricsPersistenceService.getSummary(60);
    const alerts: GuardAlert[] = [];
    for (const [type, count] of Object.entries(hourSummary)) {
      const th = getThresholdFor(type);
      if (count >= th.critical) {
        alerts.push({ type, countLastHour: count, level: 'critical', threshold: th.critical });
      } else if (count >= th.warn) {
        alerts.push({ type, countLastHour: count, level: 'warn', threshold: th.warn });
      }
    }
    // مرتب بحرانی‌ها جلوتر
    alerts.sort((a,b) => (a.level === b.level ? b.countLastHour - a.countLastHour : a.level === 'critical' ? -1 : 1));
    return alerts;
  }
}

import { GuardMetricsService } from '../services/guard-metrics-service.js';
import { GuardMetricsPersistenceService } from '../services/guard-metrics-persistence-service.js';
import { featureFlagManager } from '../services/feature-flag-manager.js';
import { GuardMetricsAnalyzer } from '../services/guard-metrics-analyzer.js';

async function run() {
  try {
    featureFlagManager.updateMultiStageFlag('guard_metrics_persistence', 'shadow', 'test_alerts');
    // تولید تعداد رویداد برای رسیدن به warn و critical (براساس threshold پیش‌فرض) برای invariant_violation_I6
    for (let i=0;i<7;i++) {
      GuardMetricsService.record('invariant_violation_I6');
    }
    await GuardMetricsPersistenceService.flushImmediate();
    const alerts = await GuardMetricsAnalyzer.computeCurrentAlerts();
    const target = alerts.find(a => a.type === 'invariant_violation_I6');
    if (!target) throw new Error('Alert not generated');
    if (target.level !== 'critical') throw new Error('Expected critical level, got ' + target.level);
    console.log('guard-metrics-alerts.spec.ts PASS', target);
  } catch (e:any) {
    console.error('guard-metrics-alerts.spec.ts FAIL', e.message);
  }
}

run();
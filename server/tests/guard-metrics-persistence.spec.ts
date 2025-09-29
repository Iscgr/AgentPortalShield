import { GuardMetricsService } from '../services/guard-metrics-service.js';
import { GuardMetricsPersistenceService } from '../services/guard-metrics-persistence-service.js';
import { featureFlagManager } from '../services/feature-flag-manager.js';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    // فعال کردن فلگ در حالت shadow
    featureFlagManager.updateMultiStageFlag('guard_metrics_persistence', 'shadow', 'test');
    // ثبت چند رویداد
    GuardMetricsService.record('test_violation_type_a');
    GuardMetricsService.record('test_violation_type_a');
    GuardMetricsService.record('test_violation_type_b');
    // فلش دستی
    await GuardMetricsPersistenceService.flushImmediate();
    // شمارش DB
    const res: any = await db.execute(sql`SELECT event_type, COUNT(*) AS c FROM guard_metrics_events WHERE event_type LIKE 'test_violation_type_%' GROUP BY event_type`);
    const rows = res.rows || [];
    if (rows.length === 0) throw new Error('No rows persisted');
    const map: Record<string, number> = {};
    rows.forEach((r:any) => map[r.event_type] = Number(r.c));
    if (map['test_violation_type_a'] !== 2 || map['test_violation_type_b'] !== 1) {
      throw new Error('Counts mismatch: ' + JSON.stringify(map));
    }
    console.log('guard-metrics-persistence.spec.ts PASS', map);
  } catch (e:any) {
    console.error('guard-metrics-persistence.spec.ts FAIL', e.message);
  }
}

run();
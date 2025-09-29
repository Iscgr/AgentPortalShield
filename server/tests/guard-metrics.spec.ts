import { GuardMetricsService } from '../services/guard-metrics-service.js';
import { strict as assert } from 'assert';

try {
  // Reset state for deterministic test
  GuardMetricsService.reset();
  GuardMetricsService.record('TEST_VIOLATION', { sample: 1 });
  GuardMetricsService.record('TEST_VIOLATION', { sample: 2 });
  GuardMetricsService.record('ANOTHER_VIOLATION');

  const snap = GuardMetricsService.snapshot();
  assert.equal(snap.counters.TEST_VIOLATION, 2, 'Expected counter TEST_VIOLATION=2');
  assert.equal(snap.counters.ANOTHER_VIOLATION, 1, 'Expected counter ANOTHER_VIOLATION=1');
  assert.ok(Array.isArray(snap.recent) && snap.recent.length === 3, 'Recent length mismatch');
  console.log('guard-metrics.spec.ts PASS');
} catch (e) {
  console.error('guard-metrics.spec.ts FAIL', e);
  process.exit(1);
}

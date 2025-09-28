import { Router } from 'express';
import { featureFlagManager } from '../services/feature-flag-manager';

// Multi-stage Flags Management Routes (Phase A - Iteration 7+)
// پایدار و قابل audit برای کنترل state پرچم‌های گذار حیاتی.
// Base path: /api/multistage-flags
// Endpoints:
//  GET / -> لیست تمام پرچم‌ها با state
//  GET /:flag -> وضعیت یک پرچم
//  POST /:flag { state } -> تغییر state (اعتبارسنجی allowed)

const router = Router();

// ساده: در آینده می‌توان unifiedAuthMiddleware را تزریق کرد؛ فعلاً فرض auth بالا دستی
router.get('/', (req, res) => {
  const status = featureFlagManager.getStatus();
  const multi = Object.entries(status)
    .filter(([k]) => k in status) // redundancy safe
    .filter(([k]) => k.includes('allocation_') || k.includes('ledger_') || k.includes('reconciliation') || k.includes('outbox'))
    .map(([k, v]: any) => ({ key: k, state: v.state, active: v.active }));
  res.json({ success: true, flags: multi, timestamp: new Date().toISOString() });
});

router.get('/:flag', (req, res) => {
  const flag = req.params.flag as any;
  try {
    const state = featureFlagManager.getMultiStageFlagState(flag);
    res.json({ success: true, flag, state });
  } catch (e: any) {
    res.status(404).json({ success: false, error: e.message });
  }
});

router.post('/:flag', (req, res) => {
  const flag = req.params.flag as any;
  const newState = (req.body?.state || req.query.state || '').toString();
  if (!newState) return res.status(400).json({ success: false, error: 'state required' });
  try {
    featureFlagManager.updateMultiStageFlag(flag, newState, (req.session as any)?.user?.username || 'api');
    res.json({ success: true, flag, newState });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message });
  }
});

export default router;

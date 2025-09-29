import { Router } from 'express';
import { GuardMetricsService } from '../services/guard-metrics-service.js';
import { GuardMetricsPersistenceService } from '../services/guard-metrics-persistence-service.js';
import { featureFlagManager } from '../services/feature-flag-manager.js';
import { unifiedAuthMiddleware } from '../middleware/unified-auth.js';
import { GuardMetricsAnalyzer } from '../services/guard-metrics-analyzer.js';

/**
 * Guard Metrics Routes (Slice 5)
 * فقط خوانش snapshot – بدون state mutation (جز reset اختیاری آینده).
 */
const router = Router();

router.use(unifiedAuthMiddleware);

router.get('/guard-metrics', async (req, res) => {
  try {
    const snapshot = GuardMetricsService.snapshot();
    const state = featureFlagManager.getMultiStageFlagState('guard_metrics_persistence');
    const alertsState = featureFlagManager.getMultiStageFlagState('guard_metrics_alerts');
    let persistedSummary: any = null;
    let alerts: any[] = [];
    if (state === 'enforce') {
      // خلاصه 60 دقیقه اخیر و 1440 دقیقه (24h)
      const lastHour = await GuardMetricsPersistenceService.getSummary(60);
      const lastDay = await GuardMetricsPersistenceService.getSummary(60 * 24);
      persistedSummary = { lastHour, lastDay };
      if (alertsState === 'on') {
        alerts = await GuardMetricsAnalyzer.computeCurrentAlerts();
      }
    }
    res.json({ success: true, data: snapshot, persistence: { state, summary: persistedSummary }, alerts: { state: alertsState, items: alerts } });
  } catch (e:any) {
    res.status(500).json({ success: false, error: e.message || 'خطای ناشناخته' });
  }
});

// تاریخچه ساده: window=1h|24h (پیش‌فرض 1h)
router.get('/guard-metrics/history', async (req, res) => {
  try {
    const windowParam = (req.query.window || '1h').toString();
    const mapping: Record<string, number> = { '1h': 60, '24h': 60*24 };
    const minutes = mapping[windowParam] || 60;
    const summary = await GuardMetricsPersistenceService.getSummary(minutes);
    res.json({ success: true, window: windowParam, minutes, summary });
  } catch (e:any) {
    res.status(500).json({ success:false, error: e.message || 'خطای ناشناخته' });
  }
});

// Endpoint مجزا برای دریافت صرفاً alert ها
router.get('/guard-metrics/alerts', async (req, res) => {
  try {
    const persistState = featureFlagManager.getMultiStageFlagState('guard_metrics_persistence');
    const alertsState = featureFlagManager.getMultiStageFlagState('guard_metrics_alerts');
    if (persistState !== 'enforce' || alertsState !== 'on') {
      return res.json({ success: true, items: [], disabled: true, reason: 'alerts inactive' });
    }
    const alerts = await GuardMetricsAnalyzer.computeCurrentAlerts();
    res.json({ success: true, items: alerts });
  } catch (e:any) {
    res.status(500).json({ success:false, error: e.message || 'خطای ناشناخته' });
  }
});

export default router;

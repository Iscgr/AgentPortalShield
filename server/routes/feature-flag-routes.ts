
/**
 * ATOMOS FEATURE FLAG CONTROL API
 * Real-time flag management for gradual rollout
 */

import { Router } from 'express';
import { featureFlagManager } from '../services/feature-flag-manager.js';

const router = Router();

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  const isAdminAuthenticated = req.session?.authenticated === true;
  
  if (isAdminAuthenticated) {
    next();
  } else {
    res.status(401).json({ error: "فقط ادمین مجاز است" });
  }
};

/**
 * Get current feature flag status
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const flagStatus = featureFlagManager.getStatus();
    const flags = featureFlagManager.getFlags();
    
    res.json({
      success: true,
      flags: flagStatus,
      detailed: flags,
      systemHealth: {
        flagsActive: Object.values(flagStatus).filter(f => f.active).length,
        totalFlags: Object.keys(flagStatus).length,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Feature flag status error:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در دریافت وضعیت feature flags'
    });
  }
});

/**
 * Update specific feature flag
 */
router.post('/update/:feature', requireAuth, async (req, res) => {
  try {
    const { feature } = req.params;
    const { enabled, percentage, conditions } = req.body;
    
    if (!['UNIFIED_FINANCIAL_ENGINE', 'BATCH_QUERY_OPTIMIZATION', 'CACHE_OPTIMIZATION', 'REAL_TIME_SYNC', 'PERFORMANCE_MONITORING'].includes(feature)) {
      return res.status(400).json({
        success: false,
        error: 'نام feature نامعتبر است'
      });
    }

    const updates: any = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (typeof percentage === 'number' && percentage >= 0 && percentage <= 100) updates.percentage = percentage;
    if (Array.isArray(conditions)) updates.conditions = conditions;

    featureFlagManager.updateFlag(feature as any, updates, 'admin_manual');

    res.json({
      success: true,
      message: `Feature ${feature} بروزرسانی شد`,
      newStatus: featureFlagManager.getStatus()[feature],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Feature flag update error:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در بروزرسانی feature flag'
    });
  }
});

/**
 * Progressive rollout activation
 */
router.post('/progressive-rollout/:feature', requireAuth, async (req, res) => {
  try {
    const { feature } = req.params;
    const { targetPercentage = 5 } = req.body;

    featureFlagManager.activateProgressiveRollout(feature as any, targetPercentage);

    res.json({
      success: true,
      message: `Progressive rollout شروع شد برای ${feature}`,
      targetPercentage,
      currentStatus: featureFlagManager.getStatus()[feature],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Progressive rollout error:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در شروع progressive rollout'
    });
  }
});

/**
 * Emergency disable all optimizations
 */
router.post('/emergency-disable', requireAuth, async (req, res) => {
  try {
    const { reason = 'manual_emergency' } = req.body;
    
    featureFlagManager.emergencyDisableAll(reason);
    
    res.json({
      success: true,
      message: 'همه optimizations به صورت اضطراری غیرفعال شدند',
      reason,
      timestamp: new Date().toISOString(),
      finalStatus: featureFlagManager.getStatus()
    });
  } catch (error) {
    console.error('Emergency disable error:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در غیرفعال‌سازی اضطراری'
    });
  }
});

/**
 * Test feature flag for specific request
 */
router.post('/test/:feature', requireAuth, async (req, res) => {
  try {
    const { feature } = req.params;
    const { requestId, userGroup } = req.body;
    
    const isEnabled = featureFlagManager.isEnabled(feature as any, { requestId, userGroup });
    
    res.json({
      success: true,
      feature,
      enabled: isEnabled,
      context: { requestId, userGroup },
  flagConfig: (featureFlagManager.getFlags() as any)[feature as any]
    });
  } catch (error) {
    console.error('Feature flag test error:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در تست feature flag'
    });
  }
});

export default router;

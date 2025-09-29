/**
 * Active Reconciliation Engine API Routes
 * Phase B: E-B4 Implementation - Advanced Reconciliation Management
 */

import { Router } from 'express';
import { z } from 'zod';
import { activeReconciliationEngine } from '../services/active-reconciliation-engine.js';
import { featureFlagManager } from '../services/feature-flag-manager.js';
import errorManager from '../unified-error-manager.js';
import { ReconciliationService } from '../services/reconciliation-service.js';

const router = Router();

// Schema validation for reconciliation requests
const ReconciliationRequestSchema = z.object({
  mode: z.enum(['dry', 'enforce']).default('dry'),
  representatives: z.array(z.number()).optional(),
  threshold: z.number().min(0).max(1).default(0.05),
  includeAnomalies: z.boolean().default(true),
  maxActions: z.number().min(1).max(1000).default(100)
});

const ReconciliationStatusSchema = z.object({
  runId: z.string().uuid()
});

/**
 * POST /api/reconciliation/run
 * Trigger Active Reconciliation Engine execution
 */
router.post('/run', async (req, res) => {
  try {
    // Validate feature flag
    const reconciliationFlag = featureFlagManager.getMultiStageFlagState('active_reconciliation');
    if (reconciliationFlag === 'off') {
      return res.status(503).json({
        success: false,
        error: 'FEATURE_DISABLED',
        message: 'Active Reconciliation is currently disabled'
      });
    }

    // Validate request
    const validationResult = ReconciliationRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: validationResult.error.errors
      });
    }

    const { mode, representatives: representativeIds, threshold, includeAnomalies, maxActions } = validationResult.data;

    // Safety check for enforce mode
    if (mode === 'enforce' && reconciliationFlag !== 'enforce') {
      return res.status(403).json({
        success: false,
        error: 'ENFORCE_MODE_DISABLED',
        message: 'Enforce mode requires feature flag to be set to "enforce"',
        current_flag_status: reconciliationFlag
      });
    }

    // Execute reconciliation
    const startTime = Date.now();
    const result = await activeReconciliationEngine.runActiveReconciliation({
      mode,
      representativeIds,
      driftThreshold: threshold,
      usePythonEnhanced: includeAnomalies
    });

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        ...result,
        execution_time_ms: executionTime,
        feature_flag_status: reconciliationFlag
      }
    });

  } catch (error) {
    console.error('Active reconciliation execution failed:', error);
    
    await errorManager.logSystemError('Active reconciliation execution failed', error);

    res.status(500).json({
      success: false,
      error: 'EXECUTION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to execute reconciliation',
      ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
    });
  }
});

/**
 * GET /api/reconciliation/status/:runId
 * Get reconciliation run status and results
 */
router.get('/status/:runId', async (req, res) => {
  try {
    const validationResult = ReconciliationStatusSchema.safeParse({ runId: req.params.runId });
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_RUN_ID',
        message: 'Run ID must be a valid UUID'
      });
    }

    const { runId } = validationResult.data;
    const status = await activeReconciliationEngine.getReconciliationStatus(runId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'RUN_NOT_FOUND',
        message: 'Reconciliation run not found'
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Failed to get reconciliation status:', error);
    
    await errorManager.logSystemError('Failed to get reconciliation status', error);

    res.status(500).json({
      success: false,
      error: 'STATUS_FETCH_FAILED',
      message: error instanceof Error ? error.message : 'Failed to get reconciliation status'
    });
  }
});

/**
 * GET /api/reconciliation/history
 * Get recent reconciliation runs history
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (limit > 500 || limit < 1) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_LIMIT',
        message: 'Limit must be between 1 and 500'
      });
    }

    const history = await activeReconciliationEngine.getReconciliationHistory({
      limit,
      offset
    });

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Failed to get reconciliation history:', error);
    
    await errorManager.logSystemError('Failed to get reconciliation history', error);

    res.status(500).json({
      success: false,
      error: 'HISTORY_FETCH_FAILED',
      message: error instanceof Error ? error.message : 'Failed to get reconciliation history'
    });
  }
});

/**
 * POST /api/reconciliation/cancel/:runId
 * Cancel running reconciliation
 */
router.post('/cancel/:runId', async (req, res) => {
  try {
    const validationResult = ReconciliationStatusSchema.safeParse({ runId: req.params.runId });
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_RUN_ID',
        message: 'Run ID must be a valid UUID'
      });
    }

    const { runId } = validationResult.data;
    const result = await activeReconciliationEngine.cancelReconciliation(runId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'CANCELLATION_FAILED',
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Reconciliation cancelled successfully'
    });

  } catch (error) {
    console.error('Failed to cancel reconciliation:', error);
    
    await errorManager.logSystemError('Failed to cancel reconciliation', error);

    res.status(500).json({
      success: false,
      error: 'CANCELLATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to cancel reconciliation'
    });
  }
});

/**
 * GET /api/reconciliation/summary
 * خلاصه لحظه‌ای drift (global + top representatives) بدون ثبت رکورد پایگاه داده.
 * پارامترهای اختیاری:
 *   limit: تعداد نمایندگان در breakdown (پیش‌فرض 20)
 */
router.get('/summary', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    // اجرای محاسبه global بدون ثبت (record=false)
    const global = await ReconciliationService.runShadowDriftCheck({ record: false });
    const breakdown = await ReconciliationService.runShadowDriftBreakdown(limit);
    res.json({ success: true, data: { global, breakdown, limit } });
  } catch (error:any) {
    console.error('Failed to get reconciliation summary:', error);
    await errorManager.logSystemError('Failed to get reconciliation summary', error);
    res.status(500).json({ success: false, error: 'SUMMARY_FAILED', message: error.message || 'خطا در خلاصه drift' });
  }
});

export default router;
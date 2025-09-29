// Phase C: E-C1 Outbox API Routes
// Purpose: API endpoints برای مدیریت outbox و monitoring

import { Router } from 'express';
import { OutboxService } from '../services/outbox';
import { OutboxWorker } from '../services/outbox-worker';
import { FeatureFlagManager } from '../services/feature-flag-manager';
import { z } from 'zod';

const router = Router();

// Validation schemas
const enqueueMessageSchema = z.object({
  type: z.enum(['TELEGRAM_MESSAGE', 'EMAIL', 'WEBHOOK']),
  payload: z.object({
    recipient: z.string(),
    message: z.string(),
    options: z.record(z.any()).optional()
  })
});

let outboxService: OutboxService;
let outboxWorker: OutboxWorker;
let featureFlagManager: FeatureFlagManager;

/**
 * Initialize outbox routes with dependencies
 */
export function initializeOutboxRoutes(
  _outboxService: OutboxService,
  _outboxWorker: OutboxWorker,
  _featureFlagManager: FeatureFlagManager
) {
  outboxService = _outboxService;
  outboxWorker = _outboxWorker;
  featureFlagManager = _featureFlagManager;
}

/**
 * POST /api/outbox/enqueue
 * ارسال پیام جدید به outbox
 */
router.post('/enqueue', async (req, res) => {
  try {
    const isEnabled = await featureFlagManager.isEnabled('outbox_enabled');
    if (!isEnabled) {
      return res.status(503).json({
        success: false,
        error: 'Outbox service is disabled'
      });
    }

    const validationResult = enqueueMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.issues
      });
    }

    const messageId = await outboxService.enqueueMessage(validationResult.data);

    res.json({
      success: true,
      data: {
        messageId,
        status: 'enqueued'
      }
    });
  } catch (error) {
    console.error('Outbox enqueue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enqueue message',
      details: error.message
    });
  }
});

/**
 * GET /api/outbox/metrics
 * دریافت آمار outbox برای KPI monitoring
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await outboxService.getMetrics();
    const workerStatus = outboxWorker.getStatus();

    res.json({
      success: true,
      data: {
        outbox: metrics,
        worker: workerStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Outbox metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      details: error.message
    });
  }
});

/**
 * GET /api/outbox/status
 * بررسی وضعیت outbox service
 */
router.get('/status', async (req, res) => {
  try {
    const isEnabled = await featureFlagManager.isEnabled('outbox_enabled');
    const workerStatus = outboxWorker.getStatus();
    const metrics = await outboxService.getMetrics();

    res.json({
      success: true,
      data: {
        enabled: isEnabled,
        worker: workerStatus,
        health: {
          successRate: metrics.successRate,
          pendingMessages: metrics.pendingMessages,
          failedMessages: metrics.failedMessages
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Outbox status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve status',
      details: error.message
    });
  }
});

/**
 * POST /api/outbox/worker/start
 * شروع outbox worker (admin only)
 */
router.post('/worker/start', async (req, res) => {
  try {
    await outboxWorker.start();
    
    res.json({
      success: true,
      message: 'Outbox worker started'
    });
  } catch (error) {
    console.error('Worker start error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start worker',
      details: error.message
    });
  }
});

/**
 * POST /api/outbox/worker/stop
 * توقف outbox worker (admin only)
 */
router.post('/worker/stop', async (req, res) => {
  try {
    await outboxWorker.stop();
    
    res.json({
      success: true,
      message: 'Outbox worker stopped'
    });
  } catch (error) {
    console.error('Worker stop error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop worker',
      details: error.message
    });
  }
});

/**
 * POST /api/outbox/cleanup
 * پاک‌سازی پیام‌های قدیمی (admin only)
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { olderThanDays = 30 } = req.body;
    
    const deletedCount = await outboxService.cleanupOldMessages(olderThanDays);
    
    res.json({
      success: true,
      data: {
        deletedCount,
        olderThanDays
      }
    });
  } catch (error) {
    console.error('Outbox cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup messages',
      details: error.message
    });
  }
});

export default router;
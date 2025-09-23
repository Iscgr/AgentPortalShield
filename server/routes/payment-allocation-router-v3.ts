
/**
 * ATOMOS v3.0: PAYMENT ALLOCATION ROUTER
 * 🎯 Router کاملاً جدید برای مدیریت تخصیص پرداخت‌ها
 */

import { Router } from 'express';
import { unifiedAuthMiddleware } from '../middleware/unified-auth.js';
import { PaymentAllocationServiceV3 } from '../services/payment-allocation-service-v3.js';

export const paymentAllocationRouterV3 = Router();

// Apply authentication to all routes
paymentAllocationRouterV3.use(unifiedAuthMiddleware);

/**
 * تخصیص خودکار پرداخت
 */
paymentAllocationRouterV3.post('/auto-allocate', async (req, res) => {
  try {
    const { paymentId, reason } = req.body;
    const performedBy = (req.session as any)?.username || 'SYSTEM';

    console.log(`🚀 ATOMOS v3.0: Auto allocation request for payment ${paymentId}`);

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'شناسه پرداخت الزامی است'
      });
    }

    const result = await PaymentAllocationServiceV3.autoAllocatePayment(
      parseInt(paymentId),
      performedBy,
      reason || 'تخصیص خودکار'
    );

    if (result.success) {
      // بروزرسانی cache مالی
      try {
        const { UnifiedFinancialEngine } = await import('../services/unified-financial-engine.js');
        if (result.data?.allocatedToInvoice) {
          const [invoice] = await import('../db.js').then(m => 
            m.db.select().from(import('../../shared/schema.js').then(s => s.invoices))
              .where(import('drizzle-orm').then(d => d.eq(import('../../shared/schema.js').then(s => s.invoices.id), result.data!.allocatedToInvoice!)))
          );
          if (invoice.length > 0) {
            UnifiedFinancialEngine.forceInvalidateRepresentative(invoice[0].representativeId, {
              cascadeGlobal: true,
              reason: 'payment_auto_allocation_v3',
              immediate: true
            });
          }
        }
      } catch (syncError) {
        console.warn('Cache invalidation warning:', syncError);
      }
    }

    res.status(result.success ? 200 : 400).json(result);

  } catch (error: any) {
    console.error('❌ ATOMOS v3.0: Auto allocation error:', error);
    res.status(500).json({
      success: false,
      error: 'خطای سیستمی در تخصیص خودکار',
      details: error.message
    });
  }
});

/**
 * تخصیص دستی پرداخت
 */
paymentAllocationRouterV3.post('/manual-allocate', async (req, res) => {
  try {
    const { paymentId, invoiceId, amount, reason } = req.body;
    const performedBy = (req.session as any)?.username || 'SYSTEM';

    console.log(`🎯 ATOMOS v3.0: Manual allocation request: Payment ${paymentId} -> Invoice ${invoiceId}`);

    if (!paymentId || !invoiceId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'شناسه پرداخت، شناسه فاکتور و مبلغ الزامی است'
      });
    }

    const result = await PaymentAllocationServiceV3.manualAllocatePayment(
      parseInt(paymentId),
      parseInt(invoiceId),
      parseFloat(amount),
      performedBy,
      reason || 'تخصیص دستی'
    );

    if (result.success) {
      // بروزرسانی cache مالی
      try {
        const { UnifiedFinancialEngine } = await import('../services/unified-financial-engine.js');
        const { db } = await import('../db.js');
        const { invoices } = await import('../../shared/schema.js');
        const { eq } = await import('drizzle-orm');
        
        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, parseInt(invoiceId)));
        if (invoice) {
          UnifiedFinancialEngine.forceInvalidateRepresentative(invoice.representativeId, {
            cascadeGlobal: true,
            reason: 'payment_manual_allocation_v3',
            immediate: true
          });
        }
      } catch (syncError) {
        console.warn('Cache invalidation warning:', syncError);
      }
    }

    res.status(result.success ? 200 : 400).json(result);

  } catch (error: any) {
    console.error('❌ ATOMOS v3.0: Manual allocation error:', error);
    res.status(500).json({
      success: false,
      error: 'خطای سیستمی در تخصیص دستی',
      details: error.message
    });
  }
});

/**
 * دریافت فاکتورهای قابل تخصیص برای یک نماینده
 */
paymentAllocationRouterV3.get('/available-invoices/:representativeId', async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);

    if (isNaN(representativeId)) {
      return res.status(400).json({
        success: false,
        error: 'شناسه نماینده نامعتبر است'
      });
    }

    const invoices = await PaymentAllocationServiceV3.getAvailableInvoicesForRepresentative(representativeId);

    res.json({
      success: true,
      data: invoices,
      count: invoices.length
    });

  } catch (error: any) {
    console.error('❌ Error fetching available invoices:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در دریافت فاکتورهای قابل تخصیص'
    });
  }
});

/**
 * دریافت پرداخت‌های تخصیص نیافته برای یک نماینده
 */
paymentAllocationRouterV3.get('/unallocated-payments/:representativeId', async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);

    if (isNaN(representativeId)) {
      return res.status(400).json({
        success: false,
        error: 'شناسه نماینده نامعتبر است'
      });
    }

    const payments = await PaymentAllocationServiceV3.getUnallocatedPaymentsForRepresentative(representativeId);

    res.json({
      success: true,
      data: payments,
      count: payments.length
    });

  } catch (error: any) {
    console.error('❌ Error fetching unallocated payments:', error);
    res.status(500).json({
      success: false,
      error: 'خطا در دریافت پرداخت‌های تخصیص نیافته'
    });
  }
});

export default paymentAllocationRouterV3;


/**
 * SHERLOCK v34.1: Payment Management Router
 * ATOMOS COMPLIANT - Enhanced payment allocation management
 */

import { Router } from 'express';
import { storage } from '../storage.js';
import { unifiedAuthMiddleware } from '../middleware/unified-auth.js';

export const paymentManagementRouter = Router();
export const requireAuth = unifiedAuthMiddleware;

// Apply authentication to all routes
paymentManagementRouter.use(requireAuth);

// Get all payments
paymentManagementRouter.get('/', async (req, res) => {
  try {
    console.log('🔍 SHERLOCK v34.1: Fetching payments with enhanced allocation data');
    
    const payments = await storage.getPayments();
    
    res.json({
      success: true,
      data: payments,
      total: payments.length,
      allocated: payments.filter(p => p.isAllocated).length,
      unallocated: payments.filter(p => !p.isAllocated).length
    });
  } catch (error) {
    console.error('❌ Error fetching payments:', error);
    res.status(500).json({ error: "خطا در دریافت پرداخت‌ها" });
  }
});

// Get unallocated payments for a representative
paymentManagementRouter.get('/unallocated/:representativeId', async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);
    console.log(`🔍 SHERLOCK v34.1: Fetching unallocated payments for representative ${representativeId}`);
    
    const unallocatedPayments = await storage.getUnallocatedPayments(representativeId);
    
    res.json({
      success: true,
      data: unallocatedPayments,
      representativeId,
      count: unallocatedPayments.length
    });
  } catch (error) {
    console.error('❌ Error fetching unallocated payments:', error);
    res.status(500).json({ error: "خطا در دریافت پرداخت‌های تخصیص نیافته" });
  }
});

// Auto-allocate payments for a representative
paymentManagementRouter.post('/auto-allocate/:representativeId', async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);
    console.log(`🚀 SHERLOCK v34.1: Auto-allocation request for representative ${representativeId}`);
    
    // Get unallocated payments for this representative
    const unallocatedPayments = await storage.getUnallocatedPayments(representativeId);
    
    if (!unallocatedPayments.length) {
      return res.json({
        success: true,
        message: 'هیچ پرداخت تخصیص نیافته‌ای برای این نماینده وجود ندارد',
        summary: {
          totalProcessed: 0,
          totalAllocated: 0,
          totalErrors: 0,
          processingTime: 0
        },
        results: []
      });
    }

    const results = [];
    let totalAllocated = 0;
    let totalErrors = 0;
    const startTime = Date.now();

    // Process each unallocated payment
    for (const payment of unallocatedPayments) {
      try {
        console.log(`🔄 Processing payment ${payment.id} with amount ${payment.amount}`);
        
        const allocationResult = await storage.autoAllocatePaymentToInvoices(payment.id, representativeId);
        
        if (allocationResult.success) {
          totalAllocated += parseFloat(allocationResult.totalAmount);
          results.push({
            paymentId: payment.id,
            success: true,
            allocatedAmount: parseFloat(allocationResult.totalAmount),
            allocationsCount: allocationResult.allocated,
            details: allocationResult.details
          });
        } else {
          totalErrors++;
          results.push({
            paymentId: payment.id,
            success: false,
            errors: ['تخصیص خودکار ناموفق'],
            allocatedAmount: 0
          });
        }
      } catch (error) {
        totalErrors++;
        results.push({
          paymentId: payment.id,
          success: false,
          errors: [error.message || 'خطای نامشخص'],
          allocatedAmount: 0
        });
      }
    }

    const processingTime = Date.now() - startTime;

    // Log successful auto-allocation
    await storage.createActivityLog({
      type: 'payment_auto_allocation_batch',
      description: `تخصیص خودکار دسته‌ای برای نماینده ${representativeId} - ${results.length} پرداخت پردازش شد`,
      relatedId: representativeId,
      metadata: {
        representativeId,
        totalProcessed: results.length,
        totalAllocated,
        totalErrors,
        processingTime
      }
    });

    res.json({
      success: true,
      message: `تخصیص خودکار کامل شد - ${results.filter(r => r.success).length} موفق از ${results.length} پرداخت`,
      summary: {
        totalProcessed: results.length,
        totalAllocated,
        totalErrors,
        processingTime
      },
      results
    });

  } catch (error) {
    console.error('❌ Auto-allocation batch error:', error);
    res.status(500).json({ error: "خطا در تخصیص خودکار دسته‌ای" });
  }
});

// Manual allocation endpoint
paymentManagementRouter.post('/manual-allocate', async (req, res) => {
  try {
    const { paymentId, invoiceId, amount, reason } = req.body;
    const performedBy = (req.session as any)?.username || 'ADMIN';
    
    console.log(`🎯 SHERLOCK v34.1: Manual allocation - Payment ${paymentId} -> Invoice ${invoiceId}, Amount: ${amount}`);
    
    const result = await storage.manualAllocatePaymentToInvoice(
      paymentId,
      invoiceId,
      amount,
      performedBy,
      reason
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          allocatedAmount: result.allocatedAmount,
          transactionId: result.transactionId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
    
  } catch (error) {
    console.error('❌ Manual allocation error:', error);
    res.status(500).json({ error: "خطا در تخصیص دستی" });
  }
});

// Get payment allocation summary for a representative
paymentManagementRouter.get('/allocation-summary/:representativeId', async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);
    
    const summary = await storage.getPaymentAllocationSummary(representativeId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('❌ Error getting allocation summary:', error);
    res.status(500).json({ error: "خطا در دریافت خلاصه تخصیص" });
  }
});

export default paymentManagementRouter;

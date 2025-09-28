
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

// SHERLOCK v35.0: Batch allocation endpoint
paymentManagementRouter.post('/batch-allocate/:representativeId', async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);
    const { maxPayments, priorityMethod, strictMode } = req.body;

    console.log(`🚀 SHERLOCK v35.0: Batch allocation request for representative ${representativeId}`);

    // Get unallocated payments for this representative
    const unallocatedPayments = await storage.getUnallocatedPayments(representativeId);

    let processedPayments = 0;
    let totalAllocated = 0;
    const details = [];

    // Process up to maxPayments
    const paymentsToProcess = unallocatedPayments.slice(0, maxPayments || 50);

    for (const payment of paymentsToProcess) {
      try {
        const result = await storage.autoAllocatePaymentToInvoices(payment.id, representativeId);
        if (result.success) {
          processedPayments++;
          totalAllocated += parseFloat(result.totalAmount);
          details.push({
            paymentId: payment.id,
            allocated: result.allocated,
            amount: result.totalAmount
          });
        }
      } catch (error) {
        console.error(`Error allocating payment ${payment.id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `تخصیص دسته‌ای کامل شد - ${processedPayments} پرداخت پردازش شد`,
      data: {
        processedPayments,
        totalAllocated: totalAllocated.toString(),
        details
      }
    });

  } catch (error) {
    console.error('❌ Batch allocation error:', error);
    res.status(500).json({ error: "خطا در تخصیص دسته‌ای" });
  }
});

// SHERLOCK v35.0: Allocation report endpoint
paymentManagementRouter.get('/allocation-report/:representativeId', async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);

    console.log(`📊 SHERLOCK v35.0: Generating allocation report for representative ${representativeId}`);

    // Get basic allocation statistics
    const payments = await storage.getPaymentsByRepresentative(representativeId);
    const allocatedPayments = payments.filter(p => p.isAllocated);
    const unallocatedPayments = payments.filter(p => !p.isAllocated);

    const report = {
      representativeId,
      totalPayments: payments.length,
      allocatedPayments: allocatedPayments.length,
      unallocatedPayments: unallocatedPayments.length,
      totalAllocatedAmount: allocatedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      totalUnallocatedAmount: unallocatedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      allocationRate: payments.length > 0 ? (allocatedPayments.length / payments.length) * 100 : 0
    };

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('❌ Allocation report error:', error);
    res.status(500).json({ error: "خطا در تولید گزارش تخصیص" });
  }
});

// SHERLOCK v35.0: Smart allocation recommendation endpoint
paymentManagementRouter.get('/smart-recommendations/:representativeId', async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);
    
    console.log(`🧠 SHERLOCK v35.0: Generating smart recommendations for representative ${representativeId}`);
    
    // Get current allocation status
    const unallocatedPayments = await storage.getUnallocatedPayments(representativeId);
    const summary = await storage.getPaymentAllocationSummary(representativeId);
    
    const recommendations = [];
    const priorities = [];
    
    if (unallocatedPayments.length > 0) {
      recommendations.push({
        type: 'AUTO_ALLOCATE',
        priority: 'HIGH',
        description: `${unallocatedPayments.length} پرداخت تخصیص نیافته برای تخصیص خودکار`,
        action: 'batch-allocate',
        estimatedBenefit: `تخصیص ${unallocatedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0)} تومان`
      });
    }
    
    if (parseFloat(summary.totalUnallocatedAmount) > 1000000) {
      priorities.push({
        type: 'URGENT',
        message: 'مبلغ بالای پرداخت‌های تخصیص نیافته نیاز به توجه فوری دارد'
      });
    }
    
    res.json({
      success: true,
      data: {
        recommendations,
        priorities,
        summary,
        nextActions: [
          'بررسی پرداخت‌های تخصیص نیافته',
          'اجرای تخصیص خودکار دسته‌ای',
          'تولید گزارش کامل تخصیص'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Smart recommendations error:', error);
    res.status(500).json({ error: "خطا در تولید پیشنهادات هوشمند" });
  }
});

export default paymentManagementRouter;

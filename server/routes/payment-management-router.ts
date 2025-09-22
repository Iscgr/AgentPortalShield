/**
 * SHERLOCK v34.1: Payment Management Router
 * ATOMOS COMPLIANT - Enhanced payment allocation management
 */

import { Router } from 'express';
import { storage } from '../storage.js';
import { unifiedAuthMiddleware } from '../middleware/unified-auth.js';
import { EnhancedPaymentAllocationEngine } from '../services/enhanced-payment-allocation-engine.js';
import { db } from '../db.js';
import { payments, invoices } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

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
      } catch (error: any) {
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
      relatedId: String(representativeId),
      metadata: {
        representativeId,
        totalProcessed: results.length,
        totalAllocated,
        totalErrors,
        processingTime
      }
    });

    // ✅ Force representative debt sync after batch allocation
    if (totalAllocated > 0) {
      try {
        const { unifiedFinancialEngine } = await import('../services/unified-financial-engine.js');
        await unifiedFinancialEngine.syncRepresentativeDebt(representativeId);
        console.log(`✅ SHERLOCK v34.1: Representative ${representativeId} debt synced after batch allocation`);
      } catch (syncError) {
        console.error(`⚠️ SHERLOCK v34.1: Debt sync failed but allocation successful:`, syncError);
      }
    }

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

// Manual allocation endpoint - TITAN-O FIXED with complete debugging
paymentManagementRouter.post('/manual-allocate', async (req, res) => {
  try {
    const { paymentId, invoiceId, invoiceNumber, amount, reason } = req.body;
    const performedBy = (req.session as any)?.username || 'ADMIN';
    const startTime = Date.now();

    console.log(`🎯 TITAN-O DEBUGGING: Manual allocation request received`);
    console.log(`   Payment ID: ${paymentId}`);
    console.log(`   Invoice ID: ${invoiceId}`);
    console.log(`   Invoice Number: ${invoiceNumber}`);
    console.log(`   Amount: ${amount}`);
    console.log(`   Request body:`, req.body);

    // TITAN-O: Enhanced validation with invoice number support
    if (!paymentId || (!invoiceId && !invoiceNumber) || !amount) {
      return res.status(400).json({
        success: false,
        error: "پارامترهای الزامی ناقص است",
        details: {
          missing: {
            paymentId: !paymentId,
            invoiceId: !invoiceId,
            invoiceNumber: !invoiceNumber,
            amount: !amount
          }
        }
      });
    }

    // TITAN-O: Smart invoice resolution (ID or Number)
    let targetInvoice = null;
    let resolvedInvoiceId = null;

    if (invoiceId) {
      // Use direct invoice ID
      targetInvoice = await storage.getInvoiceById(invoiceId);
      resolvedInvoiceId = invoiceId;
      console.log(`🔍 TITAN-O: Looking up by ID ${invoiceId}:`, targetInvoice ? 'FOUND' : 'NOT FOUND');
    } else if (invoiceNumber) {
      // Lookup by invoice number
      console.log(`🔍 TITAN-O: Looking up by invoice number: ${invoiceNumber}`);
      
      // Query database for invoice by number
      const invoiceResults = await db.select()
        .from(invoices)
        .where(eq(invoices.invoiceNumber, invoiceNumber))
        .limit(1);
      
      if (invoiceResults.length > 0) {
        targetInvoice = invoiceResults[0];
        resolvedInvoiceId = targetInvoice.id;
        console.log(`✅ TITAN-O: Found invoice by number ${invoiceNumber} -> ID ${resolvedInvoiceId}`);
      } else {
        console.log(`❌ TITAN-O: Invoice number ${invoiceNumber} not found`);
      }
    }

    if (!targetInvoice) {
      return res.status(404).json({
        success: false,
        error: `فاکتور مورد نظر یافت نشد`,
        details: { 
          searchedBy: invoiceId ? 'ID' : 'Number',
          searchValue: invoiceId || invoiceNumber
        }
      });
    }

    // Get actual invoice number for proper description
    const actualInvoiceNumber = targetInvoice.invoiceNumber || `INV-${resolvedInvoiceId}`;
    const representativeId = targetInvoice.representativeId;
    
    console.log(`🔍 TITAN-O: Final resolution details:`);
    console.log(`   Invoice ID: ${resolvedInvoiceId}`);
    console.log(`   Invoice Number: ${actualInvoiceNumber}`);
    console.log(`   Representative ID: ${representativeId}`);

    // Execute manual allocation with correct IDs
    const result = await storage.manualAllocatePaymentToInvoice(
      paymentId,
      resolvedInvoiceId,
      amount,
      performedBy,
      reason
    );

    if (result.success) {
      const processingTime = Date.now() - startTime;

      // ✅ POST-SUCCESS DEBT SYNC - as required by architect plan
      try {
        console.log(`🔄 SHERLOCK v35.1: Initiating post-success debt sync for representative ${representativeId}`);

        const { UnifiedFinancialEngine } = await import('../services/unified-financial-engine.js');

        // Force cache invalidation first
        UnifiedFinancialEngine.forceInvalidateRepresentative(representativeId, {
          cascadeGlobal: true,
          reason: 'manual_allocation_sync',
          immediate: true,
          includePortal: true
        });

        // Recalculate representative debt
        const engine = new UnifiedFinancialEngine(storage);
        const updatedFinancialData = await engine.calculateRepresentative(representativeId);

        console.log(`✅ SHERLOCK v35.1: Debt sync completed for representative ${representativeId}`);

        // ✅ COMPREHENSIVE ACTIVITY LOGGING with proper invoice number
        await storage.createActivityLog({
          type: 'payment_manual_allocation',
          description: `تخصیص دستی پرداخت ${paymentId} به فاکتور ${invoiceNumber} (ID: ${invoiceId}) - مبلغ: ${amount} تومان`,
          relatedId: String(representativeId),
          metadata: {
            paymentId: parseInt(paymentId),
            invoiceId: parseInt(invoiceId),
            representativeId,
            allocatedAmount: parseFloat(amount),
            performedBy,
            reason: reason || 'تخصیص دستی',
            processingTime,
            transactionId: result.transactionId,
            preAllocationDebt: updatedFinancialData.actualDebt + parseFloat(amount), // Estimated
            postAllocationDebt: updatedFinancialData.actualDebt,
            debtReduction: parseFloat(amount),
            timestamp: new Date().toISOString()
          }
        });

        // ✅ STRUCTURED PAYLOAD RESPONSE suitable for frontend
        res.json({
          success: true,
          message: result.message,
          data: {
            allocation: {
              paymentId: parseInt(paymentId),
              invoiceId: parseInt(invoiceId),
              allocatedAmount: result.allocatedAmount,
              transactionId: result.transactionId,
              performedBy,
              timestamp: new Date().toISOString()
            },
            representative: {
              id: representativeId,
              name: updatedFinancialData.representativeName,
              updatedDebt: updatedFinancialData.actualDebt,
              paymentRatio: updatedFinancialData.paymentRatio,
              debtLevel: updatedFinancialData.debtLevel
            },
            processing: {
              processingTime,
              debtSyncCompleted: true,
              activityLogCreated: true
            }
          },
          meta: {
            timestamp: new Date().toISOString(),
            operation: 'manual_allocation_with_sync',
            version: 'SHERLOCK_v35.1'
          }
        });

      } catch (syncError: any) {
        console.error(`⚠️ SHERLOCK v35.1: Debt sync failed but allocation successful:`, syncError);

        // Still log the allocation even if sync fails
        await storage.createActivityLog({
          type: 'payment_manual_allocation',
          description: `تخصیص دستی پرداخت ${paymentId} به فاکتور ${invoiceNumber} (ID: ${invoiceId}) - مبلغ: ${amount} تومان (همگام‌سازی بدهی ناموفق)`,
          relatedId: String(representativeId),
          metadata: {
            paymentId: parseInt(paymentId),
            invoiceId: parseInt(invoiceId),
            representativeId,
            allocatedAmount: parseFloat(amount),
            performedBy,
            reason: reason || 'تخصیص دستی',
            processingTime: Date.now() - startTime,
            transactionId: result.transactionId,
            syncError: syncError.message,
            timestamp: new Date().toISOString()
          }
        });

        // Return success but with sync warning
        res.json({
          success: true,
          message: result.message + ' (هشدار: همگام‌سازی بدهی ناموفق)',
          data: {
            allocation: {
              paymentId: parseInt(paymentId),
              invoiceId: parseInt(invoiceId),
              allocatedAmount: result.allocatedAmount,
              transactionId: result.transactionId,
              performedBy,
              timestamp: new Date().toISOString()
            },
            representative: {
              id: representativeId,
              syncWarning: 'همگام‌سازی بدهی ناموفق - لطفاً دستی بروزرسانی کنید'
            },
            processing: {
              processingTime: Date.now() - startTime,
              debtSyncCompleted: false,
              activityLogCreated: true
            }
          },
          meta: {
            timestamp: new Date().toISOString(),
            operation: 'manual_allocation_partial_sync',
            version: 'SHERLOCK_v35.1'
          }
        });
      }
    } else {
      // Allocation failed
      console.log(`❌ SHERLOCK v35.1: Manual allocation failed: ${result.message}`);

      res.status(400).json({
        success: false,
        error: result.message,
        details: {
          paymentId: parseInt(paymentId),
          invoiceId: parseInt(invoiceId),
          requestedAmount: parseFloat(amount),
          representativeId,
          reason: reason || 'نامشخص'
        },
        meta: {
          timestamp: new Date().toISOString(),
          operation: 'manual_allocation_failed',
          version: 'SHERLOCK_v35.1'
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Manual allocation error:', error);
    res.status(500).json({
      success: false,
      error: "خطا در تخصیص دستی",
      details: {
        message: error.message,
        timestamp: new Date().toISOString()
      },
      meta: {
        operation: 'manual_allocation_system_error',
        version: 'SHERLOCK_v35.1'
      }
    });
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

    const { EnhancedPaymentAllocationEngine } = await import('../services/enhanced-payment-allocation-engine.js');

    const result = await EnhancedPaymentAllocationEngine.batchAllocatePayments(
      representativeId,
      {
        maxPayments: maxPayments || 50,
        priorityMethod: priorityMethod || 'FIFO',
        strictMode: strictMode !== false
      }
    );

    if (result.success) {
      res.json({
        success: true,
        message: `تخصیص دسته‌ای کامل شد - ${result.processedPayments} پرداخت پردازش شد`,
        data: {
          processedPayments: result.processedPayments,
          totalAllocated: result.totalAllocated,
          details: result.details
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'تخصیص دسته‌ای ناموفق',
        details: result.errors
      });
    }

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

    const { EnhancedPaymentAllocationEngine } = await import('../services/enhanced-payment-allocation-engine.js');

    const report = await EnhancedPaymentAllocationEngine.generateAllocationReport(representativeId);

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

// ✅ SHERLOCK v35.1: LIGHTWEIGHT RECALCULATE ENDPOINT - as required by architect plan
paymentManagementRouter.post('/recalculate/:representativeId', async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);
    const { forceRefresh = true, cascadeGlobal = false } = req.body;
    const startTime = Date.now();

    console.log(`🔄 SHERLOCK v35.1: Lightweight recalculate request for representative ${representativeId}`);

    // Validate representative ID
    if (isNaN(representativeId) || representativeId <= 0) {
      return res.status(400).json({
        success: false,
        error: "شناسه نماینده نامعتبر است",
        details: {
          providedId: req.params.representativeId,
          parsedId: representativeId
        },
        meta: {
          timestamp: new Date().toISOString(),
          operation: 'recalculate_validation_failed',
          version: 'SHERLOCK_v35.1'
        }
      });
    }

    // Check if representative exists
    const representative = await storage.getRepresentativeById(representativeId);
    if (!representative) {
      return res.status(404).json({
        success: false,
        error: "نماینده مورد نظر یافت نشد",
        details: {
          representativeId
        },
        meta: {
          timestamp: new Date().toISOString(),
          operation: 'recalculate_not_found',
          version: 'SHERLOCK_v35.1'
        }
      });
    }

    try {
      const { UnifiedFinancialEngine } = await import('../services/unified-financial-engine.js');

      // Force cache invalidation with options
      UnifiedFinancialEngine.forceInvalidateRepresentative(representativeId, {
        cascadeGlobal,
        reason: 'manual_recalculate_request',
        immediate: true,
        includePortal: true
      });

      // Recalculate representative financial data
      const engine = new UnifiedFinancialEngine(storage);
      const freshFinancialData = await engine.calculateRepresentative(representativeId);

      const processingTime = Date.now() - startTime;

      // Log the recalculation activity
      await storage.createActivityLog({
        type: 'financial_recalculation',
        description: `بازمحاسبه دستی اطلاعات مالی برای نماینده ${representativeId}`,
        relatedId: String(representativeId),
        metadata: {
          representativeId,
          representativeName: freshFinancialData.representativeName,
          processingTime,
          forceRefresh,
          cascadeGlobal,
          calculatedDebt: freshFinancialData.actualDebt,
          paymentRatio: freshFinancialData.paymentRatio,
          debtLevel: freshFinancialData.debtLevel,
          timestamp: new Date().toISOString(),
          accuracy: freshFinancialData.accuracyGuaranteed
        }
      });

      // Return structured response
      res.json({
        success: true,
        message: `بازمحاسبه موفقیت‌آمیز برای نماینده ${representative.name}`,
        data: {
          representative: {
            id: representativeId,
            name: freshFinancialData.representativeName,
            code: freshFinancialData.representativeCode
          },
          financialData: {
            totalSales: freshFinancialData.totalSales,
            totalPaid: freshFinancialData.totalPaid,
            actualDebt: freshFinancialData.actualDebt,
            paymentRatio: freshFinancialData.paymentRatio,
            debtLevel: freshFinancialData.debtLevel,
            lastUpdate: freshFinancialData.calculationTimestamp
          },
          processing: {
            processingTime,
            cacheInvalidated: true,
            cascadeGlobal,
            accuracyGuaranteed: freshFinancialData.accuracyGuaranteed
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          operation: 'lightweight_recalculate_success',
          version: 'SHERLOCK_v35.1',
          requestId: `recalc_${representativeId}_${Date.now()}`
        }
      });

      console.log(`✅ SHERLOCK v35.1: Lightweight recalculate completed for representative ${representativeId} in ${processingTime}ms`);

    } catch (calculationError: any) {
      console.error(`❌ SHERLOCK v35.1: Recalculation failed for representative ${representativeId}:`, calculationError);

      // Log the failure
      await storage.createActivityLog({
        type: 'financial_recalculation_failed',
        description: `بازمحاسبه ناموفق برای نماینده ${representativeId}: ${calculationError.message}`,
        relatedId: String(representativeId),
        metadata: {
          representativeId,
          error: calculationError.message,
          processingTime: Date.now() - startTime,
          forceRefresh,
          cascadeGlobal,
          timestamp: new Date().toISOString()
        }
      });

      return res.status(500).json({
        success: false,
        error: "خطا در بازمحاسبه اطلاعات مالی",
        details: {
          representativeId,
          errorMessage: calculationError.message,
          processingTime: Date.now() - startTime
        },
        meta: {
          timestamp: new Date().toISOString(),
          operation: 'recalculate_calculation_failed',
          version: 'SHERLOCK_v35.1'
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Recalculate endpoint error:', error);
    res.status(500).json({
      success: false,
      error: "خطای سیستمی در بازمحاسبه",
      details: {
        message: error.message,
        representativeId: req.params.representativeId
      },
      meta: {
        timestamp: new Date().toISOString(),
        operation: 'recalculate_system_error',
        version: 'SHERLOCK_v35.1'
      }
    });
  }
});

// Add a new endpoint for creating payments with mandatory allocation
paymentManagementRouter.post('/create', requireAuth, async (req, res) => {
  try {
    const { representativeId, amount, paymentDate, description, invoiceId } = req.body;
    const performedBy = (req.session as any)?.username || 'ADMIN';
    const startTime = Date.now();

    console.log(`🎯 TITAN-O: Creating payment with MANDATORY allocation`);

    // Validation - Invoice ID is now MANDATORY
    if (!representativeId || !amount || amount <= 0 || !invoiceId) {
      return res.status(400).json({
        success: false,
        error: "پارامترهای الزامی ناقص است - تخصیص فاکتور اجباری است",
        details: {
          representativeId: !representativeId,
          amount: !amount || amount <= 0,
          invoiceId: !invoiceId
        }
      });
    }

    // Create the payment record first
    const newPayment = await storage.createPayment({
      representativeId: parseInt(representativeId),
      amount: parseFloat(amount),
      paymentDate: new Date(paymentDate),
      description: description || `Payment registered by ${performedBy}`,
      status: 'PENDING_ALLOCATION', // Initially pending
      performedBy
    });

    if (!newPayment || !newPayment.id) {
      throw new Error('Failed to create payment record');
    }

    // Get invoice details for proper numbering
    const targetInvoice = await storage.getInvoiceById(parseInt(invoiceId));
    if (!targetInvoice) {
      // Delete the payment record since allocation failed
      await db.delete(payments).where(eq(payments.id, newPayment.id));
      return res.status(400).json({
        success: false,
        error: "فاکتور مورد نظر یافت نشد",
        details: { invoiceId }
      });
    }

    // MANDATORY manual allocation - NO generic payments allowed
    console.log(`🎯 TITAN-O: Creating payment with MANDATORY allocation to invoice ${targetInvoice.invoiceNumber} (ID: ${invoiceId})`);

    const { EnhancedPaymentAllocationEngine } = await import('../services/enhanced-payment-allocation-engine.js');
    
    const result = await EnhancedPaymentAllocationEngine.manualAllocatePayment(
      newPayment.id,
      parseInt(invoiceId),
      parseFloat(amount),
      performedBy,
      `Mandatory allocation during payment creation to invoice ${targetInvoice.invoiceNumber}: ${description || 'Payment registered'}`
    );

    if (result.success) {
      // Update payment status to allocated
      await storage.updatePaymentStatus(newPayment.id, 'ALLOCATED');

      res.json({
        success: true,
        data: {
          paymentId: newPayment.id,
          allocation: result,
          representativeId: parseInt(representativeId),
          invoiceId: parseInt(invoiceId),
          method: 'MANDATORY_ALLOCATION'
        },
        message: `پرداخت با موفقیت ثبت و به فاکتور ${invoiceId} تخصیص یافت`
      });
    } else {
      // If allocation failed, delete the payment record and return an error
      await db.delete(payments).where(eq(payments.id, newPayment.id));

      res.status(400).json({
        success: false,
        error: "خطا در تخصیص اجباری پرداخت",
        details: result.errors,
        message: "پرداخت لغو شد - تخصیص اجباری موفق نبود"
      });
    }

  } catch (error: any) {
    console.error('❌ Payment creation error:', error);
    res.status(500).json({
      success: false,
      error: "خطای سیستمی در ثبت پرداخت",
      details: {
        message: error.message,
        timestamp: new Date().toISOString()
      },
      meta: {
        operation: 'payment_creation_system_error',
        version: 'TITAN-O'
      }
    });
  }
});


export default paymentManagementRouter;
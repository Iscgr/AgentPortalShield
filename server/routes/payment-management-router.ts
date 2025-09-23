/**
 * SHERLOCK v34.1: Payment Management Router
 * ATOMOS COMPLIANT - Enhanced payment allocation management
 */

import { Router } from 'express';
import { storage } from '../storage.js';
import { unifiedAuthMiddleware } from '../middleware/unified-auth.js';
import { db } from '../db.js';
import { payments, invoices } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

export const paymentManagementRouter = Router();
export const requireAuth = unifiedAuthMiddleware;

// DISABLED: Legacy payment management endpoints - replaced by unified payment system
// Apply authentication to all routes
// paymentManagementRouter.use(requireAuth);

// Legacy endpoints disabled to prevent conflicts with unified payment system
paymentManagementRouter.use((req, res, next) => {
  res.status(410).json({
    success: false,
    error: "Legacy payment management endpoints have been disabled. Use /api/payments instead.",
    redirectTo: "/api/payments"
  });
});

// Get all payments
paymentManagementRouter.get('/', async (req, res) => {
  try {
    console.log('🔍 TITAN-O v2.0: Fetching payments with simplified structure');

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
    console.log(`🔍 TITAN-O v2.0: Fetching unallocated payments for representative ${representativeId}`);

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

/**
 * TITAN-O v2.0: CORE API - ثبت پرداخت با تخصیص دستی یکپارچه
 * این API تنها راه ثبت پرداخت در سیستم است
 */
paymentManagementRouter.post('/create-with-allocation', async (req, res) => {
  try {
    const { representativeId, amount, paymentDate, description, invoiceNumber } = req.body;
    const performedBy = (req.session as any)?.username || 'ADMIN';
    const startTime = Date.now();

    console.log(`🎯 TITAN-O v2.0: Creating payment with MANDATORY allocation`);
    console.log(`   Representative: ${representativeId}, Amount: ${amount}, Invoice: ${invoiceNumber}`);

    // Validation - تمام فیلدها اجباری
    if (!representativeId || !amount || amount <= 0 || !invoiceNumber) {
      return res.status(400).json({
        success: false,
        error: "تمام فیلدها الزامی است - نماینده، مبلغ، تاریخ، و شماره فاکتور",
        details: {
          representativeId: !representativeId,
          amount: !amount || amount <= 0,
          invoiceNumber: !invoiceNumber
        }
      });
    }

    // پیدا کردن فاکتور بر اساس شماره فاکتور
    const [targetInvoice] = await db.select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, invoiceNumber))
      .limit(1);

    if (!targetInvoice) {
      return res.status(400).json({
        success: false,
        error: `فاکتور با شماره ${invoiceNumber} یافت نشد`,
        details: { invoiceNumber }
      });
    }

    // بررسی تطابق نماینده
    if (targetInvoice.representativeId !== parseInt(representativeId)) {
      return res.status(400).json({
        success: false,
        error: `فاکتور ${invoiceNumber} متعلق به نماینده ${representativeId} نیست`,
        details: { 
          invoiceRepresentativeId: targetInvoice.representativeId,
          requestedRepresentativeId: representativeId
        }
      });
    }

    // محاسبه مبلغ باقیمانده فاکتور
    const [currentPayments] = await db.select({
      totalPaid: db.$sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`
    }).from(payments)
    .where(eq(payments.invoiceId, targetInvoice.id));

    const invoiceAmount = parseFloat(targetInvoice.amount);
    const alreadyPaid = currentPayments?.totalPaid || 0;
    const remainingAmount = invoiceAmount - alreadyPaid;

    console.log(`💰 Invoice analysis: Total=${invoiceAmount}, Paid=${alreadyPaid}, Remaining=${remainingAmount}`);

    if (parseFloat(amount) > remainingAmount) {
      return res.status(400).json({
        success: false,
        error: `مبلغ پرداخت ${amount} بیشتر از مبلغ باقیمانده فاکتور ${remainingAmount} است`,
        details: {
          invoiceAmount,
          alreadyPaid,
          remainingAmount,
          requestedAmount: amount
        }
      });
    }

    // ✅ TITAN-O v2.0: ثبت پرداخت با تخصیص مستقیم - بدون پیچیدگی
    const [newPayment] = await db.insert(payments).values({
      representativeId: parseInt(representativeId),
      invoiceId: targetInvoice.id, // مستقیماً به فاکتور متصل
      amount: amount.toString(),
      paymentDate: paymentDate,
      description: description || `پرداخت ${amount} تومان برای فاکتور ${invoiceNumber}`,
      isAllocated: true // همیشه true چون مستقیماً تخصیص یافته
    }).returning();

    console.log(`✅ TITAN-O v2.0: Payment created and allocated - ID: ${newPayment.id}`);

    // بروزرسانی وضعیت فاکتور
    const newTotalPaid = alreadyPaid + parseFloat(amount);
    const paymentRatio = newTotalPaid / invoiceAmount;

    let newInvoiceStatus = 'unpaid';
    if (paymentRatio >= 0.999) {
      newInvoiceStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newInvoiceStatus = 'partial';
    }

    await db.update(invoices)
      .set({
        status: newInvoiceStatus,
        updatedAt: new Date()
      })
      .where(eq(invoices.id, targetInvoice.id));

    console.log(`✅ TITAN-O v2.0: Invoice ${invoiceNumber} status updated to '${newInvoiceStatus}'`);

    // بروزرسانی بدهی نماینده
    try {
      const { UnifiedFinancialEngine } = await import('../services/unified-financial-engine.js');
      UnifiedFinancialEngine.forceInvalidateRepresentative(parseInt(representativeId), {
        cascadeGlobal: true,
        reason: 'payment_allocation',
        immediate: true,
        includePortal: true
      });

      const engine = new UnifiedFinancialEngine(storage);
      await engine.syncRepresentativeDebt(parseInt(representativeId));
    } catch (syncError) {
      console.error(`⚠️ TITAN-O v2.0: Debt sync warning:`, syncError);
    }

    // ثبت لاگ فعالیت
    await storage.createActivityLog({
      type: 'payment_created_with_allocation',
      description: `پرداخت ${amount} تومان برای فاکتور ${invoiceNumber} ثبت و تخصیص یافت`,
      relatedId: newPayment.id,
      metadata: {
        representativeId: parseInt(representativeId),
        invoiceId: targetInvoice.id,
        invoiceNumber,
        amount: parseFloat(amount),
        performedBy,
        processingTime: Date.now() - startTime,
        newInvoiceStatus
      }
    });

    // پاسخ موفقیت
    res.json({
      success: true,
      message: `پرداخت ${amount} تومان برای فاکتور ${invoiceNumber} با موفقیت ثبت شد`,
      data: {
        paymentId: newPayment.id,
        representativeId: parseInt(representativeId),
        invoiceId: targetInvoice.id,
        invoiceNumber,
        amount: parseFloat(amount),
        newInvoiceStatus,
        remainingAmount: remainingAmount - parseFloat(amount),
        processingTime: Date.now() - startTime
      }
    });

  } catch (error: any) {
    console.error('❌ TITAN-O v2.0: Payment creation error:', error);
    res.status(500).json({
      success: false,
      error: "خطای سیستمی در ثبت پرداخت",
      details: {
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * TITAN-O v2.0: ثبت پرداخت بدون تخصیص (برای موارد خاص)
 */
paymentManagementRouter.post('/create-unallocated', async (req, res) => {
  try {
    const { representativeId, amount, paymentDate, description } = req.body;
    const performedBy = (req.session as any)?.username || 'ADMIN';

    console.log(`🎯 TITAN-O v2.0: Creating unallocated payment for representative ${representativeId}`);

    if (!representativeId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "نماینده و مبلغ الزامی است",
        details: {
          representativeId: !representativeId,
          amount: !amount || amount <= 0
        }
      });
    }

    // ثبت پرداخت بدون تخصیص
    const [newPayment] = await db.insert(payments).values({
      representativeId: parseInt(representativeId),
      invoiceId: null, // بدون تخصیص
      amount: amount.toString(),
      paymentDate: paymentDate,
      description: description || `پرداخت ${amount} تومان (بدون تخصیص)`,
      isAllocated: false // صراحتاً false
    }).returning();

    // بروزرسانی بدهی نماینده
    try {
      const { UnifiedFinancialEngine } = await import('../services/unified-financial-engine.js');
      UnifiedFinancialEngine.forceInvalidateRepresentative(parseInt(representativeId), {
        cascadeGlobal: false,
        reason: 'unallocated_payment',
        immediate: true
      });

      const engine = new UnifiedFinancialEngine(storage);
      await engine.syncRepresentativeDebt(parseInt(representativeId));
    } catch (syncError) {
      console.error(`⚠️ TITAN-O v2.0: Debt sync warning:`, syncError);
    }

    // ثبت لاگ
    await storage.createActivityLog({
      type: 'payment_created_unallocated',
      description: `پرداخت ${amount} تومان بدون تخصیص ثبت شد`,
      relatedId: newPayment.id,
      metadata: {
        representativeId: parseInt(representativeId),
        amount: parseFloat(amount),
        performedBy
      }
    });

    res.json({
      success: true,
      message: `پرداخت ${amount} تومان بدون تخصیص ثبت شد`,
      data: {
        paymentId: newPayment.id,
        representativeId: parseInt(representativeId),
        amount: parseFloat(amount),
        isAllocated: false
      }
    });

  } catch (error: any) {
    console.error('❌ TITAN-O v2.0: Unallocated payment creation error:', error);
    res.status(500).json({
      success: false,
      error: "خطای سیستمی در ثبت پرداخت",
      details: {
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * TITAN-O v2.0: تخصیص بعدی پرداخت تخصیص نیافته
 */
paymentManagementRouter.post('/allocate-existing', async (req, res) => {
  try {
    const { paymentId, invoiceNumber } = req.body;
    const performedBy = (req.session as any)?.username || 'ADMIN';

    console.log(`🎯 TITAN-O v2.0: Allocating existing payment ${paymentId} to invoice ${invoiceNumber}`);

    if (!paymentId || !invoiceNumber) {
      return res.status(400).json({
        success: false,
        error: "شماره پرداخت و شماره فاکتور الزامی است",
        details: { paymentId: !paymentId, invoiceNumber: !invoiceNumber }
      });
    }

    // پیدا کردن پرداخت
    const [payment] = await db.select()
      .from(payments)
      .where(eq(payments.id, parseInt(paymentId)))
      .limit(1);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: `پرداخت با شماره ${paymentId} یافت نشد`
      });
    }

    if (payment.isAllocated) {
      return res.status(400).json({
        success: false,
        error: `پرداخت ${paymentId} قبلاً تخصیص یافته است`
      });
    }

    // پیدا کردن فاکتور
    const [invoice] = await db.select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, invoiceNumber))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: `فاکتور با شماره ${invoiceNumber} یافت نشد`
      });
    }

    // بررسی تطابق نماینده
    if (payment.representativeId !== invoice.representativeId) {
      return res.status(400).json({
        success: false,
        error: `پرداخت و فاکتور متعلق به نمایندگان مختلف هستند`
      });
    }

    // بررسی مبلغ باقیمانده فاکتور
    const [currentPayments] = await db.select({
      totalPaid: db.$sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`
    }).from(payments)
    .where(eq(payments.invoiceId, invoice.id));

    const invoiceAmount = parseFloat(invoice.amount);
    const alreadyPaid = currentPayments?.totalPaid || 0;
    const remainingAmount = invoiceAmount - alreadyPaid;
    const paymentAmount = parseFloat(payment.amount);

    if (paymentAmount > remainingAmount) {
      return res.status(400).json({
        success: false,
        error: `مبلغ پرداخت ${paymentAmount} بیشتر از مبلغ باقیمانده فاکتور ${remainingAmount} است`
      });
    }

    // تخصیص پرداخت
    await db.update(payments)
      .set({
        invoiceId: invoice.id,
        isAllocated: true,
        description: `${payment.description} - تخصیص یافته به فاکتور ${invoiceNumber}`
      })
      .where(eq(payments.id, parseInt(paymentId)));

    // بروزرسانی وضعیت فاکتور
    const newTotalPaid = alreadyPaid + paymentAmount;
    const paymentRatio = newTotalPaid / invoiceAmount;

    let newInvoiceStatus = 'unpaid';
    if (paymentRatio >= 0.999) {
      newInvoiceStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newInvoiceStatus = 'partial';
    }

    await db.update(invoices)
      .set({
        status: newInvoiceStatus,
        updatedAt: new Date()
      })
      .where(eq(invoices.id, invoice.id));

    console.log(`✅ TITAN-O v2.0: Payment ${paymentId} allocated to invoice ${invoiceNumber}`);

    // بروزرسانی بدهی
    try {
      const { UnifiedFinancialEngine } = await import('../services/unified-financial-engine.js');
      UnifiedFinancialEngine.forceInvalidateRepresentative(payment.representativeId, {
        cascadeGlobal: true,
        reason: 'existing_payment_allocation',
        immediate: true
      });

      const engine = new UnifiedFinancialEngine(storage);
      await engine.syncRepresentativeDebt(payment.representativeId);
    } catch (syncError) {
      console.error(`⚠️ TITAN-O v2.0: Debt sync warning:`, syncError);
    }

    // ثبت لاگ
    await storage.createActivityLog({
      type: 'payment_allocated_existing',
      description: `پرداخت موجود ${paymentId} به فاکتور ${invoiceNumber} تخصیص یافت`,
      relatedId: parseInt(paymentId),
      metadata: {
        paymentId: parseInt(paymentId),
        invoiceId: invoice.id,
        invoiceNumber,
        amount: paymentAmount,
        performedBy,
        newInvoiceStatus
      }
    });

    res.json({
      success: true,
      message: `پرداخت ${paymentId} با موفقیت به فاکتور ${invoiceNumber} تخصیص یافت`,
      data: {
        paymentId: parseInt(paymentId),
        invoiceId: invoice.id,
        invoiceNumber,
        amount: paymentAmount,
        newInvoiceStatus
      }
    });

  } catch (error: any) {
    console.error('❌ TITAN-O v2.0: Existing payment allocation error:', error);
    res.status(500).json({
      success: false,
      error: "خطای سیستمی در تخصیص پرداخت",
      details: {
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default paymentManagementRouter;
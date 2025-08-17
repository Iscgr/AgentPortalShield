
import express from 'express';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { invoices } from '../shared/schema';
import { authMiddleware, requireAuth } from './middleware/unified-auth';
import { storage } from './storage';
import { unifiedFinancialEngine } from './services/unified-financial-engine';
import { createInvoice, createInvoiceSchema } from './services/invoice';
import { z } from 'zod';
import workspaceRouter from './routes/workspace-routes';

export function registerRoutes(app: express.Application) {
  
  // Default route
  app.get("/", (req, res) => {
    res.send("SHERLOCK v28.0 API is running!");
  });

  // ✅ SHERLOCK v28.0: Invoice Creation Endpoint
  app.post('/api/invoices', authMiddleware, async (req, res) => {
    const debug = {
      info: (msg: string, data?: any) => console.log(`🔍 SHERLOCK v28.0 INFO: ${msg}`, data || ''),
      success: (msg: string, data?: any) => console.log(`✅ SHERLOCK v28.0 SUCCESS: ${msg}`, data || ''),
      error: (msg: string, data?: any) => console.error(`❌ SHERLOCK v28.0 ERROR: ${msg}`, data || ''),
      warn: (msg: string, data?: any) => console.warn(`⚠️ SHERLOCK v28.0 WARN: ${msg}`, data || '')
    };

    try {
      const validatedData = createInvoiceSchema.parse(req.body);
      const sessionId = req.sessionID;

      debug.info('Invoice Creation Request', {
        ...validatedData,
        sessionId: sessionId?.substring(0, 10) + '...'
      });

      const newInvoice = await createInvoice(validatedData);

      debug.success('Invoice Created Successfully', { invoiceId: newInvoice.id });

      res.status(201).json({
        success: true,
        invoiceId: newInvoice.id,
        message: "فاکتور با موفقیت ایجاد شد"
      });
    } catch (error: any) {
      debug.error('Invoice Creation Failed', { error: error.message, stack: error.stack?.substring(0, 500) });

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "خطا در اعتبارسنجی داده‌های ورودی",
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: "خطای داخلی سرور در ایجاد فاکتور",
        details: error.message
      });
    }
  });

  // ✅ SHERLOCK v28.0: Invoice Unified Edit Endpoint
  app.post("/api/invoices/unified-edit", authMiddleware, async (req, res) => {
    const debug = {
      info: (msg: string, data?: any) => console.log(`🔍 SHERLOCK v28.0 INFO: ${msg}`, data || ''),
      success: (msg: string, data?: any) => console.log(`✅ SHERLOCK v28.0 SUCCESS: ${msg}`, data || ''),
      error: (msg: string, data?: any) => console.error(`❌ SHERLOCK v28.0 ERROR: ${msg}`, data || ''),
      warn: (msg: string, data?: any) => console.warn(`⚠️ SHERLOCK v28.0 WARN: ${msg}`, data || '')
    };

    try {
      const {
        invoiceId,
        representativeCode,
        editReason,
        originalAmount,
        editedAmount,
        editedBy,
        records,
        requiresFinancialSync
      } = req.body;

      const sessionId = req.sessionID;
      debug.info('Unified Edit Request Started', {
        invoiceId,
        representativeCode,
        amountChange: editedAmount - originalAmount,
        sessionId: sessionId?.substring(0, 10) + '...'
      });

      // ✅ Enhanced Validation
      if (!invoiceId || !representativeCode || !records || !Array.isArray(records)) {
        debug.error('Validation Failed - Missing Required Fields');
        return res.status(400).json({
          success: false,
          error: "داده‌های ضروری ناقص است"
        });
      }

      if (editedAmount < 0) {
        debug.error('Validation Failed - Negative Amount', { editedAmount });
        return res.status(400).json({
          success: false,
          error: "مبلغ فاکتور نمی‌تواند منفی باشد"
        });
      }

      // ✅ Get Invoice and Representative
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
      if (!invoice) {
        debug.error('Invoice Not Found', { invoiceId });
        return res.status(404).json({
          success: false,
          error: "فاکتور یافت نشد"
        });
      }

      const representative = await storage.getRepresentativeByCode(representativeCode);
      if (!representative) {
        debug.error('Representative Not Found', { representativeCode });
        return res.status(404).json({
          success: false,
          error: "نماینده یافت نشد"
        });
      }

      // ✅ Atomic Transaction Processing
      const transactionId = `TXN_EDIT_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      debug.info('Starting Atomic Transaction', { transactionId });

      await db.transaction(async (tx) => {
        // 1. Create Edit Record
        const editRecord = await storage.createInvoiceEdit({
          invoiceId,
          originalUsageData: invoice.usageData,
          editedUsageData: { records },
          editType: 'UNIFIED_EDIT',
          editReason,
          originalAmount,
          editedAmount,
          editedBy,
          transactionId
        });

        debug.success('Edit Record Created', { editRecordId: editRecord.id });

        // 2. Update Invoice
        await tx.update(invoices)
          .set({
            amount: editedAmount.toString(),
            usageData: { records },
            updatedAt: new Date()
          })
          .where(eq(invoices.id, invoiceId));

        debug.success('Invoice Updated', { invoiceId, newAmount: editedAmount });

        // 3. Financial Synchronization (if required)
        if (requiresFinancialSync) {
          await unifiedFinancialEngine.syncRepresentativeDebt(representative.id);
          debug.success('Financial Sync Completed', { representativeId: representative.id });
        }
      });

      // ✅ Cache Invalidation
      unifiedFinancialEngine.forceInvalidateRepresentative(representative.id, {
        cascadeGlobal: true,
        reason: 'unified_invoice_edit',
        immediate: true
      });

      debug.success('Cache Invalidated', { representativeId: representative.id });

      // ✅ Activity Logging
      await storage.createActivityLog({
        type: 'UNIFIED_INVOICE_EDIT',
        description: `فاکتور ${invoice.invoiceNumber} ویرایش شد - تغییر مبلغ: ${editedAmount - originalAmount} تومان`,
        relatedId: invoiceId,
        metadata: {
          transactionId,
          editedBy,
          representativeCode,
          amountChange: editedAmount - originalAmount,
          recordCount: records.length
        }
      });

      debug.success('Activity Logged');

      // ✅ Success Response
      const response = {
        success: true,
        transactionId,
        editId: transactionId,
        amountDifference: editedAmount - originalAmount,
        syncResults: {
          representativeSync: requiresFinancialSync,
          cacheInvalidation: true,
          financialIntegrity: true
        },
        message: "ویرایش فاکتور با موفقیت انجام شد"
      };

      debug.success('Unified Edit Completed Successfully', {
        transactionId,
        amountChange: editedAmount - originalAmount
      });

      res.json(response);

    } catch (error: any) {
      debug.error('Unified Edit Failed', {
        error: error.message,
        stack: error.stack?.substring(0, 500)
      });

      res.status(500).json({
        success: false,
        error: "خطای داخلی سرور در ویرایش فاکتور",
        details: error.message
      });
    }
  });

  // ✅ SHERLOCK v28.0: Invoice Usage Details Endpoint
  app.get("/api/invoices/:id/usage-details", authMiddleware, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);

      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: "فاکتور یافت نشد"
        });
      }

      // Extract usage data
      let usageRecords = [];
      if (invoice.usageData) {
        if (typeof invoice.usageData === 'object' && invoice.usageData.records) {
          usageRecords = invoice.usageData.records;
        } else if (Array.isArray(invoice.usageData)) {
          usageRecords = invoice.usageData;
        } else {
          // Create default record
          usageRecords = [{
            id: 1,
            description: "سرویس پایه",
            amount: parseFloat(invoice.amount) || 0,
            event_timestamp: invoice.issueDate || new Date().toISOString()
          }];
        }
      } else {
        // Default fallback
        usageRecords = [{
          id: 1,
          description: "سرویس پایه",
          amount: parseFloat(invoice.amount) || 0,
          event_timestamp: invoice.issueDate || new Date().toISOString()
        }];
      }

      res.json({
        success: true,
        data: {
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: parseFloat(invoice.amount),
          issueDate: invoice.issueDate,
          records: usageRecords
        }
      });

    } catch (error: any) {
      console.error('Usage details error:', error);
      res.status(500).json({
        success: false,
        error: "خطا در دریافت جزئیات استفاده"
      });
    }
  });

  // ✅ SHERLOCK v28.0: Invoice Edit History Endpoint
  app.get("/api/invoices/:id/edit-history", authMiddleware, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);

      const editHistory = await storage.getInvoiceEditHistory(invoiceId);

      res.json({
        success: true,
        data: editHistory || [],
        count: editHistory?.length || 0
      });

    } catch (error: any) {
      console.error('Edit history error:', error);
      res.status(500).json({
        success: false,
        error: "خطا در دریافت تاریخچه ویرایش"
      });
    }
  });

  // Register workspace routes using the default export
  app.use('/api/workspace', workspaceRouter);

  // Make sure we only register each route once
  console.log("Routes registered successfully");

  return app;
}

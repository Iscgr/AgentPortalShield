
/**
 * SHERLOCK v32.0: BATCH ROLLBACK API ROUTES
 * مسیرهای API برای حذف دسته‌جمعی فاکتورها
 */

import { Request, Response } from 'express';
import { BatchInvoiceRollbackEngine } from '../services/batch-invoice-rollback-engine.js';

export function registerBatchRollbackRoutes(app: any, requireAuth: any) {

  /**
   * گزارش فاکتورهای قابل حذف با تاریخ مشخص
   */
  app.get("/api/batch-rollback/preview/:issueDate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { issueDate } = req.params;
      
      console.log(`📊 SHERLOCK v32.0: Generating rollback preview for date ${issueDate}`);
      console.log(`📊 SHERLOCK v32.0: URL encoded date: ${decodeURIComponent(issueDate)}`);
      
      const decodedDate = decodeURIComponent(issueDate);
      const report = await BatchInvoiceRollbackEngine.getInvoicesByDateReport(decodedDate);
      
      console.log(`📊 SHERLOCK v32.0: Preview results - ${report.invoices.length} invoices, ${report.representativeSummary.length} representatives`);
      
      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        data: report,
        meta: {
          date: decodedDate,
          previewMode: true,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('❌ Rollback preview error:', error);
      res.status(500).setHeader('Content-Type', 'application/json').json({
        success: false,
        error: 'خطا در تولید گزارش پیش‌نمایش',
        details: error?.message || 'خطای نامشخص'
      });
    }
  });

  /**
   * تست حذف دسته‌جمعی (dry run)
   */
  app.post("/api/batch-rollback/test/:issueDate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { issueDate } = req.params;
      
      console.log(`🧪 SHERLOCK v32.0: Testing batch rollback for date ${issueDate}`);
      console.log(`🧪 SHERLOCK v32.0: URL encoded date: ${decodeURIComponent(issueDate)}`);
      
      const decodedDate = decodeURIComponent(issueDate);
      const result = await BatchInvoiceRollbackEngine.rollbackInvoicesByDate(decodedDate, true);
      
      console.log(`🧪 SHERLOCK v32.0: Test results - Success: ${result.success}, Invoices: ${result.deletedInvoices}, Errors: ${result.errors.length}`);
      
      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: result.success,
        data: result,
        meta: {
          testMode: true,
          noChangesApplied: true,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('❌ Rollback test error:', error);
      res.status(500).setHeader('Content-Type', 'application/json').json({
        success: false,
        error: 'خطا در تست حذف دسته‌جمعی',
        details: error?.message || 'خطای نامشخص'
      });
    }
  });

  /**
   * اجرای واقعی حذف دسته‌جمعی
   */
  app.post("/api/batch-rollback/execute/:issueDate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { issueDate } = req.params;
      const { confirmDelete, userConfirmation } = req.body;
      
      // اعتبارسنجی تأیید کاربر
      if (!confirmDelete || userConfirmation !== `DELETE_INVOICES_${issueDate}`) {
        return res.status(400).json({
          success: false,
          error: 'تأیید حذف ناقص یا نادرست',
          requiredConfirmation: `DELETE_INVOICES_${issueDate}`
        });
      }
      
      console.log(`🗑️ SHERLOCK v32.0: Executing REAL batch rollback for date ${issueDate}`);
      console.log(`⚠️ USER CONFIRMED DELETION: ${userConfirmation}`);
      
      const result = await BatchInvoiceRollbackEngine.rollbackInvoicesByDate(issueDate, false);
      
      if (result.success) {
        console.log(`✅ SHERLOCK v32.0: Batch rollback completed successfully`);
        console.log(`📊 Summary: ${result.deletedInvoices} invoices deleted, ${result.affectedRepresentatives} representatives updated`);
      }
      
      res.json({
        success: result.success,
        data: result,
        meta: {
          executionMode: true,
          changesApplied: result.success,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('❌ Rollback execution error:', error);
      res.status(500).json({
        success: false,
        error: 'خطا در اجرای حذف دسته‌جمعی',
        details: error?.message || 'خطای نامشخص'
      });
    }
  });

  console.log('✅ Batch Rollback Routes Registered');
}

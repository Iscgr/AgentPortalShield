
/**
 * SHERLOCK v32.0: BATCH INVOICE ROLLBACK ENGINE
 * سیستم حذف دسته‌جمعی فاکتورها با بازگشت کامل آمار مالی
 */

import { db } from '../db.js';
import { invoices, representatives, payments, financialTransactions } from '../../shared/schema.js';
import { eq, and, like, desc } from 'drizzle-orm';
import { UnifiedFinancialEngine } from './unified-financial-engine.js';
import { FinancialConsistencyEngine } from './financial-consistency-engine.js';

export interface BatchRollbackResult {
  success: boolean;
  deletedInvoices: number;
  affectedRepresentatives: number;
  restoredFinancialState: Array<{
    representativeId: number;
    representativeName: string;
    previousDebt: number;
    newDebt: number;
    difference: number;
  }>;
  rollbackTransactionId: string;
  errors: string[];
  warnings: string[];
}

export class BatchInvoiceRollbackEngine {
  
  /**
   * حذف دسته‌جمعی فاکتورها با تاریخ مشخص
   */
  static async rollbackInvoicesByDate(
    issueDate: string, // تاریخ شمسی به فرمت ۱۴۰۴/۰۵/۲۶
    dryRun: boolean = true // حالت تست اول
  ): Promise<BatchRollbackResult> {
    
    const rollbackTransactionId = `BATCH_ROLLBACK_${Date.now()}`;
    console.log(`🔄 SHERLOCK v32.0: Starting batch rollback for date ${issueDate}, dry run: ${dryRun}`);

    const result: BatchRollbackResult = {
      success: false,
      deletedInvoices: 0,
      affectedRepresentatives: 0,
      restoredFinancialState: [],
      rollbackTransactionId,
      errors: [],
      warnings: []
    };

    try {
      // 1. شناسایی فاکتورهای هدف
      const targetInvoices = await db.select({
        id: invoices.id,
        representativeId: invoices.representativeId,
        amount: invoices.amount,
        issueDate: invoices.issueDate
      }).from(invoices)
        .where(eq(invoices.issueDate, issueDate))
        .orderBy(desc(invoices.id));

      if (targetInvoices.length === 0) {
        result.warnings.push(`هیچ فاکتوری با تاریخ ${issueDate} یافت نشد`);
        return result;
      }

      console.log(`📊 Found ${targetInvoices.length} invoices to rollback`);

      // 2. گروه‌بندی بر اساس نماینده
      const representativeGroups = targetInvoices.reduce((acc, invoice) => {
        if (!acc[invoice.representativeId]) {
          acc[invoice.representativeId] = [];
        }
        acc[invoice.representativeId].push(invoice);
        return acc;
      }, {} as Record<number, typeof targetInvoices>);

      // 3. محاسبه تأثیر مالی قبل از حذف
      for (const [repId, invoiceGroup] of Object.entries(representativeGroups)) {
        const representativeId = parseInt(repId);

        try {
          // محاسبه وضعیت مالی فعلی
          const currentFinancial = await UnifiedFinancialEngine.calculateRepresentative(representativeId);
          
          // محاسبه مجموع فاکتورهای قرار به حذف
          const totalToDelete = invoiceGroup.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
          
          // محاسبه وضعیت مالی بعد از حذف
          const projectedDebt = Math.max(0, currentFinancial.actualDebt - totalToDelete);

          // دریافت نام نماینده
          const [representative] = await db.select({
            name: representatives.name
          }).from(representatives).where(eq(representatives.id, representativeId));

          result.restoredFinancialState.push({
            representativeId,
            representativeName: representative?.name || `نماینده ${representativeId}`,
            previousDebt: currentFinancial.actualDebt,
            newDebt: projectedDebt,
            difference: totalToDelete
          });

        } catch (error) {
          result.errors.push(`خطا در محاسبه نماینده ${representativeId}: ${error.message}`);
        }
      }

      result.affectedRepresentatives = Object.keys(representativeGroups).length;
      result.deletedInvoices = targetInvoices.length;

      // 4. اجرای حذف (فقط در صورت عدم dry run)
      if (!dryRun) {
        console.log(`🗑️ SHERLOCK v32.0: Executing actual deletion of ${targetInvoices.length} invoices...`);

        // ثبت تراکنش rollback
        await this.recordRollbackTransaction(rollbackTransactionId, targetInvoices, result.restoredFinancialState);

        // حذف فاکتورها (یکی یکی برای ایمنی)
        for (const invoice of targetInvoices) {
          try {
            await db.delete(invoices).where(eq(invoices.id, invoice.id));
            console.log(`✅ Deleted invoice ${invoice.id}`);
          } catch (error) {
            result.errors.push(`خطا در حذف فاکتور ${invoice.id}: ${error.message}`);
          }
        }

        // بروزرسانی آمار مالی نمایندگان
        for (const repState of result.restoredFinancialState) {
          try {
            // Force invalidate cache
            if (UnifiedFinancialEngine.forceInvalidateRepresentative) {
              UnifiedFinancialEngine.forceInvalidateRepresentative(repState.representativeId, {
                cascadeGlobal: true,
                reason: 'batch_rollback',
                immediate: true
              });
            }

            // بروزرسانی بدهی در جدول نمایندگان
            await db.update(representatives)
              .set({
                totalDebt: repState.newDebt.toString(),
                updatedAt: new Date()
              })
              .where(eq(representatives.id, repState.representativeId));

            console.log(`✅ Updated representative ${repState.representativeId} debt: ${repState.previousDebt} → ${repState.newDebt}`);

          } catch (error) {
            result.errors.push(`خطا در بروزرسانی نماینده ${repState.representativeId}: ${error.message}`);
          }
        }

        // اعتبارسنجی نهایی
        await FinancialConsistencyEngine.performSystemCorrection();

        result.success = result.errors.length === 0;
      } else {
        result.success = true;
        result.warnings.push('این یک تست اجرا بود - هیچ تغییری انجام نشده');
      }

      console.log(`${dryRun ? '🧪' : '✅'} SHERLOCK v32.0: Batch rollback ${dryRun ? 'simulation' : 'execution'} completed`);

      return result;

    } catch (error) {
      result.errors.push(`خطای سیستمی: ${error.message}`);
      result.success = false;
      return result;
    }
  }

  /**
   * ثبت تراکنش rollback برای قابلیت بازگشت
   */
  private static async recordRollbackTransaction(
    transactionId: string,
    deletedInvoices: any[],
    financialChanges: any[]
  ): Promise<void> {
    try {
      await db.insert(financialTransactions).values({
        transactionId,
        type: 'BATCH_INVOICE_ROLLBACK',
        representativeId: null, // تراکنش سیستمی
        relatedEntityType: 'system',
        relatedEntityId: null,
        originalState: {
          deletedInvoices: deletedInvoices.map(inv => ({
            id: inv.id,
            representativeId: inv.representativeId,
            amount: inv.amount,
            issueDate: inv.issueDate
          })),
          financialImpact: financialChanges
        },
        targetState: {
          status: 'COMPLETED',
          deletedCount: deletedInvoices.length,
          affectedRepresentatives: financialChanges.length
        },
        financialImpact: {
          totalRollbackAmount: deletedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0),
          affectedRepresentatives: financialChanges.length
        },
        rollbackData: {
          originalInvoices: deletedInvoices,
          financialStates: financialChanges
        },
        initiatedBy: 'BATCH_ROLLBACK_ENGINE',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error recording rollback transaction:', error);
    }
  }

  /**
   * گزارش فاکتورهای قابل حذف
   */
  static async getInvoicesByDateReport(issueDate: string): Promise<{
    invoices: any[];
    representativeSummary: Array<{
      representativeId: number;
      representativeName: string;
      invoiceCount: number;
      totalAmount: number;
      currentDebt: number;
    }>;
    totalAmount: number;
  }> {
    const targetInvoices = await db.select({
      id: invoices.id,
      representativeId: invoices.representativeId,
      amount: invoices.amount,
      issueDate: invoices.issueDate,
      createdAt: invoices.createdAt
    }).from(invoices)
      .where(eq(invoices.issueDate, issueDate))
      .orderBy(desc(invoices.id));

    // گروه‌بندی بر اساس نماینده
    const representativeGroups = targetInvoices.reduce((acc, invoice) => {
      if (!acc[invoice.representativeId]) {
        acc[invoice.representativeId] = [];
      }
      acc[invoice.representativeId].push(invoice);
      return acc;
    }, {} as Record<number, typeof targetInvoices>);

    const representativeSummary = [];
    
    for (const [repId, invoiceGroup] of Object.entries(representativeGroups)) {
      const representativeId = parseInt(repId);
      
      const [representative] = await db.select({
        name: representatives.name,
        totalDebt: representatives.totalDebt
      }).from(representatives).where(eq(representatives.id, representativeId));

      representativeSummary.push({
        representativeId,
        representativeName: representative?.name || `نماینده ${representativeId}`,
        invoiceCount: invoiceGroup.length,
        totalAmount: invoiceGroup.reduce((sum, inv) => sum + parseFloat(inv.amount), 0),
        currentDebt: parseFloat(representative?.totalDebt || '0')
      });
    }

    return {
      invoices: targetInvoices,
      representativeSummary: representativeSummary.sort((a, b) => b.totalAmount - a.totalAmount),
      totalAmount: targetInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0)
    };
  }
}

export const batchInvoiceRollbackEngine = new BatchInvoiceRollbackEngine();

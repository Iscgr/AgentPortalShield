
/**
 * SHERLOCK v28.0: FINANCIAL CONSISTENCY ENGINE
 * محرک ثبات و یکپارچگی محاسبات مالی
 */

import { db } from '../db.js';
import { representatives, invoices, payments, financialTransactions } from '../../shared/schema.js';
import { eq, sql, and, desc } from 'drizzle-orm';
import { unifiedFinancialEngine } from './unified-financial-engine.js';

export interface ConsistencyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  corrections: Array<{
    representativeId: number;
    type: string;
    oldValue: number;
    newValue: number;
    reason: string;
  }>;
  summary: {
    totalRepresentatives: number;
    inconsistentCount: number;
    correctedAmount: number;
    validationDuration: number;
  };
}

export class FinancialConsistencyEngine {
  /**
   * اعتبارسنجی جامع ثبات محاسبات مالی
   */
  static async validateFinancialConsistency(): Promise<ConsistencyValidationResult> {
    const startTime = Date.now();
    console.log('🔍 SHERLOCK v28.0: Starting comprehensive financial consistency validation...');

    const result: ConsistencyValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      corrections: [],
      summary: {
        totalRepresentatives: 0,
        inconsistentCount: 0,
        correctedAmount: 0,
        validationDuration: 0
      }
    };

    try {
      // 1. دریافت همه نمایندگان فعال
      const allRepresentatives = await db.select({
        id: representatives.id,
        name: representatives.name,
        code: representatives.code,
        totalDebt: representatives.totalDebt,
        isActive: representatives.isActive
      }).from(representatives).where(eq(representatives.isActive, true));

      result.summary.totalRepresentatives = allRepresentatives.length;

      // 2. اعتبارسنجی هر نماینده
      for (const rep of allRepresentatives) {
        try {
          const validationResult = await this.validateRepresentativeConsistency(rep.id);
          
          if (!validationResult.isConsistent) {
            result.isValid = false;
            result.summary.inconsistentCount++;
            
            // اصلاح خودکار
            const correction = await this.correctRepresentativeDebt(rep.id, validationResult);
            if (correction) {
              result.corrections.push({
                representativeId: rep.id,
                type: 'DEBT_CORRECTION',
                oldValue: parseFloat(rep.totalDebt),
                newValue: correction.newDebt,
                reason: correction.reason
              });
              result.summary.correctedAmount += Math.abs(correction.newDebt - parseFloat(rep.totalDebt));
            }
          }
        } catch (error) {
          result.errors.push(`Error validating representative ${rep.id}: ${error.message}`);
        }
      }

      // 3. اعتبارسنجی تراکنش‌های مالی
      await this.validateFinancialTransactions(result);

      // 4. اعتبارسنجی وضعیت فاکتورها
      await this.validateInvoiceStatuses(result);

      result.summary.validationDuration = Date.now() - startTime;
      console.log(`✅ SHERLOCK v28.0: Financial consistency validation completed in ${result.summary.validationDuration}ms`);

      return result;
    } catch (error) {
      result.errors.push(`Critical validation error: ${error.message}`);
      result.isValid = false;
      return result;
    }
  }

  /**
   * اعتبارسنجی ثبات مالی یک نماینده
   */
  static async validateRepresentativeConsistency(representativeId: number): Promise<{
    isConsistent: boolean;
    calculatedDebt: number;
    storedDebt: number;
    difference: number;
    details: any;
  }> {
    // محاسبه بدهی واقعی از روی فاکتورها و پرداخت‌ها
    const realTimeData = await unifiedFinancialEngine.calculateRepresentative(representativeId);
    
    // دریافت بدهی ذخیره شده
    const [storedData] = await db.select({
      totalDebt: representatives.totalDebt
    }).from(representatives).where(eq(representatives.id, representativeId));

    const storedDebt = parseFloat(storedData?.totalDebt || '0');
    const calculatedDebt = realTimeData.actualDebt;
    const difference = Math.abs(calculatedDebt - storedDebt);

    return {
      isConsistent: difference < 100, // تفاوت کمتر از 100 تومان قابل قبول
      calculatedDebt,
      storedDebt,
      difference,
      details: realTimeData
    };
  }

  /**
   * اصلاح خودکار بدهی نماینده
   */
  static async correctRepresentativeDebt(representativeId: number, validationResult: any): Promise<{
    newDebt: number;
    reason: string;
  } | null> {
    try {
      const newDebt = validationResult.calculatedDebt;
      
      await db.update(representatives)
        .set({
          totalDebt: newDebt.toString(),
          updatedAt: new Date()
        })
        .where(eq(representatives.id, representativeId));

      // ثبت تراکنش اصلاح
      await this.recordCorrectionTransaction(representativeId, validationResult.storedDebt, newDebt);

      return {
        newDebt,
        reason: `Automatic debt correction: ${validationResult.difference.toFixed(2)} difference`
      };
    } catch (error) {
      console.error(`Error correcting representative ${representativeId} debt:`, error);
      return null;
    }
  }

  /**
   * ثبت تراکنش اصلاح
   */
  static async recordCorrectionTransaction(representativeId: number, oldDebt: number, newDebt: number) {
    try {
      await db.insert(financialTransactions).values({
        transactionId: `CORRECTION_${Date.now()}_${representativeId}`,
        type: 'DEBT_CORRECTION',
        representativeId,
        relatedEntityType: 'representative',
        relatedEntityId: representativeId,
        originalState: { debt: oldDebt },
        targetState: { debt: newDebt },
        financialImpact: {
          debtChange: newDebt - oldDebt,
          correctionAmount: Math.abs(newDebt - oldDebt)
        },
        rollbackData: {
          representativeId,
          originalDebt: oldDebt
        },
        initiatedBy: 'SYSTEM_CORRECTION',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error recording correction transaction:', error);
    }
  }

  /**
   * اعتبارسنجی تراکنش‌های مالی
   */
  static async validateFinancialTransactions(result: ConsistencyValidationResult) {
    try {
      // بررسی تراکنش‌های ناتمام
      const incompleteTxns = await db.select()
        .from(financialTransactions)
        .where(sql`status IS NULL OR status != 'COMPLETED'`)
        .limit(10);

      if (incompleteTxns.length > 0) {
        result.warnings.push(`${incompleteTxns.length} incomplete financial transactions found`);
      }
    } catch (error) {
      result.errors.push(`Transaction validation error: ${error.message}`);
    }
  }

  /**
   * اعتبارسنجی وضعیت فاکتورها
   */
  static async validateInvoiceStatuses(result: ConsistencyValidationResult) {
    try {
      // بررسی فاکتورهای با وضعیت نادرست
      const inconsistentInvoices = await db.select({
        id: invoices.id,
        amount: invoices.amount,
        status: invoices.status,
        representativeId: invoices.representativeId
      }).from(invoices)
        .where(sql`status = 'paid' AND id IN (
          SELECT invoice_id FROM payments WHERE is_allocated = false
        )`)
        .limit(5);

      if (inconsistentInvoices.length > 0) {
        result.warnings.push(`${inconsistentInvoices.length} invoices with inconsistent payment status`);
      }
    } catch (error) {
      result.errors.push(`Invoice status validation error: ${error.message}`);
    }
  }

  /**
   * اجرای اصلاحات فوری کل سیستم
   */
  static async performSystemCorrection(): Promise<{
    success: boolean;
    corrections: number;
    errors: string[];
    duration: number;
  }> {
    const startTime = Date.now();
    console.log('🔧 SHERLOCK v28.0: Starting system-wide correction...');

    try {
      const validationResult = await this.validateFinancialConsistency();
      
      if (validationResult.corrections.length > 0) {
        // Force cache invalidation after corrections
        const { UnifiedFinancialEngine } = await import('./unified-financial-engine.js');
        UnifiedFinancialEngine.clearAllCache();
      }

      return {
        success: validationResult.corrections.length > 0,
        corrections: validationResult.corrections.length,
        errors: validationResult.errors,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        corrections: 0,
        errors: [error.message],
        duration: Date.now() - startTime
      };
    }
  }
}

export const financialConsistencyEngine = new FinancialConsistencyEngine();

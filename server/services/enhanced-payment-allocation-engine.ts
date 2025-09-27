/**
 * ENHANCED PAYMENT ALLOCATION ENGINE
 * مطابق با اصول حسابداری استاندارد
 */

import { db } from '../db.js';
import { payments, invoices, representatives } from '../../shared/schema.js';
import { eq, sql, and, desc } from 'drizzle-orm';

export interface AllocationRule {
  method: 'FIFO' | 'LIFO' | 'OLDEST_FIRST' | 'HIGHEST_AMOUNT_FIRST' | 'MANUAL';
  allowPartialAllocation: boolean;
  allowOverAllocation: boolean;
  priorityInvoiceStatuses: string[];
}

export interface AllocationResult {
  success: boolean;
  allocatedAmount: number;
  remainingAmount: number;
  allocations: PaymentAllocation[];
  errors: string[];
  warnings: string[];
}

export class EnhancedPaymentAllocationEngine {

  /**
   * ✅ ATOMOS v2.0: تخصیص خودکار بازطراحی شده برای سازگاری با ساختار پایگاه داده
   */
  static async autoAllocatePayment(
    paymentId: number,
    rules: AllocationRule = {
      method: 'FIFO',
      allowPartialAllocation: true,
      allowOverAllocation: false,
      priorityInvoiceStatuses: ['unpaid', 'partial']
    }
  ): Promise<AllocationResult> {

    console.log(`🔄 Starting auto-allocation for payment ${paymentId} with ${rules.method} method`);

    try {
      // دریافت اطلاعات پرداخت
      const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));

      if (!payment) {
        return {
          success: false,
          allocatedAmount: 0,
          remainingAmount: 0,
          allocations: [],
          errors: ['Payment not found'],
          warnings: []
        };
      }

      const paymentAmount = parseFloat(payment.amount);
      let remainingAmount = paymentAmount;
      const allocations: PaymentAllocation[] = [];
      const warnings: string[] = [];

      // دریافت فاکتورهای قابل تخصیص (مرتب شده طبق روش انتخابی)
      const eligibleInvoices = await this.getEligibleInvoices(
        payment.representativeId,
        rules
      );

      console.log(`📋 Found ${eligibleInvoices.length} eligible invoices for allocation`);

      // ✅ ATOMOS v1.0: تخصیص خودکار بهبود یافته با FIFO کامل
      for (const invoice of eligibleInvoices) {
        if (remainingAmount <= 0) break;

        const invoiceAmount = parseFloat(invoice.amount);
        const currentlyAllocated = await this.getCurrentlyAllocatedAmount(invoice.id);
        const invoiceBalance = invoiceAmount - currentlyAllocated;

        console.log(`🔍 ATOMOS FIFO: Invoice ${invoice.id} - Amount: ${invoiceAmount}, Allocated: ${currentlyAllocated}, Balance: ${invoiceBalance}`);

        if (invoiceBalance <= 0) {
          warnings.push(`Invoice ${invoice.id} is already fully allocated`);
          continue;
        }

        // محاسبه مبلغ قابل تخصیص
        const allocationAmount = Math.min(remainingAmount, invoiceBalance);

        // ✅ ثبت تخصیص با اطلاعات کامل
        allocations.push({
          invoiceId: invoice.id,
          allocatedAmount: allocationAmount,
          allocationDate: new Date().toISOString(),
          allocationMethod: 'AUTO',
          allocatedBy: 'SYSTEM'
        });

        // ✅ فوری: تخصیص واقعی در پایگاه داده
        await db.update(payments)
          .set({
            // invoiceId: invoice.id, // This should not be set here, it's a one-to-many relationship
            isAllocated: true,
            updatedAt: new Date()
          })
          .where(eq(payments.id, paymentId));

        // Instead of updating payment.invoiceId, we will create a new entry in a separate allocation table or similar
        // For now, we assume the `allocations` array on the payment object will be updated later or managed elsewhere.
        // The current structure might need review if `payments.invoiceId` is meant to be a foreign key.

        remainingAmount -= allocationAmount;

        console.log(`✅ ATOMOS FIFO: Allocated ${allocationAmount} to invoice ${invoice.id}, remaining: ${remainingAmount}`);

        // ✅ اگر پرداخت کاملاً تخصیص یافت، خروج از حلقه
        if (remainingAmount <= 0) {
          console.log(`🎯 ATOMOS FIFO: Payment ${paymentId} fully allocated`);
          break;
        }
      }

      // بروزرسانی پرداخت
      await this.updatePaymentAllocation(paymentId, {
        allocatedAmount: paymentAmount - remainingAmount,
        remainingAmount,
        allocations,
        allocationMethod: 'AUTO_' + rules.method,
        allocationHistory: [{
          timestamp: new Date().toISOString(),
          action: 'ALLOCATE',
          amount: paymentAmount - remainingAmount,
          method: rules.method,
          performedBy: 'SYSTEM',
          reason: 'Automatic allocation'
        }]
      });

      // بروزرسانی وضعیت فاکتورها
      await this.updateInvoiceStatuses(allocations);

      return {
        success: true,
        allocatedAmount: paymentAmount - remainingAmount,
        remainingAmount,
        allocations,
        errors: [],
        warnings
      };

    } catch (error) {
      console.error('Error in auto-allocation:', error);
      return {
        success: false,
        allocatedAmount: 0,
        remainingAmount: 0,
        allocations: [],
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * ✅ ATOMOS v1.0: تخصیص دستی پرداخت به فاکتور خاص - بهبود یافته
   */
  static async manualAllocatePayment(
    paymentId: number,
    invoiceId: number,
    amount: number,
    performedBy: string
  ): Promise<AllocationResult> {

    console.log(`🎯 Manual allocation: Payment ${paymentId} -> Invoice ${invoiceId}, Amount: ${amount}`);

    try {
      // اعتبارسنجی‌های اولیه
      const validation = await this.validateManualAllocation(paymentId, invoiceId, amount);
      if (!validation.isValid) {
        return {
          success: false,
          allocatedAmount: 0,
          remainingAmount: 0,
          allocations: [],
          errors: validation.errors,
          warnings: []
        };
      }

      // انجام تخصیص دستی
      const allocation: PaymentAllocation = {
        invoiceId,
        allocatedAmount: amount,
        allocationDate: new Date().toISOString(),
        allocationMethod: 'MANUAL',
        allocatedBy: performedBy
      };

      // بروزرسانی پرداخت
      const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
      const currentAllocations = payment.allocations || [];
      const newAllocations = [...currentAllocations, allocation];

      const totalAllocated = newAllocations.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0);
      const remainingAmount = parseFloat(payment.amount) - totalAllocated;

      await this.updatePaymentAllocation(paymentId, {
        allocatedAmount: totalAllocated,
        remainingAmount,
        allocations: newAllocations,
        allocationMethod: 'MANUAL',
        allocationHistory: [
          ...(payment.allocationHistory || []),
          {
            timestamp: new Date().toISOString(),
            action: 'ALLOCATE',
            invoiceId,
            amount,
            method: 'MANUAL',
            performedBy,
            reason: 'Manual allocation by user'
          }
        ]
      });

      // بروزرسانی وضعیت فاکتور
      await this.updateInvoiceStatuses([allocation]);

      console.log(`✅ Manual allocation completed successfully`);

      return {
        success: true,
        allocatedAmount: totalAllocated,
        remainingAmount,
        allocations: newAllocations,
        errors: [],
        warnings: []
      };

    } catch (error) {
      console.error('Error in manual allocation:', error);
      return {
        success: false,
        allocatedAmount: 0,
        remainingAmount: 0,
        allocations: [],
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * لغو تخصیص پرداخت (مطابق اصول حسابداری)
   */
  static async deallocatePayment(
    paymentId: number,
    invoiceId: number,
    performedBy: string,
    reason: string
  ): Promise<AllocationResult> {

    console.log(`🔄 Deallocating payment ${paymentId} from invoice ${invoiceId}`);

    try {
      const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));

      if (!payment) {
        return {
          success: false,
          allocatedAmount: 0,
          remainingAmount: 0,
          allocations: [],
          errors: ['Payment not found'],
          warnings: []
        };
      }

      const currentAllocations = payment.allocations || [];
      const targetAllocation = currentAllocations.find(alloc => alloc.invoiceId === invoiceId);

      if (!targetAllocation) {
        return {
          success: false,
          allocatedAmount: 0,
          remainingAmount: 0,
          allocations: currentAllocations,
          errors: ['No allocation found for this invoice'],
          warnings: []
        };
      }

      // حذف تخصیص
      const newAllocations = currentAllocations.filter(alloc => alloc.invoiceId !== invoiceId);
      const totalAllocated = newAllocations.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0);
      const remainingAmount = parseFloat(payment.amount) - totalAllocated;

      // بروزرسانی پرداخت
      await this.updatePaymentAllocation(paymentId, {
        allocatedAmount: totalAllocated,
        remainingAmount,
        allocations: newAllocations,
        allocationMethod: 'MANUAL',
        allocationHistory: [
          ...(payment.allocationHistory || []),
          {
            timestamp: new Date().toISOString(),
            action: 'DEALLOCATE',
            invoiceId,
            amount: targetAllocation.allocatedAmount,
            method: 'MANUAL',
            performedBy,
            reason
          }
        ]
      });

      // بروزرسانی وضعیت فاکتور
      await this.recalculateInvoiceStatus(invoiceId);

      console.log(`✅ Deallocation completed successfully`);

      return {
        success: true,
        allocatedAmount: totalAllocated,
        remainingAmount,
        allocations: newAllocations,
        errors: [],
        warnings: []
      };

    } catch (error) {
      console.error('Error in deallocation:', error);
      return {
        success: false,
        allocatedAmount: 0,
        remainingAmount: 0,
        allocations: [],
        errors: [error.message],
        warnings: []
      };
    }
  }

  // Helper methods...
  private static async getEligibleInvoices(representativeId: number, rules: AllocationRule) {
    let orderBy;

    switch (rules.method) {
      case 'FIFO':
        orderBy = [invoices.createdAt];
        break;
      case 'LIFO':
        orderBy = [desc(invoices.createdAt)];
        break;
      case 'OLDEST_FIRST':
        orderBy = [invoices.dueDate];
        break;
      case 'HIGHEST_AMOUNT_FIRST':
        orderBy = [desc(sql`CAST(amount as DECIMAL)`)];
        break;
      default:
        orderBy = [invoices.createdAt];
    }

    return await db.select()
      .from(invoices)
      .where(
        and(
          eq(invoices.representativeId, representativeId),
          sql`status IN (${rules.priorityInvoiceStatuses.map(s => `'${s}'`).join(',')})`
        )
      )
      .orderBy(...orderBy);
  }

  private static async getCurrentlyAllocatedAmount(invoiceId: number): Promise<number> {
    // محاسبه مجموع مبالغ تخصیص یافته به این فاکتور
    const allocatedPayments = await db.select()
      .from(payments)
      .where(sql`allocations IS NOT NULL`); // This condition might be too broad if payments can have allocations for other purposes

    let totalAllocated = 0;

    for (const payment of allocatedPayments) {
      const allocations = payment.allocations || [];
      for (const allocation of allocations) {
        if (allocation.invoiceId === invoiceId) {
          totalAllocated += allocation.allocatedAmount;
        }
      }
    }

    return totalAllocated;
  }

  private static async updatePaymentAllocation(paymentId: number, updates: any): Promise<void> {
    // This method assumes that the `allocations` array on the payment object is the source of truth for allocations.
    // If a separate allocation table is preferred, this method and related logic would need to change significantly.
    await db.update(payments)
      .set({
        allocatedAmount: updates.allocatedAmount.toString(),
        remainingAmount: updates.remainingAmount.toString(),
        allocations: updates.allocations,
        allocationMethod: updates.allocationMethod,
        allocationHistory: updates.allocationHistory,
        isAllocated: updates.allocatedAmount > 0,
        updatedAt: new Date()
      })
      .where(eq(payments.id, paymentId));
  }

  private static async updateInvoiceStatuses(allocations: PaymentAllocation[]): Promise<void> {
    for (const allocation of allocations) {
      await this.recalculateInvoiceStatus(allocation.invoiceId);
    }
  }

  private static async recalculateInvoiceStatus(invoiceId: number): Promise<void> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) return;

    const totalAllocated = await this.getCurrentlyAllocatedAmount(invoiceId);
    const invoiceAmount = parseFloat(invoice.amount);

    let newStatus;
    if (totalAllocated === 0) {
      newStatus = 'unpaid';
    } else if (totalAllocated >= invoiceAmount) {
      newStatus = 'paid';
    } else {
      newStatus = 'partially_paid';
    }

    await db.update(invoices)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
  }

  private static async validateManualAllocation(
    paymentId: number,
    invoiceId: number,
    amount: number
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // بررسی وجود پرداخت
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
    if (!payment) {
      errors.push('Payment not found');
      return { isValid: false, errors };
    }

    // بررسی وجود فاکتور
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) {
      errors.push('Invoice not found');
      return { isValid: false, errors };
    }

    // بررسی تطبیق نماینده
    if (payment.representativeId !== invoice.representativeId) {
      errors.push('Payment and invoice belong to different representatives');
    }

    // بررسی مبلغ منفی
    if (amount <= 0) {
      errors.push('Allocation amount must be positive');
    }

    // بررسی عدم تجاوز از مبلغ پرداخت
    const currentAllocated = (payment.allocations || [])
      .reduce((sum, alloc) => sum + alloc.allocatedAmount, 0);
    const remainingPayment = parseFloat(payment.amount) - currentAllocated;

    if (amount > remainingPayment) {
      errors.push(`Allocation amount (${amount}) exceeds remaining payment amount (${remainingPayment})`);
    }

    return { isValid: errors.length === 0, errors };
  }
}

export const enhancedPaymentAllocationEngine = new EnhancedPaymentAllocationEngine();
/**
 * ATOMOS v3.0: LEGACY ALLOCATION ENGINE - REMOVED
 * این engine حذف شده و با سیستم جدید جایگزین خواهد شد
 */

export interface AllocationRule {
  method: 'FIFO' | 'LIFO' | 'MANUAL';
  allowPartialAllocation: boolean;
  allowOverAllocation: boolean;
}

export interface AllocationResult {
  success: boolean;
  allocatedAmount: number;
  remainingAmount: number;
  errors: string[];
  warnings: string[];
  transactionId: string;
}

export class EnhancedPaymentAllocationEngine {
  static async autoAllocatePayment(): Promise<AllocationResult> {
    return {
      success: false,
      allocatedAmount: 0,
      remainingAmount: 0,
      errors: ["Legacy allocation engine has been removed. New system v3.0 is being implemented."],
      warnings: [],
      transactionId: "LEGACY_REMOVED"
    };
  }

  static async manualAllocatePayment(): Promise<AllocationResult> {
    return {
      success: false,
      allocatedAmount: 0,
      remainingAmount: 0,
      errors: ["Legacy allocation engine has been removed. New system v3.0 is being implemented."],
      warnings: [],
      transactionId: "LEGACY_REMOVED"
    };
  }
}

/**
 * TITAN-O v2.0: Simple Payment Allocation Service
 * سرویس ساده‌شده برای تخصیص پرداخت
 */

export interface SimpleAllocationResult {
  success: boolean;
  message: string;
  paymentId?: number;
  invoiceId?: number;
  allocatedAmount?: number;
  errors?: string[];
}

export class SimplePaymentAllocationService {

  /**
   * تخصیص خودکار پرداخت‌های تخصیص نیافته به فاکتورهای یک نماینده
   */
  static async autoAllocateUnallocatedPayments(representativeId: number): Promise<{
    success: boolean;
    processed: number;
    allocated: number;
    totalAmount: number;
    errors: string[];
  }> {
    console.log(`🚀 TITAN-O v2.0: Starting auto-allocation for representative ${representativeId}`);

    try {
      // پیدا کردن پرداخت‌های تخصیص نیافته
      const unallocatedPayments = await db.select()
        .from(payments)
        .where(and(
          eq(payments.representativeId, representativeId),
          eq(payments.isAllocated, false)
        ))
        .orderBy(payments.paymentDate);

      if (unallocatedPayments.length === 0) {
        return {
          success: true,
          processed: 0,
          allocated: 0,
          totalAmount: 0,
          errors: []
        };
      }

      // پیدا کردن فاکتورهای نیمه پرداخت شده یا پرداخت نشده
      const eligibleInvoices = await db.select()
        .from(invoices)
        .where(and(
          eq(invoices.representativeId, representativeId),
          sql`status IN ('unpaid', 'partial')`
        ))
        .orderBy(invoices.issueDate);

      let processedCount = 0;
      let allocatedCount = 0;
      let totalAllocatedAmount = 0;
      const errors: string[] = [];

      // تخصیص FIFO
      for (const payment of unallocatedPayments) {
        const paymentAmount = parseFloat(payment.amount);
        processedCount++;

        // پیدا کردن فاکتور مناسب
        let allocatedToInvoice = false;

        for (const invoice of eligibleInvoices) {
          // محاسبه مبلغ باقیمانده فاکتور
          const [paidResult] = await db.select({
            totalPaid: sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`
          }).from(payments)
          .where(and(
            eq(payments.invoiceId, invoice.id),
            eq(payments.isAllocated, true)
          ));

          const invoiceAmount = parseFloat(invoice.amount);
          const paidAmount = paidResult.totalPaid || 0;
          const remainingAmount = invoiceAmount - paidAmount;

          if (remainingAmount >= paymentAmount) {
            // تخصیص پرداخت
            await db.update(payments)
              .set({
                invoiceId: invoice.id,
                isAllocated: true,
                description: `${payment.description} - تخصیص خودکار به فاکتور ${invoice.invoiceNumber}`
              })
              .where(eq(payments.id, payment.id));

            // بروزرسانی وضعیت فاکتور
            const newTotalPaid = paidAmount + paymentAmount;
            const paymentRatio = newTotalPaid / invoiceAmount;

            let newStatus = 'unpaid';
            if (paymentRatio >= 0.999) {
              newStatus = 'paid';
            } else if (newTotalPaid > 0) {
              newStatus = 'partial';
            }

            await db.update(invoices)
              .set({ status: newStatus })
              .where(eq(invoices.id, invoice.id));

            allocatedCount++;
            totalAllocatedAmount += paymentAmount;
            allocatedToInvoice = true;

            console.log(`✅ Payment ${payment.id} allocated to invoice ${invoice.invoiceNumber}`);
            break;
          }
        }

        if (!allocatedToInvoice) {
          errors.push(`Payment ${payment.id} with amount ${paymentAmount} could not be allocated`);
        }
      }

      console.log(`✅ TITAN-O v2.0: Auto-allocation completed - ${allocatedCount}/${processedCount} payments allocated`);

      return {
        success: true,
        processed: processedCount,
        allocated: allocatedCount,
        totalAmount: totalAllocatedAmount,
        errors
      };

    } catch (error: any) {
      console.error('❌ TITAN-O v2.0: Auto-allocation error:', error);
      return {
        success: false,
        processed: 0,
        allocated: 0,
        totalAmount: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * دریافت خلاصه تخصیص برای یک نماینده
   */
  static async getAllocationSummary(representativeId: number): Promise<{
    totalPayments: number;
    allocatedPayments: number;
    unallocatedPayments: number;
    totalAmount: number;
    allocatedAmount: number;
    unallocatedAmount: number;
  }> {
    const [summary] = await db.select({
      totalPayments: sql<number>`COUNT(*)`,
      allocatedPayments: sql<number>`SUM(CASE WHEN is_allocated = true THEN 1 ELSE 0 END)`,
      unallocatedPayments: sql<number>`SUM(CASE WHEN is_allocated = false THEN 1 ELSE 0 END)`,
      totalAmount: sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`,
      allocatedAmount: sql<number>`COALESCE(SUM(CASE WHEN is_allocated = true THEN CAST(amount as DECIMAL) ELSE 0 END), 0)`,
      unallocatedAmount: sql<number>`COALESCE(SUM(CASE WHEN is_allocated = false THEN CAST(amount as DECIMAL) ELSE 0 END), 0)`
    }).from(payments)
    .where(eq(payments.representativeId, representativeId));

    return {
      totalPayments: summary.totalPayments || 0,
      allocatedPayments: summary.allocatedPayments || 0,
      unallocatedPayments: summary.unallocatedPayments || 0,
      totalAmount: summary.totalAmount || 0,
      allocatedAmount: summary.allocatedAmount || 0,
      unallocatedAmount: summary.unallocatedAmount || 0
    };
  }
}

export const simplePaymentAllocationService = new SimplePaymentAllocationService();
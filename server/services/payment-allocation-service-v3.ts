
/**
 * ATOMOS v3.0: COMPLETE PAYMENT ALLOCATION SYSTEM
 * 🎯 سیستم کاملاً جدید تخصیص پرداخت با معماری پاک و مدولار
 */

import { db } from '../db.js';
import { payments, invoices, representatives } from '../../shared/schema.js';
import { eq, sql, and, desc, asc } from 'drizzle-orm';
import { performance } from 'perf_hooks';

export interface PaymentAllocationRequest {
  paymentId: number;
  invoiceId?: number;
  amount?: number;
  allocationMethod: 'AUTO' | 'MANUAL';
  performedBy: string;
  reason?: string;
}

export interface PaymentAllocationResponse {
  success: boolean;
  message: string;
  data?: {
    paymentId: number;
    originalAmount: number;
    allocatedAmount: number;
    remainingAmount: number;
    allocatedToInvoice?: number;
    invoiceStatus?: string;
  };
  errors?: string[];
  transactionId: string;
  processingTime: number;
}

export interface InvoiceForAllocation {
  id: number;
  invoiceNumber: string;
  amount: number;
  currentlyPaid: number;
  remainingAmount: number;
  status: string;
  issueDate: string;
}

export class PaymentAllocationServiceV3 {
  
  private static generateTransactionId(): string {
    return `ATOMOS_v3_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * 🎯 ATOMOS v3.0: تخصیص خودکار پرداخت با الگوریتم FIFO
   */
  static async autoAllocatePayment(
    paymentId: number,
    performedBy: string,
    reason: string = 'تخصیص خودکار'
  ): Promise<PaymentAllocationResponse> {
    const startTime = performance.now();
    const transactionId = this.generateTransactionId();
    
    console.log(`🚀 ATOMOS v3.0: Starting auto allocation for payment ${paymentId}`);
    
    return await db.transaction(async (tx) => {
      try {
        // 1. دریافت اطلاعات پرداخت
        const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId));
        
        if (!payment) {
          throw new Error(`پرداخت با شناسه ${paymentId} یافت نشد`);
        }
        
        if (payment.isAllocated) {
          throw new Error(`پرداخت ${paymentId} قبلاً تخصیص یافته است`);
        }
        
        const paymentAmount = parseFloat(payment.amount);
        
        // 2. دریافت فاکتورهای قابل تخصیص (FIFO)
        const eligibleInvoices = await this.getEligibleInvoicesForAuto(
          tx,
          payment.representativeId!
        );
        
        if (eligibleInvoices.length === 0) {
          throw new Error('هیچ فاکتور قابل تخصیصی برای این نماینده یافت نشد');
        }
        
        // 3. انتخاب اولین فاکتور مناسب (FIFO)
        let targetInvoice: InvoiceForAllocation | null = null;
        
        for (const invoice of eligibleInvoices) {
          if (invoice.remainingAmount >= 0.01 && paymentAmount <= invoice.remainingAmount) {
            targetInvoice = invoice;
            break;
          }
        }
        
        if (!targetInvoice) {
          // اگر پرداخت بزرگتر از تمام فاکتورها است، اولین فاکتور را انتخاب کن
          targetInvoice = eligibleInvoices[0];
        }
        
        // 4. محاسبه مبلغ تخصیص
        const allocationAmount = Math.min(paymentAmount, targetInvoice.remainingAmount);
        
        // 5. تخصیص پرداخت
        await tx.update(payments)
          .set({
            isAllocated: true,
            invoiceId: targetInvoice.id,
            description: `${payment.description || 'پرداخت'} - تخصیص خودکار به فاکتور ${targetInvoice.invoiceNumber}`
          })
          .where(eq(payments.id, paymentId));
        
        // 6. ایجاد پرداخت باقیمانده (اگر لازم باشد)
        let remainingAmount = 0;
        if (paymentAmount > allocationAmount) {
          remainingAmount = paymentAmount - allocationAmount;
          
          await tx.insert(payments).values({
            representativeId: payment.representativeId!,
            amount: remainingAmount.toString(),
            paymentDate: payment.paymentDate,
            description: `باقیمانده پرداخت ${paymentId} پس از تخصیص خودکار`,
            isAllocated: false
          });
          
          // بروزرسانی مبلغ پرداخت اصلی
          await tx.update(payments)
            .set({ amount: allocationAmount.toString() })
            .where(eq(payments.id, paymentId));
        }
        
        // 7. بروزرسانی وضعیت فاکتور
        const newInvoiceStatus = await this.updateInvoiceStatus(tx, targetInvoice.id);
        
        const processingTime = performance.now() - startTime;
        
        console.log(`✅ ATOMOS v3.0: Auto allocation completed in ${Math.round(processingTime)}ms`);
        
        return {
          success: true,
          message: `پرداخت ${paymentAmount} تومان با موفقیت به فاکتور ${targetInvoice.invoiceNumber} تخصیص یافت`,
          data: {
            paymentId,
            originalAmount: paymentAmount,
            allocatedAmount: allocationAmount,
            remainingAmount,
            allocatedToInvoice: targetInvoice.id,
            invoiceStatus: newInvoiceStatus
          },
          transactionId,
          processingTime
        };
        
      } catch (error: any) {
        console.error(`❌ ATOMOS v3.0: Auto allocation failed:`, error);
        return {
          success: false,
          message: 'خطا در تخصیص خودکار پرداخت',
          errors: [error.message],
          transactionId,
          processingTime: performance.now() - startTime
        };
      }
    });
  }

  /**
   * 🎯 ATOMOS v3.0: تخصیص دستی پرداخت به فاکتور مشخص
   */
  static async manualAllocatePayment(
    paymentId: number,
    invoiceId: number,
    amount: number,
    performedBy: string,
    reason: string = 'تخصیص دستی'
  ): Promise<PaymentAllocationResponse> {
    const startTime = performance.now();
    const transactionId = this.generateTransactionId();
    
    console.log(`🎯 ATOMOS v3.0: Starting manual allocation: Payment ${paymentId} -> Invoice ${invoiceId}`);
    
    return await db.transaction(async (tx) => {
      try {
        // 1. اعتبارسنجی پرداخت
        const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId));
        
        if (!payment) {
          throw new Error(`پرداخت با شناسه ${paymentId} یافت نشد`);
        }
        
        if (payment.isAllocated) {
          throw new Error(`پرداخت ${paymentId} قبلاً تخصیص یافته است`);
        }
        
        const paymentAmount = parseFloat(payment.amount);
        
        if (amount <= 0 || amount > paymentAmount) {
          throw new Error(`مبلغ تخصیص ${amount} نامعتبر است (حداکثر: ${paymentAmount})`);
        }
        
        // 2. اعتبارسنجی فاکتور
        const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
        
        if (!invoice) {
          throw new Error(`فاکتور با شناسه ${invoiceId} یافت نشد`);
        }
        
        if (invoice.representativeId !== payment.representativeId) {
          throw new Error('فاکتور و پرداخت متعلق به نمایندگان مختلف هستند');
        }
        
        // 3. بررسی مبلغ باقیمانده فاکتور
        const invoiceData = await this.getInvoiceAllocationData(tx, invoiceId);
        
        if (amount > invoiceData.remainingAmount) {
          throw new Error(`مبلغ تخصیص ${amount} بیشتر از مبلغ باقیمانده فاکتور ${invoiceData.remainingAmount} است`);
        }
        
        // 4. تخصیص پرداخت
        const remainingPaymentAmount = paymentAmount - amount;
        
        if (remainingPaymentAmount < 0.01) {
          // تخصیص کامل
          await tx.update(payments)
            .set({
              isAllocated: true,
              invoiceId: invoiceId,
              description: `${payment.description || 'پرداخت'} - تخصیص کامل به فاکتور ${invoice.invoiceNumber}`
            })
            .where(eq(payments.id, paymentId));
        } else {
          // تخصیص جزئی
          await tx.insert(payments).values({
            representativeId: payment.representativeId!,
            invoiceId: invoiceId,
            amount: amount.toString(),
            paymentDate: payment.paymentDate,
            description: `تخصیص دستی از پرداخت ${paymentId} به فاکتور ${invoice.invoiceNumber}`,
            isAllocated: true
          });
          
          await tx.update(payments)
            .set({
              amount: remainingPaymentAmount.toString(),
              description: `${payment.description || 'پرداخت'} - باقیمانده پس از تخصیص ${amount} تومان`
            })
            .where(eq(payments.id, paymentId));
        }
        
        // 5. بروزرسانی وضعیت فاکتور
        const newInvoiceStatus = await this.updateInvoiceStatus(tx, invoiceId);
        
        const processingTime = performance.now() - startTime;
        
        console.log(`✅ ATOMOS v3.0: Manual allocation completed in ${Math.round(processingTime)}ms`);
        
        return {
          success: true,
          message: `مبلغ ${amount} تومان با موفقیت به فاکتور ${invoice.invoiceNumber} تخصیص یافت`,
          data: {
            paymentId,
            originalAmount: paymentAmount,
            allocatedAmount: amount,
            remainingAmount: remainingPaymentAmount,
            allocatedToInvoice: invoiceId,
            invoiceStatus: newInvoiceStatus
          },
          transactionId,
          processingTime
        };
        
      } catch (error: any) {
        console.error(`❌ ATOMOS v3.0: Manual allocation failed:`, error);
        return {
          success: false,
          message: 'خطا در تخصیص دستی پرداخت',
          errors: [error.message],
          transactionId,
          processingTime: performance.now() - startTime
        };
      }
    });
  }

  /**
   * دریافت فاکتورهای قابل تخصیص برای تخصیص خودکار (FIFO)
   */
  private static async getEligibleInvoicesForAuto(
    tx: any,
    representativeId: number
  ): Promise<InvoiceForAllocation[]> {
    const invoicesWithPayments = await tx.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      amount: invoices.amount,
      status: invoices.status,
      issueDate: invoices.issueDate,
      totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.isAllocated} = true THEN CAST(${payments.amount} as DECIMAL) ELSE 0 END), 0)`
    })
    .from(invoices)
    .leftJoin(payments, eq(invoices.id, payments.invoiceId))
    .where(and(
      eq(invoices.representativeId, representativeId),
      sql`${invoices.status} IN ('unpaid', 'partial', 'overdue')`
    ))
    .groupBy(invoices.id, invoices.invoiceNumber, invoices.amount, invoices.status, invoices.issueDate)
    .orderBy(asc(invoices.issueDate), asc(invoices.id));

    return invoicesWithPayments.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: parseFloat(inv.amount),
      currentlyPaid: inv.totalPaid || 0,
      remainingAmount: parseFloat(inv.amount) - (inv.totalPaid || 0),
      status: inv.status,
      issueDate: inv.issueDate
    })).filter(inv => inv.remainingAmount > 0.01);
  }

  /**
   * دریافت اطلاعات تخصیص فاکتور
   */
  private static async getInvoiceAllocationData(
    tx: any,
    invoiceId: number
  ): Promise<InvoiceForAllocation> {
    const [invoiceWithPayments] = await tx.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      amount: invoices.amount,
      status: invoices.status,
      issueDate: invoices.issueDate,
      totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.isAllocated} = true THEN CAST(${payments.amount} as DECIMAL) ELSE 0 END), 0)`
    })
    .from(invoices)
    .leftJoin(payments, eq(invoices.id, payments.invoiceId))
    .where(eq(invoices.id, invoiceId))
    .groupBy(invoices.id, invoices.invoiceNumber, invoices.amount, invoices.status, invoices.issueDate);

    const amount = parseFloat(invoiceWithPayments.amount);
    const currentlyPaid = invoiceWithPayments.totalPaid || 0;

    return {
      id: invoiceWithPayments.id,
      invoiceNumber: invoiceWithPayments.invoiceNumber,
      amount,
      currentlyPaid,
      remainingAmount: amount - currentlyPaid,
      status: invoiceWithPayments.status,
      issueDate: invoiceWithPayments.issueDate
    };
  }

  /**
   * بروزرسانی وضعیت فاکتور
   */
  private static async updateInvoiceStatus(tx: any, invoiceId: number): Promise<string> {
    const invoiceData = await this.getInvoiceAllocationData(tx, invoiceId);
    
    let newStatus = 'unpaid';
    const paymentRatio = invoiceData.amount > 0 ? (invoiceData.currentlyPaid / invoiceData.amount) : 0;
    
    if (paymentRatio >= 0.999) {
      newStatus = 'paid';
    } else if (invoiceData.currentlyPaid > 0.01) {
      newStatus = 'partial';
    }
    
    await tx.update(invoices)
      .set({
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(invoices.id, invoiceId));
    
    return newStatus;
  }

  /**
   * دریافت فاکتورهای قابل تخصیص برای یک نماینده
   */
  static async getAvailableInvoicesForRepresentative(
    representativeId: number
  ): Promise<InvoiceForAllocation[]> {
    return await db.transaction(async (tx) => {
      return await this.getEligibleInvoicesForAuto(tx, representativeId);
    });
  }

  /**
   * دریافت پرداخت‌های تخصیص نیافته برای یک نماینده
   */
  static async getUnallocatedPaymentsForRepresentative(
    representativeId: number
  ): Promise<any[]> {
    const unallocatedPayments = await db.select()
      .from(payments)
      .where(and(
        eq(payments.representativeId, representativeId),
        eq(payments.isAllocated, false)
      ))
      .orderBy(desc(payments.createdAt));

    return unallocatedPayments;
  }
}

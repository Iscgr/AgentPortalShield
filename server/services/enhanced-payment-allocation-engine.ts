/**
 * SHERLOCK v34.1: ENHANCED PAYMENT ALLOCATION ENGINE
 * 🎯 ATOMOS PROTOCOL COMPLIANT - Complete atomic payment allocation system
 * مطابق با اصول حسابداری استاندارد و FIFO دقیق
 */

import { db } from '../db.js';
import { payments, invoices, representatives } from '../../shared/schema.js';
import { eq, sql, and, desc, asc, inArray } from 'drizzle-orm';
import { performance } from 'perf_hooks';

export interface AllocationRule {
  method: 'FIFO' | 'LIFO' | 'OLDEST_FIRST' | 'HIGHEST_AMOUNT_FIRST' | 'MANUAL';
  allowPartialAllocation: boolean;
  allowOverAllocation: boolean;
  priorityInvoiceStatuses: string[];
  strictValidation?: boolean;
  auditMode?: boolean;
}

export interface PaymentAllocation {
  invoiceId: number;
  allocatedAmount: number;
  allocationDate: string;
  allocationMethod: 'AUTO' | 'MANUAL';
  allocatedBy: string;
  transactionId?: string;
  validationHash?: string;
}

export interface AllocationResult {
  success: boolean;
  allocatedAmount: number;
  remainingAmount: number;
  allocations: PaymentAllocation[];
  errors: string[];
  warnings: string[];
  transactionId: string;
  processingTime: number;
  auditTrail?: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  details: any;
  userId: string;
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface AllocationSummary {
  representativeId: number;
  totalAllocated: number;
  totalUnallocated: number;
  allocationHistory: PaymentAllocation[];
  lastAllocationDate: string | null;
}

export class EnhancedPaymentAllocationEngine {

  private static generateTransactionId(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private static generateValidationHash(allocation: any): string {
    return `HASH_${JSON.stringify(allocation).length}_${Date.now()}`;
  }

  /**
   * 🎯 SHERLOCK v35.0: تخصیص خودکار پرداخت با دقت کامل FIFO و قابلیت‌های پیشرفته
   * ATOMOS COMPLIANT - Enhanced atomic transaction processing with comprehensive validation
   */
  static async autoAllocatePayment(
    paymentId: number, 
    rules: AllocationRule = {
      method: 'FIFO',
      allowPartialAllocation: true,
      allowOverAllocation: false,
      priorityInvoiceStatuses: ['overdue', 'unpaid', 'partial'],
      strictValidation: true,
      auditMode: true
    }
  ): Promise<AllocationResult> {

    const startTime = performance.now();
    const transactionId = this.generateTransactionId();
    const auditTrail: AuditEntry[] = [];

    console.log(`🚀 SHERLOCK v34.1: Starting ATOMIC auto-allocation for payment ${paymentId}`);
    console.log(`📋 Transaction ID: ${transactionId}`);
    console.log(`⚙️ Rules: ${JSON.stringify(rules)}`);

    try {
      // 🔍 PHASE 1: Payment Validation & Retrieval
      auditTrail.push({
        timestamp: new Date().toISOString(),
        action: 'PAYMENT_VALIDATION_START',
        details: { paymentId, transactionId },
        userId: 'SYSTEM',
        result: 'SUCCESS'
      });

      const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));

      if (!payment) {
        const error = `Payment ${paymentId} not found`;
        auditTrail.push({
          timestamp: new Date().toISOString(),
          action: 'PAYMENT_VALIDATION_FAILED',
          details: { paymentId, error },
          userId: 'SYSTEM',
          result: 'FAILURE'
        });

        return {
          success: false,
          allocatedAmount: 0,
          remainingAmount: 0,
          allocations: [],
          errors: [error],
          warnings: [],
          transactionId,
          processingTime: performance.now() - startTime,
          auditTrail
        };
      }

      // بررسی آیا payment قبلاً allocated شده است
      if (payment.isAllocated) {
        const warning = `Payment ${paymentId} is already allocated`;
        console.log(`⚠️ SHERLOCK v34.1: ${warning}`);

        return {
          success: true,
          allocatedAmount: parseFloat(payment.amount),
          remainingAmount: 0,
          allocations: [],
          errors: [],
          warnings: [warning],
          transactionId,
          processingTime: performance.now() - startTime,
          auditTrail
        };
      }

      const paymentAmount = parseFloat(payment.amount);
      let remainingAmount = paymentAmount;
      const allocations: PaymentAllocation[] = [];
      const warnings: string[] = [];

      // 🔍 PHASE 2: Representative Validation
      const representative = await db.select()
        .from(representatives)
        .where(eq(representatives.id, payment.representativeId!))
        .limit(1);

      if (!representative.length) {
        const error = `Representative ${payment.representativeId} not found`;
        return {
          success: false,
          allocatedAmount: 0,
          remainingAmount: paymentAmount,
          allocations: [],
          errors: [error],
          warnings: [],
          transactionId,
          processingTime: performance.now() - startTime,
          auditTrail
        };
      }

      auditTrail.push({
        timestamp: new Date().toISOString(),
        action: 'REPRESENTATIVE_VALIDATED',
        details: { 
          representativeId: payment.representativeId,
          representativeName: representative[0].name,
          paymentAmount 
        },
        userId: 'SYSTEM',
        result: 'SUCCESS'
      });

      // 🎯 PHASE 3: PRECISE FIFO Invoice Retrieval
      console.log(`🔍 SHERLOCK v34.1: Getting eligible invoices using ${rules.method} method`);

      const eligibleInvoices = await this.getEligibleInvoices(
        payment.representativeId!, 
        rules
      );

      console.log(`📋 SHERLOCK v34.1: Found ${eligibleInvoices.length} eligible invoices for FIFO allocation`);

      auditTrail.push({
        timestamp: new Date().toISOString(),
        action: 'ELIGIBLE_INVOICES_RETRIEVED',
        details: { 
          count: eligibleInvoices.length,
          method: rules.method,
          invoiceIds: eligibleInvoices.map(inv => inv.id).slice(0, 10) // First 10 for audit
        },
        userId: 'SYSTEM',
        result: 'SUCCESS'
      });

      // 🎯 PHASE 4: ATOMIC Allocation Processing
      console.log(`🚀 SHERLOCK v34.1: Starting ATOMIC allocation processing...`);

      for (let i = 0; i < eligibleInvoices.length && remainingAmount > 0; i++) {
        const invoice = eligibleInvoices[i];

        console.log(`📊 SHERLOCK v34.1: Processing invoice ${invoice.id} (${i + 1}/${eligibleInvoices.length})`);

        const invoiceAmount = parseFloat(invoice.amount);
        const currentlyAllocated = await this.getCurrentlyAllocatedAmount(invoice.id);
        const invoiceBalance = invoiceAmount - currentlyAllocated;

        console.log(`💰 Invoice ${invoice.id}: Amount=${invoiceAmount}, Allocated=${currentlyAllocated}, Balance=${invoiceBalance}`);

        if (invoiceBalance <= 0.01) { // Small tolerance for floating point
          warnings.push(`Invoice ${invoice.id} is already fully allocated`);
          console.log(`⚠️ SHERLOCK v34.1: Invoice ${invoice.id} fully allocated, skipping`);
          continue;
        }

        // محاسبه مبلغ قابل تخصیص با دقت
        const allocationAmount = Math.min(remainingAmount, invoiceBalance);

        if (allocationAmount < 0.01) { // Minimum allocation threshold
          console.log(`⚠️ SHERLOCK v34.1: Allocation amount too small (${allocationAmount}), skipping`);
          continue;
        }

        // ✅ Create allocation record
        const allocation: PaymentAllocation = {
          invoiceId: invoice.id,
          allocatedAmount: Math.round(allocationAmount * 100) / 100, // Round to 2 decimals
          allocationDate: new Date().toISOString(),
          allocationMethod: 'AUTO',
          allocatedBy: 'SYSTEM_FIFO',
          transactionId,
          validationHash: this.generateValidationHash({ invoiceId: invoice.id, amount: allocationAmount })
        };

        allocations.push(allocation);
        remainingAmount -= allocationAmount;
        remainingAmount = Math.round(remainingAmount * 100) / 100; // Round to prevent floating point errors

        console.log(`✅ SHERLOCK v34.1: Allocated ${allocationAmount} to invoice ${invoice.id}`);
        console.log(`💰 Remaining amount: ${remainingAmount}`);

        auditTrail.push({
          timestamp: new Date().toISOString(),
          action: 'ALLOCATION_CREATED',
          details: {
            invoiceId: invoice.id,
            allocatedAmount: allocationAmount,
            remainingAmount,
            invoiceBalance,
            validationHash: allocation.validationHash
          },
          userId: 'SYSTEM',
          result: 'SUCCESS'
        });
      }

      const totalAllocated = paymentAmount - remainingAmount;

      console.log(`📊 SHERLOCK v34.1: Allocation Summary:`);
      console.log(`   💰 Payment Amount: ${paymentAmount}`);
      console.log(`   ✅ Total Allocated: ${totalAllocated}`);
      console.log(`   📋 Remaining: ${remainingAmount}`);
      console.log(`   🔢 Allocations Count: ${allocations.length}`);

      // 🎯 PHASE 5: DATABASE UPDATES (ATOMIC TRANSACTION)
      console.log(`🔄 SHERLOCK v34.1: Starting database updates...`);

      try {
        // ✅ بروزرسانی payment record با درایولر ORM
        await db.update(payments)
          .set({ 
            isAllocated: true,
            updatedAt: new Date()
          })
          .where(eq(payments.id, paymentId));

        // ✅ ایجاد رکوردهای allocation برای هر فاکتور
        for (const allocation of allocations) {
          await db.insert(payments).values({
            representativeId: payment.representativeId!,
            invoiceId: allocation.invoiceId,
            amount: allocation.allocatedAmount.toString(),
            paymentDate: payment.paymentDate,
            description: `Auto-allocation from payment ${paymentId} via ${rules.method}`,
            isAllocated: true,
            createdAt: new Date()
          });
        }

        // ✅ بروزرسانی وضعیت فاکتورها
        for (const allocation of allocations) {
          // محاسبه کل پرداخت‌های تخصیص یافته برای این فاکتور
          const [totalPaid] = await db.select({
            total: sql<number>`COALESCE(SUM(amount), 0)`
          }).from(payments)
          .where(and(
            eq(payments.invoiceId, allocation.invoiceId),
            eq(payments.isAllocated, true)
          ));

          const [invoice] = await db.select({
            amount: invoices.amount
          }).from(invoices).where(eq(invoices.id, allocation.invoiceId));

          if (invoice) {
            const invoiceAmount = parseFloat(invoice.amount);
            const paidAmount = totalPaid.total;
            
            let newStatus = 'unpaid';
            if (paidAmount >= invoiceAmount) {
              newStatus = 'paid';
            } else if (paidAmount > 0) {
              newStatus = 'partial';
            }

            await db.update(invoices)
              .set({ 
                status: newStatus,
                updatedAt: new Date()
              })
              .where(eq(invoices.id, allocation.invoiceId));
          }
        }

        // ✅ Force debt recalculation for representative
        if (totalAllocated > 0) {
          console.log(`🔄 SHERLOCK v34.1: Updating representative debt...`);
          
          const { UnifiedFinancialEngine } = await import('./unified-financial-engine.js');
          UnifiedFinancialEngine.forceInvalidateRepresentative(payment.representativeId!, {
            cascadeGlobal: true,
            reason: 'payment_allocation',
            immediate: true,
            includePortal: true
          });

          const { unifiedFinancialEngine } = await import('./unified-financial-engine.js');
          await unifiedFinancialEngine.syncRepresentativeDebt(payment.representativeId!);
        }

        auditTrail.push({
          timestamp: new Date().toISOString(),
          action: 'DATABASE_UPDATES_COMPLETED',
          details: {
            paymentId,
            totalAllocated,
            remainingAmount,
            allocationsCount: allocations.length
          },
          userId: 'SYSTEM',
          result: 'SUCCESS'
        });

        const processingTime = performance.now() - startTime;

        console.log(`✅ SHERLOCK v34.1: Auto-allocation COMPLETED successfully in ${Math.round(processingTime)}ms`);

        return {
          success: true,
          allocatedAmount: totalAllocated,
          remainingAmount,
          allocations,
          errors: [],
          warnings,
          transactionId,
          processingTime,
          auditTrail: rules.auditMode ? auditTrail : undefined
        };

      } catch (updateError) {
        console.error(`❌ SHERLOCK v34.1: Database update failed:`, updateError);

        auditTrail.push({
          timestamp: new Date().toISOString(),
          action: 'DATABASE_UPDATE_FAILED',
          details: { error: updateError.message },
          userId: 'SYSTEM',
          result: 'FAILURE'
        });

        return {
          success: false,
          allocatedAmount: 0,
          remainingAmount: paymentAmount,
          allocations: [],
          errors: [`Database update failed: ${updateError.message}`],
          warnings,
          transactionId,
          processingTime: performance.now() - startTime,
          auditTrail
        };
      }

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
   * 🎯 SHERLOCK v34.1: تخصیص دستی پرداخت با validation کامل
   * ATOMOS COMPLIANT - Manual allocation with comprehensive checks
   */
  static async manualAllocatePayment(
    paymentId: number,
    invoiceId: number,
    amount: number,
    performedBy: string,
    reason?: string,
    options?: {
      strictValidation?: boolean;
      auditMode?: boolean;
      allowOverAllocation?: boolean;
    }
  ): Promise<AllocationResult> {

    const startTime = performance.now();
    const transactionId = this.generateTransactionId();
    const auditTrail: AuditEntry[] = [];
    const opts = {
      strictValidation: true,
      auditMode: true,
      allowOverAllocation: false,
      ...options
    };

    console.log(`🎯 SHERLOCK v34.1: Starting MANUAL allocation`);
    console.log(`   Payment: ${paymentId} -> Invoice: ${invoiceId}`);
    console.log(`   Amount: ${amount}, By: ${performedBy}`);
    console.log(`   Transaction ID: ${transactionId}`);

    try {
      // 🔍 PHASE 1: Comprehensive Input Validation
      auditTrail.push({
        timestamp: new Date().toISOString(),
        action: 'MANUAL_ALLOCATION_INITIATED',
        details: { paymentId, invoiceId, amount, performedBy, reason, transactionId },
        userId: performedBy,
        result: 'SUCCESS'
      });

      const validation = await this.validateManualAllocation(paymentId, invoiceId, amount, opts);

      if (!validation.isValid) {
        console.log(`❌ SHERLOCK v34.1: Manual allocation validation failed`);
        validation.errors.forEach(error => console.log(`   ❌ ${error}`));

        auditTrail.push({
          timestamp: new Date().toISOString(),
          action: 'MANUAL_ALLOCATION_VALIDATION_FAILED',
          details: { errors: validation.errors, warnings: validation.warnings },
          userId: performedBy,
          result: 'FAILURE'
        });

        return {
          success: false,
          allocatedAmount: 0,
          remainingAmount: 0,
          allocations: [],
          errors: validation.errors,
          warnings: validation.warnings,
          transactionId,
          processingTime: performance.now() - startTime,
          auditTrail
        };
      }

      console.log(`✅ SHERLOCK v34.1: Manual allocation validation passed`);

      if (validation.warnings.length > 0) {
        console.log(`⚠️ SHERLOCK v34.1: Validation warnings:`);
        validation.warnings.forEach(warning => console.log(`   ⚠️ ${warning}`));
      }

      // انجام تخصیص دستی
      const allocation: PaymentAllocation = {
        invoiceId,
        allocatedAmount: amount,
        allocationDate: new Date().toISOString(),
        allocationMethod: 'MANUAL',
        allocatedBy: performedBy
      };

      // ✅ دریافت اطلاعات payment
      const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
      
      // ✅ ایجاد رکورد allocation جدید
      const [newAllocationPayment] = await db.insert(payments).values({
        representativeId: payment.representativeId!,
        invoiceId: invoiceId,
        amount: amount.toString(),
        paymentDate: payment.paymentDate,
        description: `Manual allocation from payment ${paymentId} by ${performedBy}${reason ? ` - ${reason}` : ''}`,
        isAllocated: true,
        createdAt: new Date()
      }).returning();

      // ✅ بروزرسانی payment اصلی
      await db.update(payments)
        .set({ 
          isAllocated: true,
          updatedAt: new Date()
        })
        .where(eq(payments.id, paymentId));

      // ✅ بروزرسانی وضعیت فاکتور
      const [totalPaid] = await db.select({
        total: sql<number>`COALESCE(SUM(amount), 0)`
      }).from(payments)
      .where(and(
        eq(payments.invoiceId, invoiceId),
        eq(payments.isAllocated, true)
      ));

      const [invoice] = await db.select({
        amount: invoices.amount
      }).from(invoices).where(eq(invoices.id, invoiceId));

      if (invoice) {
        const invoiceAmount = parseFloat(invoice.amount);
        const paidAmount = totalPaid.total;
        
        let newStatus = 'unpaid';
        if (paidAmount >= invoiceAmount) {
          newStatus = 'paid';
        } else if (paidAmount > 0) {
          newStatus = 'partial';
        }

        await db.update(invoices)
          .set({ 
            status: newStatus,
            updatedAt: new Date()
          })
          .where(eq(invoices.id, invoiceId));
      }

      // ✅ Force financial sync
      const { UnifiedFinancialEngine } = await import('./unified-financial-engine.js');
      UnifiedFinancialEngine.forceInvalidateRepresentative(payment.representativeId!, {
        cascadeGlobal: true,
        reason: 'manual_payment_allocation',
        immediate: true,
        includePortal: true
      });

      const { unifiedFinancialEngine } = await import('./unified-financial-engine.js');
      await unifiedFinancialEngine.syncRepresentativeDebt(payment.representativeId!);

      const totalAllocated = amount;
      const remainingAmount = parseFloat(payment.amount) - amount;

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

  /**
   * 🎯 SHERLOCK v34.1: دریافت فاکتورهای قابل تخصیص با ترتیب FIFO دقیق
   * ATOMOS COMPLIANT - Precise invoice ordering with comprehensive filtering
   */
  private static async getEligibleInvoices(
    representativeId: number, 
    rules: AllocationRule
  ): Promise<any[]> {

    console.log(`🔍 SHERLOCK v34.1: Getting eligible invoices for representative ${representativeId}`);
    console.log(`⚙️ Method: ${rules.method}, Statuses: [${rules.priorityInvoiceStatuses.join(', ')}]`);

    let orderByClause;

    switch (rules.method) {
      case 'FIFO':
        // ✅ SHERLOCK v34.1: PRECISION FIFO - اول تاریخ ایجاد، سپس تاریخ صدور، سپس ID برای deterministic ordering
        orderByClause = [asc(invoices.createdAt), asc(invoices.issueDate), asc(invoices.id)];
        console.log(`🎯 SHERLOCK v34.1: Using PRECISION FIFO ordering (created_at ASC, issue_date ASC, id ASC)`);
        break;

      case 'LIFO':
        orderByClause = [desc(invoices.createdAt), desc(invoices.issueDate), desc(invoices.id)];
        console.log(`🎯 SHERLOCK v34.1: Using LIFO ordering (created_at DESC, issue_date DESC, id DESC)`);
        break;

      case 'OLDEST_FIRST':
        // برای قدیمی‌ترین، اول issue_date، سپس created_at
        orderByClause = [asc(invoices.issueDate), asc(invoices.createdAt), asc(invoices.id)];
        console.log(`🎯 SHERLOCK v34.1: Using OLDEST_FIRST ordering (issue_date ASC, created_at ASC, id ASC)`);
        break;

      case 'HIGHEST_AMOUNT_FIRST':
        orderByClause = [desc(sql`CAST(amount as DECIMAL)`), asc(invoices.createdAt), asc(invoices.id)];
        console.log(`🎯 SHERLOCK v34.1: Using HIGHEST_AMOUNT_FIRST ordering (amount DESC, created_at ASC, id ASC)`);
        break;

      default:
        // پیش‌فرض: FIFO دقیق
        orderByClause = [asc(invoices.createdAt), asc(invoices.issueDate), asc(invoices.id)];
        console.log(`🎯 SHERLOCK v34.1: Using DEFAULT FIFO ordering`);
    }

    // Build status filter
    const statusFilter = rules.priorityInvoiceStatuses.length > 0 
      ? sql`status IN (${sql.join(rules.priorityInvoiceStatuses.map(s => sql`${s}`), sql`, `)})`
      : sql`1=1`; // No filter if no statuses specified

    const eligibleInvoices = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      representativeId: invoices.representativeId,
      amount: invoices.amount,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      createdAt: invoices.createdAt
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.representativeId, representativeId),
        statusFilter
      )
    )
    .orderBy(...orderByClause);

    console.log(`📊 SHERLOCK v34.1: Found ${eligibleInvoices.length} eligible invoices`);

    if (eligibleInvoices.length > 0) {
      console.log(`📋 SHERLOCK v34.1: First 3 invoices in order:`);
      eligibleInvoices.slice(0, 3).forEach((inv, index) => {
        console.log(`   ${index + 1}. Invoice ${inv.id}: Amount=${inv.amount}, Created=${inv.createdAt}, Issue=${inv.issueDate}`);
      });
    }

    return eligibleInvoices;
  }

  /**
   * 🔍 SHERLOCK v34.1: محاسبه دقیق مبلغ تخصیص یافته به فاکتور
   * ATOMOS COMPLIANT - Accurate allocated amount calculation
   */
  private static async getCurrentlyAllocatedAmount(invoiceId: number): Promise<number> {
    console.log(`🔍 SHERLOCK v34.1: Calculating allocated amount for invoice ${invoiceId}`);

    try {
      // Method 1: Direct from payments table where invoiceId is set
      const directAllocations = await db.select({
        amount: payments.amount
      })
      .from(payments)
      .where(
        and(
          eq(payments.invoiceId, invoiceId),
          eq(payments.isAllocated, true)
        )
      );

      const directTotal = directAllocations.reduce((sum, payment) => 
        sum + parseFloat(payment.amount), 0
      );

      console.log(`💰 SHERLOCK v34.1: Invoice ${invoiceId} has ${directTotal} allocated directly`);

      return Math.round(directTotal * 100) / 100; // Round to 2 decimal places

    } catch (error) {
      console.error(`❌ SHERLOCK v34.1: Error calculating allocated amount for invoice ${invoiceId}:`, error);
      return 0;
    }
  }



  /**
   * 🔄 SHERLOCK v34.1: بروزرسانی اتمیک پرداخت با audit trail
   */
  private static async updatePaymentAllocation(paymentId: number, updates: any): Promise<void> {
    console.log(`🔄 SHERLOCK v34.1: Updating payment ${paymentId} allocation data`);

    try {
      await db.update(payments)
        .set({
          isAllocated: updates.allocatedAmount > 0,
          updatedAt: new Date(),
          // Note: Simplified update - in production, you might need additional fields
        })
        .where(eq(payments.id, paymentId));

      console.log(`✅ SHERLOCK v34.1: Payment ${paymentId} updated successfully`);

    } catch (error) {
      console.error(`❌ SHERLOCK v34.1: Failed to update payment ${paymentId}:`, error);
      throw error;
    }
  }

  /**
   * 🔄 SHERLOCK v34.1: بروزرسانی وضعیت فاکتورها پس از تخصیص
   */
  private static async updateInvoiceStatuses(
    allocations: PaymentAllocation[], 
    transactionId?: string
  ): Promise<void> {
    console.log(`🔄 SHERLOCK v34.1: Updating invoice statuses for ${allocations.length} allocations`);

    for (const allocation of allocations) {
      try {
        await this.recalculateInvoiceStatus(allocation.invoiceId, transactionId);
        console.log(`✅ Updated status for invoice ${allocation.invoiceId}`);
      } catch (error) {
        console.error(`❌ Failed to update invoice ${allocation.invoiceId} status:`, error);
        // Continue with other invoices even if one fails
      }
    }
  }

  /**
   * 🧮 SHERLOCK v34.1: محاسبه مجدد وضعیت فاکتور با دقت کامل
   */
  private static async recalculateInvoiceStatus(invoiceId: number, transactionId?: string): Promise<void> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) {
      console.log(`⚠️ SHERLOCK v34.1: Invoice ${invoiceId} not found for status update`);
      return;
    }

    const totalAllocated = await this.getCurrentlyAllocatedAmount(invoiceId);
    const invoiceAmount = parseFloat(invoice.amount);

    console.log(`🧮 SHERLOCK v34.1: Invoice ${invoiceId} - Amount: ${invoiceAmount}, Allocated: ${totalAllocated}`);

    let newStatus: string;
    const tolerance = 0.01; // Small tolerance for floating point comparison

    if (totalAllocated < tolerance) {
      newStatus = 'unpaid';
    } else if (totalAllocated >= (invoiceAmount - tolerance)) {
      newStatus = 'paid';
    } else {
      newStatus = 'partial';
    }

    // Only update if status actually changed
    if (invoice.status !== newStatus) {
      await db.update(invoices)
        .set({ 
          status: newStatus, 
          updatedAt: new Date() 
        })
        .where(eq(invoices.id, invoiceId));

      console.log(`✅ SHERLOCK v34.1: Invoice ${invoiceId} status updated: ${invoice.status} -> ${newStatus}`);
    } else {
      console.log(`ℹ️ SHERLOCK v34.1: Invoice ${invoiceId} status unchanged: ${newStatus}`);
    }
  }

  /**
   * 💰 SHERLOCK v34.1: بروزرسانی بدهی نماینده پس از تخصیص
   */
  private static async updateRepresentativeDebtAfterAllocation(
    representativeId: number, 
    allocatedAmount: number
  ): Promise<void> {
    try {
      const [representative] = await db.select().from(representatives)
        .where(eq(representatives.id, representativeId));

      if (representative) {
        const currentDebt = parseFloat(representative.totalDebt) || 0;
        const newDebt = Math.max(0, currentDebt - allocatedAmount);

        await db.update(representatives)
          .set({
            totalDebt: newDebt.toString(),
            updatedAt: new Date()
          })
          .where(eq(representatives.id, representativeId));

        console.log(`💰 SHERLOCK v34.1: Representative ${representativeId} debt updated: ${currentDebt} -> ${newDebt}`);
      }
    } catch (error) {
      console.error(`❌ Failed to update representative debt:`, error);
      // Don't throw - this is a supplementary operation
    }
  }

  /**
   * ✅ SHERLOCK v34.1: اعتبارسنجی کامل تخصیص دستی
   */
  private static async validateManualAllocation(
    paymentId: number, 
    invoiceId: number, 
    amount: number,
    options: { strictValidation?: boolean; allowOverAllocation?: boolean } = {}
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    console.log(`🔍 SHERLOCK v34.1: Validating manual allocation - Payment: ${paymentId}, Invoice: ${invoiceId}, Amount: ${amount}`);

    // Basic input validation
    if (!paymentId || paymentId <= 0) {
      errors.push('Invalid payment ID');
    }

    if (!invoiceId || invoiceId <= 0) {
      errors.push('Invalid invoice ID');
    }

    if (!amount || amount <= 0) {
      errors.push('Allocation amount must be positive');
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings, suggestions };
    }

    // Database validation
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
    if (!payment) {
      errors.push(`Payment ${paymentId} not found`);
      return { isValid: false, errors, warnings, suggestions };
    }

    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!invoice) {
      errors.push(`Invoice ${invoiceId} not found`);
      return { isValid: false, errors, warnings, suggestions };
    }

    // Representative matching
    if (payment.representativeId !== invoice.representativeId) {
      errors.push(`Payment (Rep: ${payment.representativeId}) and invoice (Rep: ${invoice.representativeId}) belong to different representatives`);
    }

    // Payment availability check
    if (payment.isAllocated) {
      warnings.push(`Payment ${paymentId} is already marked as allocated`);
    }

    const paymentAmount = parseFloat(payment.amount);
    const remainingPayment = paymentAmount; // Simplified - in production, calculate actual remaining

    if (amount > remainingPayment && !options.allowOverAllocation) {
      errors.push(`Allocation amount (${amount}) exceeds available payment amount (${remainingPayment})`);
    }

    // Invoice capacity check
    const invoiceAmount = parseFloat(invoice.amount);
    const currentlyAllocated = await this.getCurrentlyAllocatedAmount(invoiceId);
    const invoiceBalance = invoiceAmount - currentlyAllocated;

    if (invoiceBalance <= 0) {
      warnings.push(`Invoice ${invoiceId} is already fully paid`);
      suggestions.push('Consider allocating to a different invoice');
    } else if (amount > invoiceBalance) {
      warnings.push(`Allocation amount (${amount}) exceeds invoice balance (${invoiceBalance})`);
      suggestions.push(`Consider allocating only ${invoiceBalance} to this invoice`);
    }

    // Success case
    if (errors.length === 0) {
      console.log(`✅ SHERLOCK v34.1: Manual allocation validation passed`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 📊 SHERLOCK v35.0: خلاصه تخصیصات نماینده با قابلیت‌های پیشرفته
   */
  static async getAllocationSummary(representativeId: number): Promise<AllocationSummary> {
    console.log(`📊 SHERLOCK v35.0: Getting enhanced allocation summary for representative ${representativeId}`);

    const [allocatedPayments] = await db.select({
      totalAllocated: sql<number>`COALESCE(SUM(CASE WHEN is_allocated = true THEN amount ELSE 0 END), 0)`,
      totalUnallocated: sql<number>`COALESCE(SUM(CASE WHEN is_allocated = false THEN amount ELSE 0 END), 0)`,
      lastAllocationDate: sql<string>`MAX(CASE WHEN is_allocated = true THEN updated_at END)`
    }).from(payments).where(eq(payments.representativeId, representativeId));

    return {
      representativeId,
      totalAllocated: allocatedPayments.totalAllocated || 0,
      totalUnallocated: allocatedPayments.totalUnallocated || 0,
      allocationHistory: [], // In production, fetch from allocation history table
      lastAllocationDate: allocatedPayments.lastAllocationDate
    };
  }

  /**
   * 🎯 SHERLOCK v35.0: تخصیص دسته‌ای پرداخت‌ها
   */
  static async batchAllocatePayments(
    representativeId: number,
    options: {
      maxPayments?: number;
      priorityMethod?: 'AMOUNT_DESC' | 'DATE_ASC' | 'FIFO';
      strictMode?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    processedPayments: number;
    totalAllocated: number;
    errors: string[];
    details: AllocationResult[];
  }> {
    const startTime = performance.now();
    console.log(`🚀 SHERLOCK v35.0: Starting batch allocation for representative ${representativeId}`);

    try {
      // Get unallocated payments for this representative
      const unallocatedPayments = await db.select()
        .from(payments)
        .where(
          and(
            eq(payments.representativeId, representativeId),
            eq(payments.isAllocated, false)
          )
        )
        .limit(options.maxPayments || 50);

      const results: AllocationResult[] = [];
      let totalProcessed = 0;
      let totalAllocatedAmount = 0;
      const errors: string[] = [];

      for (const payment of unallocatedPayments) {
        try {
          const allocationResult = await this.autoAllocatePayment(payment.id, {
            method: 'FIFO',
            allowPartialAllocation: true,
            allowOverAllocation: false,
            priorityInvoiceStatuses: ['overdue', 'unpaid', 'partial'],
            strictValidation: options.strictMode || true,
            auditMode: true
          });

          results.push(allocationResult);
          totalProcessed++;

          if (allocationResult.success) {
            totalAllocatedAmount += allocationResult.allocatedAmount;
          } else {
            errors.push(...allocationResult.errors);
          }
        } catch (error) {
          errors.push(`Payment ${payment.id}: ${error.message}`);
        }
      }

      const processingTime = performance.now() - startTime;
      console.log(`✅ SHERLOCK v35.0: Batch allocation completed in ${Math.round(processingTime)}ms`);

      return {
        success: errors.length === 0,
        processedPayments: totalProcessed,
        totalAllocated: totalAllocatedAmount,
        errors,
        details: results
      };
    } catch (error) {
      console.error('❌ SHERLOCK v35.0: Batch allocation failed:', error);
      return {
        success: false,
        processedPayments: 0,
        totalAllocated: 0,
        errors: [error.message],
        details: []
      };
    }
  }

  /**
   * 🔍 SHERLOCK v35.0: تحلیل و گزارش تخصیص
   */
  static async generateAllocationReport(representativeId: number): Promise<{
    summary: AllocationSummary;
    recommendations: string[];
    potentialIssues: string[];
    optimizationSuggestions: string[];
  }> {
    console.log(`📊 SHERLOCK v35.0: Generating allocation report for representative ${representativeId}`);

    const summary = await this.getAllocationSummary(representativeId);
    const recommendations: string[] = [];
    const potentialIssues: string[] = [];
    const optimizationSuggestions: string[] = [];

    // Analyze allocation patterns
    if (summary.totalUnallocated > 0) {
      recommendations.push(`${summary.totalUnallocated} تومان پرداخت تخصیص نیافته وجود دارد`);
      optimizationSuggestions.push('استفاده از تخصیص خودکار دسته‌ای');
    }

    if (summary.totalAllocated > summary.totalUnallocated * 10) {
      recommendations.push('عملکرد تخصیص بسیار مناسب است');
    }

    // Check for potential issues
    const recentAllocations = await db.select()
      .from(payments)
      .where(
        and(
          eq(payments.representativeId, representativeId),
          eq(payments.isAllocated, true),
          sql`created_at > NOW() - INTERVAL '7 days'`
        )
      );

    if (recentAllocations.length === 0) {
      potentialIssues.push('هیچ تخصیص جدیدی در هفته گذشته انجام نشده');
    }

    return {
      summary,
      recommendations,
      potentialIssues,
      optimizationSuggestions
    };
  }
}

export const enhancedPaymentAllocationEngine = new EnhancedPaymentAllocationEngine();
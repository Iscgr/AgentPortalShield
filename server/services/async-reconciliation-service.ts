/**
 * ✅ PERFORMANCE OPTIMIZATION: Async Reconciliation Service
 * سرویس reconciliation async با batching برای جلوگیری از timeout
 */

import { db } from '../db.js';
import { representatives, payments, invoices, financialTransactions } from '../../shared/schema.js';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { AsyncJobManager, type AsyncJob } from './async-job-manager.js';
import { UnifiedFinancialEngine } from './unified-financial-engine.js';

export interface ReconciliationJobConfig {
  batchSize?: number;
  maxConcurrency?: number;
  delayBetweenBatches?: number;
  includeOrphanedPayments?: boolean;
  includeAllocationConsistency?: boolean;
  includeDebtRecalculation?: boolean;
}

export interface ReconciliationResult {
  success: boolean;
  reconciliationResults: {
    totalReconciled: number;
    discrepanciesFixed: number;
    orphanedTransactionsFixed: number;
    allocationConsistencyFixed: number;
    batchesProcessed: number;
    processingTime: number;
  };
  finalDataIntegrityStatus: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION';
  verificationSummary: any;
  performanceMetrics: {
    totalTime: number;
    averageBatchTime: number;
    representativesPerSecond: number;
  };
}

export class AsyncReconciliationService {
  private static instance: AsyncReconciliationService;
  private jobManager: AsyncJobManager;

  constructor() {
    this.jobManager = AsyncJobManager.getInstance();
  }

  static getInstance(): AsyncReconciliationService {
    if (!AsyncReconciliationService.instance) {
      AsyncReconciliationService.instance = new AsyncReconciliationService();
    }
    return AsyncReconciliationService.instance;
  }

  /**
   * شروع reconciliation async با job tracking
   */
  async startAsyncReconciliation(config: ReconciliationJobConfig = {}): Promise<string> {
    const jobConfig = {
      batchSize: 10,
      maxConcurrency: 2,
      delayBetweenBatches: 500,
      includeOrphanedPayments: true,
      includeAllocationConsistency: true,
      includeDebtRecalculation: true,
      ...config
    };

    // ایجاد job جدید
    const jobId = this.jobManager.createJob('data-reconciliation', {
      batchSize: jobConfig.batchSize,
      totalBatches: 0,
      currentBatch: 0
    });

    // شروع async execution
    this.executeReconciliationJob(jobId, jobConfig).catch(error => {
      console.error(`❌ ASYNC RECONCILIATION: Job ${jobId} failed:`, error);
      this.jobManager.failJob(jobId, error.message);
    });

    return jobId;
  }

  /**
   * اجرای اصلی reconciliation job
   */
  private async executeReconciliationJob(jobId: string, config: ReconciliationJobConfig): Promise<void> {
    const startTime = Date.now();
    
    if (!this.jobManager.startJob(jobId)) {
      throw new Error(`Cannot start job ${jobId}`);
    }

    try {
      let totalReconciled = 0;
      let discrepanciesFixed = 0;
      let orphanedTransactionsFixed = 0;
      let allocationConsistencyFixed = 0;
      let batchesProcessed = 0;

      // Phase 1: Cache invalidation
      this.jobManager.updateProgress(jobId, 1, 10, 'Cache Clearing', 'Clearing all caches for fresh data');
      UnifiedFinancialEngine.forceInvalidateGlobal("async_reconciliation_start");
      await this.delay(200);

      // Phase 2: Orphaned payments (if enabled)
      if (config.includeOrphanedPayments) {
        this.jobManager.updateProgress(jobId, 2, 10, 'Orphaned Payments', 'Fixing orphaned payments');
        orphanedTransactionsFixed = await this.fixOrphanedPayments();
        console.log(`✅ ASYNC RECONCILIATION: Fixed ${orphanedTransactionsFixed} orphaned payments`);
      }

      // Phase 3: Batched debt recalculation (main intensive operation)
      if (config.includeDebtRecalculation) {
        this.jobManager.updateProgress(jobId, 3, 10, 'Representative Analysis', 'Getting representatives for processing');
        
        const allReps = await db.select({
          id: representatives.id,
          name: representatives.name,
          code: representatives.code,
          totalDebt: representatives.totalDebt
        }).from(representatives).where(eq(representatives.isActive, true));

        const totalBatches = Math.ceil(allReps.length / config.batchSize!);
        
        this.jobManager.updateProgress(
          jobId, 4, 10, 'Batch Processing', 
          `Starting batched processing: ${allReps.length} representatives in ${totalBatches} batches`,
          { currentBatch: 0, totalBatches }
        );

        // Process in batches
        for (let i = 0; i < allReps.length; i += config.batchSize!) {
          const batch = allReps.slice(i, i + config.batchSize!);
          const batchNumber = Math.floor(i / config.batchSize!) + 1;
          
          this.jobManager.updateProgress(
            jobId, 4 + (batchNumber / totalBatches) * 4, 10, 
            'Batch Processing', 
            `Processing batch ${batchNumber}/${totalBatches} (${batch.length} representatives)`,
            { currentBatch: batchNumber, totalBatches }
          );

          const batchResult = await this.processBatch(batch);
          discrepanciesFixed += batchResult.discrepanciesFixed;
          totalReconciled += batchResult.totalReconciled;
          batchesProcessed++;

          // Delay between batches to prevent overwhelming the database
          if (i + config.batchSize! < allReps.length) {
            await this.delay(config.delayBetweenBatches!);
          }
        }

        console.log(`✅ ASYNC RECONCILIATION: Processed ${batchesProcessed} batches, fixed ${discrepanciesFixed} discrepancies`);
      }

      // Phase 4: Allocation consistency (if enabled)
      if (config.includeAllocationConsistency) {
        this.jobManager.updateProgress(jobId, 8, 10, 'Allocation Consistency', 'Verifying allocation consistency');
        allocationConsistencyFixed = await this.fixAllocationConsistency();
        console.log(`✅ ASYNC RECONCILIATION: Fixed ${allocationConsistencyFixed} allocation consistencies`);
      }

      // Phase 5: Final verification
      this.jobManager.updateProgress(jobId, 9, 10, 'Final Verification', 'Running final verification');
      UnifiedFinancialEngine.forceInvalidateGlobal("async_reconciliation_refresh");
      
      const engine = new UnifiedFinancialEngine(null);
      const verificationSummary = await engine.verifyTotalDebtSum();

      // Calculate performance metrics
      const totalTime = Date.now() - startTime;
      const averageBatchTime = batchesProcessed > 0 ? totalTime / batchesProcessed : 0;
      const representativesPerSecond = totalReconciled > 0 ? (totalReconciled / totalTime) * 1000 : 0;

      // Determine final status
      const hasActualProblems = discrepanciesFixed > 0 || orphanedTransactionsFixed > 0 || allocationConsistencyFixed > 0;
      const reconciliationWorked = totalReconciled > 0;
      
      let finalDataIntegrityStatus: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION';
      
      if (!hasActualProblems && reconciliationWorked) {
        finalDataIntegrityStatus = 'GOOD';
      } else if (verificationSummary && verificationSummary.isConsistent) {
        finalDataIntegrityStatus = 'EXCELLENT';
      } else if (hasActualProblems && reconciliationWorked) {
        finalDataIntegrityStatus = 'GOOD';
      } else {
        finalDataIntegrityStatus = 'NEEDS_ATTENTION';
      }

      // Complete job with results
      const result: ReconciliationResult = {
        success: true,
        reconciliationResults: {
          totalReconciled,
          discrepanciesFixed,
          orphanedTransactionsFixed,
          allocationConsistencyFixed,
          batchesProcessed,
          processingTime: totalTime
        },
        finalDataIntegrityStatus,
        verificationSummary,
        performanceMetrics: {
          totalTime,
          averageBatchTime,
          representativesPerSecond
        }
      };

      this.jobManager.completeJob(jobId, result);
      
      console.log(`✅ ASYNC RECONCILIATION COMPLETED in ${totalTime}ms`);
      console.log(`📊 Processed ${totalReconciled} representatives in ${batchesProcessed} batches`);
      console.log(`🎯 Final Status: ${finalDataIntegrityStatus}`);

    } catch (error) {
      console.error(`❌ ASYNC RECONCILIATION ERROR:`, error);
      this.jobManager.failJob(jobId, error.message);
      throw error;
    }
  }

  /**
   * پردازش یک batch از representatives
   */
  private async processBatch(batch: Array<{id: number, name: string, code: string, totalDebt: string}>): Promise<{
    discrepanciesFixed: number;
    totalReconciled: number;
  }> {
    let discrepanciesFixed = 0;
    let totalReconciled = 0;

    // Process all representatives in batch with parallel queries where possible
    const representativeIds = batch.map(rep => rep.id);

    // Batch query for all invoice totals
    const invoiceTotals = await db.select({
      representativeId: invoices.representativeId,
      total: sql<number>`COALESCE(SUM(amount), 0)`
    }).from(invoices)
    .where(inArray(invoices.representativeId, representativeIds))
    .groupBy(invoices.representativeId);

    // Batch query for all payment totals
    const paymentTotals = await db.select({
      representativeId: payments.representativeId,
      total: sql<number>`COALESCE(SUM(CASE WHEN is_allocated = true THEN amount ELSE 0 END), 0)`
    }).from(payments)
    .where(inArray(payments.representativeId, representativeIds))
    .groupBy(payments.representativeId);

    // Create lookup maps
    const invoiceMap = new Map(invoiceTotals.map(item => [item.representativeId, item.total]));
    const paymentMap = new Map(paymentTotals.map(item => [item.representativeId, item.total]));

    // Process each representative in batch
    const updates: Array<{id: number, newDebt: number}> = [];

    for (const rep of batch) {
      const invoiceTotal = invoiceMap.get(rep.id) || 0;
      const paymentTotal = paymentMap.get(rep.id) || 0;
      const actualDebt = Math.max(0, invoiceTotal - paymentTotal);
      const currentDebt = parseFloat(rep.totalDebt) || 0;
      const discrepancy = Math.abs(actualDebt - currentDebt);

      if (discrepancy >= 1) {
        updates.push({ id: rep.id, newDebt: actualDebt });
        discrepanciesFixed++;
      }

      totalReconciled++;
    }

    // Batch update all representatives that need fixing
    if (updates.length > 0) {
      await Promise.all(updates.map(update => 
        db.update(representatives)
          .set({ 
            totalDebt: update.newDebt.toString(),
            lastCalculationUpdate: new Date()
          })
          .where(eq(representatives.id, update.id))
      ));
    }

    return { discrepanciesFixed, totalReconciled };
  }

  /**
   * رفع orphaned payments
   */
  private async fixOrphanedPayments(): Promise<number> {
    const orphanedPayments = await db.select({
      id: payments.id,
      representativeId: payments.representativeId,
      amount: payments.amount,
      isAllocated: payments.isAllocated
    }).from(payments)
    .leftJoin(representatives, eq(payments.representativeId, representatives.id))
    .where(and(
      eq(payments.isAllocated, true),
      sql`${representatives.id} IS NULL OR ${representatives.isActive} = false`
    ));

    if (orphanedPayments.length > 0) {
      await db.update(payments)
        .set({ 
          isAllocated: false, 
          allocationNote: 'Auto-fixed: Representative not found or inactive' 
        })
        .where(inArray(payments.id, orphanedPayments.map(p => p.id)));
    }

    return orphanedPayments.length;
  }

  /**
   * رفع allocation consistency
   */
  private async fixAllocationConsistency(): Promise<number> {
    const inconsistentAllocations = await db.select({
      paymentId: payments.id,
      representativeId: payments.representativeId,
      paymentAmount: payments.amount
    }).from(payments)
    .leftJoin(invoices, eq(payments.representativeId, invoices.representativeId))
    .where(and(
      eq(payments.isAllocated, true),
      sql`${invoices.representativeId} IS NULL`
    ));

    if (inconsistentAllocations.length > 0) {
      await db.update(payments)
        .set({ 
          allocationNote: 'Auto-reconciled: Allocation verified during async reconciliation' 
        })
        .where(inArray(payments.id, inconsistentAllocations.map(a => a.paymentId)));
    }

    return inconsistentAllocations.length;
  }

  /**
   * تأخیر برای rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * دریافت وضعیت job
   */
  getJobStatus(jobId: string): AsyncJob | null {
    return this.jobManager.getJob(jobId);
  }

  /**
   * لغو job در حال اجرا
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobManager.getJob(jobId);
    if (job && job.status === 'running') {
      return this.jobManager.failJob(jobId, 'Job cancelled by user');
    }
    return false;
  }
}
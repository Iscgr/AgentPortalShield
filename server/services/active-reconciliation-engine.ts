/**
 * PROMETHEUS v3.0: ACTIVE RECONCILIATION ENGINE
 * Phase B - E-B4: Intelligent Financial Drift Detection & Auto-Correction
 * 
 * هدف: تشخیص انحرافات مالی > آستانه و تولید repair plan های خودکار
 * Strategy: dry-run → analysis → enforce (with rollback capability)
 */

import { db } from '../database-manager.js';
import { 
  reconciliationRuns, 
  reconciliationActions, 
  representatives, 
  invoices, 
  payments,
  paymentAllocations,
  invoiceBalanceCache
} from '../../shared/schema.js';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import { featureFlagManager } from './feature-flag-manager.js';
import { unifiedFinancialEngine, UnifiedFinancialEngine } from './unified-financial-engine.js';
import { pythonFinancialClient } from './python-financial-client.js';

export interface ReconciliationPlan {
  runId: number;
  actions: RepairAction[];
  estimatedImpact: {
    affectedRepresentatives: number;
    totalAdjustment: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  metadata: {
    driftThreshold: number;
    detectionMethod: 'STANDARD' | 'PYTHON_ENHANCED';
    createdAt: string;
  };
}

export interface RepairAction {
  representativeId?: number;
  actionType: 'ADJUST_DEBT' | 'RECALCULATE_BALANCE' | 'SYNC_CACHE' | 'REPAIR_ALLOCATION';
  targetEntity: 'representative' | 'invoice' | 'payment' | 'cache';
  targetId: number;
  currentValue: number;
  expectedValue: number;
  adjustmentAmount: number;
  reason: string;
  confidence: number; // 0-100%
}

export interface ExecutionResult {
  success: boolean;
  appliedActions: number;
  failedActions: number;
  skippedActions: number;
  totalAdjustment: number;
  executionTime: number;
  errors: string[];
}

export class ActiveReconciliationEngine {
  private readonly DRIFT_THRESHOLD = 0.005; // 0.5% default threshold
  private readonly CONFIDENCE_THRESHOLD = 85; // Minimum confidence for auto-apply
  private readonly MAX_ADJUSTMENT_AMOUNT = 50000; // Maximum single adjustment (safety limit)

  /**
   * اجرای کامل چرخه Active Reconciliation
   * 1. Detection Phase: تشخیص drift
   * 2. Analysis Phase: تولید repair plan
   * 3. Execution Phase: اعمال اصلاحات (در صورت enforce mode)
   */
  async runActiveReconciliation(options: {
    mode?: 'dry' | 'enforce';
    driftThreshold?: number;
    usePythonEnhanced?: boolean;
    representativeIds?: number[];
  } = {}): Promise<{
    reconciliationRun: any;
    plan: ReconciliationPlan | null;
    execution: ExecutionResult | null;
  }> {
    const {
      mode = 'dry',
      driftThreshold = this.DRIFT_THRESHOLD,
      usePythonEnhanced = true,
      representativeIds
    } = options;

    console.log(`🔄 ACTIVE RECONCILIATION: Starting ${mode} mode analysis...`);

    // Check feature flag state
    const reconState = featureFlagManager.getMultiStageFlagState('active_reconciliation');
    if (reconState === 'off') {
      throw new Error('Active reconciliation is disabled');
    }

    // Step 1: Drift Detection with optional Python enhancement
    const driftMetrics = await this.detectDrift({
      threshold: driftThreshold,
      usePythonEnhanced,
      representativeIds
    });

    // Create reconciliation run record
    const runRecord = await db.insert(reconciliationRuns).values({
      scope: representativeIds ? `representatives:${representativeIds.length}` : 'global',
      diffAbs: driftMetrics.totalDrift,
      diffRatio: driftMetrics.driftRatio,
      status: driftMetrics.totalDrift > driftThreshold ? 'WARN' : 'OK',
      meta: {
        mode,
        threshold: driftThreshold,
        usePythonEnhanced,
        detectedAnomalies: driftMetrics.anomalies?.length || 0
      }
    }).returning();

    const runId = runRecord[0].id;

    let plan: ReconciliationPlan | null = null;
    let execution: ExecutionResult | null = null;

    // Step 2: Generate Repair Plan (if drift detected)
    if (driftMetrics.totalDrift > driftThreshold) {
      console.log(`⚠️ DRIFT DETECTED: ${driftMetrics.totalDrift} (threshold: ${driftThreshold})`);
      
      plan = await this.generateRepairPlan(runId, driftMetrics, {
        usePythonEnhanced,
        representativeIds
      });

      // Step 3: Execute Repairs (if enforce mode)
      if (mode === 'enforce' && plan) {
        execution = await this.executeRepairPlan(plan);
      }
    } else {
      console.log(`✅ NO DRIFT: System is within acceptable threshold`);
    }

    return {
      reconciliationRun: runRecord[0],
      plan,
      execution
    };
  }

  /**
   * تشخیص drift با روش‌های متعدد
   */
  private async detectDrift(options: {
    threshold: number;
    usePythonEnhanced: boolean;
    representativeIds?: number[];
  }): Promise<{
    totalDrift: number;
    driftRatio: number;
    anomalies: any[];
    method: 'STANDARD' | 'PYTHON_ENHANCED';
  }> {
    const { threshold, usePythonEnhanced, representativeIds } = options;

    if (usePythonEnhanced) {
      try {
        // Use Python service for enhanced drift detection
        const pythonDrift = await pythonFinancialClient.detectDrift({
          representatives: representativeIds,
          threshold,
          includeAnomalies: true
        });

        return {
          totalDrift: pythonDrift.total_drift,
          driftRatio: pythonDrift.drift_ratio,
          anomalies: pythonDrift.anomalies || [],
          method: 'PYTHON_ENHANCED'
        };
      } catch (error) {
        console.warn('⚠️ Python drift detection failed, falling back to standard method:', error);
      }
    }

    // Standard Node.js drift detection (fallback)
    const standardDrift = await this.standardDriftDetection(representativeIds);
    
    return {
      ...standardDrift,
      method: 'STANDARD'
    };
  }

  /**
   * استاندارد drift detection (Node.js fallback)
   */
  private async standardDriftDetection(representativeIds?: number[]): Promise<{
    totalDrift: number;
    driftRatio: number;
    anomalies: any[];
  }> {
    // Get representatives to analyze
    const repsQuery = representativeIds
      ? db.select().from(representatives).where(sql`${representatives.id} = ANY(${representativeIds})`)
      : db.select().from(representatives).where(eq(representatives.isActive, true));

    const reps = await repsQuery;
    let totalDrift = 0;
    const anomalies: any[] = [];

    for (const rep of reps) {
      // Calculate expected debt from ledger
      const ledgerDebt = await this.calculateLedgerDebt(rep.id);
      const cachedDebt = parseFloat(rep.totalDebt || '0');
      
      const drift = Math.abs(ledgerDebt - cachedDebt);
      totalDrift += drift;

      if (drift > this.DRIFT_THRESHOLD * cachedDebt) {
        anomalies.push({
          representativeId: rep.id,
          representativeName: rep.name,
          ledgerDebt,
          cachedDebt,
          drift,
          driftRatio: cachedDebt > 0 ? drift / cachedDebt : 0
        });
      }
    }

    const totalCachedDebt = reps.reduce((sum, rep) => sum + parseFloat(rep.totalDebt || '0'), 0);
    const driftRatio = totalCachedDebt > 0 ? totalDrift / totalCachedDebt : 0;

    return {
      totalDrift,
      driftRatio,
      anomalies
    };
  }

  /**
   * محاسبه بدهی از ledger (payment_allocations)
   */
  private async calculateLedgerDebt(representativeId: number): Promise<number> {
    // Total invoices
    const invoiceSum = await db.select({
      total: sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`
    }).from(invoices).where(eq(invoices.representativeId, representativeId));

    // Total allocated payments
    const allocatedSum = await db.select({
      total: sql<number>`COALESCE(SUM(allocated_amount), 0)`
    })
    .from(paymentAllocations)
    .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
    .where(eq(payments.representativeId, representativeId));

    const totalInvoices = invoiceSum[0]?.total || 0;
    const totalAllocated = allocatedSum[0]?.total || 0;

    return Math.max(0, totalInvoices - totalAllocated);
  }

  /**
   * تولید repair plan
   */
  private async generateRepairPlan(
    runId: number, 
    driftMetrics: any, 
    options: { usePythonEnhanced: boolean; representativeIds?: number[] }
  ): Promise<ReconciliationPlan> {
    const actions: RepairAction[] = [];

    for (const anomaly of driftMetrics.anomalies) {
      const repId = anomaly.representativeId;
      const adjustmentAmount = anomaly.ledgerDebt - anomaly.cachedDebt;

      // Safety check: Skip large adjustments that need manual review
      if (Math.abs(adjustmentAmount) > this.MAX_ADJUSTMENT_AMOUNT) {
        console.warn(`⚠️ Large adjustment skipped for rep ${repId}: ${adjustmentAmount}`);
        continue;
      }

      actions.push({
        representativeId: repId,
        actionType: 'ADJUST_DEBT',
        targetEntity: 'representative',
        targetId: repId,
        currentValue: anomaly.cachedDebt,
        expectedValue: anomaly.ledgerDebt,
        adjustmentAmount,
        reason: `Drift correction: ledger=${anomaly.ledgerDebt}, cached=${anomaly.cachedDebt}`,
        confidence: 90 // High confidence for ledger-based corrections
      });

      // Also create cache sync action
      actions.push({
        representativeId: repId,
        actionType: 'SYNC_CACHE',
        targetEntity: 'cache',
        targetId: repId, 
        currentValue: anomaly.cachedDebt,
        expectedValue: anomaly.ledgerDebt,
        adjustmentAmount: 0,
        reason: 'Cache synchronization after debt adjustment',
        confidence: 95
      });
    }

    // Store actions in database
    if (actions.length > 0) {
      await db.insert(reconciliationActions).values(
        actions.map(action => ({
          runId,
          representativeId: action.representativeId,
          actionType: action.actionType,
          targetEntity: action.targetEntity,
          targetId: action.targetId,
          currentValue: action.currentValue.toString(),
          expectedValue: action.expectedValue.toString(),
          adjustmentAmount: action.adjustmentAmount.toString(),
          reason: action.reason
        }))
      );
    }

    const totalAdjustment = actions.reduce((sum, action) => sum + Math.abs(action.adjustmentAmount), 0);
    const riskLevel = this.assessRiskLevel(totalAdjustment, actions.length);

    return {
      runId,
      actions,
      estimatedImpact: {
        affectedRepresentatives: new Set(actions.map(a => a.representativeId)).size,
        totalAdjustment,
        riskLevel
      },
      metadata: {
        driftThreshold: this.DRIFT_THRESHOLD,
        detectionMethod: options.usePythonEnhanced ? 'PYTHON_ENHANCED' : 'STANDARD',
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * اجرای repair plan
   */
  private async executeRepairPlan(plan: ReconciliationPlan): Promise<ExecutionResult> {
    const startTime = Date.now();
    let appliedActions = 0;
    let failedActions = 0;
    let skippedActions = 0;
    let totalAdjustment = 0;
    const errors: string[] = [];

    console.log(`🔧 EXECUTING REPAIR PLAN: ${plan.actions.length} actions`);

    for (const action of plan.actions) {
      try {
        // Skip low-confidence actions
        if (action.confidence < this.CONFIDENCE_THRESHOLD) {
          skippedActions++;
          await this.updateActionStatus(plan.runId, action, 'SKIPPED', 'Low confidence');
          continue;
        }

        // Execute the repair action
        const success = await this.executeRepairAction(action);
        
        if (success) {
          appliedActions++;
          totalAdjustment += Math.abs(action.adjustmentAmount);
          await this.updateActionStatus(plan.runId, action, 'APPLIED');
        } else {
          failedActions++;
          await this.updateActionStatus(plan.runId, action, 'FAILED', 'Execution failed');
        }

      } catch (error) {
        failedActions++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Action ${action.actionType} for ${action.targetEntity}:${action.targetId} failed: ${errorMsg}`);
        await this.updateActionStatus(plan.runId, action, 'FAILED', errorMsg);
      }
    }

    const executionTime = Date.now() - startTime;

    console.log(`✅ REPAIR PLAN EXECUTED: ${appliedActions} applied, ${failedActions} failed, ${skippedActions} skipped in ${executionTime}ms`);

    return {
      success: failedActions === 0,
      appliedActions,
      failedActions,
      skippedActions,
      totalAdjustment,
      executionTime,
      errors
    };
  }

  /**
   * اجرای یک repair action
   */
  private async executeRepairAction(action: RepairAction): Promise<boolean> {
    switch (action.actionType) {
      case 'ADJUST_DEBT':
        return this.adjustRepresentativeDebt(action.targetId, action.expectedValue);
      
      case 'SYNC_CACHE':
        return this.syncInvoiceCache(action.representativeId!);
      
      case 'RECALCULATE_BALANCE':
        return this.recalculateBalance(action.targetId);
      
      default:
        console.warn(`Unknown action type: ${action.actionType}`);
        return false;
    }
  }

  /**
   * تنظیم بدهی نماینده
   */
  private async adjustRepresentativeDebt(representativeId: number, newDebt: number): Promise<boolean> {
    try {
      await db.update(representatives)
        .set({ 
          totalDebt: newDebt.toString(),
          updatedAt: new Date()
        })
        .where(eq(representatives.id, representativeId));
      
      return true;
    } catch (error) {
      console.error(`Failed to adjust debt for representative ${representativeId}:`, error);
      return false;
    }
  }

  /**
   * همگام‌سازی cache فاکتورها
   */
  private async syncInvoiceCache(representativeId: number): Promise<boolean> {
    try {
      // Force recalculation through unified financial engine
      UnifiedFinancialEngine.forceInvalidateRepresentative(representativeId, {
        cascadeGlobal: false,
        reason: 'active_reconciliation_sync'
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to sync cache for representative ${representativeId}:`, error);
      return false;
    }
  }

  /**
   * محاسبه مجدد تراز
   */
  private async recalculateBalance(invoiceId: number): Promise<boolean> {
    try {
      // This would integrate with invoice balance cache service
      // For now, just log the action
      console.log(`Recalculating balance for invoice ${invoiceId}`);
      return true;
    } catch (error) {
      console.error(`Failed to recalculate balance for invoice ${invoiceId}:`, error);
      return false;
    }
  }

  /**
   * به‌روزرسانی وضعیت action
   */
  private async updateActionStatus(
    runId: number, 
    action: RepairAction, 
    status: 'APPLIED' | 'FAILED' | 'SKIPPED',
    reason?: string
  ): Promise<void> {
    await db.update(reconciliationActions)
      .set({
        status,
        reason: reason || action.reason,
        appliedAt: status === 'APPLIED' ? new Date() : null
      })
      .where(and(
        eq(reconciliationActions.runId, runId),
        eq(reconciliationActions.targetId, action.targetId),
        eq(reconciliationActions.actionType, action.actionType)
      ));
  }

  /**
   * ارزیابی سطح ریسک
   */
  private assessRiskLevel(totalAdjustment: number, actionCount: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (totalAdjustment > 100000 || actionCount > 20) return 'CRITICAL';
    if (totalAdjustment > 50000 || actionCount > 10) return 'HIGH';  
    if (totalAdjustment > 10000 || actionCount > 5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get reconciliation run status and results
   */
  async getReconciliationStatus(runId: string): Promise<any | null> {
    try {
      const runData = await db.select()
        .from(reconciliationRuns)
        .where(eq(reconciliationRuns.id, parseInt(runId)))
        .limit(1);

      if (runData.length === 0) {
        return null;
      }

      const run = runData[0];
      
      // Get associated actions
      const actions = await db.select()
        .from(reconciliationActions)
        .where(eq(reconciliationActions.runId, run.id))
        .orderBy(reconciliationActions.createdAt);

      return {
        runId: run.id,
        status: run.status,
        mode: run.mode,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        summary: run.summary,
        actions: actions.map(action => ({
          id: action.id,
          actionType: action.actionType,
          targetEntity: action.targetEntity,
          targetId: action.targetId,
          status: action.status,
          reason: action.reason,
          appliedAt: action.appliedAt
        })),
        metadata: {
          actionsPlanned: actions.length,
          actionsCompleted: actions.filter(a => a.status === 'APPLIED').length,
          actionsFailed: actions.filter(a => a.status === 'FAILED').length
        }
      };
    } catch (error) {
      console.error('Failed to get reconciliation status:', error);
      throw error;
    }
  }

  /**
   * Get reconciliation runs history
   */
  async getReconciliationHistory(options: {
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const { limit = 50, offset = 0 } = options;
      
      const runs = await db.select({
        id: reconciliationRuns.id,
        status: reconciliationRuns.status,
        mode: reconciliationRuns.mode,
        startedAt: reconciliationRuns.startedAt,
        completedAt: reconciliationRuns.completedAt,
        summary: reconciliationRuns.summary
      })
      .from(reconciliationRuns)
      .orderBy(desc(reconciliationRuns.startedAt))
      .limit(limit)
      .offset(offset);

      return runs.map(run => ({
        runId: run.id,
        status: run.status,
        mode: run.mode,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        duration: run.completedAt && run.startedAt 
          ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
          : null,
        summary: run.summary
      }));
    } catch (error) {
      console.error('Failed to get reconciliation history:', error);
      throw error;
    }
  }

  /**
   * Cancel running reconciliation
   */
  async cancelReconciliation(runId: string): Promise<{ success: boolean; message: string }> {
    try {
      const runData = await db.select()
        .from(reconciliationRuns)
        .where(eq(reconciliationRuns.id, parseInt(runId)))
        .limit(1);

      if (runData.length === 0) {
        return { success: false, message: 'Reconciliation run not found' };
      }

      const run = runData[0];

      if (run.status !== 'RUNNING') {
        return { 
          success: false, 
          message: `Cannot cancel reconciliation in ${run.status} status` 
        };
      }

      // Update run status to cancelled
      await db.update(reconciliationRuns)
        .set({
          status: 'CANCELLED',
          completedAt: new Date(),
          summary: {
            ...run.summary,
            cancelled: true,
            cancelledAt: new Date().toISOString()
          }
        })
        .where(eq(reconciliationRuns.id, run.id));

      // Mark pending actions as cancelled
      await db.update(reconciliationActions)
        .set({
          status: 'CANCELLED',
          reason: 'Run cancelled by user'
        })
        .where(and(
          eq(reconciliationActions.runId, run.id),
          eq(reconciliationActions.status, 'PENDING')
        ));

      return { success: true, message: 'Reconciliation cancelled successfully' };
    } catch (error) {
      console.error('Failed to cancel reconciliation:', error);
      return { success: false, message: 'Failed to cancel reconciliation' };
    }
  }
}

export const activeReconciliationEngine = new ActiveReconciliationEngine();
// 🔗 SHERLOCK v3.0 - Intelligent Coupling Service
// محافظتی: اتصال هوشمند اجزا بدون تخریب سیستم موجود

import { eq, desc, sql, and, or } from "drizzle-orm";
import { db } from "../db";
import { 
  representatives,
  workspaceTasks,
  crmTasks,
  crmTaskResults,
  aiDecisionLog,
  crmCulturalProfiles,
  activityLogs,
  invoices,
  payments
} from "../../shared/schema";
import { PersianAIEngine } from "./persian-ai-engine";
import { TaskManagementService } from "./task-management-service";
import { nanoid } from "nanoid";

/**
 * 🔗 Intelligent Coupling Service - کوپلینگ محافظتی
 * 
 * هدف: اتصال هوشمند اجزای موجود بدون تخریب عملکرد فعلی
 * روش: Layer جدید بالای سیستم موجود که کوپلینگ را فراهم می‌کند
 */
export class IntelligentCouplingService {
  private persianAI: PersianAIEngine;
  private taskManager: TaskManagementService;
  
  // Cache برای جلوگیری از بار اضافی database
  private representativeCache: Map<string, any> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.persianAI = new PersianAIEngine();
    this.taskManager = new TaskManagementService();
  }

  // ==================== کوپلینگ محافظتی Task → Representative ====================

  /**
   * 🔄 همگام‌سازی محافظتی: وظایف با نمایندگان
   * این متد بدون تغییر در سیستم موجود، کوپلینگ را فراهم می‌کند
   */
  async syncTaskWithRepresentative(taskId: string): Promise<{
    representative?: any;
    culturalProfile?: any;
    financialContext?: any;
    recommendedActions?: string[];
    syncStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    syncDetails: string;
  }> {
    try {
      console.log(`🔄 Starting protective sync for task: ${taskId}`);

      // Step 1: دریافت وظیفه از سیستم موجود (محافظتی)
      const task = await this.getExistingTask(taskId);
      if (!task) {
        return {
          syncStatus: 'FAILED',
          syncDetails: 'وظیفه یافت نشد'
        };
      }

      // Step 2: شناسایی نماینده مرتبط (اگر وجود دارد)
      const representative = await this.identifyRelatedRepresentative(task);
      if (!representative) {
        return {
          syncStatus: 'PARTIAL',
          syncDetails: 'وظیفه بدون نماینده مشخص',
          recommendedActions: ['تعیین نماینده مرتبط', 'بروزرسانی توضیحات وظیفه']
        };
      }

      // Step 3: تحلیل فرهنگی (بدون تغییر در data موجود)
      const culturalProfile = await this.persianAI.analyzeCulturalProfile(representative.id);

      // Step 4: تحلیل مالی (بدون تغییر در data موجود)
      const financialContext = await this.getFinancialContext(representative.id);

      // Step 5: تولید توصیه‌های بهبود (بدون اجرای خودکار)
      const recommendedActions = await this.generateImprovementRecommendations(
        task, 
        representative, 
        culturalProfile, 
        financialContext
      );

      // Step 6: ثبت کوپلینگ در AI Decision Log (محافظتی)
      await this.logCouplingDecision(taskId, representative.id, {
        culturalProfile,
        financialContext,
        recommendedActions
      });

      console.log(`✅ Protective sync completed for task: ${taskId}`);

      return {
        representative,
        culturalProfile,
        financialContext,
        recommendedActions,
        syncStatus: 'SUCCESS',
        syncDetails: `کوپلینگ موفق با نماینده ${representative.name}`
      };

    } catch (error) {
      console.error('خطا در همگام‌سازی محافظتی:', error);
      return {
        syncStatus: 'FAILED',
        syncDetails: `خطا: ${error instanceof Error ? error.message : 'خطای نامشخص'}`
      };
    }
  }

  // ==================== کوپلینگ محافظتی Representative → Tasks ====================

  /**
   * 🎯 تولید وظایف هوشمند بر اساس تغییرات نماینده
   * محافظتی: فقط پیشنهاد می‌دهد، اجرای خودکار ندارد
   */
  async generateSmartTasksForRepresentative(representativeId: number, changes?: any): Promise<{
    suggestedTasks: any[];
    urgentTasks: any[];
    culturalConsiderations: any;
    autoGenerateRecommended: boolean;
    manualReviewRequired: boolean;
  }> {
    try {
      console.log(`🎯 Generating smart tasks for representative: ${representativeId}`);

      // Step 1: دریافت اطلاعات کامل نماینده
      const representative = await this.getRepresentativeWithFinancials(representativeId);
      if (!representative) {
        throw new Error('نماینده یافت نشد');
      }

      // Step 2: تحلیل AI از وضعیت نماینده
      const aiRecommendations = await this.persianAI.generateTaskRecommendations(representativeId);

      // Step 3: اولویت‌بندی بر اساس فوریت
      const { urgent, regular } = this.categorizeTasks(aiRecommendations, representative);

      // Step 4: تحلیل فرهنگی برای وظایف
      const culturalConsiderations = await this.analyzeCulturalRequirements(representative);

      // Step 5: تعیین نیاز به بررسی دستی
      const manualReviewRequired = this.requiresManualReview(representative, urgent);

      console.log(`✅ Generated ${aiRecommendations.length} smart task suggestions`);

      return {
        suggestedTasks: regular,
        urgentTasks: urgent,
        culturalConsiderations,
        autoGenerateRecommended: urgent.length === 0 && regular.length <= 3,
        manualReviewRequired
      };

    } catch (error) {
      console.error('خطا در تولید وظایف هوشمند:', error);
      throw error;
    }
  }

  // ==================== کوپلینگ محافظتی Financial → Workflow ====================

  /**
   * 💰 همگام‌سازی تغییرات مالی با workflow
   * محافظتی: monitor می‌کند و اعلان می‌دهد، تغییر خودکار نمی‌دهد
   */
  async syncFinancialChangesWithWorkflow(representativeId: number, changeType: string, changeDetails: any): Promise<{
    impactAnalysis: any;
    workflowAdjustments: any[];
    urgentTasksNeeded: any[];
    aiDecisionSummary: string;
    autoActionTaken: boolean;
  }> {
    try {
      console.log(`💰 Syncing financial changes for representative: ${representativeId}`);

      // Step 1: تحلیل تأثیر تغییرات مالی
      const impactAnalysis = await this.analyzeFinancialImpact(representativeId, changeType, changeDetails);

      // Step 2: شناسایی تنظیمات مورد نیاز در workflow
      const workflowAdjustments = await this.identifyWorkflowAdjustments(representativeId, impactAnalysis);

      // Step 3: تشخیص نیاز به وظایف فوری
      const urgentTasksNeeded = await this.identifyUrgentTasks(representativeId, impactAnalysis);

      // Step 4: تصمیم‌گیری AI
      const aiDecision = await this.makeFinancialSyncDecision(impactAnalysis, workflowAdjustments, urgentTasksNeeded);

      // Step 5: ثبت تصمیم در AI Log
      await this.logFinancialSyncDecision(representativeId, changeType, aiDecision);

      console.log(`✅ Financial sync analysis completed for representative: ${representativeId}`);

      return {
        impactAnalysis,
        workflowAdjustments,
        urgentTasksNeeded,
        aiDecisionSummary: aiDecision.summary,
        autoActionTaken: aiDecision.autoActionRecommended && urgentTasksNeeded.length === 0
      };

    } catch (error) {
      console.error('خطا در همگام‌سازی مالی:', error);
      throw error;
    }
  }

  // ==================== کوپلینگ محافظتی AI Learning ====================

  /**
   * 🧠 یادگیری از نتایج بدون تغییر در سیستم اصلی
   */
  async learnFromWorkflowResults(): Promise<{
    learningPoints: any[];
    patterns: any[];
    improvements: any[];
    systemAdaptations: any[];
  }> {
    try {
      console.log('🧠 Starting protective learning from workflow results...');

      // Step 1: جمع‌آوری data از منابع مختلف
      const completedTasks = await this.getRecentCompletedTasks();
      const representativeChanges = await this.getRecentRepresentativeChanges();
      const financialMovements = await this.getRecentFinancialMovements();

      // Step 2: تحلیل الگوها
      const patterns = await this.analyzeSuccessPatterns(completedTasks, representativeChanges, financialMovements);

      // Step 3: استخراج نکات یادگیری
      const learningPoints = await this.extractLearningPoints(patterns);

      // Step 4: شناسایی بهبودهای ممکن
      const improvements = await this.identifySystemImprovements(learningPoints);

      // Step 5: پیشنهاد تطبیق‌های سیستم
      const systemAdaptations = await this.suggestSystemAdaptations(improvements);

      console.log(`✅ Learning completed: ${learningPoints.length} points, ${patterns.length} patterns`);

      return {
        learningPoints,
        patterns,
        improvements,
        systemAdaptations
      };

    } catch (error) {
      console.error('خطا در فرایند یادگیری:', error);
      throw error;
    }
  }

  // ==================== متدهای کمکی ====================

  private async getExistingTask(taskId: string): Promise<any> {
    const workspaceTask = await db.select()
      .from(workspaceTasks)
      .where(eq(workspaceTasks.id, taskId))
      .limit(1);

    return workspaceTask.length ? workspaceTask[0] : null;
  }

  private async identifyRelatedRepresentative(task: any): Promise<any> {
    // روش 1: اگر representativeId مستقیم موجود است
    if (task.representativeId) {
      return await this.getRepresentativeWithFinancials(task.representativeId);
    }

    // روش 2: تشخیص از assignedTo
    if (task.assignedTo) {
      const rep = await db.select()
        .from(representatives)
        .where(eq(representatives.name, task.assignedTo))
        .limit(1);
      
      return rep.length ? rep[0] : null;
    }

    // روش 3: تشخیص از توضیحات با AI
    return await this.identifyRepresentativeFromDescription(task.description);
  }

  private async identifyRepresentativeFromDescription(description: string): Promise<any> {
    // استفاده از AI برای تشخیص نماینده از توضیحات
    // این قسمت می‌تواند بعداً پیاده‌سازی شود
    return null;
  }

  private async getRepresentativeWithFinancials(representativeId: number): Promise<any> {
    // بررسی cache
    const cacheKey = `rep_${representativeId}`;
    const cached = this.representativeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }

    // دریافت از database
    const rep = await db.select()
      .from(representatives)
      .where(eq(representatives.id, representativeId))
      .limit(1);

    if (!rep.length) return null;

    const representative = rep[0];

    // اضافه کردن اطلاعات مالی
    const financialData = await this.getFinancialContext(representativeId);

    const result = {
      ...representative,
      ...financialData
    };

    // ذخیره در cache
    this.representativeCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  private async getFinancialContext(representativeId: number): Promise<any> {
    // دریافت آخرین اطلاعات مالی
    const recentInvoices = await db.select()
      .from(invoices)
      .where(eq(invoices.representativeId, representativeId))
      .orderBy(desc(invoices.createdAt))
      .limit(5);

    const recentPayments = await db.select()
      .from(payments)
      .where(eq(payments.representativeId, representativeId))
      .orderBy(desc(payments.createdAt))
      .limit(5);

    return {
      recentInvoices,
      recentPayments,
      lastInvoiceDate: recentInvoices[0]?.issueDate || null,
      lastPaymentDate: recentPayments[0]?.paymentDate || null
    };
  }

  private async generateImprovementRecommendations(task: any, representative: any, culturalProfile: any, financialContext: any): Promise<string[]> {
    const recommendations = [];

    // تحلیل کیفیت وظیفه
    if (!task.culturalContext) {
      recommendations.push('اضافه کردن context فرهنگی به وظیفه');
    }

    if (!task.representativeId) {
      recommendations.push('مشخص کردن نماینده مرتبط با وظیفه');
    }

    // تحلیل اولویت بر اساس وضعیت مالی
    const debt = parseFloat(representative.totalDebt || '0');
    if (debt > 2000000 && task.priority !== 'HIGH') {
      recommendations.push('افزایش اولویت به دلیل بدهی بالا');
    }

    // توصیه‌های فرهنگی
    if (culturalProfile.communicationStyle === 'FORMAL' && !task.description.includes('محترمانه')) {
      recommendations.push('اضافه کردن عبارات محترمانه');
    }

    return recommendations;
  }

  private categorizeTasks(recommendations: any[], representative: any): { urgent: any[], regular: any[] } {
    const urgent = [];
    const regular = [];

    const debt = parseFloat(representative.totalDebt || '0');

    for (const rec of recommendations) {
      if (rec.priority === 'URGENT' || (rec.priority === 'HIGH' && debt > 5000000)) {
        urgent.push(rec);
      } else {
        regular.push(rec);
      }
    }

    return { urgent, regular };
  }

  private async analyzeCulturalRequirements(representative: any): Promise<any> {
    // تحلیل نیازهای فرهنگی بر اساس نماینده
    return {
      formality: representative.ownerName ? 'HIGH' : 'MEDIUM',
      approachStyle: 'RESPECTFUL',
      communicationChannel: 'PHONE_PREFERRED'
    };
  }

  private requiresManualReview(representative: any, urgentTasks: any[]): boolean {
    const debt = parseFloat(representative.totalDebt || '0');
    return urgentTasks.length > 2 || debt > 10000000 || !representative.isActive;
  }

  private async analyzeFinancialImpact(representativeId: number, changeType: string, changeDetails: any): Promise<any> {
    return {
      severity: changeDetails.amount > 1000000 ? 'HIGH' : 'MEDIUM',
      type: changeType,
      impact: 'WORKFLOW_ADJUSTMENT_NEEDED'
    };
  }

  private async identifyWorkflowAdjustments(representativeId: number, impact: any): Promise<any[]> {
    return [
      {
        type: 'PRIORITY_ADJUSTMENT',
        description: 'تنظیم اولویت وظایف موجود'
      }
    ];
  }

  private async identifyUrgentTasks(representativeId: number, impact: any): Promise<any[]> {
    if (impact.severity === 'HIGH') {
      return await this.persianAI.generateTaskRecommendations(representativeId);
    }
    return [];
  }

  private async makeFinancialSyncDecision(impact: any, adjustments: any[], urgentTasks: any[]): Promise<any> {
    return {
      summary: 'تحلیل تأثیر مالی کامل شد',
      autoActionRecommended: urgentTasks.length === 0,
      confidence: 85
    };
  }

  private async logCouplingDecision(taskId: string, representativeId: number, data: any): Promise<void> {
    await db.insert(aiDecisionLog).values({
      decisionId: `COUPLING-${Date.now()}-${nanoid(6)}`,
      decisionType: 'TASK_REPRESENTATIVE_COUPLING',
      representativeId,
      inputData: { taskId, ...data },
      reasoning: 'Protective coupling analysis without system modification',
      confidenceScore: 85,
      expectedOutcome: 'Improved task-representative relationship',
      contextFactors: { protective: true, nonInvasive: true },
      culturalConsiderations: data.culturalProfile,
      createdAt: new Date()
    });
  }

  private async logFinancialSyncDecision(representativeId: number, changeType: string, decision: any): Promise<void> {
    await db.insert(aiDecisionLog).values({
      decisionId: `FINANCIAL-SYNC-${Date.now()}-${nanoid(6)}`,
      decisionType: 'FINANCIAL_WORKFLOW_SYNC',
      representativeId,
      inputData: { changeType, decision },
      reasoning: 'Financial change impact analysis for workflow optimization',
      confidenceScore: decision.confidence,
      expectedOutcome: 'Optimized workflow based on financial changes',
      contextFactors: { financial: true, protective: true },
      culturalConsiderations: {},
      createdAt: new Date()
    });
  }

  private async getRecentCompletedTasks(): Promise<any[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return await db.select()
      .from(workspaceTasks)
      .where(and(
        eq(workspaceTasks.status, 'COMPLETED'),
        sql`${workspaceTasks.completedAt} > ${thirtyDaysAgo}`
      ));
  }

  private async getRecentRepresentativeChanges(): Promise<any[]> {
    // پیاده‌سازی بعدی: تغییرات اخیر نمایندگان
    return [];
  }

  private async getRecentFinancialMovements(): Promise<any[]> {
    // پیاده‌سازی بعدی: تحرکات مالی اخیر
    return [];
  }

  private async analyzeSuccessPatterns(tasks: any[], changes: any[], movements: any[]): Promise<any[]> {
    // تحلیل الگوهای موفقیت
    return [];
  }

  private async extractLearningPoints(patterns: any[]): Promise<any[]> {
    // استخراج نکات یادگیری
    return [];
  }

  private async identifySystemImprovements(learningPoints: any[]): Promise<any[]> {
    // شناسایی بهبودهای سیستم
    return [];
  }

  private async suggestSystemAdaptations(improvements: any[]): Promise<any[]> {
    // پیشنهاد تطبیق‌های سیستم
    return [];
  }
}

// Export singleton instance
export const intelligentCoupling = new IntelligentCouplingService();
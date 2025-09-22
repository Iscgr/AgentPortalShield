/**
 * ✅ PERFORMANCE OPTIMIZATION: Async Job Manager
 * مدیریت کارهای async برای جلوگیری از timeout در عملیات سنگین
 */

export interface AsyncJob {
  id: string;
  type: 'data-reconciliation' | 'batch-calculation' | 'sync-all-representatives';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    percentage: number;
    currentPhase: string;
    message: string;
  };
  result?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  metadata: {
    batchSize: number;
    totalBatches: number;
    currentBatch: number;
  };
}

export class AsyncJobManager {
  private static instance: AsyncJobManager;
  private jobs: Map<string, AsyncJob> = new Map();
  
  static getInstance(): AsyncJobManager {
    if (!AsyncJobManager.instance) {
      AsyncJobManager.instance = new AsyncJobManager();
    }
    return AsyncJobManager.instance;
  }

  /**
   * ایجاد job جدید
   */
  createJob(type: AsyncJob['type'], metadata: Partial<AsyncJob['metadata']> = {}): string {
    const jobId = `job_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const job: AsyncJob = {
      id: jobId,
      type,
      status: 'pending',
      progress: {
        current: 0,
        total: 0,
        percentage: 0,
        currentPhase: 'Initializing',
        message: 'Job created, waiting to start...'
      },
      startedAt: new Date(),
      metadata: {
        batchSize: 10,
        totalBatches: 0,
        currentBatch: 0,
        ...metadata
      }
    };

    this.jobs.set(jobId, job);
    console.log(`📋 ASYNC JOB: Created job ${jobId} of type ${type}`);
    
    return jobId;
  }

  /**
   * شروع job
   */
  startJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') {
      return false;
    }

    job.status = 'running';
    job.progress.currentPhase = 'Starting';
    job.progress.message = 'Job execution started';
    
    console.log(`🚀 ASYNC JOB: Started job ${jobId}`);
    return true;
  }

  /**
   * بروزرسانی progress job
   */
  updateProgress(
    jobId: string, 
    current: number, 
    total: number, 
    phase: string, 
    message: string,
    batchInfo?: { currentBatch: number; totalBatches: number }
  ): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.progress.current = current;
    job.progress.total = total;
    job.progress.percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    job.progress.currentPhase = phase;
    job.progress.message = message;

    if (batchInfo) {
      job.metadata.currentBatch = batchInfo.currentBatch;
      job.metadata.totalBatches = batchInfo.totalBatches;
    }

    console.log(`📊 ASYNC JOB: Progress ${jobId}: ${job.progress.percentage}% - ${phase}: ${message}`);
    return true;
  }

  /**
   * تکمیل موفقیت‌آمیز job
   */
  completeJob(jobId: string, result: any): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date();
    job.progress.percentage = 100;
    job.progress.currentPhase = 'Completed';
    job.progress.message = 'Job completed successfully';

    console.log(`✅ ASYNC JOB: Completed job ${jobId}`);
    return true;
  }

  /**
   * شکست job
   */
  failJob(jobId: string, error: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.status = 'failed';
    job.error = error;
    job.completedAt = new Date();
    job.progress.currentPhase = 'Failed';
    job.progress.message = `Job failed: ${error}`;

    console.error(`❌ ASYNC JOB: Failed job ${jobId}: ${error}`);
    return true;
  }

  /**
   * دریافت اطلاعات job
   */
  getJob(jobId: string): AsyncJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * دریافت همه jobs فعال
   */
  getActiveJobs(): AsyncJob[] {
    return Array.from(this.jobs.values()).filter(job => 
      job.status === 'running' || job.status === 'pending'
    );
  }

  /**
   * دریافت آخرین jobs
   */
  getRecentJobs(limit: number = 10): AsyncJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  /**
   * پاک‌سازی jobs قدیمی (بیش از 24 ساعت)
   */
  cleanupOldJobs(): number {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.startedAt < oneDayAgo && job.status !== 'running') {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 ASYNC JOB: Cleaned up ${cleaned} old jobs`);
    }

    return cleaned;
  }

  /**
   * تخمین زمان باقی‌مانده
   */
  estimateTimeRemaining(jobId: string): number | null {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'running' || job.progress.current === 0) {
      return null;
    }

    const elapsed = Date.now() - job.startedAt.getTime();
    const progressRatio = job.progress.current / job.progress.total;
    const estimatedTotal = elapsed / progressRatio;
    const remaining = estimatedTotal - elapsed;

    return Math.max(0, remaining);
  }
}
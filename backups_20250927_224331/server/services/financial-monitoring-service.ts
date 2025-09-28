
/**
 * SHERLOCK v28.0: FINANCIAL MONITORING SERVICE
 * سرویس نظارت مداوم بر ثبات محاسبات مالی
 */

import { financialConsistencyEngine } from './financial-consistency-engine.js';

export class FinancialMonitoringService {
  private static instance: FinancialMonitoringService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  static getInstance(): FinancialMonitoringService {
    if (!this.instance) {
      this.instance = new FinancialMonitoringService();
    }
    return this.instance;
  }

  /**
   * شروع نظارت مداوم
   */
  startMonitoring(intervalMinutes: number = 30) {
    if (this.isMonitoring) {
      console.log('📊 Financial monitoring already running');
      return;
    }

    console.log(`📊 SHERLOCK v28.0: Starting financial monitoring every ${intervalMinutes} minutes`);
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      await this.performMonitoringCheck();
    }, intervalMinutes * 60 * 1000);

    // اجرای اولیه
    this.performMonitoringCheck();
  }

  /**
   * توقف نظارت
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('📊 Financial monitoring stopped');
  }

  /**
   * بررسی نظارتی
   */
  private async performMonitoringCheck() {
    try {
      console.log('🔍 SHERLOCK v28.0: Performing routine financial monitoring check...');
      
      const { FinancialConsistencyEngine } = await import('./financial-consistency-engine.js');
    const validationResult = await FinancialConsistencyEngine.validateFinancialConsistency();
      
      if (!validationResult.isValid) {
        console.warn(`⚠️ Financial inconsistencies detected: ${validationResult.summary.inconsistentCount} issues`);
        
        // اصلاح خودکار در صورت نیاز
        if (validationResult.summary.inconsistentCount > 0) {
          await financialConsistencyEngine.performSystemCorrection();
          console.log('✅ Automatic correction applied');
        }
      } else {
        console.log('✅ Financial system is consistent');
      }
    } catch (error) {
      console.error('❌ Monitoring check failed:', error);
    }
  }

  /**
   * گزارش وضعیت نظارت
   */
  getMonitoringStatus() {
    return {
      isActive: this.isMonitoring,
      nextCheck: this.monitoringInterval ? new Date(Date.now() + 30 * 60 * 1000) : null,
      lastCheck: new Date().toISOString()
    };
  }
}

export const financialMonitoringService = FinancialMonitoringService.getInstance();

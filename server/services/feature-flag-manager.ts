
/**
 * ATOMOS FEATURE FLAG MANAGER v1.0
 * Real-time toggle control for gradual rollout
 */

export interface FeatureFlag {
  enabled: boolean;
  percentage: number;      // 0-100% of traffic
  userGroups?: string[];   // specific user groups  
  conditions?: string[];   // conditional activation
  lastModified: string;
  modifiedBy: string;
}

export interface FeatureFlagConfig {
  UNIFIED_FINANCIAL_ENGINE: FeatureFlag;
  BATCH_QUERY_OPTIMIZATION: FeatureFlag;
  CACHE_OPTIMIZATION: FeatureFlag;
  REAL_TIME_SYNC: FeatureFlag;
  PERFORMANCE_MONITORING: FeatureFlag;
  PYTHON_FINANCIAL_CALCULATIONS: FeatureFlag;
}

// تعریف پرچم‌های چندمرحله‌ای برای گذارهای حساس (ledger و reconciliation)
export interface MultiStageFlag {
  state: string;           // حالت جاری (مثلاً off/shadow/enforce)
  allowed: string[];       // لیست حالت‌های مجاز
  lastModified: string;
  modifiedBy: string;
  description?: string;
}

type MultiStageFlagKey = 'allocation_dual_write' | 'ledger_backfill_mode' | 'allocation_read_switch' | 'active_reconciliation' | 'outbox_enabled' | 'allocation_runtime_guards' | 'usage_line_visibility' | 'allocation_partial_mode';

class FeatureFlagManager {
  private flags: FeatureFlagConfig;
  private lastUpdate: number = 0;
  private multiStageFlags: Record<MultiStageFlagKey, MultiStageFlag>;

  constructor() {
    // Initialize with safe defaults - all optimizations OFF initially
    this.flags = {
      UNIFIED_FINANCIAL_ENGINE: {
        enabled: true,  // ✅ PHASE 9C2.4: FULLY ACTIVATED
        percentage: 100,  // 100% traffic for immediate testing
        conditions: [],
        lastModified: new Date().toISOString(),
        modifiedBy: 'phase_9c2_4_full_activation'
      },

      BATCH_QUERY_OPTIMIZATION: {
        enabled: true,  // ✅ PHASE 8B: ACTIVATED FOR PERFORMANCE VALIDATION
        percentage: 100,  // 100% traffic for immediate testing
        conditions: [],  // Remove conditional dependency
        lastModified: new Date().toISOString(),
        modifiedBy: 'phase_8b_performance_validation'
      },

      CACHE_OPTIMIZATION: {
        enabled: true,  // Safe to enable - passive optimization
        percentage: 100,
        conditions: [],
        lastModified: new Date().toISOString(),
        modifiedBy: 'system_init'
      },

      REAL_TIME_SYNC: {
        enabled: false,
        percentage: 0,
        conditions: ['batch_optimization_stable'],
        lastModified: new Date().toISOString(),
        modifiedBy: 'system_init'
      },

      PERFORMANCE_MONITORING: {
        enabled: true,  // Always monitor
        percentage: 100,
        conditions: [],
        lastModified: new Date().toISOString(),
        modifiedBy: 'system_init'
      },

      PYTHON_FINANCIAL_CALCULATIONS: {
        enabled: true,  // Python integration for bulk calculations
        percentage: 100,
        conditions: [],
        lastModified: new Date().toISOString(),
        modifiedBy: 'e_d5_python_integration'
      }
    };

    this.lastUpdate = Date.now();
    // مقداردهی ایمن پرچم‌های چندمرحله‌ای (همه روی off)
    this.multiStageFlags = {
      allocation_dual_write: {
        state: 'off',
        allowed: ['off','shadow','enforce'],
        lastModified: new Date().toISOString(),
        modifiedBy: 'init',
        description: 'کنترل dual-write بین مدل legacy و ledger'
      },
      ledger_backfill_mode: {
        state: 'off',
        allowed: ['off','read_only','active'],
        lastModified: new Date().toISOString(),
        modifiedBy: 'init',
        description: 'اجرای backfill روی payment_allocations (shadow)'
      },
      allocation_read_switch: {
        state: 'off',
        allowed: ['off','canary','full'],
        lastModified: new Date().toISOString(),
        modifiedBy: 'init',
        description: 'سوییچ تدریجی خواندن تخصیص از ledger'
      },
      active_reconciliation: {
        state: 'off',
        allowed: ['off','dry','enforce'],
        lastModified: new Date().toISOString(),
        modifiedBy: 'init',
        description: 'اجرای job آشتی و اعمال سیاست‌ها'
      },
      outbox_enabled: {
        state: 'off',
        allowed: ['off','on'],
        lastModified: new Date().toISOString(),
        modifiedBy: 'init',
        description: 'فعال‌سازی الگوی outbox برای event dispatch'
      }
      ,
      allocation_runtime_guards: {
        state: 'off',
        allowed: ['off','warn','enforce'],
        lastModified: new Date().toISOString(),
        modifiedBy: 'init',
        description: 'گاردهای زمان اجرای تخصیص برای جلوگیری از over-allocation (I6/I7)'
      },
      usage_line_visibility: {
        state: 'off',
        allowed: ['off','on'],
        lastModified: new Date().toISOString(),
        modifiedBy: 'init',
        description: 'نمایش خطوط تخصیص و usage برای شفافیت (E-B6)'
      },
      allocation_partial_mode: {
        state: 'off',
        allowed: ['off','allow','enforce'],
        lastModified: new Date().toISOString(),
        modifiedBy: 'init',
        description: 'فعال‌سازی تخصیص جزئی پرداخت‌ها (E-B2)'      
      }
    };
    console.log('🚩 ATOMOS Feature Flag Manager v1.0 initialized with safe defaults');
  }

  /**
   * Check if a feature is enabled for current request
   */
  isEnabled(feature: keyof FeatureFlagConfig, context?: {
    userId?: string;
    userGroup?: string;
    requestId?: string;
  }): boolean {
    const flag = this.flags[feature];
    
    if (!flag || !flag.enabled) {
      return false;
    }

    // Check percentage rollout
    if (flag.percentage < 100) {
      // Simple percentage-based rollout using request hash
      const hash = this.hashForPercentage(context?.requestId || Date.now().toString());
      const shouldEnable = (hash % 100) < flag.percentage;
      
      if (!shouldEnable) {
        return false;
      }
    }

    // Check user groups if specified
    if (flag.userGroups && flag.userGroups.length > 0 && context?.userGroup) {
      if (!flag.userGroups.includes(context.userGroup)) {
        return false;
      }
    }

    // Check conditions
    if (flag.conditions && flag.conditions.length > 0) {
      return this.evaluateConditions(flag.conditions);
    }

    return true;
  }

  /**
   * Update feature flag configuration
   */
  updateFlag(feature: keyof FeatureFlagConfig, updates: Partial<FeatureFlag>, modifiedBy: string = 'admin'): void {
    const currentFlag = this.flags[feature];
    
    this.flags[feature] = {
      ...currentFlag,
      ...updates,
      lastModified: new Date().toISOString(),
      modifiedBy
    };

    this.lastUpdate = Date.now();
    
    console.log(`🔄 ATOMOS Feature Flag: Updated ${feature}`, {
      enabled: this.flags[feature].enabled,
      percentage: this.flags[feature].percentage,
      modifiedBy
    });
  }

  /**
   * Get current flag configuration
   */
  getFlags(): FeatureFlagConfig {
    return { ...this.flags };
  }

  /**
   * Get flag status summary
   */
  getStatus(): { [key: string]: { enabled: boolean; percentage: number; active: boolean } } {
    const status: any = {};
    Object.entries(this.flags).forEach(([key, flag]) => {
      status[key] = {
        enabled: flag.enabled,
        percentage: flag.percentage,
        active: this.isEnabled(key as keyof FeatureFlagConfig)
      };
    });
    // افزودن multi-stage flags
    Object.entries(this.multiStageFlags).forEach(([key, flag]) => {
      status[key] = {
        enabled: flag.state !== 'off',
        percentage: 100,
        active: flag.state !== 'off'
      };
      status[key].state = flag.state; // الحاق state پویا
    });
    return status;
  }

  /**
   * دریافت state فعلی یک پرچم چندمرحله‌ای
   */
  getMultiStageFlagState(flag: MultiStageFlagKey): string {
    return this.multiStageFlags[flag].state;
  }

  /**
   * به‌روزرسانی پرچم چندمرحله‌ای با اعتبارسنجی حالت مجاز
   */
  updateMultiStageFlag(flag: MultiStageFlagKey, newState: string, modifiedBy: string = 'admin') {
    const current = this.multiStageFlags[flag];
    if (!current.allowed.includes(newState)) {
      throw new Error(`State '${newState}' مجاز نیست. حالات مجاز: ${current.allowed.join(', ')}`);
    }
    if (current.state === newState) return; // بدون تغییر
    this.multiStageFlags[flag] = {
      ...current,
      state: newState,
      lastModified: new Date().toISOString(),
      modifiedBy
    };
    this.lastUpdate = Date.now();
    console.log(`🔄 MultiStageFlag ${flag} → ${newState} by ${modifiedBy}`);
  }

  /**
   * Emergency disable all optimizations
   */
  emergencyDisableAll(reason: string): void {
    console.log(`🚨 EMERGENCY: Disabling all feature flags, reason: ${reason}`);
    
    Object.keys(this.flags).forEach(feature => {
      if (feature !== 'PERFORMANCE_MONITORING') { // Keep monitoring enabled
        this.updateFlag(feature as keyof FeatureFlagConfig, {
          enabled: false,
          percentage: 0
        }, `emergency_${reason}`);
      }
    });
  }

  /**
   * Progressive rollout activation
   */
  activateProgressiveRollout(feature: keyof FeatureFlagConfig, targetPercentage: number = 5): void {
    console.log(`🚀 ATOMOS: Starting progressive rollout for ${feature} to ${targetPercentage}%`);
    
    this.updateFlag(feature, {
      enabled: true,
      percentage: targetPercentage
    }, 'progressive_rollout');
  }

  // Private helper methods
  private hashForPercentage(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private evaluateConditions(conditions: string[]): boolean {
    // Simple condition evaluation - can be expanded
    const conditionResults = conditions.map(condition => {
      switch (condition) {
        case 'unified_engine_active':
          return this.isEnabled('UNIFIED_FINANCIAL_ENGINE');
        case 'batch_optimization_stable':
          return this.isEnabled('BATCH_QUERY_OPTIMIZATION');
        default:
          return true; // Unknown conditions default to true
      }
    });

    return conditionResults.every(result => result);
  }
}

// Export singleton instance
export const featureFlagManager = new FeatureFlagManager();

// Helper function for easy feature checking
export function isFeatureEnabled(feature: keyof FeatureFlagConfig, context?: any): boolean {
  return featureFlagManager.isEnabled(feature, context);
}

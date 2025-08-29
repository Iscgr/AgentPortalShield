
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
}

class FeatureFlagManager {
  private flags: FeatureFlagConfig;
  private lastUpdate: number = 0;

  constructor() {
    // Initialize with safe defaults - all optimizations OFF initially
    this.flags = {
      UNIFIED_FINANCIAL_ENGINE: {
        enabled: true,  // ✅ PHASE 9C2.4: ACTIVATED FOR TESTING
        percentage: 5,  // Start with 5% traffic
        conditions: [],
        lastModified: new Date().toISOString(),
        modifiedBy: 'phase_9c2_4_activation'
      },

      BATCH_QUERY_OPTIMIZATION: {
        enabled: false,
        percentage: 0,
        conditions: ['unified_engine_active'],
        lastModified: new Date().toISOString(),
        modifiedBy: 'system_init'
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
      }
    };

    this.lastUpdate = Date.now();
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

    return status;
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

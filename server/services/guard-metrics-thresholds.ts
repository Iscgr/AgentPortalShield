/**
 * Threshold configuration برای انواع تخلف.
 * مقادیر اولیه محافظه‌کارانه هستند و در آینده از settings یا DB لود می‌شوند.
 */
export interface MetricThreshold {
  warn: number;    // آستانه هشدار
  critical: number; // آستانه بحرانی
}

export const DEFAULT_GUARD_THRESHOLDS: Record<string, MetricThreshold> = {
  // نمونه‌ها - در آینده براساس نوع واقعی violation پر می‌شود
  'allocation_over_remaining': { warn: 2, critical: 5 },
  'allocation_negative_amount': { warn: 1, critical: 2 },
  'invariant_violation_I6': { warn: 3, critical: 6 },
  'invariant_violation_I7': { warn: 3, critical: 6 }
};

export function getThresholdFor(type: string): MetricThreshold {
  return DEFAULT_GUARD_THRESHOLDS[type] || { warn: 10, critical: 20 };
}

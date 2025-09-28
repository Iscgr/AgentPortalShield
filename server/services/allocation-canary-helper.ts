/**
 * allocation-canary-helper.ts
 * انتخاب نماینده‌های canary برای خواندن آزمایشی از ledger/cache.
 * فعلاً استراتژی ساده: hash(repId) % 20 == 0 → 5%.
 */
export function isCanaryRepresentative(representativeId: number, percentage: number = 5): boolean {
  if (percentage <=0) return false;
  if (percentage >=100) return true;
  const bucket = Math.abs(hash(`${representativeId}`)) % 100;
  return bucket < percentage;
}

function hash(str: string): number {
  let h = 0;
  for (let i=0;i<str.length;i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

#!/usr/bin/env tsx
/**
 * payments-cast-validate.ts
 * هدف: اجرای سه‌مرحله‌ای مهاجرت ستون مبلغ پرداخت‌ها (TEXT -> DECIMAL shadow) و تولید گزارش نهایی.
 * مراحل:
 *  1) DRY_RUN: بدون نوشتن – محاسبه diff و اعتبار اولیه
 *  2) APPLY: پر کردن amount_dec برای ردیف‌های خالی
 *  3) FINALIZE: تایید نهایی تلورانس و اعلام آمادگی برای DDL (rename/ swap)
 * اگر هر مرحله خارج از تلورانس باشد، اجرای pipeline متوقف می‌شود (خروج با کد >0).
 * خروجی: JSON شامل نتایج هر مرحله + نتیجه کلی.
 * استفاده: npm run cast:payments:validate  یا  tsx scripts/payments-cast-validate.ts [--limit=1000] [--tolerance=0.0001] [--skip-finalize]
 */
import { spawnSync } from 'node:child_process';

interface StepResult {
  mode: 'DRY_RUN' | 'APPLY' | 'FINALIZE';
  total: number;
  converted: number;
  wouldConvert: number;
  invalid: number;
  sumText: number;
  sumDecimal: number;
  sumDiffAbs: number;
  diffRatio: number;
  withinTolerance: boolean;
  tolerance: number;
}

interface PipelineReport {
  steps: StepResult[];
  tolerance: number;
  finalWithinTolerance: boolean;
  abortedAt?: string;
  readyForSwap: boolean;
  timestamp: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  function getNum(flag: string, def?: number) {
    const i = args.indexOf(flag); if (i>=0) return Number(args[i+1]); return def;
  }
  return {
    limit: getNum('--limit'),
    tolerance: getNum('--tolerance', 0.0001)!,
    skipFinalize: args.includes('--skip-finalize'),
    verbose: args.includes('--verbose')
  };
}

function runCast(modeArgs: string[]): StepResult {
  const cmd = process.execPath; // node
  // استفاده از tsx در shebang اسکریپت اصلی؛ اینجا tsx را مستقیم صدا نمی‌زنیم چون payments-cast-shadow.ts خودش #!/usr/bin/env tsx دارد.
  const fullArgs = [...modeArgs];
  const proc = spawnSync('tsx', fullArgs, { encoding: 'utf8' });
  if (proc.error) throw proc.error;
  if (proc.status !== 0) {
    console.error('[cast-validator] زیرپردازه غیرصفر خاتمه یافت', proc.stderr || proc.stdout);
    throw new Error('cast shadow script failed');
  }
  // خروجی JSON آخر را پیدا کنیم (ممکن است خطوط اضافی log هم وجود داشته باشد)
  const lines = (proc.stdout || '').trim().split(/\n/);
  let jsonLine: any = null;
  for (let i = lines.length -1; i >=0; i--) {
    try { jsonLine = JSON.parse(lines[i]); break; } catch { /* ignore */ }
  }
  if (!jsonLine) throw new Error('JSON report not found in cast script output');
  return jsonLine as StepResult;
}

async function main() {
  const { limit, tolerance, skipFinalize, verbose } = parseArgs();
  const steps: StepResult[] = [];
  const baseArgs = ['scripts/payments-cast-shadow.ts'];
  if (limit) baseArgs.push('--limit', String(limit));

  // 1) DRY_RUN
  if (verbose) console.log('▶️ DRY_RUN مرحله 1');
  const dry = runCast(baseArgs.concat('--dry-run'));
  steps.push(dry);
  if (!dry.withinTolerance) {
    const report: PipelineReport = {
      steps, tolerance, finalWithinTolerance: false, abortedAt: 'DRY_RUN', readyForSwap: false, timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(report, null, 2));
    process.exit(3);
  }

  // 2) APPLY
  if (verbose) console.log('▶️ APPLY مرحله 2');
  const apply = runCast(baseArgs.concat('--apply'));
  steps.push(apply);
  if (!apply.withinTolerance) {
    const report: PipelineReport = {
      steps, tolerance, finalWithinTolerance: false, abortedAt: 'APPLY', readyForSwap: false, timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(report, null, 2));
    process.exit(4);
  }

  let finalizeStep: StepResult | undefined;
  if (!skipFinalize) {
    if (verbose) console.log('▶️ FINALIZE مرحله 3');
    finalizeStep = runCast(baseArgs.concat('--finalize'));
    steps.push(finalizeStep);
    if (!finalizeStep.withinTolerance) {
      const report: PipelineReport = {
        steps, tolerance, finalWithinTolerance: false, abortedAt: 'FINALIZE', readyForSwap: false, timestamp: new Date().toISOString()
      };
      console.log(JSON.stringify(report, null, 2));
      process.exit(5);
    }
  }

  const finalWithinTolerance = (finalizeStep ?? apply).withinTolerance;
  const report: PipelineReport = {
    steps,
    tolerance,
    finalWithinTolerance,
    readyForSwap: finalWithinTolerance && !skipFinalize,
    timestamp: new Date().toISOString()
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });

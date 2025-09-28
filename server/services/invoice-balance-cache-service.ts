/**
 * InvoiceBalanceCacheService (Phase A - Iteration 4 Skeleton)
 * مسئول محاسبه/به‌روزرسانی ورودی cache برای یک فاکتور (بدون trigger فعلاً).
 */
import { db } from '../database-manager';
import { invoices, paymentAllocations, invoiceBalanceCache } from '@shared/schema';
import { sql, eq } from 'drizzle-orm';

export interface CacheRecomputeResult {
  invoiceId: number;
  allocatedTotal: number;
  remaining: number;
  status: string;
  previousVersion?: number;
  newVersion?: number;
  updated: boolean;
}

export class InvoiceBalanceCacheService {
  /**
   * Recompute یک فاکتور: aggregate روی payment_allocations و محاسبه remaining و status.
   * Status Rules ابتدایی:
   * - remaining == 0 -> paid
   * - 0 < remaining < amount -> partial
   * - remaining == amount -> unpaid
   * - remaining < 0 (نباید رخ دهد) -> anomaly
   */
  static async recompute(invoiceId: number): Promise<CacheRecomputeResult> {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!inv) throw new Error('Invoice not found');

    const agg = await db.execute(sql`SELECT COALESCE(SUM(allocated_amount),0) AS alloc FROM payment_allocations WHERE invoice_id = ${invoiceId}`);
    const allocated = Number((agg as any).rows?.[0]?.alloc || 0);
    const remaining = Number(inv.amount) - allocated;

    let status = 'unpaid';
    if (remaining === 0) status = 'paid';
    else if (remaining < Number(inv.amount)) status = 'partial';
    if (remaining < 0) status = 'anomaly';

    // خواندن نسخه قبلی
    const existing = await db.execute(sql`SELECT version FROM invoice_balance_cache WHERE invoice_id = ${invoiceId}`);
    const prevVersion = (existing as any).rows?.[0]?.version;
    let newVersion: number | undefined = undefined;

    // UPSERT ساده (در PostgreSQL 15+ می‌توان ON CONFLICT DO UPDATE استفاده کرد؛ فعلاً sql دستی)
    await db.execute(sql`
      INSERT INTO invoice_balance_cache(invoice_id, allocated_total, remaining_amount, status_cached, version)
      VALUES (${invoiceId}, ${allocated}, ${remaining}, ${status}, ${prevVersion ? prevVersion + 1 : 1})
      ON CONFLICT (invoice_id) DO UPDATE SET
        allocated_total = EXCLUDED.allocated_total,
        remaining_amount = EXCLUDED.remaining_amount,
        status_cached = EXCLUDED.status_cached,
        version = invoice_balance_cache.version + 1,
        updated_at = now();
    `);

    if (prevVersion !== undefined) newVersion = Number(prevVersion) + 1; else newVersion = 1;

    return {
      invoiceId,
      allocatedTotal: allocated,
      remaining,
      status,
      previousVersion: prevVersion !== undefined ? Number(prevVersion) : undefined,
      newVersion,
      updated: true
    };
  }

  /**
   * recomputeAll: بازسازی گروهی کش برای تمام فاکتورهای انتخابی.
   * - batchSize: تعداد فاکتور در هر batch
   * - sleepMs: تاخیر بین batch ها برای کاهش فشار
   * - representativeId: (اختیاری) محدودسازی به نماینده خاص
   * خروجی: آمار اجرای کل.
   */
  static async recomputeAll(params?: { batchSize?: number; sleepMs?: number; representativeId?: number; limit?: number }): Promise<{ processed: number; batches: number; errors: number }> {
    const batchSize = params?.batchSize ?? 200;
    const sleepMs = params?.sleepMs ?? 0;
    const repId = params?.representativeId;
    const limit = params?.limit ?? 5000;

    let offset = 0; let processed = 0; let batches = 0; let errors = 0;
    while (processed < limit) {
      const selection = await db.execute(sql`
        SELECT id FROM invoices
        ${repId ? sql`WHERE representative_id = ${repId}` : sql``}
        ORDER BY id ASC
        LIMIT ${batchSize} OFFSET ${offset};`);
      const rows = (selection as any).rows || [];
      if (!rows.length) break;
      for (const r of rows) {
        try { await this.recompute(Number(r.id)); } catch { errors++; }
        processed++;
      }
      batches++;
      offset += rows.length;
      if (sleepMs > 0) await new Promise(res => setTimeout(res, sleepMs));
      if (rows.length < batchSize) break; // پایان
    }
    return { processed, batches, errors };
  }
}

-- Migration 003: Backfill & Index Hardening (Phase A - Iteration 4)
-- ایندکس‌ها و قیود تکمیلی برای بهبود صحت و کارایی

-- جلوگیری از duplicate backfill (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_alloc_idem ON payment_allocations(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ایندکس ترکیبی برای توزیع سریع بر اساس invoice
CREATE INDEX IF NOT EXISTS idx_payment_alloc_invoice_method ON payment_allocations(invoice_id, method);

-- ایندکس partial برای فاکتورهای باز (اگر قبلاً در migration 002 نبود)
CREATE INDEX IF NOT EXISTS idx_invoices_status_open ON invoices(status) WHERE status IN ('unpaid','partial','overdue');

-- ایندکس drift status برای کوئری‌های اخیر
CREATE INDEX IF NOT EXISTS idx_reconciliation_status_created ON reconciliation_runs(status, created_at DESC);

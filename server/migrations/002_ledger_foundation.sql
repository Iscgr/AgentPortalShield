-- Migration 002: Ledger Foundation (Phase A - E-A1..E-A3/E-A5)
-- Atomic creation of ledger-related tables + shadow amount column.
-- Rollback strategy: DROP tables (if empty) + DROP COLUMN amount_dec if needed.

BEGIN;

-- payment_allocations
CREATE TABLE IF NOT EXISTS payment_allocations (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(15,2) NOT NULL CHECK (allocated_amount > 0),
  method TEXT NOT NULL CHECK (method IN ('auto','manual','backfill')),
  synthetic BOOLEAN NOT NULL DEFAULT false,
  idempotency_key TEXT,
  performed_by BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_alloc_unique UNIQUE (payment_id, invoice_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_invoice ON payment_allocations(invoice_id);

-- invoice_balance_cache
CREATE TABLE IF NOT EXISTS invoice_balance_cache (
  invoice_id BIGINT PRIMARY KEY REFERENCES invoices(id) ON DELETE CASCADE,
  allocated_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(15,2) NOT NULL,
  status_cached TEXT NOT NULL,
  version INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_balance_status_rem ON invoice_balance_cache(status_cached, remaining_amount);

-- reconciliation_runs
CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  diff_abs DECIMAL(15,2) NOT NULL,
  diff_ratio DECIMAL(12,6) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OK','WARN','FAIL')),
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recon_status_created ON reconciliation_runs(status, created_at);

-- shadow column for payments.amount_dec
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_dec DECIMAL(15,2);

COMMIT;

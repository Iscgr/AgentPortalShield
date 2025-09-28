-- 004_invoice_usage_items.sql
-- ایجاد جدول ریزجزئیات مصرف جهت نگهداری خطوط فایل‌های هفتگی JSON
CREATE TABLE IF NOT EXISTS invoice_usage_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  admin_username TEXT NOT NULL,
  event_timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  amount_text TEXT NOT NULL,
  amount_dec DECIMAL(15,2),
  raw_json JSON,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_items_invoice ON invoice_usage_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_usage_items_admin ON invoice_usage_items(admin_username);

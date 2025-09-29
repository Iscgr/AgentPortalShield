-- Phase C: E-C1 Telegram Outbox Pattern Implementation
-- Migration: 006_outbox_table.sql
-- Purpose: تضمین تحویل پیام‌های تلگرام با retry mechanism و KPI tracking

-- Create outbox table
CREATE TABLE IF NOT EXISTS outbox (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL, -- 'TELEGRAM_MESSAGE', 'EMAIL', 'WEBHOOK'
  payload JSONB NOT NULL, -- محتوای پیام شامل recipient، message، options
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | PROCESSING | SENT | FAILED | CANCELLED
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMP,
  error_last TEXT, -- آخرین خطای مواجه شده
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status);
CREATE INDEX IF NOT EXISTS idx_outbox_next_retry_at ON outbox(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outbox_type ON outbox(type);
CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox(created_at);

-- Composite index for worker query optimization
CREATE INDEX IF NOT EXISTS idx_outbox_worker_ready ON outbox(status, next_retry_at) WHERE status IN ('PENDING', 'FAILED');

-- Comment documentation
COMMENT ON TABLE outbox IS 'Phase C E-C1: Outbox pattern for reliable message delivery with retry mechanism';
COMMENT ON COLUMN outbox.type IS 'Message type: TELEGRAM_MESSAGE, EMAIL, WEBHOOK';
COMMENT ON COLUMN outbox.payload IS 'JSON payload containing recipient, message content, and delivery options';
COMMENT ON COLUMN outbox.status IS 'Current processing status: PENDING, PROCESSING, SENT, FAILED, CANCELLED';
COMMENT ON COLUMN outbox.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN outbox.next_retry_at IS 'Scheduled time for next retry attempt (NULL if no retry needed)';
COMMENT ON COLUMN outbox.error_last IS 'Last error message encountered during processing';
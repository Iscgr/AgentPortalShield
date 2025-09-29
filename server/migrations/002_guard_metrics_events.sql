-- Migration 002: Create guard_metrics_events table (Phase B - E-B5 persistence stage 1)
CREATE TABLE IF NOT EXISTS guard_metrics_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  level TEXT NULL,
  context JSON NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guard_metrics_events_type_created ON guard_metrics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_guard_metrics_events_created ON guard_metrics_events(created_at);

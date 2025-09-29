-- Migration 005: Enhanced Reconciliation Runs Table
-- Phase B: E-B4 - Active Reconciliation Engine Schema Enhancement

-- Add missing fields to existing reconciliation_runs table
ALTER TABLE reconciliation_runs 
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'dry' CHECK (mode IN ('dry', 'enforce')),
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS summary JSONB DEFAULT '{}';

-- Update existing status values to match new system
UPDATE reconciliation_runs 
SET status = CASE 
    WHEN status = 'OK' THEN 'COMPLETED'
    WHEN status = 'WARN' THEN 'COMPLETED_WITH_WARNINGS' 
    WHEN status = 'FAIL' THEN 'FAILED'
    ELSE status
END
WHERE status IN ('OK', 'WARN', 'FAIL');

-- Add new status constraint  
ALTER TABLE reconciliation_runs DROP CONSTRAINT IF EXISTS reconciliation_runs_status_check;
ALTER TABLE reconciliation_runs 
ADD CONSTRAINT reconciliation_runs_status_check 
CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED', 'CANCELLED'));

-- Add new mode constraint
ALTER TABLE reconciliation_runs 
ADD CONSTRAINT reconciliation_runs_mode_check 
CHECK (mode IN ('dry', 'enforce'));

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_mode ON reconciliation_runs(mode);
CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_status_started ON reconciliation_runs(status, started_at);
CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_completed_at ON reconciliation_runs(completed_at) WHERE completed_at IS NOT NULL;

-- Update comments
COMMENT ON COLUMN reconciliation_runs.mode IS 'Execution mode: dry (simulation) or enforce (actual changes)';
COMMENT ON COLUMN reconciliation_runs.started_at IS 'When the reconciliation run started';
COMMENT ON COLUMN reconciliation_runs.completed_at IS 'When the reconciliation run completed (success or failure)';
COMMENT ON COLUMN reconciliation_runs.summary IS 'JSON summary with metrics, actions taken, and results';
COMMENT ON COLUMN reconciliation_runs.status IS 'Current status: PENDING, RUNNING, COMPLETED, COMPLETED_WITH_WARNINGS, FAILED, CANCELLED';
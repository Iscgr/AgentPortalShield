-- Migration 004: Reconciliation Actions Table
-- Active Reconciliation Engine for Phase B (E-B4)

CREATE TABLE IF NOT EXISTS reconciliation_actions (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES reconciliation_runs(id) ON DELETE CASCADE,
    representative_id BIGINT REFERENCES representatives(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('ADJUST_DEBT', 'RECALCULATE_BALANCE', 'SYNC_CACHE', 'REPAIR_ALLOCATION')),
    target_entity TEXT NOT NULL CHECK (target_entity IN ('representative', 'invoice', 'payment', 'cache')),
    target_id BIGINT NOT NULL,
    current_value DECIMAL(15,2),
    expected_value DECIMAL(15,2),
    adjustment_amount DECIMAL(15,2),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPLIED', 'FAILED', 'SKIPPED')),
    reason TEXT,
    applied_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reconciliation_actions_run_id ON reconciliation_actions(run_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_actions_representative_id ON reconciliation_actions(representative_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_actions_status ON reconciliation_actions(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_actions_target ON reconciliation_actions(target_entity, target_id);

-- Comments
COMMENT ON TABLE reconciliation_actions IS 'Active Reconciliation repair plans and execution status';
COMMENT ON COLUMN reconciliation_actions.action_type IS 'Type of corrective action to perform';
COMMENT ON COLUMN reconciliation_actions.target_entity IS 'Entity type being corrected';
COMMENT ON COLUMN reconciliation_actions.adjustment_amount IS 'Amount of correction needed';
-- Extend workflow_conversations for multi-turn support
-- Adds turn counting, timeout configuration, and accumulated context

ALTER TABLE workflow_conversations
  ADD COLUMN IF NOT EXISTS turn_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timeout_at timestamptz,
  ADD COLUMN IF NOT EXISTS timeout_action text DEFAULT 'end',
  ADD COLUMN IF NOT EXISTS context jsonb DEFAULT '{}';

-- Index for timeout processing (find expired conversations)
CREATE INDEX IF NOT EXISTS idx_wc_timeout
  ON workflow_conversations (timeout_at)
  WHERE status = 'waiting' AND timeout_at IS NOT NULL;

COMMENT ON COLUMN workflow_conversations.turn_count IS 'Number of conversation turns completed';
COMMENT ON COLUMN workflow_conversations.timeout_at IS 'When this conversation expires if no reply received';
COMMENT ON COLUMN workflow_conversations.timeout_action IS 'What to do on timeout: end, retry, or goto_node';
COMMENT ON COLUMN workflow_conversations.context IS 'Accumulated outputs between turns for context preservation';

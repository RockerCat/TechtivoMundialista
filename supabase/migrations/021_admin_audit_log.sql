-- =====================================================================
-- Migration 021: Admin match audit log
--
-- Stores a row every time an admin changes a match's result or fixture
-- metadata. Written from server actions (not from SQL triggers) so the
-- admin_id is always the authenticated user who made the change.
-- =====================================================================

CREATE TABLE IF NOT EXISTS admin_match_audit (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id   UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  admin_id   UUID        NOT NULL REFERENCES auth.users(id),
  -- 'update_result'  → status / score change (may trigger scoring)
  -- 'update_fixture' → starts_at / group_code correction
  action     TEXT        NOT NULL CHECK (action IN ('update_result', 'update_fixture')),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_match_id   ON admin_match_audit(match_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_match_audit(created_at DESC);

ALTER TABLE admin_match_audit ENABLE ROW LEVEL SECURITY;

-- Admins can read the full audit log
CREATE POLICY "admin_select_audit" ON admin_match_audit
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Admins can insert their own audit rows
CREATE POLICY "admin_insert_audit" ON admin_match_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

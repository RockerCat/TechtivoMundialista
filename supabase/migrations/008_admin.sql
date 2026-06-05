-- =====================================================================
-- El VAR — Migration 008: Admin System
--
-- Adds:
--   • admin_users table — tracks which users have admin rights
--   • update_match_result RPC — SECURITY DEFINER function that lets
--     admins change match status and scores safely
-- =====================================================================

-- ── Admin users table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_users (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Users can check their own admin status; no one can see other rows
CREATE POLICY "users_select_own_admin_row" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- ── SECURITY DEFINER function — update match result ───────────────────
--
-- Only users in admin_users can call this effectively.
-- All writes go through here so the matches table needs no direct
-- write policies for admins.

CREATE OR REPLACE FUNCTION update_match_result(
  p_match_id   UUID,
  p_status     TEXT,
  p_home_score INT,
  p_away_score INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF p_status NOT IN ('scheduled', 'live', 'finished') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF p_home_score IS NOT NULL AND (p_home_score < 0 OR p_home_score > 30) THEN
    RAISE EXCEPTION 'invalid_scores';
  END IF;
  IF p_away_score IS NOT NULL AND (p_away_score < 0 OR p_away_score > 30) THEN
    RAISE EXCEPTION 'invalid_scores';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE id = p_match_id) THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  UPDATE matches
  SET
    status     = p_status,
    home_score = p_home_score,
    away_score = p_away_score
  WHERE id = p_match_id;
END;
$$;

REVOKE ALL     ON FUNCTION update_match_result(UUID, TEXT, INT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION update_match_result(UUID, TEXT, INT, INT) TO authenticated;

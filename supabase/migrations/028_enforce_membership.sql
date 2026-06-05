-- =====================================================================
-- Migration 028: Enforce group membership before any participation
--
-- 1. save_prediction_for_user — add group-membership check.
--    A user who created an account without an invite code will never
--    be in group_members, so this blocks them at the DB level.
--
-- 2. predictions RLS INSERT/UPDATE — add the same membership guard as
--    defense-in-depth behind the SECURITY DEFINER function.
--
-- 3. Audit query (commented) — find users without group membership.
-- =====================================================================

-- ── 1. save_prediction_for_user — group membership required ──────────

CREATE OR REPLACE FUNCTION save_prediction_for_user(
  p_match_id   UUID,
  p_home_score INT,
  p_away_score INT
)
RETURNS predictions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_match   matches%ROWTYPE;
  v_pred    predictions%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Admins manage the competition; they do not participate
  IF EXISTS (SELECT 1 FROM admin_users adm WHERE adm.user_id = v_user_id) THEN
    RAISE EXCEPTION 'admin_cannot_predict';
  END IF;

  -- Must be a group member (only invited users are added to group_members)
  IF NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.user_id = v_user_id) THEN
    RAISE EXCEPTION 'not_group_member';
  END IF;

  -- Soft-disabled users cannot predict
  IF EXISTS (SELECT 1 FROM user_profiles up
             WHERE up.user_id = v_user_id AND up.is_disabled = true) THEN
    RAISE EXCEPTION 'user_disabled';
  END IF;

  IF p_home_score < 0 OR p_home_score > 30
     OR p_away_score < 0 OR p_away_score > 30 THEN
    RAISE EXCEPTION 'invalid_scores';
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'match_not_found'; END IF;

  IF v_match.status <> 'scheduled' THEN
    RAISE EXCEPTION 'match_not_scheduled';
  END IF;

  IF NOW() >= v_match.starts_at THEN
    RAISE EXCEPTION 'match_started';
  END IF;

  INSERT INTO predictions (match_id, user_id, home_score, away_score, updated_at)
  VALUES (p_match_id, v_user_id, p_home_score, p_away_score, NOW())
  ON CONFLICT (match_id, user_id) DO UPDATE SET
    home_score = EXCLUDED.home_score,
    away_score = EXCLUDED.away_score,
    updated_at = NOW()
  RETURNING * INTO v_pred;

  RETURN v_pred;
END;
$$;

REVOKE ALL     ON FUNCTION save_prediction_for_user(UUID, INT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION save_prediction_for_user(UUID, INT, INT) TO authenticated;

-- ── 2. Tighten predictions RLS — add group membership guard ──────────

DROP POLICY IF EXISTS "users_insert_own_predictions" ON predictions;
DROP POLICY IF EXISTS "users_update_own_predictions" ON predictions;

CREATE POLICY "users_insert_own_predictions" ON predictions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM admin_users a   WHERE a.user_id   = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id  = auth.uid() AND up.is_disabled = true)
    AND EXISTS     (SELECT 1 FROM group_members gm WHERE gm.user_id  = auth.uid())
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE  m.id     = match_id
      AND    m.status = 'scheduled'
      AND    NOW()    < m.starts_at
    )
  );

CREATE POLICY "users_update_own_predictions" ON predictions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM admin_users a   WHERE a.user_id   = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.user_id  = auth.uid() AND up.is_disabled = true)
    AND EXISTS     (SELECT 1 FROM group_members gm WHERE gm.user_id  = auth.uid())
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE  m.id     = predictions.match_id
      AND    m.status = 'scheduled'
      AND    NOW()    < m.starts_at
    )
  );

-- ── 3. Audit query — run manually to find uninvited accounts ─────────
--
-- SELECT au.id, au.email, au.created_at
-- FROM   auth.users au
-- WHERE  NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.user_id = au.id)
--   AND  NOT EXISTS (SELECT 1 FROM admin_users   a  WHERE a.user_id  = au.id)
-- ORDER  BY au.created_at;
--
-- To soft-disable all uninvited users (REVIEW BEFORE RUNNING):
--
-- INSERT INTO user_profiles (user_id, is_disabled, disabled_at)
-- SELECT au.id, true, NOW()
-- FROM   auth.users au
-- WHERE  NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.user_id = au.id)
--   AND  NOT EXISTS (SELECT 1 FROM admin_users   a  WHERE a.user_id  = au.id)
-- ON CONFLICT (user_id) DO UPDATE SET is_disabled = true, disabled_at = NOW();

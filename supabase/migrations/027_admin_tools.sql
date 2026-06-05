-- =====================================================================
-- Migration 027: Admin operational tools
--
--  1. admin_activity_log   — general audit table (entity-agnostic)
--  2. get_match_predictions — view predictions for one match
--  3. recalculate_all_scores — re-run scoring for all finished matches
--  4. get_admin_activity_log — read log with admin display names
-- =====================================================================

-- ── 1. admin_activity_log ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id     UUID        NOT NULL REFERENCES auth.users(id),
  action       TEXT        NOT NULL, -- match_result | match_fixture | user_disable | user_enable | recalculate_scores
  entity_type  TEXT        NOT NULL, -- match | user | system
  entity_id    UUID        NOT NULL,
  entity_label TEXT,                 -- human-readable label stored at write time
  old_values   JSONB,
  new_values   JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_admin   ON admin_activity_log(admin_id);

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_activity_log" ON admin_activity_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "admin_insert_activity_log" ON admin_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ── 2. get_match_predictions ──────────────────────────────────────────
-- Returns every prediction submitted for a given match, with user info.

CREATE OR REPLACE FUNCTION get_match_predictions(p_match_id UUID)
RETURNS TABLE (
  user_id       UUID,
  display_name  TEXT,
  home_score    INT,
  away_score    INT,
  points        INT,
  points_reason TEXT,
  submitted_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users adm WHERE adm.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    COALESCE(au.raw_user_meta_data->>'username',
             SPLIT_PART(au.email, '@', 1))::TEXT   AS display_name,
    p.home_score,
    p.away_score,
    p.points,
    p.points_reason,
    p.created_at                                    AS submitted_at,
    p.updated_at
  FROM   predictions p
  JOIN   auth.users au ON au.id = p.user_id
  WHERE  p.match_id = p_match_id
  ORDER  BY p.created_at;
END;
$$;

REVOKE ALL     ON FUNCTION get_match_predictions(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_match_predictions(UUID) TO authenticated;

-- ── 3. recalculate_all_scores ─────────────────────────────────────────
-- Re-runs calculate_match_points() for every finished match.
-- Safe to call multiple times (scoring is idempotent).

CREATE OR REPLACE FUNCTION recalculate_all_scores()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match            matches%ROWTYPE;
  v_scored_this      INT;
  v_matches_done     INT := 0;
  v_predictions_done INT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users adm WHERE adm.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  FOR v_match IN
    SELECT * FROM matches
    WHERE  status     = 'finished'
      AND  home_score IS NOT NULL
      AND  away_score IS NOT NULL
  LOOP
    BEGIN
      v_scored_this      := calculate_match_points(v_match.id);
      v_matches_done     := v_matches_done     + 1;
      v_predictions_done := v_predictions_done + v_scored_this;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- skip any single match that fails
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'matches_processed',   v_matches_done,
    'predictions_scored',  v_predictions_done
  );
END;
$$;

REVOKE ALL     ON FUNCTION recalculate_all_scores() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION recalculate_all_scores() TO authenticated;

-- ── 4. get_admin_activity_log ─────────────────────────────────────────
-- Joins with auth.users to resolve admin display names.

CREATE OR REPLACE FUNCTION get_admin_activity_log(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id           UUID,
  admin_name   TEXT,
  action       TEXT,
  entity_type  TEXT,
  entity_label TEXT,
  old_values   JSONB,
  new_values   JSONB,
  created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users adm WHERE adm.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    COALESCE(au.raw_user_meta_data->>'username',
             SPLIT_PART(au.email, '@', 1))::TEXT     AS admin_name,
    al.action,
    al.entity_type,
    COALESCE(al.entity_label, al.entity_id::TEXT)::TEXT AS entity_label,
    al.old_values,
    al.new_values,
    al.created_at
  FROM   admin_activity_log al
  JOIN   auth.users au ON au.id = al.admin_id
  ORDER  BY al.created_at DESC
  LIMIT  p_limit;
END;
$$;

REVOKE ALL     ON FUNCTION get_admin_activity_log(INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_admin_activity_log(INT) TO authenticated;

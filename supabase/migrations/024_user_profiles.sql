-- =====================================================================
-- Migration 024: User profiles + admin exclusions
--
-- 1. user_profiles — soft-disable flag, avoids hard auth deletion
-- 2. get_admin_dashboard_stats() — SECURITY DEFINER for admin home card
-- 3. get_admin_user_list()       — SECURITY DEFINER for /admin/users
-- 4. save_prediction_for_user    — block disabled users
-- 5. get_group_leaderboard       — exclude disabled users from ranking
-- =====================================================================

-- ── 1. user_profiles ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_disabled BOOLEAN     NOT NULL DEFAULT false,
  disabled_at TIMESTAMPTZ,
  disabled_by UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_disabled
  ON user_profiles(is_disabled) WHERE is_disabled = true;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_select_profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "admin_update_profiles" ON user_profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

CREATE POLICY "admin_insert_profiles" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ── 2. get_admin_dashboard_stats ──────────────────────────────────────

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total_users',       (
        SELECT COUNT(DISTINCT gm.user_id)
        FROM   group_members gm
        WHERE  NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.user_id = gm.user_id)
      ),
      'active_users',      (
        SELECT COUNT(DISTINCT gm.user_id)
        FROM   group_members gm
        LEFT   JOIN user_profiles up ON up.user_id = gm.user_id
        WHERE  NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.user_id = gm.user_id)
          AND  COALESCE(up.is_disabled, false) = false
      ),
      'disabled_users',    (
        SELECT COUNT(*) FROM user_profiles WHERE is_disabled = true
      ),
      'total_predictions', (SELECT COUNT(*) FROM predictions),
      'matches_scheduled', (SELECT COUNT(*) FROM matches WHERE status = 'scheduled'),
      'matches_live',      (SELECT COUNT(*) FROM matches WHERE status = 'live'),
      'matches_finished',  (SELECT COUNT(*) FROM matches WHERE status = 'finished')
    )
  );
END;
$$;

REVOKE ALL     ON FUNCTION get_admin_dashboard_stats() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;

-- ── 3. get_admin_user_list ────────────────────────────────────────────
-- Joins auth.users (requires elevated access via SECURITY DEFINER) with
-- group membership, profile status, and prediction aggregates.

CREATE OR REPLACE FUNCTION get_admin_user_list()
RETURNS TABLE (
  user_id      UUID,
  display_name TEXT,
  email        TEXT,
  joined_at    TIMESTAMPTZ,
  is_disabled  BOOLEAN,
  total_points BIGINT,
  pred_count   BIGINT,
  exact_count  BIGINT,
  result_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT
    au.id                                                             AS user_id,
    COALESCE(au.raw_user_meta_data->>'username',
             SPLIT_PART(au.email, '@', 1))                           AS display_name,
    au.email                                                          AS email,
    au.created_at                                                     AS joined_at,
    COALESCE(up.is_disabled, false)                                   AS is_disabled,
    COALESCE(SUM(p.points), 0)::BIGINT                               AS total_points,
    COUNT(p.id)::BIGINT                                              AS pred_count,
    COUNT(p.id) FILTER (WHERE p.points_reason = 'Marcador exacto')::BIGINT  AS exact_count,
    COUNT(p.id) FILTER (WHERE p.points_reason = 'Resultado acertado')::BIGINT AS result_count
  FROM   auth.users au
  JOIN   group_members gm  ON gm.user_id = au.id
  LEFT   JOIN user_profiles up ON up.user_id = au.id
  LEFT   JOIN predictions   p  ON p.user_id  = au.id
  WHERE  NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.user_id = au.id)
  GROUP  BY au.id, au.email, au.raw_user_meta_data, au.created_at, up.is_disabled
  ORDER  BY COALESCE(up.is_disabled, false), au.created_at;
END;
$$;

REVOKE ALL     ON FUNCTION get_admin_user_list() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_admin_user_list() TO authenticated;

-- ── 4. save_prediction_for_user — block disabled users ────────────────

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

  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'admin_cannot_predict';
  END IF;

  IF EXISTS (SELECT 1 FROM user_profiles
             WHERE user_id = v_user_id AND is_disabled = true) THEN
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

-- ── 5. get_group_leaderboard — also exclude disabled users ────────────

CREATE OR REPLACE FUNCTION get_group_leaderboard(p_group_id UUID)
RETURNS TABLE (
  user_id      UUID,
  display_name TEXT,
  total_points BIGINT,
  exact_count  BIGINT,
  result_count BIGINT,
  pred_count   BIGINT,
  rank         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM group_members gm_check
    WHERE gm_check.group_id = p_group_id
      AND gm_check.user_id  = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_member';
  END IF;

  RETURN QUERY
  WITH member_scores AS (
    SELECT
      gm.user_id,
      COALESCE(au.raw_user_meta_data->>'username',
               SPLIT_PART(au.email, '@', 1))                        AS display_name,
      COALESCE(SUM(p.points), 0)                                     AS total_points,
      COUNT(*) FILTER (WHERE p.points_reason = 'Marcador exacto')    AS exact_count,
      COUNT(*) FILTER (WHERE p.points_reason = 'Resultado acertado') AS result_count,
      COUNT(p.id)                                                     AS pred_count
    FROM group_members gm
    JOIN auth.users au ON au.id = gm.user_id
    LEFT JOIN predictions p ON p.user_id = gm.user_id
    WHERE gm.group_id = p_group_id
      AND NOT EXISTS (SELECT 1 FROM admin_users  a  WHERE a.user_id  = gm.user_id)
      AND NOT EXISTS (SELECT 1 FROM user_profiles up
                      WHERE up.user_id = gm.user_id AND up.is_disabled = true)
    GROUP BY gm.user_id, au.email, au.raw_user_meta_data
  ),
  ranked AS (
    SELECT ms.*,
      RANK() OVER (
        ORDER BY ms.total_points DESC, ms.exact_count DESC, ms.result_count DESC
      )::BIGINT AS rank
    FROM member_scores ms
  )
  SELECT r.user_id, r.display_name, r.total_points,
         r.exact_count, r.result_count, r.pred_count, r.rank
  FROM ranked r
  ORDER BY r.rank, r.total_points DESC, r.display_name;
END;
$$;

REVOKE ALL     ON FUNCTION get_group_leaderboard(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_group_leaderboard(UUID) TO authenticated;

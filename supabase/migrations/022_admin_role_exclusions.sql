-- =====================================================================
-- Migration 022: Admin role exclusions
--
-- Enforces that admin users:
--   • CANNOT submit or modify predictions (save_prediction_for_user)
--   • DO NOT appear in leaderboards (get_group_leaderboard)
--   • DO NOT appear in rank previews (get_user_ranks_in_groups)
--   • DO NOT appear in activity feeds (get_group_recent_activity)
--
-- All changes are server-enforced (SECURITY DEFINER + RLS).
-- Client-side validation is secondary.
-- =====================================================================

-- ── 1. Harden predictions RLS — block admin inserts/updates ──────────
-- Drop and recreate both policies to add the NOT IN admin_users guard.

DROP POLICY IF EXISTS "users_insert_own_predictions" ON predictions;
DROP POLICY IF EXISTS "users_update_own_predictions" ON predictions;

CREATE POLICY "users_insert_own_predictions" ON predictions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.user_id = auth.uid())
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
    AND NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE  m.id     = predictions.match_id
      AND    m.status = 'scheduled'
      AND    NOW()    < m.starts_at
    )
  );

-- ── 2. save_prediction_for_user — block admin callers ────────────────
-- Adds an explicit admin check before any prediction is written.
-- Returns 'admin_cannot_predict' so the TypeScript client can show
-- a clear message: "El administrador no participa en la competencia."

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

  -- Admins manage the competition; they do not participate in it
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'admin_cannot_predict';
  END IF;

  IF p_home_score < 0 OR p_home_score > 30
     OR p_away_score < 0 OR p_away_score > 30 THEN
    RAISE EXCEPTION 'invalid_scores'
      USING HINT = 'Scores must be between 0 and 30';
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  IF v_match.status <> 'scheduled' THEN
    RAISE EXCEPTION 'match_not_scheduled'
      USING HINT = 'Predictions are only accepted for scheduled matches';
  END IF;

  IF NOW() >= v_match.starts_at THEN
    RAISE EXCEPTION 'match_started'
      USING HINT = 'Kickoff time has passed';
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

-- ── 3. get_group_leaderboard — exclude admin users from rankings ──────
-- Admins cannot appear in rankings or participant counts.
-- Also maintains the gm_check alias fix from migration 012.

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
      COALESCE(
        au.raw_user_meta_data->>'username',
        SPLIT_PART(au.email, '@', 1)
      )                                                               AS display_name,
      COALESCE(SUM(p.points), 0)                                      AS total_points,
      COUNT(*) FILTER (WHERE p.points_reason = 'Marcador exacto')     AS exact_count,
      COUNT(*) FILTER (WHERE p.points_reason = 'Resultado acertado')  AS result_count,
      COUNT(p.id)                                                      AS pred_count
    FROM group_members gm
    JOIN auth.users au ON au.id = gm.user_id
    LEFT JOIN predictions p ON p.user_id = gm.user_id
    WHERE gm.group_id = p_group_id
      -- Exclude admin users from all rankings and counts
      AND NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.user_id = gm.user_id)
    GROUP BY gm.user_id, au.email, au.raw_user_meta_data
  ),
  ranked AS (
    SELECT
      ms.*,
      RANK() OVER (
        ORDER BY ms.total_points DESC, ms.exact_count DESC, ms.result_count DESC
      )::BIGINT AS rank
    FROM member_scores ms
  )
  SELECT
    r.user_id,
    r.display_name,
    r.total_points,
    r.exact_count,
    r.result_count,
    r.pred_count,
    r.rank
  FROM ranked r
  ORDER BY r.rank, r.total_points DESC, r.display_name;
END;
$$;

REVOKE ALL     ON FUNCTION get_group_leaderboard(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_group_leaderboard(UUID) TO authenticated;

-- ── 4. get_user_ranks_in_groups — exclude admins from rank previews ───
-- Also maintains the alias fix from migration 012.

CREATE OR REPLACE FUNCTION get_user_ranks_in_groups()
RETURNS TABLE (
  group_id      UUID,
  user_rank     BIGINT,
  total_members BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH my_group_ids AS (
    SELECT gm.group_id
    FROM   group_members gm
    WHERE  gm.user_id = auth.uid()
  ),
  member_points AS (
    SELECT
      gm.group_id,
      gm.user_id,
      COALESCE(SUM(p.points), 0)                                      AS total_points,
      COUNT(*) FILTER (WHERE p.points_reason = 'Marcador exacto')     AS exact_count,
      COUNT(*) FILTER (WHERE p.points_reason = 'Resultado acertado')  AS result_count
    FROM group_members gm
    LEFT JOIN predictions p ON p.user_id = gm.user_id
    WHERE gm.group_id IN (SELECT group_id FROM my_group_ids)
      -- Exclude admins from rank calculations and member counts
      AND NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.user_id = gm.user_id)
    GROUP BY gm.group_id, gm.user_id
  ),
  ranked AS (
    SELECT
      mp.group_id,
      mp.user_id,
      RANK() OVER (
        PARTITION BY mp.group_id
        ORDER BY mp.total_points DESC, mp.exact_count DESC, mp.result_count DESC
      )::BIGINT                                        AS user_rank,
      COUNT(*) OVER (PARTITION BY mp.group_id)::BIGINT AS total_members
    FROM member_points mp
  )
  SELECT r.group_id, r.user_rank, r.total_members
  FROM   ranked r
  WHERE  r.user_id = auth.uid();
END;
$$;

REVOKE ALL     ON FUNCTION get_user_ranks_in_groups() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_user_ranks_in_groups() TO authenticated;

-- ── 5. get_group_recent_activity — exclude admin predictions ──────────
-- Admins have no predictions, so this is defensive but explicit.
-- Also maintains the gm_check alias fix from migration 012.

CREATE OR REPLACE FUNCTION get_group_recent_activity(
  p_group_id UUID,
  p_limit    INT DEFAULT 10
)
RETURNS TABLE (
  user_id          UUID,
  display_name     TEXT,
  pred_home        INT,
  pred_away        INT,
  points           INT,
  points_reason    TEXT,
  scored_at        TIMESTAMPTZ,
  match_home_score INT,
  match_away_score INT,
  home_team_name   TEXT,
  home_team_flag   TEXT,
  away_team_name   TEXT,
  away_team_flag   TEXT,
  match_stage      TEXT
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
  SELECT
    p.user_id,
    COALESCE(
      au.raw_user_meta_data->>'username',
      SPLIT_PART(au.email, '@', 1)
    )                     AS display_name,
    p.home_score          AS pred_home,
    p.away_score          AS pred_away,
    p.points,
    p.points_reason,
    p.scored_at,
    m.home_score          AS match_home_score,
    m.away_score          AS match_away_score,
    ht.name               AS home_team_name,
    ht.flag_emoji         AS home_team_flag,
    awt.name              AS away_team_name,
    awt.flag_emoji        AS away_team_flag,
    m.stage               AS match_stage
  FROM   predictions p
  JOIN   group_members gm  ON gm.user_id   = p.user_id
                          AND gm.group_id  = p_group_id
  JOIN   auth.users    au  ON au.id        = p.user_id
  JOIN   matches       m   ON m.id         = p.match_id
  JOIN   teams         ht  ON ht.id        = m.home_team_id
  JOIN   teams         awt ON awt.id       = m.away_team_id
  WHERE  p.scored_at IS NOT NULL
    AND  p.points    >  0
    -- Exclude any predictions from admin accounts
    AND  NOT EXISTS (SELECT 1 FROM admin_users a WHERE a.user_id = p.user_id)
  ORDER BY p.scored_at DESC
  LIMIT  p_limit;
END;
$$;

REVOKE ALL     ON FUNCTION get_group_recent_activity(UUID, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_group_recent_activity(UUID, INT) TO authenticated;

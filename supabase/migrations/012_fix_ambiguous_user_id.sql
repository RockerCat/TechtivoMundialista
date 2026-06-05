-- =====================================================================
-- Migration 012: Fix ambiguous "user_id" reference
--
-- Root cause: both get_group_leaderboard and get_group_recent_activity
-- declare a return column named "user_id" via RETURNS TABLE.  PostgreSQL
-- puts those OUT-parameter names in scope as local variables, making any
-- bare reference to "user_id" inside the function body ambiguous (42702)
-- when a FROM clause also exposes a column of the same name.
--
-- Fix: alias the membership-guard subquery so every reference to user_id
-- in the WHERE clause is unambiguously table-qualified (gm_check.user_id).
-- The RETURN QUERY body was already correctly aliased (gm.user_id,
-- p.user_id) and does not need changes.
-- =====================================================================

-- ── get_group_leaderboard ─────────────────────────────────────────────

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
  -- Alias the subquery so "user_id" is unambiguously gm_check.user_id,
  -- not the return-column variable of the same name.
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

-- ── get_group_recent_activity ─────────────────────────────────────────
-- Same fix: alias the membership-guard subquery.

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
  ORDER BY p.scored_at DESC
  LIMIT  p_limit;
END;
$$;

REVOKE ALL     ON FUNCTION get_group_recent_activity(UUID, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_group_recent_activity(UUID, INT) TO authenticated;

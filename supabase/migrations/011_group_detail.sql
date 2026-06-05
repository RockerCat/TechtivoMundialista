-- =====================================================================
-- El VAR — Migration 011: Group Detail Queries
--
-- Adds two read-only SECURITY DEFINER helpers used by the group detail
-- page and the dashboard card rank previews.
--
--   get_user_ranks_in_groups()
--     Returns (group_id, user_rank, total_members) for every group the
--     caller belongs to, in a single query. Used to show "Vas #1 de 3"
--     on dashboard group cards.
--
--   get_group_recent_activity(p_group_id, p_limit = 10)
--     Returns the last N scored predictions (points > 0) from all
--     members of the group, enriched with match and team data.
--     Requires caller to be a group member.
-- =====================================================================

-- ── get_user_ranks_in_groups ─────────────────────────────────────────

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
    GROUP BY gm.group_id, gm.user_id
  ),
  ranked AS (
    SELECT
      mp.group_id,
      mp.user_id,
      RANK() OVER (
        PARTITION BY mp.group_id
        ORDER BY mp.total_points DESC, mp.exact_count DESC, mp.result_count DESC
      )::BIGINT                                       AS user_rank,
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

-- ── get_group_recent_activity ─────────────────────────────────────────

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
    SELECT 1 FROM group_members
    WHERE  group_id = p_group_id AND user_id = auth.uid()
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

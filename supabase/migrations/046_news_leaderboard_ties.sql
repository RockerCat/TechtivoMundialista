-- =====================================================================
-- Fix: get_match_news_context leaderboard snapshot dropped tied
-- "perseguidores" (chasers) when more participants shared the
-- second-highest score than fit inside a row-count LIMIT 3.
--
-- The old query ordered by total_points DESC and cut off at 3 rows,
-- which is a row-count limit, not a rank-tier limit. Example: leader
-- (rank 1) + two players tied at rank 2 already fills the 3-row quota,
-- so a 3rd tied chaser at the same rank 2 would silently disappear.
--
-- Fix: keep every row belonging to rank 1 (leader tier) and the very
-- next rank (chaser tier), regardless of how many rows that is. The
-- cutoff changes from "first 3 rows" to "rank <= 2".
--
-- Also: the leader/chaser tie that the TS layer (buildBody) groups by
-- is total_points alone. The original RANK() broke ties by exact_count,
-- which could split two equal-point players across two different rank
-- values (e.g. rank 2 and rank 3) — exactly the kind of tie this fix
-- is meant to preserve. RANK() now orders strictly by total_points;
-- exact_count/display_name are only used to order entries *within* the
-- JSON array for stable display, never to compute the rank value.
-- =====================================================================

CREATE OR REPLACE FUNCTION get_match_news_context(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id     UUID;
  v_match        RECORD;
  v_pred_stats   RECORD;
  v_exact_names  TEXT[];
  v_winner_names TEXT[];
  v_leaderboard  JSONB;
BEGIN
  -- Main group: oldest by created_at (only group in practice)
  SELECT id INTO v_group_id
  FROM groups
  ORDER BY created_at ASC
  LIMIT 1;

  -- Match info joined with teams (placeholders as fallback)
  SELECT
    m.stage,
    m.home_score,
    m.away_score,
    m.group_code,
    m.match_number,
    m.venue,
    COALESCE(ht.name,       m.home_placeholder, 'Equipo local')      AS home_name,
    COALESCE(ht.code,       m.home_placeholder, '?')                 AS home_code,
    COALESCE(ht.flag_emoji, '🏳️')                                   AS home_flag,
    COALESCE(at.name,       m.away_placeholder, 'Equipo visitante')  AS away_name,
    COALESCE(at.code,       m.away_placeholder, '?')                 AS away_code,
    COALESCE(at.flag_emoji, '🏳️')                                   AS away_flag
  INTO v_match
  FROM matches m
  LEFT JOIN teams ht ON ht.id = m.home_team_id
  LEFT JOIN teams at ON at.id = m.away_team_id
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Prediction counts for this match
  SELECT
    COUNT(*)                                                    AS total_preds,
    COUNT(*) FILTER (WHERE points_reason = 'Marcador exacto')   AS exact_count,
    COUNT(*) FILTER (WHERE points_reason = 'Resultado acertado') AS winner_count,
    COUNT(*) FILTER (WHERE points = 0)                          AS zero_count
  INTO v_pred_stats
  FROM predictions
  WHERE match_id = p_match_id;

  -- Display names of users who got exact score (up to 3, in order of submission)
  SELECT ARRAY(
    SELECT COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1))
    FROM   predictions p
    JOIN   auth.users  au ON au.id = p.user_id
    WHERE  p.match_id      = p_match_id
      AND  p.points_reason = 'Marcador exacto'
    ORDER  BY p.scored_at ASC
    LIMIT  3
  ) INTO v_exact_names;

  -- Display names of users who got the result (winner, up to 3)
  SELECT ARRAY(
    SELECT COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1))
    FROM   predictions p
    JOIN   auth.users  au ON au.id = p.user_id
    WHERE  p.match_id      = p_match_id
      AND  p.points_reason = 'Resultado acertado'
    ORDER  BY p.scored_at ASC
    LIMIT  3
  ) INTO v_winner_names;

  -- Leader-tier + chaser-tier leaderboard snapshot for the main group.
  -- Admins excluded. Rank is based on total_points ONLY, so two players
  -- with equal points always land on the same rank — exact_count is
  -- used solely to order entries within the returned JSON array, never
  -- to break the rank itself. Returns ALL rows at rank 1 and rank 2
  -- (not a fixed row count), so ties at either tier are never truncated.
  IF v_group_id IS NOT NULL THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'display_name', r.display_name,
        'total_points', r.total_points,
        'rank',         r.rank
      )
      ORDER BY r.rank, r.exact_count DESC, r.display_name
    )
    INTO v_leaderboard
    FROM (
      SELECT
        display_name,
        total_points,
        exact_count,
        rank
      FROM (
        SELECT
          COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1))
                                                       AS display_name,
          COALESCE(SUM(pred.points), 0)::BIGINT        AS total_points,
          COUNT(*) FILTER (WHERE pred.points_reason = 'Marcador exacto')
                                                       AS exact_count,
          RANK() OVER (
            ORDER BY COALESCE(SUM(pred.points), 0) DESC
          )                                            AS rank
        FROM       group_members gm
        JOIN       auth.users    au   ON au.id   = gm.user_id
        LEFT JOIN  predictions   pred ON pred.user_id = gm.user_id
        WHERE gm.group_id = v_group_id
          AND NOT EXISTS (
                SELECT 1 FROM admin_users a WHERE a.user_id = gm.user_id
              )
        GROUP BY gm.user_id, au.email, au.raw_user_meta_data
      ) ranked
      WHERE ranked.rank <= 2
    ) r;
  END IF;

  RETURN jsonb_build_object(
    'match_id',     p_match_id,
    'stage',        v_match.stage,
    'home_score',   v_match.home_score,
    'away_score',   v_match.away_score,
    'home_name',    v_match.home_name,
    'home_code',    v_match.home_code,
    'home_flag',    v_match.home_flag,
    'away_name',    v_match.away_name,
    'away_code',    v_match.away_code,
    'away_flag',    v_match.away_flag,
    'group_code',   v_match.group_code,
    'match_number', v_match.match_number,
    'venue',        v_match.venue,
    'total_preds',  COALESCE(v_pred_stats.total_preds,  0),
    'exact_count',  COALESCE(v_pred_stats.exact_count,  0),
    'winner_count', COALESCE(v_pred_stats.winner_count, 0),
    'zero_count',   COALESCE(v_pred_stats.zero_count,   0),
    'exact_names',  to_jsonb(COALESCE(v_exact_names,  ARRAY[]::TEXT[])),
    'winner_names', to_jsonb(COALESCE(v_winner_names, ARRAY[]::TEXT[])),
    'leaderboard',  COALESCE(v_leaderboard, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL     ON FUNCTION get_match_news_context(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_match_news_context(UUID) TO authenticated;

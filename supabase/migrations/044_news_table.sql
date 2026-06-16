-- =====================================================================
-- Migration 044: Match News
--
-- Changes:
--   1. CREATE TABLE news — one row per match (UNIQUE on match_id)
--   2. Grants + RLS (SELECT for all authenticated, INSERT for admins)
--   3. RPC get_match_news_context(p_match_id) — returns all data
--      needed for deterministic news generation:
--        · match info (teams, scores, stage)
--        · prediction stats (total, exact, winner, zero counts + names)
--        · top-3 leaderboard snapshot for the main group
-- =====================================================================

-- ── 1. Table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS news (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  headline    TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  -- Deterministic label used by the frontend to pick a static editorial
  -- image (e.g. 'home_win', 'draw', 'goal_fest', 'exacto_fest').
  -- No external API involved — value is computed by TypeScript templates.
  image_type  TEXT        NOT NULL DEFAULT 'default',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- DB-level deduplication: only one news post per match.
  CONSTRAINT news_match_unique UNIQUE (match_id)
);

CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);

-- ── 2. Grants ────────────────────────────────────────────────────────

GRANT SELECT, INSERT ON TABLE news TO authenticated;

-- ── 3. RLS ───────────────────────────────────────────────────────────

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read news
CREATE POLICY "news_select_authenticated"
  ON news FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert news (INSERT policy matches admin_activity_log pattern)
CREATE POLICY "news_insert_admin"
  ON news FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ── 4. RPC: get_match_news_context ───────────────────────────────────
--
-- Returns a JSONB object with everything the TypeScript layer needs
-- to generate headline, body, and image_type without any external call.
--
-- Contexts returned:
--   match      → teams, scores, stage, group_code, match_number, venue
--   pred_stats → total_preds, exact_count, winner_count, zero_count
--   names      → exact_names[], winner_names[] (up to 3 each)
--   leaderboard → top-3 ranked entries for the main group (oldest group)
--
-- "Main group" = oldest group by created_at. In Pollita Techtivo there
-- is typically one group; this query degrades gracefully if none exists.
--
-- SECURITY DEFINER: allows joining auth.users without exposing it via
-- a direct SELECT policy on the authenticated role.

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

  -- Top-3 leaderboard snapshot for the main group
  -- Admins excluded; ties broken by exact_count then display_name
  IF v_group_id IS NOT NULL THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'display_name', r.display_name,
        'total_points', r.total_points,
        'rank',         r.rank
      )
    )
    INTO v_leaderboard
    FROM (
      SELECT
        COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1))
                                                     AS display_name,
        COALESCE(SUM(pred.points), 0)::BIGINT        AS total_points,
        RANK() OVER (
          ORDER BY COALESCE(SUM(pred.points), 0) DESC,
                   COUNT(*) FILTER (WHERE pred.points_reason = 'Marcador exacto') DESC
        )                                            AS rank
      FROM       group_members gm
      JOIN       auth.users    au   ON au.id   = gm.user_id
      LEFT JOIN  predictions   pred ON pred.user_id = gm.user_id
      WHERE gm.group_id = v_group_id
        AND NOT EXISTS (
              SELECT 1 FROM admin_users a WHERE a.user_id = gm.user_id
            )
      GROUP BY gm.user_id, au.email, au.raw_user_meta_data
      ORDER BY total_points DESC
      LIMIT 3
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

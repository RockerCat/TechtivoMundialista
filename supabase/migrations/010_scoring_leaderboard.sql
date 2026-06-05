-- =====================================================================
-- El VAR — Migration 010: Scoring + Leaderboard
--
-- Changes:
--   1. Add points/points_reason/scored_at columns to predictions
--   2. calculate_match_points() — scores all predictions for one match
--   3. Rebuild update_match_result() — calls scoring when finished
--      (return type changes void→JSONB, so we DROP + RECREATE)
--   4. get_group_leaderboard() — returns ranked member scores,
--      enforcing membership via auth.uid()
-- =====================================================================

-- ── 1. Predictions: add scoring columns ──────────────────────────────

ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS points        INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_reason TEXT,
  ADD COLUMN IF NOT EXISTS scored_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_predictions_user_points
  ON predictions(user_id, points);

-- ── 2. calculate_match_points ─────────────────────────────────────────
--
-- Idempotent: safe to call multiple times (re-scores on every call).
-- Returns the number of predictions updated.
-- Called internally by update_match_result — not exposed directly.

CREATE OR REPLACE FUNCTION calculate_match_points(p_match_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match   matches%ROWTYPE;
  v_exact   INT;
  v_result  INT;
  v_updated INT;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;

  IF NOT FOUND
     OR v_match.status     <> 'finished'
     OR v_match.home_score IS NULL
     OR v_match.away_score IS NULL
  THEN
    RAISE EXCEPTION 'match_not_scorable';
  END IF;

  -- ── Points table by stage ──────────────────────────────────────────
  v_exact := CASE v_match.stage
    WHEN 'group'         THEN 3
    WHEN 'round_of_32'   THEN 4
    WHEN 'round_of_16'   THEN 5
    WHEN 'quarter_final' THEN 6
    WHEN 'semi_final'    THEN 7
    WHEN 'third_place'   THEN 7
    WHEN 'final'         THEN 8
    ELSE 3
  END;
  v_result := CASE v_match.stage
    WHEN 'group'         THEN 1
    WHEN 'round_of_32'   THEN 2
    WHEN 'round_of_16'   THEN 3
    WHEN 'quarter_final' THEN 4
    WHEN 'semi_final'    THEN 5
    WHEN 'third_place'   THEN 5
    WHEN 'final'         THEN 6
    ELSE 1
  END;

  UPDATE predictions p
  SET
    points = CASE
      -- Exact score wins; does NOT also earn result points
      WHEN p.home_score = v_match.home_score
       AND p.away_score = v_match.away_score
        THEN v_exact
      -- Correct result: home win / away win / draw
      WHEN (p.home_score > p.away_score AND v_match.home_score > v_match.away_score)
        OR (p.home_score < p.away_score AND v_match.home_score < v_match.away_score)
        OR (p.home_score = p.away_score AND v_match.home_score = v_match.away_score)
        THEN v_result
      ELSE 0
    END,
    points_reason = CASE
      WHEN p.home_score = v_match.home_score
       AND p.away_score = v_match.away_score
        THEN 'Marcador exacto'
      WHEN (p.home_score > p.away_score AND v_match.home_score > v_match.away_score)
        OR (p.home_score < p.away_score AND v_match.home_score < v_match.away_score)
        OR (p.home_score = p.away_score AND v_match.home_score = v_match.away_score)
        THEN 'Resultado acertado'
      ELSE 'Sin puntos'
    END,
    scored_at = NOW()
  WHERE p.match_id = p_match_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- Not exposed to users — only called by update_match_result
REVOKE ALL ON FUNCTION calculate_match_points(UUID) FROM PUBLIC;

-- ── 3. Rebuild update_match_result ────────────────────────────────────
--
-- Return type changes void → JSONB so we can report { scored: N }.
-- PostgreSQL does not allow changing a function's return type via
-- CREATE OR REPLACE, so we drop and recreate.

DROP FUNCTION IF EXISTS update_match_result(UUID, TEXT, INT, INT);

CREATE FUNCTION update_match_result(
  p_match_id   UUID,
  p_status     TEXT,
  p_home_score INT,
  p_away_score INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_scored  INT := 0;
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

  -- Score all predictions when match is finished with valid scores
  IF p_status = 'finished'
     AND p_home_score IS NOT NULL
     AND p_away_score IS NOT NULL
  THEN
    v_scored := calculate_match_points(p_match_id);
  END IF;

  RETURN jsonb_build_object('scored', v_scored);
END;
$$;

REVOKE ALL     ON FUNCTION update_match_result(UUID, TEXT, INT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION update_match_result(UUID, TEXT, INT, INT) TO authenticated;

-- ── 4. get_group_leaderboard ─────────────────────────────────────────
--
-- Returns ranked members for a group.
-- Security: auth.uid() must be a member of p_group_id.
-- Points come from ALL matches globally (groups are for comparison only).

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
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
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

-- =====================================================================
-- El VAR — Migration 050: Fix third-place match scoring
--
-- The "third place" match was being scored like a semi-final (7/5).
-- It belongs to the final's scoring tier — same as the Final (8/6).
-- Re-declares calculate_match_points() with the corrected points table.
-- Idempotent: safe to re-run; existing predictions are re-scored via
-- the admin "recalculate scores" action (recalculate_all_scores, see
-- migration 027_admin_tools.sql), which calls this function per match.
-- =====================================================================

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
    WHEN 'third_place'   THEN 8
    WHEN 'final'         THEN 8
    ELSE 3
  END;
  v_result := CASE v_match.stage
    WHEN 'group'         THEN 1
    WHEN 'round_of_32'   THEN 2
    WHEN 'round_of_16'   THEN 3
    WHEN 'quarter_final' THEN 4
    WHEN 'semi_final'    THEN 5
    WHEN 'third_place'   THEN 6
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

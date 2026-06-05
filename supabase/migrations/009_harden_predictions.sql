-- =====================================================================
-- El VAR — Migration 009: Harden prediction security
--
-- Changes:
--   1. save_prediction_for_user — two separate exceptions so the client
--      gets a precise reason code, not a generic "match_closed":
--        match_not_scheduled  → status is not 'scheduled'
--        match_started        → NOW() >= starts_at (kickoff already happened)
--      Removes the old 5-minute pre-kickoff buffer; the backend and
--      frontend now agree on exactly one cutoff: starts_at.
--
--   2. predictions RLS INSERT / UPDATE policies — aligned to match:
--        status = 'scheduled' AND NOW() < starts_at
--      Previously they only checked the time window (with the buffer)
--      and had no status guard.  These are a secondary defence behind
--      the SECURITY DEFINER function, but should be consistent.
-- =====================================================================

-- ── 1. Update RLS policies on predictions ────────────────────────────

DROP POLICY IF EXISTS "users_insert_own_predictions" ON predictions;
DROP POLICY IF EXISTS "users_update_own_predictions" ON predictions;

CREATE POLICY "users_insert_own_predictions" ON predictions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
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
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE  m.id     = predictions.match_id
      AND    m.status = 'scheduled'
      AND    NOW()    < m.starts_at
    )
  );

-- ── 2. Replace save_prediction_for_user ──────────────────────────────

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

  IF p_home_score < 0 OR p_home_score > 30
     OR p_away_score < 0 OR p_away_score > 30 THEN
    RAISE EXCEPTION 'invalid_scores'
      USING HINT = 'Scores must be between 0 and 30';
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  -- Status guard: only 'scheduled' matches accept predictions
  IF v_match.status <> 'scheduled' THEN
    RAISE EXCEPTION 'match_not_scheduled'
      USING HINT = 'Predictions are only accepted for scheduled matches';
  END IF;

  -- Time guard: kickoff must not have started yet
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

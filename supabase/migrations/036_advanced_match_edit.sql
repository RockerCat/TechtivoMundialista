-- =====================================================================
-- Migration 036: Admin advanced match edit
--
-- Adds a SECURITY DEFINER function that lets admins update all writable
-- fields of a match in one atomic operation.
--
-- Designed as a SECURITY DEFINER bypass (same pattern as
-- update_match_result) so the matches table needs no direct UPDATE
-- policy for authenticated users.
--
-- Validates:
--   • caller is in admin_users
--   • match exists
--   • status / stage are within allowed enum values
--   • both team IDs are not the same (when non-null)
--   • finished status requires non-null scores
--   • scores are in 0–30 range
-- =====================================================================

CREATE OR REPLACE FUNCTION admin_edit_match_full(
  p_match_id         UUID,
  p_home_team_id     UUID,
  p_away_team_id     UUID,
  p_home_placeholder TEXT,
  p_away_placeholder TEXT,
  p_starts_at        TIMESTAMPTZ,
  p_stage            TEXT,
  p_status           TEXT,
  p_home_score       INT,
  p_away_score       INT,
  p_group_code       TEXT,
  p_match_number     INT,
  p_venue            TEXT
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

  IF NOT EXISTS (SELECT 1 FROM matches WHERE id = p_match_id) THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  IF p_status NOT IN ('scheduled', 'live', 'finished') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF p_stage NOT IN ('group', 'round_of_32', 'round_of_16', 'quarter_final',
                     'semi_final', 'third_place', 'final') THEN
    RAISE EXCEPTION 'invalid_stage';
  END IF;

  -- Both team IDs present and identical → reject
  IF p_home_team_id IS NOT NULL
     AND p_away_team_id IS NOT NULL
     AND p_home_team_id = p_away_team_id THEN
    RAISE EXCEPTION 'same_team_both_sides';
  END IF;

  -- Finished match requires both scores
  IF p_status = 'finished'
     AND (p_home_score IS NULL OR p_away_score IS NULL) THEN
    RAISE EXCEPTION 'finished_requires_scores';
  END IF;

  -- Score range validation
  IF p_home_score IS NOT NULL AND (p_home_score < 0 OR p_home_score > 30) THEN
    RAISE EXCEPTION 'invalid_scores';
  END IF;
  IF p_away_score IS NOT NULL AND (p_away_score < 0 OR p_away_score > 30) THEN
    RAISE EXCEPTION 'invalid_scores';
  END IF;

  -- Apply update — if a real team is assigned, clear its placeholder
  UPDATE matches
  SET
    home_team_id     = p_home_team_id,
    away_team_id     = p_away_team_id,
    home_placeholder = CASE WHEN p_home_team_id IS NOT NULL THEN NULL
                            ELSE p_home_placeholder END,
    away_placeholder = CASE WHEN p_away_team_id IS NOT NULL THEN NULL
                            ELSE p_away_placeholder END,
    starts_at        = p_starts_at,
    stage            = p_stage,
    status           = p_status,
    home_score       = p_home_score,
    away_score       = p_away_score,
    group_code       = p_group_code,
    match_number     = p_match_number,
    venue            = p_venue
  WHERE id = p_match_id;

  -- Re-calculate points if now finished with scores
  IF p_status = 'finished'
     AND p_home_score IS NOT NULL
     AND p_away_score IS NOT NULL THEN
    BEGIN
      v_scored := calculate_match_points(p_match_id);
    EXCEPTION WHEN OTHERS THEN
      v_scored := 0; -- scoring failure never blocks the edit
    END;
  END IF;

  RETURN jsonb_build_object('scored', v_scored);
END;
$$;

REVOKE ALL ON FUNCTION admin_edit_match_full(
  UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, INT, INT, TEXT, INT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION admin_edit_match_full(
  UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, INT, INT, TEXT, INT, TEXT
) TO authenticated;

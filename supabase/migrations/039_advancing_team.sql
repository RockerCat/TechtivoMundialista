-- =====================================================================
-- Migration 039: Advancing team for knockout penalty shootouts
--
-- Adds advancing_team_id to matches.
--
-- Purpose
-- ───────
-- In knockout matches that finish level (e.g. Argentina 1–1 France,
-- decided 4–2 on penalties), the scoring system evaluates ONLY the
-- 90+extra-time scoreline (1–1). advancing_team_id records which team
-- actually advanced to the next round — for bracket/display only.
--
-- Scoring guarantee
-- ─────────────────
-- calculate_match_points() uses ONLY home_score and away_score.
-- advancing_team_id is NEVER read by any scoring function.
-- This column is purely informational.
--
-- Validation
-- ──────────
-- update_match_result   — requires advancing_team_id when finishing a
--                         tied knockout match (stage ≠ 'group').
-- admin_edit_match_full — same validation via p_stage parameter.
-- =====================================================================

-- ── 1. Add column ────────────────────────────────────────────────────

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS advancing_team_id UUID REFERENCES teams(id);

-- ── 2. Rebuild update_match_result ───────────────────────────────────
-- Signature changes: add p_advancing_team_id UUID DEFAULT NULL.
-- Must DROP + RECREATE because PostgreSQL won't allow adding parameters
-- via CREATE OR REPLACE when the old overload exists.

DROP FUNCTION IF EXISTS update_match_result(UUID, TEXT, INT, INT);

CREATE FUNCTION update_match_result(
  p_match_id          UUID,
  p_status            TEXT,
  p_home_score        INT,
  p_away_score        INT,
  p_advancing_team_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_match   matches%ROWTYPE;
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

  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  -- Knockout tie finished without an advancing team → reject
  IF p_status = 'finished'
     AND p_home_score IS NOT NULL
     AND p_away_score IS NOT NULL
     AND p_home_score = p_away_score
     AND v_match.stage <> 'group'
     AND p_advancing_team_id IS NULL
  THEN
    RAISE EXCEPTION 'advancing_team_required';
  END IF;

  -- advancing_team_id must belong to this match
  IF p_advancing_team_id IS NOT NULL
     AND v_match.home_team_id IS NOT NULL
     AND v_match.away_team_id IS NOT NULL
  THEN
    IF p_advancing_team_id <> v_match.home_team_id
       AND p_advancing_team_id <> v_match.away_team_id THEN
      RAISE EXCEPTION 'invalid_advancing_team';
    END IF;
  END IF;

  UPDATE matches
  SET
    status            = p_status,
    home_score        = p_home_score,
    away_score        = p_away_score,
    advancing_team_id = p_advancing_team_id
  WHERE id = p_match_id;

  -- Score predictions when finishing.
  -- calculate_match_points uses ONLY home_score/away_score — never advancing_team_id.
  IF p_status = 'finished'
     AND p_home_score IS NOT NULL
     AND p_away_score IS NOT NULL
  THEN
    v_scored := calculate_match_points(p_match_id);
  END IF;

  RETURN jsonb_build_object('scored', v_scored);
END;
$$;

REVOKE ALL     ON FUNCTION update_match_result(UUID, TEXT, INT, INT, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION update_match_result(UUID, TEXT, INT, INT, UUID) TO authenticated;

-- ── 3. Rebuild admin_edit_match_full ─────────────────────────────────
-- Add p_advancing_team_id UUID DEFAULT NULL. Same DROP + RECREATE pattern.

DROP FUNCTION IF EXISTS admin_edit_match_full(
  UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, INT, INT, TEXT, INT, TEXT
);

CREATE FUNCTION admin_edit_match_full(
  p_match_id          UUID,
  p_home_team_id      UUID,
  p_away_team_id      UUID,
  p_home_placeholder  TEXT,
  p_away_placeholder  TEXT,
  p_starts_at         TIMESTAMPTZ,
  p_stage             TEXT,
  p_status            TEXT,
  p_home_score        INT,
  p_away_score        INT,
  p_group_code        TEXT,
  p_match_number      INT,
  p_venue             TEXT,
  p_advancing_team_id UUID DEFAULT NULL
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

  IF p_home_team_id IS NOT NULL
     AND p_away_team_id IS NOT NULL
     AND p_home_team_id = p_away_team_id THEN
    RAISE EXCEPTION 'same_team_both_sides';
  END IF;

  IF p_status = 'finished'
     AND (p_home_score IS NULL OR p_away_score IS NULL) THEN
    RAISE EXCEPTION 'finished_requires_scores';
  END IF;

  IF p_home_score IS NOT NULL AND (p_home_score < 0 OR p_home_score > 30) THEN
    RAISE EXCEPTION 'invalid_scores';
  END IF;
  IF p_away_score IS NOT NULL AND (p_away_score < 0 OR p_away_score > 30) THEN
    RAISE EXCEPTION 'invalid_scores';
  END IF;

  -- Knockout tie requires advancing team
  IF p_status = 'finished'
     AND p_home_score IS NOT NULL
     AND p_away_score IS NOT NULL
     AND p_home_score = p_away_score
     AND p_stage <> 'group'
     AND p_advancing_team_id IS NULL
  THEN
    RAISE EXCEPTION 'advancing_team_required';
  END IF;

  -- advancing_team_id must belong to this match (when both teams are known)
  IF p_advancing_team_id IS NOT NULL
     AND p_home_team_id IS NOT NULL
     AND p_away_team_id IS NOT NULL
  THEN
    IF p_advancing_team_id <> p_home_team_id
       AND p_advancing_team_id <> p_away_team_id THEN
      RAISE EXCEPTION 'invalid_advancing_team';
    END IF;
  END IF;

  UPDATE matches
  SET
    home_team_id      = p_home_team_id,
    away_team_id      = p_away_team_id,
    home_placeholder  = CASE WHEN p_home_team_id IS NOT NULL THEN NULL
                             ELSE p_home_placeholder END,
    away_placeholder  = CASE WHEN p_away_team_id IS NOT NULL THEN NULL
                             ELSE p_away_placeholder END,
    starts_at         = p_starts_at,
    stage             = p_stage,
    status            = p_status,
    home_score        = p_home_score,
    away_score        = p_away_score,
    group_code        = p_group_code,
    match_number      = p_match_number,
    venue             = p_venue,
    advancing_team_id = p_advancing_team_id
  WHERE id = p_match_id;

  -- Score predictions when finishing.
  -- calculate_match_points uses ONLY home_score/away_score — never advancing_team_id.
  IF p_status = 'finished'
     AND p_home_score IS NOT NULL
     AND p_away_score IS NOT NULL THEN
    BEGIN
      v_scored := calculate_match_points(p_match_id);
    EXCEPTION WHEN OTHERS THEN
      v_scored := 0;
    END;
  END IF;

  RETURN jsonb_build_object('scored', v_scored);
END;
$$;

REVOKE ALL ON FUNCTION admin_edit_match_full(
  UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, INT, INT, TEXT, INT, TEXT, UUID
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION admin_edit_match_full(
  UUID, UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, INT, INT, TEXT, INT, TEXT, UUID
) TO authenticated;

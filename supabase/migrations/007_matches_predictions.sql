-- =====================================================================
-- El VAR — Migration 007: Teams, Matches, Predictions
-- (User requested naming: 003_matches_predictions — renamed to 007 to
-- avoid conflict with existing 003_fix_insert_rls.sql)
--
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================================

-- ── Tables ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teams (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  code        TEXT        NOT NULL UNIQUE,
  flag_emoji  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  home_team_id  UUID        NOT NULL REFERENCES teams(id),
  away_team_id  UUID        NOT NULL REFERENCES teams(id),
  starts_at     TIMESTAMPTZ NOT NULL,
  stage         TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('scheduled', 'live', 'finished')),
  home_score    INT         NULL,
  away_score    INT         NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT matches_different_teams CHECK (home_team_id <> away_team_id)
);

CREATE TABLE IF NOT EXISTS predictions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id    UUID        NOT NULL REFERENCES matches(id)      ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  home_score  INT         NOT NULL CHECK (home_score >= 0 AND home_score <= 30),
  away_score  INT         NOT NULL CHECK (away_score >= 0 AND away_score <= 30),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (match_id, user_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_matches_starts_at    ON matches(starts_at);
CREATE INDEX IF NOT EXISTS idx_matches_status       ON matches(status);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id  ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);

-- ── Row Level Security ────────────────────────────────────────────────

ALTER TABLE teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- teams: any authenticated user can read
CREATE POLICY "authenticated_read_teams" ON teams
  FOR SELECT TO authenticated USING (true);

-- matches: any authenticated user can read
CREATE POLICY "authenticated_read_matches" ON matches
  FOR SELECT TO authenticated USING (true);

-- predictions: users can only see their own rows
CREATE POLICY "users_select_own_predictions" ON predictions
  FOR SELECT USING (auth.uid() = user_id);

-- predictions: insert own row, only before deadline
CREATE POLICY "users_insert_own_predictions" ON predictions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE  m.id = match_id
      AND    NOW() < m.starts_at - INTERVAL '5 minutes'
    )
  );

-- predictions: update own row, only before deadline
CREATE POLICY "users_update_own_predictions" ON predictions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE  m.id = predictions.match_id
      AND    NOW() < m.starts_at - INTERVAL '5 minutes'
    )
  );

-- ── SECURITY DEFINER function — save (upsert) prediction ─────────────
--
-- Bypasses RLS INSERT/UPDATE policies to avoid the auth.uid() = NULL
-- issue that affects direct table writes from Server Actions.
-- Security is enforced inside the function:
--   - Validates auth.uid() is not NULL
--   - Validates scores are in range
--   - Validates match exists and deadline has not passed

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

  IF v_match.status = 'finished'
     OR NOW() >= v_match.starts_at - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'match_closed'
      USING HINT = 'Prediction deadline has passed';
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

-- ── Seed data ─────────────────────────────────────────────────────────
-- Fixed UUIDs so the seed is idempotent (safe to re-run).
-- Uses dates relative to 2026-05-28 (app development date):
--   yesterday → finished match (predictions locked)
--   +1 day    → upcoming (open for predictions)
--   +3 days   → upcoming
--   +10 days  → upcoming (group stage)

INSERT INTO teams (id, name, code, flag_emoji) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Colombia',   'COL', '🇨🇴'),
  ('a0000000-0000-0000-0000-000000000002', 'Argentina',  'ARG', '🇦🇷'),
  ('a0000000-0000-0000-0000-000000000003', 'Brasil',     'BRA', '🇧🇷'),
  ('a0000000-0000-0000-0000-000000000004', 'México',     'MEX', '🇲🇽'),
  ('a0000000-0000-0000-0000-000000000005', 'España',     'ESP', '🇪🇸'),
  ('a0000000-0000-0000-0000-000000000006', 'Uruguay',    'URU', '🇺🇾'),
  ('a0000000-0000-0000-0000-000000000007', 'Alemania',   'GER', '🇩🇪'),
  ('a0000000-0000-0000-0000-000000000008', 'Francia',    'FRA', '🇫🇷')
ON CONFLICT (code) DO NOTHING;

INSERT INTO matches (id, home_team_id, away_team_id, starts_at, stage, status, home_score, away_score)
VALUES
  -- Finished match — result already set, predictions locked
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000005',  -- España
    'a0000000-0000-0000-0000-000000000001',  -- Colombia
    '2026-05-27 20:00:00+00',
    'group', 'finished', 1, 0
  ),
  -- Tomorrow — open for predictions
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',  -- Brasil
    'a0000000-0000-0000-0000-000000000002',  -- Argentina
    '2026-05-29 18:00:00+00',
    'group', 'scheduled', NULL, NULL
  ),
  -- In 3 days — open
  (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',  -- Colombia
    'a0000000-0000-0000-0000-000000000004',  -- México
    '2026-05-31 20:00:00+00',
    'group', 'scheduled', NULL, NULL
  ),
  -- In 5 days — open
  (
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000006',  -- Uruguay
    'a0000000-0000-0000-0000-000000000008',  -- Francia
    '2026-06-02 18:00:00+00',
    'group', 'scheduled', NULL, NULL
  ),
  -- In 10 days — open
  (
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000002',  -- Argentina
    'a0000000-0000-0000-0000-000000000007',  -- Alemania
    '2026-06-07 20:00:00+00',
    'group', 'scheduled', NULL, NULL
  )
ON CONFLICT (id) DO NOTHING;

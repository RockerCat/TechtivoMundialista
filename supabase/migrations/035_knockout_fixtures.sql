-- =====================================================================
-- Migration 035: FIFA World Cup 2026 — Knockout Stage Fixtures
-- 32 matches · M73–M104 (includes third-place playoff M103)
--
-- Schema changes
-- ──────────────
-- • home_team_id / away_team_id   → DROP NOT NULL  (teams unknown until
--                                   group stage resolves)
-- • match_number  INT             → new nullable column, UNIQUE, used as
--                                   idempotency key for ON CONFLICT
-- • home_placeholder / away_placeholder  TEXT  → bracket-slot labels
--                                   e.g. "Runner-up Group A"
-- • venue         TEXT            → stadium + city string
--
-- Idempotency
-- ───────────
-- ON CONFLICT (match_number) DO NOTHING — safe to re-run.
-- Group-stage rows (M1–M72) have match_number NULL and are untouched.
--
-- Sources: Wikipedia + ESPN (cross-referenced, all pairings verified).
-- UTC times stored; app converts to America/Bogota for display.
-- =====================================================================

-- ── 1. Add new columns (all nullable, idempotent) ────────────────────

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_number      INT  UNIQUE,
  ADD COLUMN IF NOT EXISTS home_placeholder  TEXT,
  ADD COLUMN IF NOT EXISTS away_placeholder  TEXT,
  ADD COLUMN IF NOT EXISTS venue             TEXT;

-- ── 2. Drop NOT NULL from team FK columns ────────────────────────────
-- Existing group-stage rows all have values — this is safe.

ALTER TABLE matches
  ALTER COLUMN home_team_id DROP NOT NULL,
  ALTER COLUMN away_team_id DROP NOT NULL;

-- ── 3. Insert 32 knockout matches ────────────────────────────────────
-- home_team_id / away_team_id = NULL until group stage resolves.
-- stage values match existing TypeScript MatchStage union.
-- ⚠️  Three matches cross midnight UTC → Colombia date is one day earlier:
--     M85 (03:00 UTC Jul 3  = 22:00 COT Jul 2)
--     M87 (01:30 UTC Jul 4  = 20:30 COT Jul 3)
--     M100(01:00 UTC Jul 11 = 20:00 COT Jul 10)

INSERT INTO matches
  (match_number, home_team_id, away_team_id,
   starts_at, stage, status,
   home_placeholder, away_placeholder, venue)
VALUES

  -- ── Fase 2 — Round of 32 (M73–M88) ─────────────────────────────────
  ( 73, NULL, NULL, '2026-06-28 19:00:00+00', 'round_of_32', 'scheduled',
    'Runner-up Group A',      'Runner-up Group B',         'SoFi Stadium — Inglewood, CA'),
  ( 74, NULL, NULL, '2026-06-29 20:30:00+00', 'round_of_32', 'scheduled',
    'Winner Group E',         'Best 3rd (A/B/C/D/F)',      'Gillette Stadium — Foxborough, MA'),
  ( 75, NULL, NULL, '2026-06-29 23:00:00+00', 'round_of_32', 'scheduled',
    'Winner Group F',         'Runner-up Group C',         'Estadio BBVA — Monterrey, MEX'),
  ( 76, NULL, NULL, '2026-06-29 17:00:00+00', 'round_of_32', 'scheduled',
    'Winner Group C',         'Runner-up Group F',         'NRG Stadium — Houston, TX'),
  ( 77, NULL, NULL, '2026-06-30 21:00:00+00', 'round_of_32', 'scheduled',
    'Winner Group I',         'Best 3rd (C/D/F/G/H)',      'MetLife Stadium — East Rutherford, NJ'),
  ( 78, NULL, NULL, '2026-06-30 17:00:00+00', 'round_of_32', 'scheduled',
    'Runner-up Group E',      'Runner-up Group I',         'AT&T Stadium — Arlington, TX'),
  ( 79, NULL, NULL, '2026-06-30 23:00:00+00', 'round_of_32', 'scheduled',
    'Winner Group A',         'Best 3rd (C/E/F/H/I)',      'Estadio Azteca — Mexico City, MEX'),
  ( 80, NULL, NULL, '2026-07-01 16:00:00+00', 'round_of_32', 'scheduled',
    'Winner Group L',         'Best 3rd (E/H/I/J/K)',      'Mercedes-Benz Stadium — Atlanta, GA'),
  ( 81, NULL, NULL, '2026-07-01 21:00:00+00', 'round_of_32', 'scheduled',
    'Winner Group D',         'Best 3rd (B/E/F/I/J)',      'Levi''s Stadium — Santa Clara, CA'),
  ( 82, NULL, NULL, '2026-07-01 20:00:00+00', 'round_of_32', 'scheduled',
    'Winner Group G',         'Best 3rd (A/E/H/I/J)',      'Lumen Field — Seattle, WA'),
  ( 83, NULL, NULL, '2026-07-02 23:00:00+00', 'round_of_32', 'scheduled',
    'Runner-up Group K',      'Runner-up Group L',         'BMO Field — Toronto, CAN'),
  ( 84, NULL, NULL, '2026-07-02 19:00:00+00', 'round_of_32', 'scheduled',
    'Winner Group H',         'Runner-up Group J',         'SoFi Stadium — Inglewood, CA'),
  ( 85, NULL, NULL, '2026-07-03 03:00:00+00', 'round_of_32', 'scheduled',  -- COT: Jul 2 22:00
    'Winner Group B',         'Best 3rd (E/F/G/I/J)',      'BC Place — Vancouver, CAN'),
  ( 86, NULL, NULL, '2026-07-03 22:00:00+00', 'round_of_32', 'scheduled',
    'Winner Group J',         'Runner-up Group H',         'Hard Rock Stadium — Miami Gardens, FL'),
  ( 87, NULL, NULL, '2026-07-04 01:30:00+00', 'round_of_32', 'scheduled',  -- COT: Jul 3 20:30
    'Winner Group K',         'Best 3rd (D/E/I/J/L)',      'Arrowhead Stadium — Kansas City, MO'),
  ( 88, NULL, NULL, '2026-07-03 18:00:00+00', 'round_of_32', 'scheduled',
    'Runner-up Group D',      'Runner-up Group G',         'AT&T Stadium — Arlington, TX'),

  -- ── Fase 3 — Round of 16 (M89–M96) ──────────────────────────────────
  ( 89, NULL, NULL, '2026-07-04 21:00:00+00', 'round_of_16', 'scheduled',
    'Winner M74',             'Winner M77',                'Lincoln Financial Field — Philadelphia, PA'),
  ( 90, NULL, NULL, '2026-07-04 17:00:00+00', 'round_of_16', 'scheduled',
    'Winner M73',             'Winner M75',                'NRG Stadium — Houston, TX'),
  ( 91, NULL, NULL, '2026-07-05 20:00:00+00', 'round_of_16', 'scheduled',
    'Winner M76',             'Winner M78',                'MetLife Stadium — East Rutherford, NJ'),
  ( 92, NULL, NULL, '2026-07-05 22:00:00+00', 'round_of_16', 'scheduled',
    'Winner M79',             'Winner M80',                'Estadio Azteca — Mexico City, MEX'),
  ( 93, NULL, NULL, '2026-07-06 18:00:00+00', 'round_of_16', 'scheduled',
    'Winner M83',             'Winner M84',                'AT&T Stadium — Arlington, TX'),
  ( 94, NULL, NULL, '2026-07-06 22:00:00+00', 'round_of_16', 'scheduled',
    'Winner M81',             'Winner M82',                'Lumen Field — Seattle, WA'),
  ( 95, NULL, NULL, '2026-07-07 16:00:00+00', 'round_of_16', 'scheduled',
    'Winner M86',             'Winner M88',                'Mercedes-Benz Stadium — Atlanta, GA'),
  ( 96, NULL, NULL, '2026-07-07 20:00:00+00', 'round_of_16', 'scheduled',
    'Winner M85',             'Winner M87',                'BC Place — Vancouver, CAN'),

  -- ── Fase 4 — Quarter-finals (M97–M100) ───────────────────────────────
  ( 97, NULL, NULL, '2026-07-09 20:00:00+00', 'quarter_final', 'scheduled',
    'Winner M89',             'Winner M90',                'Gillette Stadium — Foxborough, MA'),
  ( 98, NULL, NULL, '2026-07-10 19:00:00+00', 'quarter_final', 'scheduled',
    'Winner M93',             'Winner M94',                'SoFi Stadium — Inglewood, CA'),
  ( 99, NULL, NULL, '2026-07-11 21:00:00+00', 'quarter_final', 'scheduled',
    'Winner M91',             'Winner M92',                'Hard Rock Stadium — Miami Gardens, FL'),
  (100, NULL, NULL, '2026-07-11 01:00:00+00', 'quarter_final', 'scheduled',  -- COT: Jul 10 20:00
    'Winner M95',             'Winner M96',                'Arrowhead Stadium — Kansas City, MO'),

  -- ── Semifinal (M101–M102) ─────────────────────────────────────────────
  (101, NULL, NULL, '2026-07-14 18:00:00+00', 'semi_final', 'scheduled',
    'Winner M97',             'Winner M98',                'AT&T Stadium — Arlington, TX'),
  (102, NULL, NULL, '2026-07-15 19:00:00+00', 'semi_final', 'scheduled',
    'Winner M99',             'Winner M100',               'Mercedes-Benz Stadium — Atlanta, GA'),

  -- ── Tercer Puesto — Third-Place Playoff (M103) ───────────────────────
  (103, NULL, NULL, '2026-07-18 18:00:00+00', 'third_place', 'scheduled',
    'Loser M101',             'Loser M102',                'Hard Rock Stadium — Miami Gardens, FL'),

  -- ── Final (M104) ──────────────────────────────────────────────────────
  (104, NULL, NULL, '2026-07-19 19:00:00+00', 'final', 'scheduled',
    'Winner M101',            'Winner M102',               'MetLife Stadium — East Rutherford, NJ')

ON CONFLICT (match_number) DO NOTHING;

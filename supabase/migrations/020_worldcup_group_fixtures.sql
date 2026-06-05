-- =====================================================================
-- Migration 020: FIFA World Cup 2026 — Group Stage Fixtures
-- 72 matches · Groups A–L · 3 matchdays each
--
-- Sources: Sky Sports (BST = UTC+1) cross-referenced with ESPN (ET = EDT+4h)
-- All starts_at stored in UTC (TIMESTAMPTZ WITH TIME ZONE).
--
-- ⚠️  THREE MATCHES WITH SOURCE DISCREPANCY — verify at fifa.com:
--     • BEL vs EGY  (G MD1): Sky Sports 19:00 UTC · ESPN 22:00 UTC → using ESPN
--     • IRN vs NZL  (G MD1): Sky Sports 01:00 UTC · ESPN 04:00 UTC → using ESPN
--     • BRA vs HAI  (C MD2): Sky Sports 00:30 UTC · ESPN 01:00 UTC → using Sky Sports
--
-- IDEMPOTENT: ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING
-- Requires migration 019 (teams inserted + matches_fixture_unique constraint).
-- =====================================================================

-- Safety check — fails fast if 019 was not applied
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_fixture_unique'
  ) THEN
    RAISE EXCEPTION 'Run migration 019 first (matches_fixture_unique constraint missing)';
  END IF;
  IF (SELECT COUNT(*) FROM teams WHERE code IN ('MEX','COL','ARG','BRA')) < 4 THEN
    RAISE EXCEPTION 'Run migration 019 first (teams not seeded)';
  END IF;
END;
$$;

-- ── Macro: each INSERT uses a SELECT+VALUES+JOIN pattern ─────────────
-- (hc = home code, ac = away code, ts = UTC timestamp, gc = group code)
-- ON CONFLICT DO NOTHING makes each block safe to re-run.

-- ── GROUP A: México · Sudáfrica · Corea del Sur · República Checa ─────
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('MEX','RSA','2026-06-11 19:00:00+00','A'),  -- MD1
  ('KOR','CZE','2026-06-12 02:00:00+00','A'),  -- MD1
  ('CZE','RSA','2026-06-18 16:00:00+00','A'),  -- MD2
  ('MEX','KOR','2026-06-19 03:00:00+00','A'),  -- MD2
  ('RSA','KOR','2026-06-25 01:00:00+00','A'),  -- MD3 ⚡ simultaneous
  ('CZE','MEX','2026-06-25 01:00:00+00','A')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── GROUP B: Canadá · Bosnia y Herzegovina · Catar · Suiza ───────────
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('CAN','BIH','2026-06-12 19:00:00+00','B'),  -- MD1
  ('QAT','SUI','2026-06-13 19:00:00+00','B'),  -- MD1
  ('SUI','BIH','2026-06-18 19:00:00+00','B'),  -- MD2
  ('CAN','QAT','2026-06-18 22:00:00+00','B'),  -- MD2
  ('SUI','CAN','2026-06-24 19:00:00+00','B'),  -- MD3 ⚡ simultaneous
  ('BIH','QAT','2026-06-24 19:00:00+00','B')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── GROUP C: Brasil · Marruecos · Haití · Escocia ────────────────────
-- BRA vs HAI (MD2) kicks off at 00:30 UTC per Sky Sports.
-- ESPN reports 01:00 UTC. ⚠️  Verify at fifa.com before production.
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('BRA','MAR','2026-06-13 22:00:00+00','C'),  -- MD1
  ('HAI','SCO','2026-06-14 01:00:00+00','C'),  -- MD1
  ('SCO','MAR','2026-06-19 22:00:00+00','C'),  -- MD2
  ('BRA','HAI','2026-06-20 00:30:00+00','C'),  -- MD2 ⚠️ verify time
  ('MAR','HAI','2026-06-24 22:00:00+00','C'),  -- MD3 ⚡ simultaneous
  ('SCO','BRA','2026-06-24 22:00:00+00','C')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── GROUP D: Estados Unidos · Paraguay · Australia · Turquía ─────────
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('USA','PAR','2026-06-13 01:00:00+00','D'),  -- MD1
  ('AUS','TUR','2026-06-14 04:00:00+00','D'),  -- MD1
  ('USA','AUS','2026-06-19 19:00:00+00','D'),  -- MD2
  ('TUR','PAR','2026-06-20 03:00:00+00','D'),  -- MD2
  ('TUR','USA','2026-06-26 02:00:00+00','D'),  -- MD3 ⚡ simultaneous
  ('PAR','AUS','2026-06-26 02:00:00+00','D')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── GROUP E: Alemania · Curazao · Costa de Marfil · Ecuador ──────────
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('GER','CUW','2026-06-14 17:00:00+00','E'),  -- MD1
  ('CIV','ECU','2026-06-14 23:00:00+00','E'),  -- MD1
  ('GER','CIV','2026-06-20 20:00:00+00','E'),  -- MD2
  ('ECU','CUW','2026-06-21 00:00:00+00','E'),  -- MD2
  ('CUW','CIV','2026-06-25 20:00:00+00','E'),  -- MD3 ⚡ simultaneous
  ('ECU','GER','2026-06-25 20:00:00+00','E')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── GROUP F: Países Bajos · Japón · Suecia · Túnez ───────────────────
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('NED','JPN','2026-06-14 20:00:00+00','F'),  -- MD1
  ('SWE','TUN','2026-06-15 02:00:00+00','F'),  -- MD1
  ('NED','SWE','2026-06-20 17:00:00+00','F'),  -- MD2
  ('TUN','JPN','2026-06-21 04:00:00+00','F'),  -- MD2
  ('TUN','NED','2026-06-25 23:00:00+00','F'),  -- MD3 ⚡ simultaneous
  ('JPN','SWE','2026-06-25 23:00:00+00','F')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── GROUP G: Bélgica · Egipto · Irán · Nueva Zelanda ─────────────────
-- MD1 times corrected to ESPN (ET) after Sky Sports showed a systematic
-- 3-hour offset for this group's opening day. MD2 and MD3 are consistent
-- across both sources.
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('BEL','EGY','2026-06-15 22:00:00+00','G'),  -- MD1 (ESPN 6pm ET; Sky 19:00 UTC) ⚠️
  ('IRN','NZL','2026-06-16 04:00:00+00','G'),  -- MD1 (ESPN midnight ET; Sky 01:00 UTC) ⚠️
  ('BEL','IRN','2026-06-21 19:00:00+00','G'),  -- MD2 ✓ both sources agree
  ('NZL','EGY','2026-06-22 01:00:00+00','G'),  -- MD2 ✓ both sources agree
  ('NZL','BEL','2026-06-27 03:00:00+00','G'),  -- MD3 ⚡ simultaneous
  ('EGY','IRN','2026-06-27 03:00:00+00','G')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── GROUP H: España · Cabo Verde · Arabia Saudita · Uruguay ──────────
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('ESP','CPV','2026-06-15 17:00:00+00','H'),  -- MD1 (ESPN 1pm ET; Sky 16:00 UTC) ⚠️
  ('KSA','URU','2026-06-15 22:00:00+00','H'),  -- MD1 ✓ both sources agree
  ('ESP','KSA','2026-06-21 16:00:00+00','H'),  -- MD2 ✓ both sources agree
  ('URU','CPV','2026-06-21 22:00:00+00','H'),  -- MD2 ✓ both sources agree
  ('CPV','KSA','2026-06-27 00:00:00+00','H'),  -- MD3 ⚡ simultaneous
  ('URU','ESP','2026-06-27 00:00:00+00','H')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── GROUP I: Francia · Senegal · Irak · Noruega ──────────────────────
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('FRA','SEN','2026-06-16 19:00:00+00','I'),  -- MD1
  ('IRQ','NOR','2026-06-16 22:00:00+00','I'),  -- MD1
  ('FRA','IRQ','2026-06-22 21:00:00+00','I'),  -- MD2
  ('NOR','SEN','2026-06-23 00:00:00+00','I'),  -- MD2
  ('NOR','FRA','2026-06-26 19:00:00+00','I'),  -- MD3 ⚡ simultaneous
  ('SEN','IRQ','2026-06-26 19:00:00+00','I')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── GROUP J: Argentina · Argelia · Austria · Jordania ────────────────
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('ARG','ALG','2026-06-17 01:00:00+00','J'),  -- MD1
  ('AUT','JOR','2026-06-17 04:00:00+00','J'),  -- MD1
  ('ARG','AUT','2026-06-22 17:00:00+00','J'),  -- MD2
  ('JOR','ALG','2026-06-23 03:00:00+00','J'),  -- MD2
  ('ALG','AUT','2026-06-28 02:00:00+00','J'),  -- MD3 ⚡ simultaneous
  ('JOR','ARG','2026-06-28 02:00:00+00','J')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── GROUP K: Portugal · R.D. Congo · Uzbekistán · Colombia ───────────
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('POR','COD','2026-06-17 17:00:00+00','K'),  -- MD1
  ('UZB','COL','2026-06-18 02:00:00+00','K'),  -- MD1  (Colombia: Jun 17 21:00 Bogota)
  ('POR','UZB','2026-06-23 17:00:00+00','K'),  -- MD2
  ('COL','COD','2026-06-24 02:00:00+00','K'),  -- MD2  (Colombia: Jun 23 21:00 Bogota)
  ('COL','POR','2026-06-27 23:30:00+00','K'),  -- MD3 ⚡ simultaneous (Jun 27 18:30 Bogota)
  ('COD','UZB','2026-06-27 23:30:00+00','K')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── GROUP L: Inglaterra · Croacia · Ghana · Panamá ───────────────────
INSERT INTO matches (home_team_id, away_team_id, starts_at, stage, group_code, status)
SELECT t1.id, t2.id, v.ts::timestamptz, 'group', v.gc, 'scheduled'
FROM (VALUES
  ('ENG','CRO','2026-06-17 20:00:00+00','L'),  -- MD1
  ('GHA','PAN','2026-06-17 23:00:00+00','L'),  -- MD1
  ('ENG','GHA','2026-06-23 20:00:00+00','L'),  -- MD2
  ('PAN','CRO','2026-06-23 23:00:00+00','L'),  -- MD2
  ('PAN','ENG','2026-06-27 21:00:00+00','L'),  -- MD3 ⚡ simultaneous
  ('CRO','GHA','2026-06-27 21:00:00+00','L')   -- MD3 ⚡ simultaneous
) AS v(hc, ac, ts, gc)
JOIN teams t1 ON t1.code = v.hc
JOIN teams t2 ON t2.code = v.ac
ON CONFLICT (home_team_id, away_team_id, starts_at) DO NOTHING;

-- ── Optional: remove demo matches from migrations 007/014-018 ─────────
-- The seed matches (IDs b0000000-...) now coexist with the real fixtures.
-- They appear in groups A, B, C alongside real matches.
-- Uncomment to clean up. CASCADE removes their predictions too.
--
-- DELETE FROM matches
--  WHERE id IN (
--    'b0000000-0000-0000-0000-000000000001',  -- España vs Colombia (demo)
--    'b0000000-0000-0000-0000-000000000002',  -- Brasil vs Argentina (demo)
--    'b0000000-0000-0000-0000-000000000003',  -- Colombia vs México (demo)
--    'b0000000-0000-0000-0000-000000000004',  -- Uruguay vs Francia (demo)
--    'b0000000-0000-0000-0000-000000000005',  -- Argentina vs Alemania (demo)
--    'b0000000-0000-0000-0000-000000000006',  -- México vs Alemania (demo)
--    'b0000000-0000-0000-0000-000000000007'   -- España vs Francia (demo)
--  );

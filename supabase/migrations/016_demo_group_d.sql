-- =====================================================================
-- Migration 016: Add Group D matches for visual demo
--
-- Creates two future-dated Group D matches so the dashboard immediately
-- shows the "⚠ Pronóstico requerido" (amber/pending) state without
-- requiring the user to have any prior interaction.
--
-- After this migration the dashboard shows all four match states at once:
--
--   Grupo A  → FINALIZADO (España–Colombia) + EN VIVO (Uruguay–Francia)
--   Grupo B  → EN VIVO (Brasil–Argentina) + PRONOSTICAR (Arg–Ale)
--   Grupo C  → EN VIVO (Colombia–México)
--   Grupo D  → PRONOSTICAR ⚠ (two unpredicted future matches)
-- =====================================================================

-- México vs Alemania — Group D, future kickoff
INSERT INTO matches (id, home_team_id, away_team_id, starts_at, stage, status, group_code)
VALUES (
  'b0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000004',  -- México
  'a0000000-0000-0000-0000-000000000007',  -- Alemania
  '2026-06-20 18:00:00+00',
  'group', 'scheduled', 'D'
)
ON CONFLICT (id) DO NOTHING;

-- España vs Francia — Group D, future kickoff
INSERT INTO matches (id, home_team_id, away_team_id, starts_at, stage, status, group_code)
VALUES (
  'b0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000005',  -- España
  'a0000000-0000-0000-0000-000000000008',  -- Francia
  '2026-06-22 20:00:00+00',
  'group', 'scheduled', 'D'
)
ON CONFLICT (id) DO NOTHING;

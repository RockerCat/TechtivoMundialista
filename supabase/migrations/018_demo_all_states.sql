-- =====================================================================
-- Migration 018: Seed all visual match states for demo validation
--
-- After running this (on top of 014–017) the dashboard shows:
--
--   Grupo A:  España–Colombia  → FINALIZADO +3 pts ✓ (green)
--             Uruguay–Francia  → EN VIVO 1–0  · pronóstico 1–0 (matching)
--
--   Grupo B:  Brasil–Argentina → FINALIZADO 1–0 · pronóstico 0–2 → 0 pts (red)
--             Arg–Ale          → PRONOSTICAR · pronóstico guardado 2–1
--
--   Grupo C:  Col–Méx         → EN VIVO 1–1  · pronóstico 0–0 (failing)
--
--   Grupo D:  Méx–Ale / Esp–Fra → ⚠ Pronóstico requerido (amber, no prediction)
-- =====================================================================

DO $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'alexsosa.me@gmail.com';
  IF v_uid IS NULL THEN
    RAISE NOTICE '[018] User not found — skipping all seeds';
    RETURN;
  END IF;

  -- ── Brasil vs Argentina → finish it with 1–0, seed wrong prediction 0–2 → 0 pts
  UPDATE matches
     SET status = 'finished', home_score = 1, away_score = 0
   WHERE id = 'b0000000-0000-0000-0000-000000000002';

  INSERT INTO predictions (match_id, user_id, home_score, away_score, points, points_reason, scored_at, created_at, updated_at)
  VALUES ('b0000000-0000-0000-0000-000000000002', v_uid, 0, 2, 0, 'Sin puntos', NOW(), NOW(), NOW())
  ON CONFLICT (match_id, user_id) DO UPDATE
    SET home_score=0, away_score=2, points=0, points_reason='Sin puntos', scored_at=NOW(), updated_at=NOW();

  -- ── Uruguay vs Francia (live 1–0) → seed MATCHING prediction 1–0
  INSERT INTO predictions (match_id, user_id, home_score, away_score, points, points_reason, scored_at, created_at, updated_at)
  VALUES ('b0000000-0000-0000-0000-000000000004', v_uid, 1, 0, 0, NULL, NULL, NOW(), NOW())
  ON CONFLICT (match_id, user_id) DO UPDATE
    SET home_score=1, away_score=0, points=0, points_reason=NULL, scored_at=NULL, updated_at=NOW();

  -- ── Colombia vs México (live 1–1) → seed WRONG prediction 0–0
  INSERT INTO predictions (match_id, user_id, home_score, away_score, points, points_reason, scored_at, created_at, updated_at)
  VALUES ('b0000000-0000-0000-0000-000000000003', v_uid, 0, 0, 0, NULL, NULL, NOW(), NOW())
  ON CONFLICT (match_id, user_id) DO UPDATE
    SET home_score=0, away_score=0, points=0, points_reason=NULL, scored_at=NULL, updated_at=NOW();

  -- ── Argentina vs Alemania (scheduled June 7) → seed saved prediction 2–1
  INSERT INTO predictions (match_id, user_id, home_score, away_score, points, points_reason, scored_at, created_at, updated_at)
  VALUES ('b0000000-0000-0000-0000-000000000005', v_uid, 2, 1, 0, NULL, NULL, NOW(), NOW())
  ON CONFLICT (match_id, user_id) DO UPDATE
    SET home_score=2, away_score=1, points=0, points_reason=NULL, scored_at=NULL, updated_at=NOW();

  RAISE NOTICE '[018] ✓ All demo states seeded for user %', v_uid;
END;
$$;

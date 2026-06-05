-- =====================================================================
-- Migration 017: Seed a successful prediction for España vs Colombia
--
-- Creates a scored prediction for alexsosa.me@gmail.com on the España
-- vs Colombia match (already finished 1–0).
-- Exact-score prediction (1–0) earns 3 pts in the group stage per the
-- scoring table in migration 010.
--
-- After running this, the España vs Colombia card in Grupo A will show:
--
--   FINALIZADO
--   🇪🇸 España  1–0  Colombia 🇨🇴
--   Mi pronóstico: 1–0        ✓ +3 pts
--
-- with a green border and soft green glow.
--
-- Safe to re-run: ON CONFLICT DO UPDATE makes it idempotent.
-- =====================================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
    FROM auth.users
   WHERE email = 'alexsosa.me@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE '[017] User alexsosa.me@gmail.com not found — skipping';
    RETURN;
  END IF;

  INSERT INTO predictions (
    match_id,
    user_id,
    home_score,
    away_score,
    points,
    points_reason,
    scored_at,
    created_at,
    updated_at
  )
  VALUES (
    'b0000000-0000-0000-0000-000000000001', -- España vs Colombia (1–0, finished)
    v_user_id,
    1,                   -- predicted España score (correct)
    0,                   -- predicted Colombia score (correct)
    3,                   -- group-stage exact match = 3 pts (migration 010)
    'Marcador exacto',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (match_id, user_id) DO UPDATE SET
    home_score    = 1,
    away_score    = 0,
    points        = 3,
    points_reason = 'Marcador exacto',
    scored_at     = NOW(),
    updated_at    = NOW();

  RAISE NOTICE '[017] ✓ Winning prediction seeded for user %', v_user_id;
END;
$$;

-- =====================================================================
-- Migration 023: Remove demo/mock matches
--
-- Deletes the 7 seeded test matches introduced in migrations 007, 015,
-- 016 and modified by 014, 018. Their UUIDs all start with b0000000-…
-- and are distinct from the 72 real fixtures inserted by migration 020
-- (which use gen_random_uuid()).
--
-- Predictions on these matches (seeded by migrations 017 and 018) are
-- removed automatically via ON DELETE CASCADE.
--
-- Teams are NOT deleted — they are shared with real WC matches.
-- Users, groups, and group memberships are NOT affected.
-- Real match records from migration 020 are NOT affected.
-- =====================================================================

DO $$
DECLARE
  v_ids UUID[] := ARRAY[
    'b0000000-0000-0000-0000-000000000001'::UUID,  -- España vs Colombia   (007)
    'b0000000-0000-0000-0000-000000000002'::UUID,  -- Brasil vs Argentina  (007/014/018)
    'b0000000-0000-0000-0000-000000000003'::UUID,  -- Colombia vs México   (007/015/018)
    'b0000000-0000-0000-0000-000000000004'::UUID,  -- Uruguay vs Francia   (007/015/018)
    'b0000000-0000-0000-0000-000000000005'::UUID,  -- Argentina vs Alemania(007/018)
    'b0000000-0000-0000-0000-000000000006'::UUID,  -- México vs Alemania   (016)
    'b0000000-0000-0000-0000-000000000007'::UUID   -- España vs Francia    (016)
  ];
  v_rec RECORD;
  v_total_matches   INT := 0;
  v_total_preds     INT := 0;
BEGIN
  -- ── Audit: log every demo match and its prediction count ─────────────
  FOR v_rec IN
    SELECT
      m.id,
      ht.code || ' vs ' || at.code            AS fixture,
      m.status,
      COALESCE(m.group_code, '–')             AS grp,
      COUNT(p.id)                             AS pred_count
    FROM   matches m
    JOIN   teams ht ON ht.id = m.home_team_id
    JOIN   teams at ON at.id = m.away_team_id
    LEFT   JOIN predictions p ON p.match_id = m.id
    WHERE  m.id = ANY(v_ids)
    GROUP  BY m.id, ht.code, at.code, m.status, m.group_code
    ORDER  BY m.id
  LOOP
    RAISE NOTICE '[023] Removing demo match: % | status=% | group=% | predictions=%',
      v_rec.fixture, v_rec.status, v_rec.grp, v_rec.pred_count;
    v_total_matches := v_total_matches + 1;
    v_total_preds   := v_total_preds   + v_rec.pred_count;
  END LOOP;

  IF v_total_matches = 0 THEN
    RAISE NOTICE '[023] No demo matches found — already cleaned or never seeded.';
    RETURN;
  END IF;

  -- ── Delete (predictions cascade automatically) ────────────────────────
  DELETE FROM matches WHERE id = ANY(v_ids);

  RAISE NOTICE '[023] ✓ Deleted % demo match(es) and % associated prediction(s).',
    v_total_matches, v_total_preds;
END;
$$;

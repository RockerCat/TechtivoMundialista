-- =====================================================================
-- Migration 049: Initialize live match scores to 0-0
--
-- sync_started_matches() — updated
-- ─────────────────────────────────
-- Migration 040 made the scheduled → live transition lazy, but
-- deliberately left home_score/away_score untouched, so a match that
-- just went live still had NULL/NULL scores. The match detail page's
-- live simulations ("si el partido terminara ahora", live ranking,
-- simulated points) treat a NULL score as "no data yet" and skip
-- entirely — so those sections stayed blank for the first few minutes
-- of every match, until an admin manually entered a score.
--
-- This migration makes the same transition also set home_score = 0 and
-- away_score = 0, but ONLY when both are still NULL. A real score —
-- entered by an admin before or during the match — is never touched,
-- via COALESCE(home_score, 0) (a no-op when the column already has a
-- value).
--
-- Still NEVER does (same invariants as migration 040, plus the new one):
--   • live → finished
--   • Overwrite an existing (non-null) score
--   • Call calculate_match_points
--   • Touch predictions
--   • Touch finished or already-live matches (WHERE status = 'scheduled')
--
-- Safety:
--   • Idempotent: re-running when no matches are due, or when the score
--     is already set, is a no-op (COALESCE only fires on NULL).
--   • Same signature, same SECURITY DEFINER, same auth guard as before.
-- =====================================================================

CREATE OR REPLACE FUNCTION sync_started_matches()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE matches
  SET    status     = 'live',
         home_score = COALESCE(home_score, 0),
         away_score = COALESCE(away_score, 0)
  WHERE  status    = 'scheduled'
    AND  starts_at <= NOW();

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('updated', v_updated);
END;
$$;

REVOKE ALL     ON FUNCTION sync_started_matches() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION sync_started_matches() TO authenticated;

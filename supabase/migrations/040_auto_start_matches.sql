-- =====================================================================
-- Migration 040: Lazy auto-start for overdue matches
--
-- sync_started_matches()
-- ─────────────────────
-- Transitions any match that is still 'scheduled' but whose kickoff
-- time has already passed to 'live'.
--
-- Design:
--   • Called server-side before fetching matches on any page that
--     displays the calendar (dashboard, match detail, admin pages).
--   • SECURITY DEFINER so it can UPDATE matches regardless of the
--     caller's role (regular user or admin).
--
-- Invariants (what this function NEVER does):
--   • live → finished    (admin-only via update_match_result)
--   • Modify home_score / away_score
--   • Call calculate_match_points
--   • Touch predictions in any way
--
-- Safety:
--   • Idempotent: re-running when no matches are due is a no-op.
--   • Returns { "updated": N } — N = rows changed (0 is normal).
--   • Requires an authenticated session; anonymous calls are rejected.
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
  SET    status = 'live'
  WHERE  status    = 'scheduled'
    AND  starts_at <= NOW();

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('updated', v_updated);
END;
$$;

REVOKE ALL     ON FUNCTION sync_started_matches() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION sync_started_matches() TO authenticated;

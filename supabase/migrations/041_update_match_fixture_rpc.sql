-- =====================================================================
-- Migration 041: update_match_fixture RPC
--
-- Root cause for creation
-- ───────────────────────
-- The matches table has RLS enabled with only a SELECT policy.
-- There is intentionally no direct UPDATE policy (see migration 008).
-- updateMatchFixtureAction was calling supabase.from("matches").update()
-- directly, which RLS silently blocked (0 rows updated, no error).
-- The server action misread the null error as success and returned
-- { success: true } even though nothing was saved.
--
-- This RPC mirrors the pattern of update_match_result: it is
-- SECURITY DEFINER so it bypasses RLS, and it enforces admin-only
-- access at the database level.
--
-- What it updates: starts_at and group_code only.
-- What it never touches: status, home_score, away_score, stage,
--   advancing_team_id, predictions, or scoring logic.
-- =====================================================================

CREATE OR REPLACE FUNCTION update_match_fixture(
  p_match_id   UUID,
  p_starts_at  TIMESTAMPTZ,
  p_group_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE id = p_match_id) THEN
    RAISE EXCEPTION 'match_not_found';
  END IF;

  UPDATE matches
  SET starts_at  = p_starts_at,
      group_code = p_group_code
  WHERE id = p_match_id;
END;
$$;

REVOKE ALL     ON FUNCTION update_match_fixture(UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION update_match_fixture(UUID, TIMESTAMPTZ, TEXT) TO authenticated;

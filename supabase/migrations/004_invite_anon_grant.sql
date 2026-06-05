-- =====================================================================
-- El VAR — Migration 004: Allow anon users to look up groups by invite code
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================================
--
-- The /invite/[code] page shows the group name and member count to
-- anyone who visits the link, including unauthenticated users, so they
-- can see what group they're joining before creating an account.
--
-- get_group_by_invite_code() is already SECURITY DEFINER — it only
-- returns the specific group matching the code, so granting anon access
-- exposes nothing beyond what the invite code holder is supposed to see.
-- =====================================================================

GRANT EXECUTE ON FUNCTION get_group_by_invite_code(TEXT) TO anon;

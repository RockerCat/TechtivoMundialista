-- =====================================================================
-- El VAR — Migration 006: Clean join_group_for_user function
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================================
--
-- WHY WE DROP FIRST
-- The existing version (005) returns JSON.
-- PostgreSQL does not allow CREATE OR REPLACE when the return type
-- changes, so we must drop before recreating.
--
-- DESIGN CHANGES FROM 005
-- - Returns UUID (the group_id) instead of JSON
-- - Uses RAISE EXCEPTION for BOTH error cases, not a mix of RAISE and
--   JSON return values.  The caller checks rpcError.message, not
--   result.error — simpler, no ambiguity.
-- - Error messages match exactly what the TypeScript action checks:
--     'not_authenticated'  — auth.uid() is NULL
--     'invalid_code'       — no group found for that invite code
-- =====================================================================

-- Drop old version (return type incompatibility)
DROP FUNCTION IF EXISTS join_group_for_user(TEXT);

-- ── Clean implementation ──────────────────────────────────────────────
CREATE FUNCTION join_group_for_user(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID;
  v_group_id UUID;
BEGIN
  -- 1. Require authenticated caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- 2. Find the group by invite code (RLS bypassed — user not yet a member)
  SELECT id INTO v_group_id
  FROM   groups
  WHERE  invite_code = UPPER(TRIM(p_invite_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  -- 3. Insert membership — idempotent, no error if already a member
  INSERT INTO group_members (group_id, user_id)
  VALUES (v_group_id, v_user_id)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- 4. Return the group id
  RETURN v_group_id;
END;
$$;

-- Only authenticated sessions may call this function
REVOKE ALL     ON FUNCTION join_group_for_user(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION join_group_for_user(TEXT) TO authenticated;

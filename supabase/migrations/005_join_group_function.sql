-- =====================================================================
-- El VAR — Migration 005: Atomic join-group SECURITY DEFINER function
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================================
--
-- WHY THIS IS NEEDED
-- ------------------
-- joinGroupAction currently does two separate calls:
--   1. rpc("get_group_by_invite_code") — SECURITY DEFINER, works fine
--   2. supabase.from("group_members").insert(...) — hits RLS directly
--
-- Step 2 fails with 42501 for the same reason groups INSERT fails:
-- the group_members INSERT policy is  WITH CHECK (auth.uid() = user_id),
-- and auth.uid() is NULL when the JWT does not reach PostgREST.
--
-- join_group_for_user() fixes this by doing both the lookup and the
-- INSERT inside a single SECURITY DEFINER call:
--   - Validates auth.uid() explicitly (raises if NULL)
--   - Looks up group without RLS
--   - Inserts membership without RLS
--   - ON CONFLICT DO NOTHING makes it idempotent (safe to call multiple
--     times — joining an already-joined group is not an error)
--   - Returns JSON so the caller can tell success from invalid-code
-- =====================================================================

CREATE OR REPLACE FUNCTION join_group_for_user(p_invite_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_group   groups%ROWTYPE;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING HINT = 'JWT must be present in the PostgREST request';
  END IF;

  -- Look up group (bypasses SELECT RLS — user is not yet a member)
  SELECT * INTO v_group
  FROM   groups
  WHERE  invite_code = UPPER(TRIM(p_invite_code));

  IF NOT FOUND THEN
    RETURN json_build_object(
      'error',   'invalid_code',
      'message', 'Código de invitación no encontrado'
    );
  END IF;

  -- Insert membership (bypasses INSERT RLS, idempotent)
  INSERT INTO group_members (group_id, user_id)
  VALUES (v_group.id, v_user_id)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'success',     true,
    'group_id',    v_group.id,
    'group_name',  v_group.name,
    'invite_code', v_group.invite_code
  );
END;
$$;

REVOKE ALL     ON FUNCTION join_group_for_user(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION join_group_for_user(TEXT) TO authenticated;

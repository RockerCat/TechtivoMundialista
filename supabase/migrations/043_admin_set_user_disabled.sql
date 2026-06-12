-- =====================================================================
-- Migration 043: admin_set_user_disabled SECURITY DEFINER RPC
--
-- The direct upsert from the server action was blocked because the
-- `authenticated` role only has SELECT on user_profiles (migration 037).
-- This function runs as the function owner, bypasses RLS entirely, and
-- enforces admin-only access inside SQL.
--
-- Security guarantees:
--   1. Caller must be authenticated (auth.uid() IS NOT NULL)
--   2. Caller must be in admin_users
--   3. Caller cannot modify their own account
-- =====================================================================

CREATE OR REPLACE FUNCTION admin_set_user_disabled(
  p_target_user_id UUID,
  p_disabled        BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_caller_id) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF p_target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'cannot_modify_self';
  END IF;

  INSERT INTO user_profiles (user_id, is_disabled, disabled_at, disabled_by, updated_at)
  VALUES (
    p_target_user_id,
    p_disabled,
    CASE WHEN p_disabled THEN NOW() ELSE NULL END,
    CASE WHEN p_disabled THEN v_caller_id ELSE NULL END,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_disabled = EXCLUDED.is_disabled,
    disabled_at = EXCLUDED.disabled_at,
    disabled_by = EXCLUDED.disabled_by,
    updated_at  = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL     ON FUNCTION admin_set_user_disabled(UUID, BOOLEAN) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION admin_set_user_disabled(UUID, BOOLEAN) TO authenticated;

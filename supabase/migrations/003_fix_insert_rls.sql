-- =====================================================================
-- El VAR — Migration 003: Fix groups INSERT RLS
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================================
--
-- PROBLEM
-- -------
-- The INSERT policy "auth_insert_groups" uses:
--   WITH CHECK (auth.uid() = owner_id)
--
-- auth.uid() reads from the PostgreSQL session variable
-- "request.jwt.claims", which PostgREST sets per-request via SET LOCAL.
-- When the Supabase JS client (via @supabase/ssr in a Next.js Server
-- Action) does not include the JWT in the Authorization header of the
-- PostgREST request, that variable is empty → auth.uid() returns NULL
-- → NULL = owner_id evaluates to NULL (not TRUE) → 42501.
--
-- getUser() still succeeds because it calls the Supabase Auth REST API
-- directly (not PostgREST), so it can validate the JWT even if PostgREST
-- never sees it.
--
-- WHY THE JWT MAY NOT REACH POSTGREST
-- ------------------------------------
-- In @supabase/ssr createServerClient, the GoTrue client reads the
-- session from cookies, but only loads it into memory when an auth
-- method is explicitly called first.  In a Server Action the client is
-- freshly created on every invocation.  If the session isn't loaded
-- before the first database call, the Supabase JS client sends the
-- request as the anon role (no Authorization header), and auth.uid()
-- is NULL in the PostgreSQL session.
--
-- FIX
-- ---
-- Introduce create_group_for_user(), a SECURITY DEFINER function that:
--   1. Calls auth.uid() inside the PostgreSQL session — at this point
--      PostgREST has already set request.jwt.claims, so the value is
--      guaranteed to be available if any JWT was sent at all.
--   2. Raises a clear exception if auth.uid() is still NULL (no JWT).
--   3. Bypasses RLS for the INSERT (SECURITY DEFINER runs as the
--      function owner, not the caller), so the failing policy is never
--      evaluated.
--   4. Atomically inserts the group AND the owner's membership in one
--      call — no separate auto-join step that could fail.
--
-- The INSERT RLS policy is kept in place as a defence-in-depth layer
-- for any direct table access that isn't going through this function.
-- =====================================================================


-- ── 1. Fix the INSERT policy (add explicit TO authenticated) ─────────
--  This alone may not be enough if the JWT is missing, but it's correct
--  to be explicit about the target role.

DROP POLICY IF EXISTS "auth_insert_groups" ON groups;

CREATE POLICY "auth_insert_groups" ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);


-- ── 2. SECURITY DEFINER function — atomic group creation ─────────────

CREATE OR REPLACE FUNCTION create_group_for_user(
  p_name        TEXT,
  p_invite_code TEXT
)
RETURNS TABLE (id UUID, name TEXT, invite_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID;
  v_group_id UUID;
BEGIN
  -- auth.uid() reads request.jwt.claims set by PostgREST.
  -- If it is NULL here, the JWT never reached the database layer.
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING HINT = 'JWT was not forwarded to PostgREST — check the Supabase client session initialisation';
  END IF;

  -- Insert the group (RLS bypassed by SECURITY DEFINER).
  -- Security is enforced above: v_user_id is auth.uid(), not caller-supplied.
  INSERT INTO groups (name, invite_code, owner_id)
  VALUES (trim(p_name), p_invite_code, v_user_id)
  RETURNING groups.id INTO v_group_id;

  -- Auto-join the creator as a member (also RLS-bypassed here).
  INSERT INTO group_members (group_id, user_id)
  VALUES (v_group_id, v_user_id);

  -- Return the created group row.
  RETURN QUERY
    SELECT g.id, g.name, g.invite_code
    FROM   groups g
    WHERE  g.id = v_group_id;
END;
$$;

-- Only authenticated sessions may call this function.
REVOKE ALL     ON FUNCTION create_group_for_user(TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION create_group_for_user(TEXT, TEXT) TO authenticated;


-- ── 3. Diagnostic helper (optional, safe to leave in) ────────────────
--  Call this from a Server Action to verify the JWT context:
--    supabase.rpc('diagnose_auth_context')
--  If uid is null, the JWT is not reaching PostgREST.

CREATE OR REPLACE FUNCTION diagnose_auth_context()
RETURNS JSON
LANGUAGE sql
SECURITY INVOKER   -- intentionally uses caller's auth context
STABLE
AS $$
  SELECT json_build_object(
    'uid',            auth.uid(),
    'role',           auth.role(),
    'jwt_present',    current_setting('request.jwt.claims', true) <> ''
  );
$$;

REVOKE ALL     ON FUNCTION diagnose_auth_context() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION diagnose_auth_context() TO anon, authenticated;

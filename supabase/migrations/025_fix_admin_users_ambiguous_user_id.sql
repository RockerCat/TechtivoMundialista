-- =====================================================================
-- Migration 025: Fix ambiguous "user_id" in get_admin_user_list
--
-- Root cause: RETURNS TABLE (user_id UUID, ...) places the return
-- column name "user_id" into the PL/pgSQL variable scope.  Inside the
-- function body, the unqualified reference
--
--   WHERE user_id = auth.uid()
--
-- is ambiguous between the OUT-parameter "user_id" and the column
-- admin_users.user_id, triggering PostgreSQL error 42702.
--
-- Fix: alias admin_users as "adm" in the guard check so every
-- reference to user_id is unambiguously table-qualified (adm.user_id).
-- All other JOIN conditions were already qualified and are untouched.
-- =====================================================================

CREATE OR REPLACE FUNCTION get_admin_user_list()
RETURNS TABLE (
  user_id      UUID,
  display_name TEXT,
  email        TEXT,
  joined_at    TIMESTAMPTZ,
  is_disabled  BOOLEAN,
  total_points BIGINT,
  pred_count   BIGINT,
  exact_count  BIGINT,
  result_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Alias admin_users as "adm" so adm.user_id is unambiguous
  -- (the OUT-parameter "user_id" is also in scope here).
  IF NOT EXISTS (
    SELECT 1 FROM admin_users adm WHERE adm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT
    au.id                                                              AS user_id,
    COALESCE(au.raw_user_meta_data->>'username',
             SPLIT_PART(au.email, '@', 1))                            AS display_name,
    au.email                                                           AS email,
    au.created_at                                                      AS joined_at,
    COALESCE(up.is_disabled, false)                                    AS is_disabled,
    COALESCE(SUM(p.points), 0)::BIGINT                                AS total_points,
    COUNT(p.id)::BIGINT                                               AS pred_count,
    COUNT(p.id) FILTER (WHERE p.points_reason = 'Marcador exacto')::BIGINT   AS exact_count,
    COUNT(p.id) FILTER (WHERE p.points_reason = 'Resultado acertado')::BIGINT AS result_count
  FROM   auth.users au
  JOIN   group_members  gm ON gm.user_id = au.id
  LEFT   JOIN user_profiles  up ON up.user_id = au.id
  LEFT   JOIN predictions     p ON p.user_id  = au.id
  WHERE  NOT EXISTS (
    SELECT 1 FROM admin_users a WHERE a.user_id = au.id
  )
  GROUP  BY au.id, au.email, au.raw_user_meta_data, au.created_at, up.is_disabled
  ORDER  BY COALESCE(up.is_disabled, false), au.created_at;
END;
$$;

REVOKE ALL     ON FUNCTION get_admin_user_list() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_admin_user_list() TO authenticated;

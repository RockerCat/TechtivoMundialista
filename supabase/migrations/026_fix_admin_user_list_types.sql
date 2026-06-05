-- =====================================================================
-- Migration 026: Fix get_admin_user_list type mismatch
--
-- "structure of query does not match function result type"
--
-- Two issues in the previous version:
--
--  1. auth.users.email is VARCHAR, not TEXT.  PostgreSQL does not
--     automatically promote varchar → text inside RETURNS TABLE functions.
--     Fix: explicit ::TEXT cast.
--
--  2. COUNT(…) FILTER (…)::BIGINT — without parentheses the ::BIGINT
--     might bind to the condition string rather than the whole aggregate.
--     Fix: wrap the aggregate in parens before casting.
--
--  All other changes from migration 025 (ambiguous user_id) are kept.
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
  -- adm alias avoids ambiguity with the OUT-parameter "user_id" (migration 025 fix)
  IF NOT EXISTS (
    SELECT 1 FROM admin_users adm WHERE adm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT
    -- UUID — exact match
    au.id                                                                           AS user_id,

    -- TEXT — explicit cast: JSONB ->> returns text, but COALESCE result
    -- may still be typed as unknown; ::TEXT ensures the declared type.
    COALESCE(
      au.raw_user_meta_data->>'username',
      SPLIT_PART(au.email, '@', 1)
    )::TEXT                                                                         AS display_name,

    -- TEXT — auth.users.email is varchar; explicit cast to match TEXT
    au.email::TEXT                                                                  AS email,

    -- TIMESTAMPTZ — exact match
    au.created_at                                                                   AS joined_at,

    -- BOOLEAN — COALESCE handles NULL from missing profile rows
    COALESCE(up.is_disabled, false)                                                 AS is_disabled,

    -- BIGINT — predictions.points is INT; SUM promotes to BIGINT, cast to confirm
    COALESCE(SUM(p.points), 0)::BIGINT                                             AS total_points,

    -- BIGINT — parentheses ensure ::BIGINT binds to the whole aggregate
    COUNT(p.id)::BIGINT                                                            AS pred_count,
    (COUNT(p.id) FILTER (WHERE p.points_reason = 'Marcador exacto' ))::BIGINT     AS exact_count,
    (COUNT(p.id) FILTER (WHERE p.points_reason = 'Resultado acertado'))::BIGINT   AS result_count

  FROM   auth.users au
  JOIN   group_members  gm ON gm.user_id = au.id
  LEFT   JOIN user_profiles  up ON up.user_id = au.id
  LEFT   JOIN predictions     p  ON p.user_id  = au.id

  WHERE  NOT EXISTS (
    -- Exclude admin accounts from the player list
    SELECT 1 FROM admin_users a WHERE a.user_id = au.id
  )

  GROUP  BY au.id, au.email, au.raw_user_meta_data, au.created_at, up.is_disabled
  ORDER  BY COALESCE(up.is_disabled, false), au.created_at;
END;
$$;

REVOKE ALL     ON FUNCTION get_admin_user_list() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_admin_user_list() TO authenticated;

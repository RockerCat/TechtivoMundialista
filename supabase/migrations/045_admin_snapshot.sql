-- =====================================================================
-- Migration 045: Admin JSON snapshot
--
-- Read-only export of every functional table, for manual backup.
-- SECURITY DEFINER + admin_users check — same pattern already used by
-- get_admin_user_list / get_admin_activity_log / recalculate_all_scores.
-- No restore path. No passwords, secrets, tokens or service role usage.
-- =====================================================================

CREATE OR REPLACE FUNCTION get_admin_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users adm WHERE adm.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', NOW(),
    'exported_by', auth.uid(),
    'version',     1,
    'tables', jsonb_build_object(
      'teams',         (SELECT COALESCE(jsonb_agg(to_jsonb(t)),   '[]'::jsonb) FROM teams t),
      'matches',       (SELECT COALESCE(jsonb_agg(to_jsonb(m)),   '[]'::jsonb) FROM matches m),
      'predictions',   (SELECT COALESCE(jsonb_agg(to_jsonb(p)),   '[]'::jsonb) FROM predictions p),
      'user_profiles', (SELECT COALESCE(jsonb_agg(to_jsonb(up)),  '[]'::jsonb) FROM user_profiles up),
      'admin_users',   (SELECT COALESCE(jsonb_agg(to_jsonb(adu)), '[]'::jsonb) FROM admin_users adu),
      'users_minimal', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'user_id',      au.id,
            'email',        au.email,
            'display_name', COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)),
            'created_at',   au.created_at
          )
        ), '[]'::jsonb)
        FROM auth.users au
      ),
      'groups',             (SELECT COALESCE(jsonb_agg(to_jsonb(g)),   '[]'::jsonb) FROM groups g),
      'group_members',      (SELECT COALESCE(jsonb_agg(to_jsonb(gm)),  '[]'::jsonb) FROM group_members gm),
      'news',                (SELECT COALESCE(jsonb_agg(to_jsonb(n)),   '[]'::jsonb) FROM news n),
      'admin_activity_log', (SELECT COALESCE(jsonb_agg(to_jsonb(al)),  '[]'::jsonb) FROM admin_activity_log al),
      'admin_match_audit',  (SELECT COALESCE(jsonb_agg(to_jsonb(ama)), '[]'::jsonb) FROM admin_match_audit ama)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL     ON FUNCTION get_admin_snapshot() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_admin_snapshot() TO authenticated;

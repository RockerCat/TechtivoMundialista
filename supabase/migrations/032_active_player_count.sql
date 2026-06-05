-- Returns the count of active (non-admin, non-disabled) players in a group.
-- Used for prize pool calculations so admins and disabled users are not counted
-- toward the prize pool participant count.
--
-- A "player" is a group_members row whose user_id:
--   1. Is NOT in admin_users
--   2. Has no user_profiles row OR user_profiles.is_disabled = false

CREATE OR REPLACE FUNCTION get_active_player_count(p_group_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM group_members gm
  WHERE gm.group_id = p_group_id
    AND NOT EXISTS (
      SELECT 1 FROM admin_users au WHERE au.user_id = gm.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = gm.user_id AND up.is_disabled = true
    );
$$;

REVOKE ALL     ON FUNCTION get_active_player_count(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_active_player_count(UUID) TO authenticated;

-- Returns the active (non-admin, non-disabled) members of a group who have
-- NOT registered a prediction for a given match. Used by the match detail
-- page's "Sin pronóstico" section.
--
-- Only participation status is exposed here (not other members' picks), so
-- it's safe to show regardless of match status (scheduled/live/finished) —
-- unlike get_match_detail_predictions, which gates the actual scores behind
-- live/finished to avoid leaking picks before kickoff.

CREATE OR REPLACE FUNCTION get_match_missing_predictions(
  p_match_id uuid,
  p_group_id uuid
)
RETURNS TABLE (
  user_id      uuid,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM group_members AS gm_check
    WHERE gm_check.group_id = p_group_id
      AND gm_check.user_id  = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  RETURN QUERY
  SELECT
    gm.user_id,
    COALESCE(
      au.raw_user_meta_data->>'username',
      split_part(au.email, '@', 1)
    )::text AS display_name
  FROM group_members gm
  JOIN auth.users au
    ON au.id = gm.user_id
  WHERE gm.group_id = p_group_id
    AND NOT EXISTS (
      SELECT 1 FROM admin_users adm WHERE adm.user_id = gm.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = gm.user_id AND up.is_disabled = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM predictions p
      WHERE p.match_id = p_match_id
        AND p.user_id  = gm.user_id
    )
  ORDER BY display_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_match_missing_predictions(uuid, uuid) TO authenticated;

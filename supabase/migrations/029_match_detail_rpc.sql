-- Returns all predictions for a match scoped to a specific group,
-- including the predictor's display name from auth.users.
-- Only callable by authenticated users who are members of the group.

CREATE OR REPLACE FUNCTION get_match_detail_predictions(
  p_match_id uuid,
  p_group_id uuid
)
RETURNS TABLE (
  user_id       uuid,
  display_name  text,
  pred_home     int,
  pred_away     int,
  points        int,
  points_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be a member of the group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    COALESCE(
      au.raw_user_meta_data->>'username',
      split_part(au.email, '@', 1)
    )::text                         AS display_name,
    p.home_score::int               AS pred_home,
    p.away_score::int               AS pred_away,
    COALESCE(p.points, 0)::int      AS points,
    p.points_reason
  FROM predictions p
  JOIN group_members gm
    ON  gm.user_id  = p.user_id
    AND gm.group_id = p_group_id
  JOIN auth.users au
    ON  au.id = p.user_id
  LEFT JOIN user_profiles up
    ON  up.user_id = p.user_id
  WHERE p.match_id = p_match_id
    AND (up.user_id IS NULL OR up.is_disabled = false)
  ORDER BY p.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION get_match_detail_predictions(uuid, uuid) TO authenticated;

-- =====================================================================
-- Fix: get_group_leaderboard used exact_count/result_count as RANK()
-- tiebreakers, so two users with the same total_points could end up on
-- different rank values (e.g. 2 and 3) whenever one had more exact
-- scores than the other.
--
-- New official rule: for final ranking and prize purposes, only
-- total_points determines ties. No other criterion (exact scores,
-- correct winners, predictions submitted, alphabetical order, etc.) may
-- break a tie. Users with equal total_points must share the same rank.
--
-- This mirrors the fix already applied to get_match_news_context in
-- 046_news_leaderboard_ties.sql, which made the same change for the
-- news leaderboard snapshot. exact_count/display_name are still used
-- to order rows *within* the returned table for stable display, but
-- never to compute the rank value itself.
-- =====================================================================

CREATE OR REPLACE FUNCTION get_group_leaderboard(p_group_id UUID)
RETURNS TABLE (
  user_id      UUID,
  display_name TEXT,
  total_points BIGINT,
  exact_count  BIGINT,
  result_count BIGINT,
  pred_count   BIGINT,
  rank         BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM group_members gm_check
    WHERE gm_check.group_id = p_group_id
      AND gm_check.user_id  = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_member';
  END IF;

  RETURN QUERY
  WITH member_scores AS (
    SELECT
      gm.user_id,
      COALESCE(au.raw_user_meta_data->>'username',
               SPLIT_PART(au.email, '@', 1))                        AS display_name,
      COALESCE(SUM(p.points), 0)                                     AS total_points,
      COUNT(*) FILTER (WHERE p.points_reason = 'Marcador exacto')    AS exact_count,
      COUNT(*) FILTER (WHERE p.points_reason = 'Resultado acertado') AS result_count,
      COUNT(p.id)                                                     AS pred_count
    FROM group_members gm
    JOIN auth.users au ON au.id = gm.user_id
    LEFT JOIN predictions p ON p.user_id = gm.user_id
    WHERE gm.group_id = p_group_id
      AND NOT EXISTS (SELECT 1 FROM admin_users  a  WHERE a.user_id  = gm.user_id)
      AND NOT EXISTS (SELECT 1 FROM user_profiles up
                      WHERE up.user_id = gm.user_id AND up.is_disabled = true)
    GROUP BY gm.user_id, au.email, au.raw_user_meta_data
  ),
  ranked AS (
    SELECT ms.*,
      RANK() OVER (
        ORDER BY ms.total_points DESC
      )::BIGINT AS rank
    FROM member_scores ms
  )
  SELECT r.user_id, r.display_name, r.total_points,
         r.exact_count, r.result_count, r.pred_count, r.rank
  FROM ranked r
  ORDER BY r.rank, r.exact_count DESC, r.display_name;
END;
$$;

REVOKE ALL     ON FUNCTION get_group_leaderboard(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_group_leaderboard(UUID) TO authenticated;

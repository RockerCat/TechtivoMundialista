-- Extends get_group_by_invite_code to return prize config fields and
-- active player count so the invite page can render the participation
-- card and rules drawer without additional queries.
--
-- The function is dropped first because PostgreSQL disallows changing
-- the return type of an existing function via CREATE OR REPLACE.
-- Grants are re-applied below to restore access from migrations 001/004.

DROP FUNCTION IF EXISTS get_group_by_invite_code(TEXT);

CREATE OR REPLACE FUNCTION get_group_by_invite_code(code TEXT)
RETURNS TABLE (
  id               UUID,
  name             TEXT,
  invite_code      TEXT,
  owner_id         UUID,
  created_at       TIMESTAMPTZ,
  entry_fee        INT,
  first_place_pct  INT,
  second_place_pct INT,
  payment_key      TEXT,
  active_players   INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.invite_code,
    g.owner_id,
    g.created_at,
    g.entry_fee,
    g.first_place_pct,
    g.second_place_pct,
    g.payment_key,
    (
      SELECT COUNT(*)::INT
      FROM group_members gm
      WHERE gm.group_id = g.id
        AND NOT EXISTS (
          SELECT 1 FROM admin_users au WHERE au.user_id = gm.user_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.user_id = gm.user_id AND up.is_disabled = true
        )
    ) AS active_players
  FROM groups g
  WHERE g.invite_code = UPPER(TRIM(code));
END;
$$;

REVOKE ALL     ON FUNCTION get_group_by_invite_code(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_group_by_invite_code(TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION get_group_by_invite_code(TEXT) TO anon;

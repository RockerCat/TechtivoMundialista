-- Adds prize pool configuration to the groups table.
-- All three columns are nullable so existing groups are unaffected until
-- an admin explicitly sets values. The application treats null as "not
-- configured" and hides the prize card when entry_fee is null/0.

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS entry_fee          INT     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_place_pct    INT     DEFAULT 70,
  ADD COLUMN IF NOT EXISTS second_place_pct   INT     DEFAULT 30;

-- Constraint: the two percentages must sum to 100 when both are set.
ALTER TABLE groups
  ADD CONSTRAINT groups_prize_pct_sum
    CHECK (
      (first_place_pct IS NULL AND second_place_pct IS NULL) OR
      (first_place_pct + second_place_pct = 100)
    );

-- Admin-only update function — enforces that only admins can change prize config.
CREATE OR REPLACE FUNCTION update_group_prize_config(
  p_group_id         UUID,
  p_entry_fee        INT,
  p_first_place_pct  INT,
  p_second_place_pct INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF p_entry_fee < 0 THEN
    RAISE EXCEPTION 'invalid_entry_fee';
  END IF;

  IF p_first_place_pct < 0 OR p_first_place_pct > 100 THEN
    RAISE EXCEPTION 'invalid_percentages';
  END IF;

  IF p_first_place_pct + p_second_place_pct <> 100 THEN
    RAISE EXCEPTION 'percentages_must_sum_100';
  END IF;

  UPDATE groups
  SET
    entry_fee        = p_entry_fee,
    first_place_pct  = p_first_place_pct,
    second_place_pct = p_second_place_pct
  WHERE id = p_group_id;
END;
$$;

REVOKE ALL     ON FUNCTION update_group_prize_config(UUID, INT, INT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION update_group_prize_config(UUID, INT, INT, INT) TO authenticated;

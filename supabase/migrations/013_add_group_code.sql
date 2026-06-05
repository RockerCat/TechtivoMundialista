-- =====================================================================
-- Migration 013: Add group_code to matches
--
-- Adds a nullable group_code column (e.g. 'A', 'B', 'C') so group-stage
-- matches can be organised into their World Cup groups.
-- Knockout-stage matches leave group_code NULL.
--
-- Also back-fills the existing seed matches from migration 007.
-- =====================================================================

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS group_code VARCHAR(10) NULL;

-- Back-fill seed matches from migration 007
-- España vs Colombia → Group A
UPDATE matches
   SET group_code = 'A'
 WHERE id = 'b0000000-0000-0000-0000-000000000001';

-- Brasil vs Argentina → Group B
UPDATE matches
   SET group_code = 'B'
 WHERE id = 'b0000000-0000-0000-0000-000000000002';

-- Colombia vs México → Group C
UPDATE matches
   SET group_code = 'C'
 WHERE id = 'b0000000-0000-0000-0000-000000000003';

-- Uruguay vs Francia → Group A
UPDATE matches
   SET group_code = 'A'
 WHERE id = 'b0000000-0000-0000-0000-000000000004';

-- Argentina vs Alemania → Group B
UPDATE matches
   SET group_code = 'B'
 WHERE id = 'b0000000-0000-0000-0000-000000000005';

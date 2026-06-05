-- =====================================================================
-- Migration 014: Demo match states
--
-- Sets Brasil vs Argentina to 'live' so the dashboard immediately shows
-- all three visual states:
--   finished  → España vs Colombia (from migration 007, score 1–0)
--   live      → Brasil vs Argentina (this migration, score 1–0)
--   scheduled → Colombia vs México / Uruguay vs Francia / Argentina vs Alemania
--
-- SAFE TO REVERT: any admin can update these matches back at any time.
-- =====================================================================

UPDATE matches
   SET status     = 'live',
       home_score = 1,
       away_score = 0
 WHERE id = 'b0000000-0000-0000-0000-000000000002';

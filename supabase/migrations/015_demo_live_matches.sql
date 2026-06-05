-- =====================================================================
-- Migration 015: Set past-scheduled matches to LIVE for visual demo
--
-- Colombia vs México and Uruguay vs Francia have kickoff dates in the past
-- but still have status='scheduled', causing them to display as CERRADO.
-- Setting them to 'live' replaces all CERRADO cards with the EN VIVO state.
--
-- After running this migration, the dashboard will show:
--   España vs Colombia   → FINALIZADO  1–0
--   Brasil vs Argentina  → EN VIVO     1–0  (migration 014)
--   Colombia vs México   → EN VIVO     1–1
--   Uruguay vs Francia   → EN VIVO     1–0  (user's requested example)
--   Argentina vs Alemania → PRONOSTICAR (future kickoff, still open)
--
-- All of these can be reset by an admin at any time.
-- =====================================================================

-- Colombia vs México → live  1–1
UPDATE matches
   SET status     = 'live',
       home_score = 1,
       away_score = 1
 WHERE id = 'b0000000-0000-0000-0000-000000000003';

-- Uruguay vs Francia → live  1–0
UPDATE matches
   SET status     = 'live',
       home_score = 1,
       away_score = 0
 WHERE id = 'b0000000-0000-0000-0000-000000000004';

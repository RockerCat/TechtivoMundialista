-- Updates the entry fee for the Techtivo Mundialista community group
-- from the legacy default of $20,000 COP to the new value of $50,000 COP.
--
-- Run this once against the existing Techtivo Mundialista database.
-- Prize distribution (70% / 30%) and all other group config remain unchanged.

UPDATE public.groups
SET entry_fee = 50000
WHERE invite_code = 'TECHTIVO';

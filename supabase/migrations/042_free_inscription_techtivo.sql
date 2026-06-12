-- Techtivo Mundialista: inscripción gratuita.
-- Cambia el valor de inscripción del grupo TECHTIVO de $50,000 a $0.
-- Los premios (first_place_pct / second_place_pct) no se modifican en esta migración.

UPDATE public.groups
SET entry_fee = 0
WHERE invite_code = 'TECHTIVO';

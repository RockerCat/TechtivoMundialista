-- =====================================================================
-- Migration 019: FIFA World Cup 2026 — Teams & Group Assignments
--
-- Source: Verified FIFA 2026 group draw (provided by user).
-- This migration ONLY inserts/updates teams.
-- Fixtures (matches) are inserted separately in migration 020 once
-- official kick-off times are confirmed from the FIFA schedule.
--
-- Groups A–L are documented here as comments so migration 020 can
-- reference the correct team codes when inserting fixtures.
--
-- IDEMPOTENT: ON CONFLICT (code) DO UPDATE — safe to re-run.
-- =====================================================================

-- ── Fixture uniqueness constraint (needed for migration 020) ──────────
-- Added now so migration 020 can rely on it being present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_fixture_unique'
  ) THEN
    ALTER TABLE matches
      ADD CONSTRAINT matches_fixture_unique
      UNIQUE (home_team_id, away_team_id, starts_at);
  END IF;
END;
$$;

-- ── 48 Teams ──────────────────────────────────────────────────────────
-- Names in Spanish (app locale). FIFA 3-letter codes.
-- Group membership noted inline — used by migration 020.

INSERT INTO teams (name, code, flag_emoji) VALUES

  -- ── GROUP A: México · Sudáfrica · Corea del Sur · República Checa
  ('México',              'MEX', '🇲🇽'),
  ('Sudáfrica',           'RSA', '🇿🇦'),
  ('Corea del Sur',       'KOR', '🇰🇷'),
  ('República Checa',     'CZE', '🇨🇿'),

  -- ── GROUP B: Canadá · Bosnia y Herzegovina · Catar · Suiza
  ('Canadá',              'CAN', '🇨🇦'),
  ('Bosnia y Herzegovina','BIH', '🇧🇦'),
  ('Catar',               'QAT', '🇶🇦'),
  ('Suiza',               'SUI', '🇨🇭'),

  -- ── GROUP C: Brasil · Marruecos · Haití · Escocia
  ('Brasil',              'BRA', '🇧🇷'),
  ('Marruecos',           'MAR', '🇲🇦'),
  ('Haití',               'HAI', '🇭🇹'),
  ('Escocia',             'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'),

  -- ── GROUP D: Estados Unidos · Paraguay · Australia · Turquía
  ('Estados Unidos',      'USA', '🇺🇸'),
  ('Paraguay',            'PAR', '🇵🇾'),
  ('Australia',           'AUS', '🇦🇺'),
  ('Turquía',             'TUR', '🇹🇷'),

  -- ── GROUP E: Alemania · Curazao · Costa de Marfil · Ecuador
  ('Alemania',            'GER', '🇩🇪'),
  ('Curazao',             'CUW', '🇨🇼'),
  ('Costa de Marfil',     'CIV', '🇨🇮'),
  ('Ecuador',             'ECU', '🇪🇨'),

  -- ── GROUP F: Países Bajos · Japón · Suecia · Túnez
  ('Países Bajos',        'NED', '🇳🇱'),
  ('Japón',               'JPN', '🇯🇵'),
  ('Suecia',              'SWE', '🇸🇪'),
  ('Túnez',               'TUN', '🇹🇳'),

  -- ── GROUP G: Bélgica · Egipto · Irán · Nueva Zelanda
  ('Bélgica',             'BEL', '🇧🇪'),
  ('Egipto',              'EGY', '🇪🇬'),
  ('Irán',                'IRN', '🇮🇷'),
  ('Nueva Zelanda',       'NZL', '🇳🇿'),

  -- ── GROUP H: España · Cabo Verde · Arabia Saudita · Uruguay
  ('España',              'ESP', '🇪🇸'),
  ('Cabo Verde',          'CPV', '🇨🇻'),
  ('Arabia Saudita',      'KSA', '🇸🇦'),
  ('Uruguay',             'URU', '🇺🇾'),

  -- ── GROUP I: Francia · Senegal · Irak · Noruega
  ('Francia',             'FRA', '🇫🇷'),
  ('Senegal',             'SEN', '🇸🇳'),
  ('Irak',                'IRQ', '🇮🇶'),
  ('Noruega',             'NOR', '🇳🇴'),

  -- ── GROUP J: Argentina · Argelia · Austria · Jordania
  ('Argentina',           'ARG', '🇦🇷'),
  ('Argelia',             'ALG', '🇩🇿'),
  ('Austria',             'AUT', '🇦🇹'),
  ('Jordania',            'JOR', '🇯🇴'),

  -- ── GROUP K: Portugal · R.D. Congo · Uzbekistán · Colombia
  ('Portugal',            'POR', '🇵🇹'),
  ('R.D. Congo',          'COD', '🇨🇩'),
  ('Uzbekistán',          'UZB', '🇺🇿'),
  ('Colombia',            'COL', '🇨🇴'),

  -- ── GROUP L: Inglaterra · Croacia · Ghana · Panamá
  ('Inglaterra',          'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
  ('Croacia',             'CRO', '🇭🇷'),
  ('Ghana',               'GHA', '🇬🇭'),
  ('Panamá',              'PAN', '🇵🇦')

ON CONFLICT (code) DO UPDATE SET
  name       = EXCLUDED.name,
  flag_emoji = EXCLUDED.flag_emoji;

-- ── Summary (for reference when writing migration 020) ────────────────
-- A: MEX  RSA  KOR  CZE
-- B: CAN  BIH  QAT  SUI
-- C: BRA  MAR  HAI  SCO
-- D: USA  PAR  AUS  TUR
-- E: GER  CUW  CIV  ECU
-- F: NED  JPN  SWE  TUN
-- G: BEL  EGY  IRN  NZL
-- H: ESP  CPV  KSA  URU
-- I: FRA  SEN  IRQ  NOR
-- J: ARG  ALG  AUT  JOR
-- K: POR  COD  UZB  COL
-- L: ENG  CRO  GHA  PAN

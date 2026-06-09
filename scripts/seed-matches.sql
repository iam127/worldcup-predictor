BEGIN;

-- Ensure country code columns exist (old volumes may predate them)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_country_code VARCHAR(10);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_country_code VARCHAR(10);

-- Clear existing match data (ON DELETE CASCADE removes predictions automatically)
DELETE FROM leaderboard_cache;
DELETE FROM predictions;
DELETE FROM matches;

-- ============================================================
-- FIFA World Cup 2026 – Phase de Grupos (72 partidos)
-- Horarios en UTC  |  Groups A-C confirmed draw; D-L best knowledge
-- ============================================================

INSERT INTO matches (home_team, away_team, home_country_code, away_country_code, match_time, stage) VALUES

-- ── GROUP A: USA · Panama · Albania · Ukraine ────────────────────────────────
-- MD1 – 11 Jun
('USA',     'Panama',  'us', 'pa', '2026-06-11 16:00:00+00', 'Group A'),
('Albania', 'Ukraine', 'al', 'ua', '2026-06-11 22:00:00+00', 'Group A'),
-- MD2 – 20 Jun
('USA',     'Albania', 'us', 'al', '2026-06-20 16:00:00+00', 'Group A'),
('Panama',  'Ukraine', 'pa', 'ua', '2026-06-20 22:00:00+00', 'Group A'),
-- MD3 – 29 Jun (simultaneous)
('USA',     'Ukraine', 'us', 'ua', '2026-06-29 22:00:00+00', 'Group A'),
('Panama',  'Albania', 'pa', 'al', '2026-06-29 22:00:00+00', 'Group A'),

-- ── GROUP B: Mexico · Ecuador · Jamaica · Senegal ────────────────────────────
-- MD1 – 11 Jun
('Mexico',  'Ecuador', 'mx', 'ec', '2026-06-11 19:00:00+00', 'Group B'),
('Jamaica', 'Senegal', 'jm', 'sn', '2026-06-12 01:00:00+00', 'Group B'),
-- MD2 – 20 Jun
('Mexico',  'Jamaica', 'mx', 'jm', '2026-06-20 19:00:00+00', 'Group B'),
('Ecuador', 'Senegal', 'ec', 'sn', '2026-06-21 01:00:00+00', 'Group B'),
-- MD3 – 29 Jun (simultaneous)
('Mexico',  'Senegal', 'mx', 'sn', '2026-06-29 19:00:00+00', 'Group B'),
('Ecuador', 'Jamaica', 'ec', 'jm', '2026-06-29 19:00:00+00', 'Group B'),

-- ── GROUP C: Canada · Morocco · Cuba · Honduras ──────────────────────────────
-- MD1 – 12 Jun
('Canada',  'Morocco',  'ca', 'ma', '2026-06-12 16:00:00+00', 'Group C'),
('Cuba',    'Honduras', 'cu', 'hn', '2026-06-12 22:00:00+00', 'Group C'),
-- MD2 – 21 Jun
('Canada',  'Cuba',     'ca', 'cu', '2026-06-21 16:00:00+00', 'Group C'),
('Morocco', 'Honduras', 'ma', 'hn', '2026-06-21 22:00:00+00', 'Group C'),
-- MD3 – 30 Jun (simultaneous)
('Canada',  'Honduras', 'ca', 'hn', '2026-06-30 22:00:00+00', 'Group C'),
('Morocco', 'Cuba',     'ma', 'cu', '2026-06-30 22:00:00+00', 'Group C'),

-- ── GROUP D: Argentina · Colombia · Chile · Venezuela ────────────────────────
-- MD1 – 12 Jun
('Argentina', 'Colombia',  'ar', 'co', '2026-06-12 19:00:00+00', 'Group D'),
('Chile',     'Venezuela', 'cl', 've', '2026-06-13 01:00:00+00', 'Group D'),
-- MD2 – 21 Jun
('Argentina', 'Chile',     'ar', 'cl', '2026-06-21 19:00:00+00', 'Group D'),
('Colombia',  'Venezuela', 'co', 've', '2026-06-22 01:00:00+00', 'Group D'),
-- MD3 – 30 Jun (simultaneous)
('Argentina', 'Venezuela', 'ar', 've', '2026-06-30 19:00:00+00', 'Group D'),
('Colombia',  'Chile',     'co', 'cl', '2026-06-30 19:00:00+00', 'Group D'),

-- ── GROUP E: France · Croatia · Algeria · Tunisia ────────────────────────────
-- MD1 – 13 Jun
('France',  'Croatia', 'fr', 'hr', '2026-06-13 16:00:00+00', 'Group E'),
('Algeria', 'Tunisia', 'dz', 'tn', '2026-06-13 22:00:00+00', 'Group E'),
-- MD2 – 22 Jun
('France',  'Algeria', 'fr', 'dz', '2026-06-22 16:00:00+00', 'Group E'),
('Croatia', 'Tunisia', 'hr', 'tn', '2026-06-22 22:00:00+00', 'Group E'),
-- MD3 – 01 Jul (simultaneous)
('France',  'Tunisia', 'fr', 'tn', '2026-07-01 22:00:00+00', 'Group E'),
('Croatia', 'Algeria', 'hr', 'dz', '2026-07-01 22:00:00+00', 'Group E'),

-- ── GROUP F: Spain · Japan · South Africa · Saudi Arabia ─────────────────────
-- MD1 – 13 Jun
('Spain',        'Japan',        'es', 'jp', '2026-06-13 19:00:00+00', 'Group F'),
('South Africa', 'Saudi Arabia', 'za', 'sa', '2026-06-14 01:00:00+00', 'Group F'),
-- MD2 – 22 Jun
('Spain',        'South Africa', 'es', 'za', '2026-06-22 19:00:00+00', 'Group F'),
('Japan',        'Saudi Arabia', 'jp', 'sa', '2026-06-23 01:00:00+00', 'Group F'),
-- MD3 – 01 Jul (simultaneous)
('Spain',        'Saudi Arabia', 'es', 'sa', '2026-07-01 19:00:00+00', 'Group F'),
('Japan',        'South Africa', 'jp', 'za', '2026-07-01 19:00:00+00', 'Group F'),

-- ── GROUP G: Brazil · Uruguay · Ivory Coast · New Zealand ────────────────────
-- MD1 – 14 Jun
('Brazil',      'Uruguay',     'br', 'uy', '2026-06-14 16:00:00+00', 'Group G'),
('Ivory Coast', 'New Zealand', 'ci', 'nz', '2026-06-14 22:00:00+00', 'Group G'),
-- MD2 – 23 Jun
('Brazil',      'Ivory Coast', 'br', 'ci', '2026-06-23 16:00:00+00', 'Group G'),
('Uruguay',     'New Zealand', 'uy', 'nz', '2026-06-23 22:00:00+00', 'Group G'),
-- MD3 – 02 Jul (simultaneous)
('Brazil',      'New Zealand', 'br', 'nz', '2026-07-02 22:00:00+00', 'Group G'),
('Uruguay',     'Ivory Coast', 'uy', 'ci', '2026-07-02 22:00:00+00', 'Group G'),

-- ── GROUP H: England · Serbia · Poland · Cameroon ────────────────────────────
-- MD1 – 14 Jun
('England', 'Serbia',   'gb-eng', 'rs', '2026-06-14 19:00:00+00', 'Group H'),
('Poland',  'Cameroon', 'pl',     'cm', '2026-06-15 01:00:00+00', 'Group H'),
-- MD2 – 23 Jun
('England', 'Poland',   'gb-eng', 'pl', '2026-06-23 19:00:00+00', 'Group H'),
('Serbia',  'Cameroon', 'rs',     'cm', '2026-06-24 01:00:00+00', 'Group H'),
-- MD3 – 02 Jul (simultaneous)
('England', 'Cameroon', 'gb-eng', 'cm', '2026-07-02 19:00:00+00', 'Group H'),
('Serbia',  'Poland',   'rs',     'pl', '2026-07-02 19:00:00+00', 'Group H'),

-- ── GROUP I: Germany · South Korea · Turkey · Qatar ──────────────────────────
-- MD1 – 15 Jun
('Germany',     'South Korea', 'de', 'kr', '2026-06-15 16:00:00+00', 'Group I'),
('Turkey',      'Qatar',       'tr', 'qa', '2026-06-15 22:00:00+00', 'Group I'),
-- MD2 – 24 Jun
('Germany',     'Turkey',      'de', 'tr', '2026-06-24 16:00:00+00', 'Group I'),
('South Korea', 'Qatar',       'kr', 'qa', '2026-06-24 22:00:00+00', 'Group I'),
-- MD3 – 03 Jul (simultaneous)
('Germany',     'Qatar',       'de', 'qa', '2026-07-03 22:00:00+00', 'Group I'),
('South Korea', 'Turkey',      'kr', 'tr', '2026-07-03 22:00:00+00', 'Group I'),

-- ── GROUP J: Portugal · Italy · Nigeria · Egypt ───────────────────────────────
-- MD1 – 15 Jun
('Portugal', 'Italy',   'pt', 'it', '2026-06-15 19:00:00+00', 'Group J'),
('Nigeria',  'Egypt',   'ng', 'eg', '2026-06-16 01:00:00+00', 'Group J'),
-- MD2 – 24 Jun
('Portugal', 'Nigeria', 'pt', 'ng', '2026-06-24 19:00:00+00', 'Group J'),
('Italy',    'Egypt',   'it', 'eg', '2026-06-25 01:00:00+00', 'Group J'),
-- MD3 – 03 Jul (simultaneous)
('Portugal', 'Egypt',   'pt', 'eg', '2026-07-03 19:00:00+00', 'Group J'),
('Italy',    'Nigeria', 'it', 'ng', '2026-07-03 19:00:00+00', 'Group J'),

-- ── GROUP K: Netherlands · Denmark · Australia · Iraq ────────────────────────
-- MD1 – 16 Jun
('Netherlands', 'Denmark',   'nl', 'dk', '2026-06-16 16:00:00+00', 'Group K'),
('Australia',   'Iraq',      'au', 'iq', '2026-06-16 22:00:00+00', 'Group K'),
-- MD2 – 25 Jun
('Netherlands', 'Australia', 'nl', 'au', '2026-06-25 16:00:00+00', 'Group K'),
('Denmark',     'Iraq',      'dk', 'iq', '2026-06-25 22:00:00+00', 'Group K'),
-- MD3 – 04 Jul (simultaneous)
('Netherlands', 'Iraq',      'nl', 'iq', '2026-07-04 22:00:00+00', 'Group K'),
('Denmark',     'Australia', 'dk', 'au', '2026-07-04 22:00:00+00', 'Group K'),

-- ── GROUP L: Belgium · Austria · Iran · Uzbekistan ───────────────────────────
-- MD1 – 16 Jun
('Belgium', 'Austria',    'be', 'at', '2026-06-16 19:00:00+00', 'Group L'),
('Iran',    'Uzbekistan', 'ir', 'uz', '2026-06-17 01:00:00+00', 'Group L'),
-- MD2 – 25 Jun
('Belgium', 'Iran',       'be', 'ir', '2026-06-25 19:00:00+00', 'Group L'),
('Austria', 'Uzbekistan', 'at', 'uz', '2026-06-26 01:00:00+00', 'Group L'),
-- MD3 – 04 Jul (simultaneous)
('Belgium', 'Uzbekistan', 'be', 'uz', '2026-07-04 19:00:00+00', 'Group L'),
('Austria', 'Iran',       'at', 'ir', '2026-07-04 19:00:00+00', 'Group L');

COMMIT;

SELECT count(*) AS total_matches, stage FROM matches GROUP BY stage ORDER BY stage;

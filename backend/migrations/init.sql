-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id   VARCHAR(255) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  avatar      VARCHAR(500),
  is_admin    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  invite_code VARCHAR(8)   UNIQUE NOT NULL,
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id   UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team          VARCHAR(100) NOT NULL,
  away_team          VARCHAR(100) NOT NULL,
  home_country_code  VARCHAR(10),
  away_country_code  VARCHAR(10),
  match_time         TIMESTAMPTZ  NOT NULL,
  home_score         INTEGER,
  away_score         INTEGER,
  status             VARCHAR(20) DEFAULT 'upcoming',  -- upcoming | live | finished
  stage              VARCHAR(50),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if upgrading an existing database
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_country_code VARCHAR(10);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_country_code VARCHAR(10);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS round VARCHAR(20) DEFAULT 'GROUP';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_number INTEGER;

CREATE TABLE IF NOT EXISTS predictions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id)   ON DELETE CASCADE,
  match_id       UUID REFERENCES matches(id) ON DELETE CASCADE,
  room_id        UUID REFERENCES rooms(id)   ON DELETE CASCADE,
  home_score_pred INTEGER NOT NULL,
  away_score_pred INTEGER NOT NULL,
  points_earned  INTEGER DEFAULT 0,
  is_early       BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, match_id, room_id)
);

CREATE TABLE IF NOT EXISTS leaderboard_cache (
  room_id              UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id              UUID REFERENCES users(id) ON DELETE CASCADE,
  total_points         INTEGER DEFAULT 0,
  streak               INTEGER DEFAULT 0,
  correct_predictions  INTEGER DEFAULT 0,
  last_updated         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_predictions_match    ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_room ON predictions(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_matches_status        ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_time          ON matches(match_time);

-- Sample World Cup 2026 matches
INSERT INTO matches (home_team, away_team, home_country_code, away_country_code, match_time, stage) VALUES
  ('Argentina',   'Morocco',     'ar',     'ma',  '2026-06-11 16:00:00+00', 'Group A'),
  ('Brazil',      'Serbia',      'br',     'rs',  '2026-06-11 19:00:00+00', 'Group B'),
  ('France',      'Mexico',      'fr',     'mx',  '2026-06-12 16:00:00+00', 'Group C'),
  ('Germany',     'Japan',       'de',     'jp',  '2026-06-12 19:00:00+00', 'Group D'),
  ('Spain',       'USA',         'es',     'us',  '2026-06-13 16:00:00+00', 'Group E'),
  ('England',     'Colombia',    'gb-eng', 'co',  '2026-06-13 19:00:00+00', 'Group F'),
  ('Portugal',    'Uruguay',     'pt',     'uy',  '2026-06-14 16:00:00+00', 'Group G'),
  ('Netherlands', 'Ecuador',     'nl',     'ec',  '2026-06-14 19:00:00+00', 'Group H')
ON CONFLICT DO NOTHING;

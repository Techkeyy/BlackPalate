-- BlackPalate PostgreSQL / Neon Database Schema
-- Production Relational Storage for Multi-User Tasting Campaigns & Rewards

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  flynet_id TEXT UNIQUE,
  name TEXT NOT NULL,
  cuisine TEXT[] NOT NULL DEFAULT '{}',
  neighborhood TEXT,
  price_tier INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  dish_focus TEXT NOT NULL,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  target_cuisines TEXT[] NOT NULL DEFAULT '{}',
  min_total_check_ins INTEGER NOT NULL DEFAULT 1,
  min_cuisine_visits INTEGER NOT NULL DEFAULT 0,
  must_be_new_to_venue BOOLEAN NOT NULL DEFAULT FALSE,
  reward_fly TEXT NOT NULL DEFAULT '5',
  reward_fly_wei TEXT,
  max_slots INTEGER NOT NULL DEFAULT 10,
  filled_slots INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  feedback_questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  diner_flynet_id TEXT NOT NULL,
  diner_name TEXT,
  diner_avatar TEXT,
  qualification_proof JSONB,
  status TEXT NOT NULL DEFAULT 'QUALIFIED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_campaign_diner UNIQUE (campaign_id, diner_flynet_id)
);

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  diner_flynet_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  ratings JSONB NOT NULL,
  answers JSONB NOT NULL,
  dish_feedback TEXT NOT NULL,
  suggestions TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_receipts (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  diner_flynet_id TEXT NOT NULL,
  amount_fly TEXT NOT NULL,
  amount_fly_wei TEXT NOT NULL,
  tx_hash TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  issued_at TIMESTAMPTZ,
  error TEXT
);

CREATE TABLE IF NOT EXISTS synthesis_reports (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  executive_summary TEXT NOT NULL,
  flavor_analysis TEXT NOT NULL,
  cohort_trends JSONB NOT NULL,
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  raw_submission_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_applications_diner ON applications(diner_flynet_id);
CREATE INDEX IF NOT EXISTS idx_feedback_campaign ON feedback_submissions(campaign_id);


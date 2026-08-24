-- Traqqy Baseline Migration
-- This migration creates the complete database schema from the Drizzle definitions.
-- Run with: psql $DATABASE_URL -f lib/db/migrations/0000_baseline.sql

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. user_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  theme TEXT NOT NULL DEFAULT 'system',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  health_preferences TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (clerk_id) REFERENCES users(clerk_id) ON DELETE CASCADE
);

-- ============================================================
-- 3. categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'Tag',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  clerk_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. subscriptions (with Trial/Lifetime + Cost Sharing columns)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  category_id INTEGER,
  price NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_cycle TEXT NOT NULL,
  renewal_date DATE,                                   -- NULLABLE: null for trial/lifetime
  payment_method TEXT,
  notes TEXT,
  subscription_type TEXT NOT NULL DEFAULT 'recurring', -- recurring | trial | lifetime
  trial_ends_at DATE,
  trial_converts_to_recurring BOOLEAN,
  recurring_price NUMERIC(10, 2),
  recurring_billing_cycle TEXT,
  purchase_date DATE,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  split_mode TEXT NOT NULL DEFAULT 'equal',            -- equal | custom
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ============================================================
-- 5. subscription_shares
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_shares (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  is_current_user BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

-- ============================================================
-- 6. reminders
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  subscription_id INTEGER NOT NULL,
  days_before INTEGER NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  scheduled_send_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

-- Unique index: one reminder per subscription per days_before value per user
CREATE UNIQUE INDEX IF NOT EXISTS reminders_subscription_days_idx
  ON reminders(subscription_id, days_before);

-- ============================================================
-- 7. gmail_connections
-- ============================================================
CREATE TABLE IF NOT EXISTS gmail_connections (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. auto_import_scans
-- ============================================================
CREATE TABLE IF NOT EXISTS auto_import_scans (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  months_back INTEGER NOT NULL DEFAULT 12,
  emails_found INTEGER NOT NULL DEFAULT 0,
  emails_processed INTEGER NOT NULL DEFAULT 0,
  candidates_found INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. auto_import_candidates
-- ============================================================
CREATE TABLE IF NOT EXISTS auto_import_candidates (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL,
  clerk_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  catalog_match_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  billing_cycle TEXT,
  last_payment_date DATE,
  confidence INTEGER NOT NULL,
  confidence_label TEXT NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]',
  evidence_count INTEGER NOT NULL DEFAULT 1,
  duplicate_of_subscription_id INTEGER,
  email_sender TEXT,
  email_subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (scan_id) REFERENCES auto_import_scans(id) ON DELETE CASCADE,
  FOREIGN KEY (duplicate_of_subscription_id) REFERENCES subscriptions(id) ON DELETE NO ACTION
);

-- src/db/schema.sql
-- Full PostgreSQL schema — Nexus AI Pro v3.0.0
-- Created: 2026-06-11

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy username search

-- =============================================
-- ENUMS
-- =============================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'dev', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('card', 'crypto', 'gift_card', 'bank_transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_type AS ENUM ('coding', 'game_dev', 'ar_vr', '3d', 'app_dev', 'web_dev');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mfa_method AS ENUM ('totp', 'sms', 'email', 'backup_code');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE biometric_method AS ENUM ('fingerprint', 'touch_id', 'face_id', 'retinal', 'windows_hello', 'webauthn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE social_platform AS ENUM ('tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs', 'youtube', 'twitter');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE game_platform AS ENUM ('epic_games', 'sony_psn', 'microsoft_xbox', 'ubisoft', 'steam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- USERS
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- username supports emoji and unicode; uniqueness enforced via normalized form
  username        TEXT UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 2 AND 64),
  username_lower  TEXT UNIQUE GENERATED ALWAYS AS (lower(username)) STORED,
  email           CITEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  display_name    TEXT CHECK (char_length(display_name) <= 128),
  avatar_url      TEXT,
  bio             TEXT CHECK (char_length(bio) <= 500),
  locale          VARCHAR(10) DEFAULT 'en',
  timezone        VARCHAR(64) DEFAULT 'UTC',
  role            user_role NOT NULL DEFAULT 'user',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  last_login_ip   INET,
  login_count     INTEGER NOT NULL DEFAULT 0,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  settings        JSONB NOT NULL DEFAULT '{}',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- MFA
-- =============================================
CREATE TABLE IF NOT EXISTS user_mfa (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method        mfa_method NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  is_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  -- TOTP secret stored encrypted (never plaintext)
  secret_enc    TEXT,
  phone_hash    TEXT, -- bcrypt hash of phone number for SMS
  backup_codes  TEXT[], -- bcrypt hashed backup codes
  verified_at   TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, method)
);

-- =============================================
-- BIOMETRICS (WebAuthn credentials)
-- =============================================
CREATE TABLE IF NOT EXISTS user_biometrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method          biometric_method NOT NULL,
  credential_id   TEXT NOT NULL UNIQUE,
  public_key      TEXT NOT NULL,
  counter         BIGINT NOT NULL DEFAULT 0,
  device_name     TEXT,
  platform        VARCHAR(32),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ
);

-- =============================================
-- SESSIONS & TOKENS
-- =============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  ip_address    INET,
  user_agent    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTIONS & PAYMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                  subscription_plan NOT NULL DEFAULT 'free',
  status                subscription_status NOT NULL DEFAULT 'active',
  payment_method        payment_method,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  coinbase_charge_id    TEXT,
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  trial_end             TIMESTAMPTZ,
  canceled_at           TIMESTAMPTZ,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_cards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_hash     TEXT NOT NULL UNIQUE,
  plan          subscription_plan NOT NULL,
  duration_days INTEGER NOT NULL,
  redeemed_by   UUID REFERENCES users(id),
  redeemed_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount_cents    INTEGER NOT NULL,
  currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
  method          payment_method NOT NULL,
  provider_txn_id TEXT,
  status          VARCHAR(32) NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- CHATS & MESSAGES
-- =============================================
CREATE TABLE IF NOT EXISTS chats (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New Chat',
  model_type  VARCHAR(64) NOT NULL DEFAULT 'claude',
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id           UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role              VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content           TEXT,
  content_enc       BYTEA,
  is_encrypted      BOOLEAN NOT NULL DEFAULT TRUE,
  model_type        VARCHAR(64),
  tokens_used       INTEGER,
  reasoning_steps   TEXT[],
  attachment_urls   TEXT[],
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PROJECTS
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  type          project_type NOT NULL,
  status        VARCHAR(32) NOT NULL DEFAULT 'active',
  -- Game-specific
  engine        VARCHAR(64),
  platforms     TEXT[],
  -- Progress
  progress      SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  milestones    JSONB NOT NULL DEFAULT '[]',
  -- Integrations
  repo_url      TEXT,
  build_url     TEXT,
  -- Tracking
  last_commit   TIMESTAMPTZ,
  last_build    TIMESTAMPTZ,
  build_status  VARCHAR(32),
  tags          TEXT[],
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type  VARCHAR(64) NOT NULL,
  actor_id    UUID REFERENCES users(id),
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_achievements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  platform        game_platform,
  platform_game_id TEXT,
  achievement_id  TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  icon_url        TEXT,
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata        JSONB NOT NULL DEFAULT '{}',
  UNIQUE(user_id, platform, achievement_id)
);

-- =============================================
-- SOCIAL INTEGRATIONS & ANALYTICS
-- =============================================
CREATE TABLE IF NOT EXISTS social_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform        social_platform NOT NULL,
  platform_user_id TEXT NOT NULL,
  username        TEXT,
  display_name    TEXT,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes          TEXT[],
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at  TIMESTAMPTZ,
  UNIQUE(user_id, platform, platform_user_id)
);

CREATE TABLE IF NOT EXISTS social_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  followers       BIGINT,
  following       BIGINT,
  total_posts     BIGINT,
  total_views     BIGINT,
  total_likes     BIGINT,
  total_comments  BIGINT,
  total_shares    BIGINT,
  reach           BIGINT,
  impressions     BIGINT,
  engagement_rate NUMERIC(6,4),
  watch_time_sec  BIGINT,
  avg_view_duration_sec INTEGER,
  subscriber_growth INTEGER,
  metadata        JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS post_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform_post_id TEXT NOT NULL,
  post_type       VARCHAR(32),
  title           TEXT,
  thumbnail_url   TEXT,
  published_at    TIMESTAMPTZ,
  views           BIGINT NOT NULL DEFAULT 0,
  likes           BIGINT NOT NULL DEFAULT 0,
  comments        BIGINT NOT NULL DEFAULT 0,
  shares          BIGINT NOT NULL DEFAULT 0,
  saves           BIGINT NOT NULL DEFAULT 0,
  reach           BIGINT NOT NULL DEFAULT 0,
  impressions     BIGINT NOT NULL DEFAULT 0,
  watch_time_sec  BIGINT,
  avg_view_pct    NUMERIC(5,2),
  retention_curve JSONB,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, platform_post_id)
);

-- =============================================
-- SECURITY
-- =============================================
CREATE TABLE IF NOT EXISTS security_scans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id),
  scan_type     VARCHAR(64) NOT NULL,
  status        VARCHAR(32) NOT NULL DEFAULT 'running',
  score         SMALLINT,
  findings      JSONB NOT NULL DEFAULT '[]',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  metadata      JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS security_alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id),
  scan_id       UUID REFERENCES security_scans(id),
  severity      alert_severity NOT NULL,
  category      VARCHAR(64) NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  remediation   TEXT,
  is_resolved   BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES users(id),
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- AUDIT LOG (minimal — only key events)
-- =============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  event       VARCHAR(64) NOT NULL,
  ip_address  INET,
  user_agent  TEXT,
  result      VARCHAR(16) NOT NULL DEFAULT 'success',
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS audit_log_2026 PARTITION OF audit_log
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS audit_log_2027 PARTITION OF audit_log
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- =============================================
-- GAMING INTEGRATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS gaming_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform        game_platform NOT NULL,
  platform_user_id TEXT NOT NULL,
  gamertag        TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at  TIMESTAMPTZ,
  UNIQUE(user_id, platform, platform_user_id)
);

CREATE TABLE IF NOT EXISTS game_library (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gaming_account_id UUID NOT NULL REFERENCES gaming_accounts(id) ON DELETE CASCADE,
  platform_game_id  TEXT NOT NULL,
  title             TEXT NOT NULL,
  cover_url         TEXT,
  playtime_mins     INTEGER NOT NULL DEFAULT 0,
  last_played_at    TIMESTAMPTZ,
  achievement_count INTEGER NOT NULL DEFAULT 0,
  achievement_total INTEGER NOT NULL DEFAULT 0,
  metadata          JSONB NOT NULL DEFAULT '{}',
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(gaming_account_id, platform_game_id)
);

-- =============================================
-- DEV INTEGRATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS dev_integrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        VARCHAR(32) NOT NULL,
  provider_user_id TEXT,
  username        TEXT,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes          TEXT[],
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_metrics_account ON social_metrics(account_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_metrics_account ON post_metrics(account_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON security_alerts(user_id, is_resolved, severity);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON audit_log(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gaming_accounts_user ON gaming_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_game_library_account ON game_library(gaming_account_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY['users','subscriptions','chats','projects']) LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', t);
  EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
END LOOP; END; $$;

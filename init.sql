-- nexus-ai-pro/init.sql | 2026-04-17
-- Copyright © 2025-2026 Cameron Fox. All rights reserved.
-- Enterprise schema: auth/2FA/MFA, social analytics, payments, projects, security, i18n, audit

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'developer', 'admin', 'superadmin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification', 'banned');
CREATE TYPE mfa_method AS ENUM ('totp', 'sms', 'email', 'passkey', 'biometric');
CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing', 'incomplete');
CREATE TYPE payment_method_type AS ENUM ('card', 'crypto', 'gift_card', 'bank_transfer');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'disputed');
CREATE TYPE project_type AS ENUM ('web', 'mobile', 'desktop', 'game', 'ar_vr', 'blockchain', 'ai_ml', 'other');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed', 'archived');
CREATE TYPE platform_connector AS ENUM ('unreal', 'unity', 'godot', 'sony_psn', 'xbox_live', 'steam', 'ubisoft', 'epic_games', 'github', 'gitlab', 'bitbucket', 'azure', 'aws', 'gcp', 'slack', 'discord', 'jira', 'linear');
CREATE TYPE social_platform AS ENUM ('tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs', 'youtube', 'twitter_x');
CREATE TYPE alert_severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');
CREATE TYPE scan_type AS ENUM ('vulnerability', 'network', 'on_device', 'dependency', 'full');

-- ============================================================
-- USERS & AUTH
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username        TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  phone           TEXT,
  phone_verified  BOOLEAN NOT NULL DEFAULT false,
  password_hash   TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'user',
  status          user_status NOT NULL DEFAULT 'pending_verification',
  tier            subscription_tier NOT NULL DEFAULT 'free',
  display_name    TEXT,
  avatar_url      TEXT,
  locale          TEXT NOT NULL DEFAULT 'en',
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  last_login_at   TIMESTAMPTZ,
  last_login_ip   INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mfa_configs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method          mfa_method NOT NULL,
  secret          TEXT,
  backup_codes    TEXT[],
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  verified        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, method)
);

CREATE TABLE biometric_credentials (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id   TEXT NOT NULL UNIQUE,
  public_key      TEXT NOT NULL,
  sign_count      BIGINT NOT NULL DEFAULT 0,
  device_type     TEXT,
  platform        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  ip              INET,
  user_agent      TEXT,
  platform        TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS & PAYMENTS
-- ============================================================
CREATE TABLE subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  tier                   subscription_tier NOT NULL DEFAULT 'free',
  status                 subscription_status NOT NULL DEFAULT 'active',
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_methods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            payment_method_type NOT NULL,
  stripe_pm_id    TEXT,
  last_four       TEXT,
  brand           TEXT,
  crypto_address  TEXT,
  gift_card_code  TEXT,
  gift_card_balance INTEGER,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id),
  subscription_id   UUID REFERENCES subscriptions(id),
  stripe_payment_id TEXT,
  amount_cents      INTEGER NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'usd',
  method            payment_method_type NOT NULL,
  status            payment_status NOT NULL DEFAULT 'pending',
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gift_cards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_hash     TEXT NOT NULL UNIQUE,
  amount_cents  INTEGER NOT NULL,
  balance_cents INTEGER NOT NULL,
  redeemed_by   UUID REFERENCES users(id),
  redeemed_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOCIAL ANALYTICS
-- ============================================================
CREATE TABLE social_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform        social_platform NOT NULL,
  platform_uid    TEXT NOT NULL,
  handle          TEXT NOT NULL,
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires   TIMESTAMPTZ,
  scopes          TEXT[],
  is_active       BOOLEAN NOT NULL DEFAULT true,
  connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE TABLE social_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform        social_platform NOT NULL,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  followers       BIGINT,
  following       BIGINT,
  posts           INTEGER,
  views           BIGINT,
  likes           BIGINT,
  comments        BIGINT,
  shares          BIGINT,
  reach           BIGINT,
  impressions     BIGINT,
  engagement_rate NUMERIC(6,4),
  watch_time_sec  BIGINT,
  avg_view_pct    NUMERIC(5,2),
  top_posts       JSONB,
  demographics    JSONB,
  extra           JSONB
);

CREATE TABLE social_posts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id       UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform_post_id TEXT NOT NULL,
  title            TEXT,
  content          TEXT,
  media_type       TEXT,
  published_at     TIMESTAMPTZ,
  views            BIGINT DEFAULT 0,
  likes            BIGINT DEFAULT 0,
  comments         BIGINT DEFAULT 0,
  shares           BIGINT DEFAULT 0,
  reach            BIGINT DEFAULT 0,
  retention_data   JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROJECT TRACKING
-- ============================================================
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  type          project_type NOT NULL DEFAULT 'web',
  status        project_status NOT NULL DEFAULT 'planning',
  platform      TEXT[],
  engines       TEXT[],
  repo_url      TEXT,
  cover_url     TEXT,
  target_date   DATE,
  tags          TEXT[],
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_milestones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES project_milestones(id),
  assignee_id  UUID REFERENCES users(id),
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'todo',
  priority     TEXT NOT NULL DEFAULT 'medium',
  tags         TEXT[],
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_connectors (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform       platform_connector NOT NULL,
  credentials    TEXT,
  config         JSONB,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE game_achievements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform       TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  icon_url       TEXT,
  points         INTEGER DEFAULT 0,
  rarity         TEXT,
  unlocked_at    TIMESTAMPTZ,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE game_progress (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL,
  progress_pct NUMERIC(5,2) DEFAULT 0,
  playtime_sec BIGINT DEFAULT 0,
  level        INTEGER DEFAULT 1,
  score        BIGINT DEFAULT 0,
  save_data    JSONB,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECURITY
-- ============================================================
CREATE TABLE security_scans (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiated_by UUID REFERENCES users(id),
  type         scan_type NOT NULL DEFAULT 'full',
  status       TEXT NOT NULL DEFAULT 'running',
  score        INTEGER,
  findings     JSONB,
  summary      TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE security_alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id     UUID REFERENCES security_scans(id),
  severity    alert_severity NOT NULL DEFAULT 'medium',
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  source_ip   INET,
  resolved    BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE network_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  source_ip  INET,
  dest_ip    INET,
  dest_port  INTEGER,
  protocol   TEXT,
  bytes      BIGINT,
  action     TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG (minimal, labeled, dated)
-- ============================================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label       TEXT NOT NULL,
  actor_id    UUID REFERENCES users(id),
  actor_role  user_role,
  target_type TEXT,
  target_id   UUID,
  ip          INET,
  user_agent  TEXT,
  result      TEXT NOT NULL DEFAULT 'ok',
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI CHAT & MEMORY
-- ============================================================
CREATE TABLE chats (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'New Chat',
  model      TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  pinned     BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  content     TEXT,
  encrypted   BOOLEAN NOT NULL DEFAULT false,
  iv          TEXT,
  attachments JSONB,
  tokens_used INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE memories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL DEFAULT 'general',
  content    TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  tags       TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE api_usage (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id),
  model             TEXT NOT NULL,
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens      INTEGER GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  cost_usd          NUMERIC(10, 6),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- I18N
-- ============================================================
CREATE TABLE translation_overrides (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  locale     TEXT NOT NULL,
  namespace  TEXT NOT NULL DEFAULT 'common',
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(locale, namespace, key)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_role      ON users(role);
CREATE INDEX idx_sessions_user   ON sessions(user_id);
CREATE INDEX idx_sessions_token  ON sessions(token_hash);
CREATE INDEX idx_mfa_user        ON mfa_configs(user_id);
CREATE INDEX idx_social_account  ON social_accounts(user_id, platform);
CREATE INDEX idx_social_metrics  ON social_metrics(account_id, captured_at DESC);
CREATE INDEX idx_projects_owner  ON projects(owner_id);
CREATE INDEX idx_tasks_project   ON project_tasks(project_id);
CREATE INDEX idx_scans_time      ON security_scans(started_at DESC);
CREATE INDEX idx_alerts_sev      ON security_alerts(severity, resolved);
CREATE INDEX idx_audit_actor     ON audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_label     ON audit_log(label, created_at DESC);
CREATE INDEX idx_net_events      ON network_events(created_at DESC);
CREATE INDEX idx_chats_user      ON chats(user_id);
CREATE INDEX idx_messages_chat   ON messages(chat_id);
CREATE INDEX idx_payments_user   ON payments(user_id, created_at DESC);
CREATE INDEX idx_api_usage_user  ON api_usage(user_id, created_at DESC);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_users_upd         BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subs_upd          BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_upd      BEFORE UPDATE ON payments      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_upd      BEFORE UPDATE ON projects      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tasks_upd         BEFORE UPDATE ON project_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_chats_upd         BEFORE UPDATE ON chats         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_memories_upd      BEFORE UPDATE ON memories      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

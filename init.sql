-- File: init.sql | Date: 2026-06-16 | Nexus AI Pro
-- PostgreSQL database schema v2.1.0

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enum Types ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'moderator', 'developer', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_type AS ENUM ('webapp', 'mobile', 'desktop', 'api', 'gamedev', 'arvr', '3d', 'library', 'cli', 'embedded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('planning', 'active', 'paused', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE game_phase AS ENUM ('concept', 'pre_production', 'production', 'alpha', 'beta', 'gold', 'live', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE achievement_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_severity AS ENUM ('info', 'warn', 'error', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('card', 'crypto', 'gift_card', 'apple_pay', 'google_pay', 'bank_transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             TEXT NOT NULL UNIQUE,
  username          TEXT NOT NULL UNIQUE,
  display_name      TEXT,
  password_hash     TEXT NOT NULL,
  role              user_role NOT NULL DEFAULT 'user',
  avatar_url        TEXT,
  bio               TEXT,
  locale            TEXT DEFAULT 'en',
  timezone          TEXT DEFAULT 'UTC',
  mfa_secret        TEXT,
  mfa_enabled       BOOLEAN DEFAULT FALSE,
  mfa_backup_codes  TEXT[],
  biometric_cred_id TEXT,
  biometric_enabled BOOLEAN DEFAULT FALSE,
  is_suspended      BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,
  email_verified    BOOLEAN DEFAULT FALSE,
  settings          JSONB DEFAULT '{}',
  last_login        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ── Sessions & Tokens ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  device_info JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Subscriptions & Payments ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id   TEXT,
  stripe_sub_id        TEXT UNIQUE,
  plan_id              TEXT NOT NULL,
  plan_name            TEXT NOT NULL,
  status               subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end            TIMESTAMPTZ,
  payment_method_type  payment_method_type DEFAULT 'card',
  crypto_address       TEXT,
  gift_card_codes      TEXT[],
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_sub_id);

CREATE TABLE IF NOT EXISTS gift_cards (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'usd',
  redeemed_by  UUID REFERENCES users(id),
  redeemed_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Analytics & Social Media ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_connections (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform       TEXT NOT NULL,
  platform_uid   TEXT,
  username       TEXT,
  access_token   BYTEA,
  refresh_token  BYTEA,
  token_expires  TIMESTAMPTZ,
  scopes         TEXT[],
  is_active      BOOLEAN DEFAULT TRUE,
  metadata       JSONB DEFAULT '{}',
  connected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced    TIMESTAMPTZ,
  UNIQUE(user_id, platform)
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform       TEXT NOT NULL,
  metric_type    TEXT NOT NULL,
  value          NUMERIC,
  metadata       JSONB DEFAULT '{}',
  captured_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_user_platform ON analytics_snapshots(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_analytics_captured ON analytics_snapshots(captured_at);

-- ── Projects ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  type         project_type NOT NULL DEFAULT 'webapp',
  status       project_status NOT NULL DEFAULT 'active',
  languages    TEXT[] DEFAULT '{}',
  frameworks   TEXT[] DEFAULT '{}',
  platforms    TEXT[] DEFAULT '{}',
  tags         TEXT[] DEFAULT '{}',
  repo_url     TEXT,
  deploy_url   TEXT,
  cover_image  TEXT,
  settings     JSONB DEFAULT '{}',
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

CREATE TABLE IF NOT EXISTS milestones (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  due_date     TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  priority     task_priority DEFAULT 'medium',
  is_completed BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES milestones(id),
  title        TEXT NOT NULL,
  description  TEXT,
  status       task_status NOT NULL DEFAULT 'todo',
  priority     task_priority NOT NULL DEFAULT 'medium',
  assignee_id  UUID REFERENCES users(id),
  due_date     TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  code_file    TEXT,
  line_number  INTEGER,
  labels       TEXT[] DEFAULT '{}',
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE TABLE IF NOT EXISTS project_activity (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id),
  type       TEXT NOT NULL,
  description TEXT,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS builds (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version    TEXT,
  platform   TEXT,
  status     TEXT NOT NULL,
  duration   INTEGER,
  errors     INTEGER DEFAULT 0,
  warnings   INTEGER DEFAULT 0,
  logs       TEXT,
  metadata   JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  ended_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Gaming ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  engine          TEXT,
  genre           TEXT,
  phase           game_phase DEFAULT 'concept',
  completion_pct  INTEGER DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  target_platforms TEXT[] DEFAULT '{}',
  team_size        INTEGER DEFAULT 1,
  cover_art       TEXT,
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_platform_connections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL,
  platform_uid TEXT,
  username     TEXT,
  access_token BYTEA,
  is_active    BOOLEAN DEFAULT TRUE,
  last_synced  TIMESTAMPTZ,
  metadata     JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE TABLE IF NOT EXISTS achievements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id        TEXT,
  platform       TEXT,
  achievement_id TEXT,
  name           TEXT NOT NULL,
  description    TEXT,
  icon           TEXT,
  rarity         achievement_rarity DEFAULT 'common',
  points         INTEGER DEFAULT 0,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata       JSONB DEFAULT '{}',
  UNIQUE(user_id, platform, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);

CREATE TABLE IF NOT EXISTS game_stats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id         TEXT NOT NULL,
  platform        TEXT,
  playtime_hours  NUMERIC DEFAULT 0,
  level           INTEGER,
  score           BIGINT,
  completion_pct  INTEGER,
  last_played     TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, game_id, platform)
);

-- ── Service Connectors ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS connector_configs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service      TEXT NOT NULL,
  display_name TEXT,
  credentials  BYTEA,
  settings     JSONB DEFAULT '{}',
  is_active    BOOLEAN DEFAULT TRUE,
  last_tested  TIMESTAMPTZ,
  metadata     JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, service)
);

-- ── Chats & Messages ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chats (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT DEFAULT 'New Chat',
  model_type  TEXT,
  is_pinned   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id, updated_at);

CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id           UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content           TEXT,
  model_type        TEXT,
  is_encrypted      BOOLEAN DEFAULT FALSE,
  encrypted_content BYTEA,
  attachment_urls   TEXT[] DEFAULT '{}',
  reasoning_steps   TEXT[] DEFAULT '{}',
  tokens_used       INTEGER,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at);

-- ── Workflows ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflows (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  nodes       JSONB DEFAULT '[]',
  connections JSONB DEFAULT '[]',
  is_active   BOOLEAN DEFAULT TRUE,
  last_run    TIMESTAMPTZ,
  run_count   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id  UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',
  input        JSONB,
  output       JSONB,
  error        TEXT,
  steps        JSONB DEFAULT '[]',
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Memories ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS memories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  category    TEXT DEFAULT 'general',
  importance  INTEGER DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, importance);

-- ── Audit Log ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  event      TEXT NOT NULL,
  details    JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  severity   audit_severity DEFAULT 'info',
  date_label DATE NOT NULL DEFAULT CURRENT_DATE,
  hash       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_log(event);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(date_label);

-- ── Content Moderation ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS moderation_queue (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id  UUID REFERENCES users(id),
  target_type  TEXT NOT NULL,
  target_id    UUID,
  reason       TEXT NOT NULL,
  description  TEXT,
  status       TEXT DEFAULT 'pending',
  reviewer_id  UUID REFERENCES users(id),
  reviewed_at  TIMESTAMPTZ,
  action_taken TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Auto-update timestamps ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_game_projects_updated_at BEFORE UPDATE ON game_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- init.sql | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10
-- PostgreSQL schema — full platform: auth, payments, analytics, projects, AI

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'dev', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_type AS ENUM ('coding', 'game-dev', 'ar-vr', '3d-modeling');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('planning', 'in-progress', 'testing', 'done', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE game_platform AS ENUM ('epic', 'psn', 'xbox', 'ubisoft', 'steam', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Core Tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email             VARCHAR(254) UNIQUE NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    username          VARCHAR(64) UNIQUE,                       -- unicode/emoji safe
    display_name      VARCHAR(255),
    role              user_role NOT NULL DEFAULT 'user',
    avatar_url        TEXT,
    locale            VARCHAR(10) DEFAULT 'en',
    timezone          VARCHAR(64) DEFAULT 'UTC',
    settings          JSONB DEFAULT '{}',
    api_keys          JSONB DEFAULT '{}',                       -- encrypted externally
    -- MFA
    mfa_enabled       BOOLEAN DEFAULT FALSE,
    mfa_method        VARCHAR(20) DEFAULT 'totp',               -- totp | email | biometric
    totp_secret       TEXT,                                     -- encrypted
    pending_totp      TEXT,
    -- Biometrics
    biometric_enabled BOOLEAN DEFAULT FALSE,
    webauthn_creds    JSONB DEFAULT '[]',
    -- Stripe
    stripe_customer_id VARCHAR(64),
    -- Timestamps
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login        TIMESTAMP WITH TIME ZONE,
    deactivated_at    TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(128) NOT NULL UNIQUE,
    device_fp       VARCHAR(128),
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chats (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    model_type VARCHAR(50) NOT NULL DEFAULT 'claude',
    is_pinned  BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id           UUID REFERENCES chats(id) ON DELETE CASCADE,
    role              VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system')),
    content           TEXT NOT NULL,
    model_type        VARCHAR(50),
    is_encrypted      BOOLEAN DEFAULT TRUE,
    encrypted_content BYTEA,
    attachment_urls   TEXT[],
    reasoning_steps   TEXT[],
    reasoning_duration INTEGER,
    tokens_used       INTEGER,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    category    VARCHAR(50) DEFAULT 'general',
    importance  INTEGER DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflows (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    nodes       JSONB DEFAULT '[]',
    connections JSONB DEFAULT '[]',
    is_active   BOOLEAN DEFAULT FALSE,
    last_run    TIMESTAMP WITH TIME ZONE,
    run_count   INTEGER DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id  UUID REFERENCES workflows(id) ON DELETE CASCADE,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    input        JSONB DEFAULT '{}',
    output       JSONB,
    error        TEXT,
    started_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ── Payments ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(64) UNIQUE,
    stripe_customer_id   VARCHAR(64),
    plan_id              VARCHAR(20) NOT NULL DEFAULT 'free',
    status               subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end   TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    trial_end            TIMESTAMP WITH TIME ZONE,
    metadata             JSONB DEFAULT '{}',
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    stripe_invoice_id VARCHAR(64) UNIQUE,
    amount_paid       INTEGER NOT NULL DEFAULT 0,
    currency          VARCHAR(3) DEFAULT 'usd',
    status            VARCHAR(20) NOT NULL,
    pdf_url           TEXT,
    hosted_url        TEXT,
    paid_at           TIMESTAMP WITH TIME ZONE,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Analytics ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_analytics (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform     VARCHAR(30) NOT NULL,
    likes        BIGINT DEFAULT 0,
    reach        BIGINT DEFAULT 0,
    views        BIGINT DEFAULT 0,
    retention    DECIMAL(5,2) DEFAULT 0,
    followers    BIGINT DEFAULT 0,
    engagement   DECIMAL(5,2) DEFAULT 0,
    top_content  JSONB DEFAULT '[]',
    recorded_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform, date_trunc('day', recorded_at))
);

CREATE TABLE IF NOT EXISTS content_performance (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform     VARCHAR(30) NOT NULL,
    content_url  TEXT NOT NULL,
    title        VARCHAR(500),
    views        BIGINT DEFAULT 0,
    likes        BIGINT DEFAULT 0,
    shares       BIGINT DEFAULT 0,
    comments     BIGINT DEFAULT 0,
    watch_time   INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Project Tracking ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    type        project_type NOT NULL,
    status      project_status NOT NULL DEFAULT 'planning',
    metadata    JSONB DEFAULT '{}',
    milestones  JSONB DEFAULT '[]',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_metrics (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    metric_key VARCHAR(100) NOT NULL,
    value      JSONB NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Game / Platform Integrations ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_connections (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform     game_platform NOT NULL,
    platform_uid VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    access_token TEXT,              -- stored encrypted at application layer
    token_expiry TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform)
);

CREATE TABLE IF NOT EXISTS achievements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform        game_platform NOT NULL,
    platform_uid    VARCHAR(255),
    game_id         VARCHAR(255),
    game_title      VARCHAR(255),
    achievement_id  VARCHAR(255),
    title           VARCHAR(500),
    description     TEXT,
    points          INTEGER DEFAULT 0,
    unlocked        BOOLEAN DEFAULT FALSE,
    unlocked_at     TIMESTAMP WITH TIME ZONE,
    icon_url        TEXT,
    synced_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform, achievement_id)
);

CREATE TABLE IF NOT EXISTS game_progress (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform     game_platform NOT NULL,
    game_id      VARCHAR(255) NOT NULL,
    game_title   VARCHAR(255),
    completion   DECIMAL(5,2) DEFAULT 0,
    playtime     INTEGER DEFAULT 0,
    last_played  TIMESTAMP WITH TIME ZONE,
    trophies     JSONB DEFAULT '{}',
    synced_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform, game_id)
);

-- ── Audit & Telemetry ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    event      VARCHAR(80) NOT NULL,
    details    JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_usage (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    model_type   VARCHAR(50) NOT NULL,
    tokens_input  INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd     DECIMAL(10, 6) DEFAULT 0,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username     ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_uid ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id      ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at   ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id   ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_id   ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id  ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_uid  ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_uid ON social_analytics(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_projects_user_id   ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_type      ON projects(type);
CREATE INDEX IF NOT EXISTS idx_achievements_uid   ON achievements(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_game_progress_uid  ON game_progress(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_audit_log_uid      ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_ts       ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_uid      ON api_usage(user_id);

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','chats','workflows','subscriptions','projects','platform_connections']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I;
       CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- ── Cost Calculation ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_api_cost(model VARCHAR, tokens_in INTEGER, tokens_out INTEGER)
RETURNS DECIMAL AS $$
DECLARE cost DECIMAL(10, 6);
BEGIN
  CASE model
    WHEN 'claude'   THEN cost := (tokens_in * 0.000015) + (tokens_out * 0.000075);
    WHEN 'gpt4'     THEN cost := (tokens_in * 0.00003)  + (tokens_out * 0.00006);
    WHEN 'gemini'   THEN cost := (tokens_in * 0.00001)  + (tokens_out * 0.00003);
    WHEN 'deepseek' THEN cost := (tokens_in * 0.000001) + (tokens_out * 0.000002);
    ELSE                  cost := (tokens_in * 0.00001)  + (tokens_out * 0.00003);
  END CASE;
  RETURN cost;
END;
$$ LANGUAGE plpgsql;

-- ── Bootstrap ─────────────────────────────────────────────────────────────────

INSERT INTO users (email, password_hash, display_name, role)
VALUES ('system@nexusai.pro', 'SYSTEM_ACCOUNT_NO_LOGIN', 'System', 'admin')
ON CONFLICT (email) DO NOTHING;

GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

DO $$ BEGIN RAISE NOTICE 'Nexus AI Pro DB initialized — %', NOW(); END $$;

-- ================================================
-- NEXUS AI PRO — Database Schema v2.1
-- PostgreSQL · Updated: 2026-05-03
-- ================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users & Roles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email             VARCHAR(320) UNIQUE NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    -- username supports unicode/emoji; stored as TEXT to preserve full Unicode
    username          TEXT UNIQUE,
    display_name      TEXT,
    avatar_url        TEXT,
    role              VARCHAR(20) NOT NULL DEFAULT 'user'
                        CHECK (role IN ('admin','dev','moderator','user')),
    locale            VARCHAR(10) DEFAULT 'en',
    timezone          VARCHAR(60) DEFAULT 'UTC',
    settings          JSONB DEFAULT '{}',
    -- Biometric credential IDs stored as opaque bytes (WebAuthn)
    webauthn_credentials JSONB DEFAULT '[]',
    mfa_secret        TEXT,   -- encrypted TOTP secret; null = MFA not set up
    mfa_method        VARCHAR(20) CHECK (mfa_method IN ('totp','sms','email','biometric','none')),
    mfa_enabled       BOOLEAN DEFAULT FALSE,
    backup_codes      TEXT[],  -- hashed one-time recovery codes
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free','pro','enterprise')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id VARCHAR(50),
    is_active         BOOLEAN DEFAULT TRUE,
    email_verified    BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login        TIMESTAMP WITH TIME ZONE
);

-- ── Sessions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token_hash      VARCHAR(128) NOT NULL UNIQUE, -- SHA-256 of the JWT jti
    ip_address      INET,
    user_agent      TEXT,
    platform        VARCHAR(20), -- web | desktop | mobile | electron
    mfa_verified    BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Subscriptions & Payments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    stripe_sub_id       VARCHAR(100),
    plan                VARCHAR(20) NOT NULL CHECK (plan IN ('free','pro','enterprise')),
    billing_interval    VARCHAR(10) CHECK (billing_interval IN ('monthly','annual')),
    status              VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','canceled','past_due','trialing')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end   TIMESTAMP WITH TIME ZONE,
    amount_cents        INTEGER,
    currency            VARCHAR(3) DEFAULT 'USD',
    payment_method      VARCHAR(20) CHECK (payment_method IN ('card','crypto','giftcard')),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    event_type      VARCHAR(50) NOT NULL,  -- charge.succeeded, etc.
    amount_cents    INTEGER,
    currency        VARCHAR(3),
    provider        VARCHAR(20),           -- stripe | crypto | giftcard
    provider_event_id VARCHAR(255),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Social Analytics ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_accounts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    platform    VARCHAR(20) NOT NULL
                  CHECK (platform IN ('tiktok','instagram','facebook','twitch','discord','lemon8','reddit','redgifs')),
    account_id  TEXT NOT NULL,
    username    TEXT,
    -- OAuth tokens stored encrypted; never plaintext in DB
    token_enc   TEXT,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id  UUID REFERENCES social_accounts(id) ON DELETE CASCADE NOT NULL,
    platform    VARCHAR(20) NOT NULL,
    metric      VARCHAR(50) NOT NULL,
    value       BIGINT NOT NULL,
    snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_account_metric ON analytics_snapshots(account_id, metric, snapshot_at DESC);

-- ── Projects ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('coding','game_dev','ar_vr','three_d')),
    status          VARCHAR(20) DEFAULT 'active'
                      CHECK (status IN ('active','paused','completed','blocked','archived')),
    language        VARCHAR(50),
    engine          VARCHAR(50),
    progress        INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    lines_of_code   BIGINT DEFAULT 0,
    commit_count    INTEGER DEFAULT 0,
    open_issues     INTEGER DEFAULT 0,
    team_size       INTEGER DEFAULT 1,
    due_date        DATE,
    milestones      JSONB DEFAULT '[]',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_activity (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    event_type  VARCHAR(30) NOT NULL,  -- commit | issue_closed | deploy | etc.
    value       INTEGER DEFAULT 1,
    metadata    JSONB DEFAULT '{}',
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Gaming ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gaming_platforms (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    platform    VARCHAR(20) NOT NULL
                  CHECK (platform IN ('unreal','epic','sony','microsoft','ubisoft','steam')),
    account_id  TEXT,
    token_enc   TEXT,  -- encrypted OAuth/API token
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS achievements (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    platform    VARCHAR(20) NOT NULL,
    achievement_id VARCHAR(100) NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    tier        VARCHAR(10) CHECK (tier IN ('bronze','silver','gold','platinum','diamond')),
    xp          INTEGER DEFAULT 0,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, platform, achievement_id)
);

CREATE TABLE IF NOT EXISTS game_progress (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    platform    VARCHAR(20) NOT NULL,
    game_id     TEXT NOT NULL,
    game_name   TEXT,
    hours_played DECIMAL(10,2) DEFAULT 0,
    completion  INTEGER DEFAULT 0 CHECK (completion BETWEEN 0 AND 100),
    last_played TIMESTAMP WITH TIME ZONE,
    metadata    JSONB DEFAULT '{}',
    UNIQUE (user_id, platform, game_id)
);

-- ── Original AI Chat / Memory / Workflow Tables ───────────────────────────
CREATE TABLE IF NOT EXISTS chats (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    model_type  VARCHAR(50) NOT NULL DEFAULT 'claude',
    is_pinned   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id             UUID REFERENCES chats(id) ON DELETE CASCADE,
    role                VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system')),
    content             TEXT NOT NULL,
    model_type          VARCHAR(50),
    is_encrypted        BOOLEAN DEFAULT TRUE,
    encrypted_content   BYTEA,
    attachment_urls     TEXT[],
    reasoning_steps     TEXT[],
    reasoning_duration  INTEGER,
    tokens_used         INTEGER,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    input       JSONB DEFAULT '{}',
    output      JSONB,
    error       TEXT,
    started_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ── Audit Log (minimal) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    event       VARCHAR(50) NOT NULL,
    ip_address  INET,
    hash        VARCHAR(128),   -- HMAC of (event||user_id||timestamp)
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── API Usage ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    model_type      VARCHAR(50) NOT NULL,
    tokens_input    INTEGER DEFAULT 0,
    tokens_output   INTEGER DEFAULT 0,
    cost_usd        DECIMAL(10,6) DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email               ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role                ON users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_user             ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token            ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires          ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user        ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user      ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user             ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_type             ON projects(type);
CREATE INDEX IF NOT EXISTS idx_achievements_user         ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_user        ON game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id             ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id          ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_id          ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id         ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at      ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id         ON api_usage(user_id);

-- ── updated_at trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DO $$ BEGIN
  CREATE TRIGGER update_users_updated_at         BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_chats_updated_at         BEFORE UPDATE ON chats         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_workflows_updated_at     BEFORE UPDATE ON workflows     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER update_projects_updated_at      BEFORE UPDATE ON projects      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── API cost helper ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_api_cost(model VARCHAR, tokens_in INTEGER, tokens_out INTEGER)
RETURNS DECIMAL AS $$
DECLARE cost DECIMAL(10,6);
BEGIN
    CASE model
        WHEN 'claude'   THEN cost := (tokens_in * 0.000015)  + (tokens_out * 0.000075);
        WHEN 'gpt4'     THEN cost := (tokens_in * 0.00003)   + (tokens_out * 0.00006);
        WHEN 'gemini'   THEN cost := (tokens_in * 0.00001)   + (tokens_out * 0.00003);
        WHEN 'deepseek' THEN cost := (tokens_in * 0.000001)  + (tokens_out * 0.000002);
        ELSE                 cost := (tokens_in * 0.00001)   + (tokens_out * 0.00003);
    END CASE;
    RETURN cost;
END;
$$ LANGUAGE plpgsql;

-- ── Session cleanup helper ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ── Permissions ───────────────────────────────────────────────────────────
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

DO $$ BEGIN
    RAISE NOTICE '✅ Nexus AI Pro v2.1 database initialized successfully! (2026-05-03)';
END $$;

-- ================================================
-- NEXUS AI PRO - Database Initialization
-- PostgreSQL schema — auth, analytics, projects,
-- payments, connectors, MFA, roles, audit
-- Date: 2026-08-15
-- ================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";       -- case-insensitive text for emails/usernames

-- ================================================
-- ROLES ENUM
-- ================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'moderator', 'dev', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('card', 'crypto', 'giftcard', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_type AS ENUM ('coding', 'game', 'ar_vr', 'mobile', 'web', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================
-- USERS
-- ================================================
CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email            CITEXT UNIQUE NOT NULL,
    -- Username stored as text to preserve Unicode grapheme clusters (emoji etc.)
    username         TEXT UNIQUE NOT NULL
                     CONSTRAINT username_length CHECK (
                       octet_length(username) >= 3 AND octet_length(username) <= 256
                     ),
    password_hash    TEXT NOT NULL,
    display_name     TEXT,
    avatar_url       TEXT,
    role             user_role NOT NULL DEFAULT 'user',
    language         VARCHAR(10) NOT NULL DEFAULT 'en',
    subscription     subscription_tier NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    settings         JSONB NOT NULL DEFAULT '{}',
    mfa_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login       TIMESTAMPTZ
);

-- ================================================
-- MFA SECRETS (separate table — never returned in user queries)
-- ================================================
CREATE TABLE IF NOT EXISTS mfa_secrets (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    secret_enc  TEXT NOT NULL,            -- AES-256-GCM encrypted TOTP secret
    verified    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   TEXT NOT NULL,            -- SHA-256 of the backup code
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- SESSIONS (refresh tokens)
-- ================================================
CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,  -- SHA-256 of refresh token
    ip_address      INET,
    user_agent      TEXT,
    device_name     TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- CHATS & MESSAGES
-- ================================================
CREATE TABLE IF NOT EXISTS chats (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'New Chat',
    model_type  VARCHAR(60) NOT NULL DEFAULT 'claude',
    is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id           UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role              VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content           TEXT NOT NULL,
    model_type        VARCHAR(60),
    encrypted_content BYTEA,
    is_encrypted      BOOLEAN NOT NULL DEFAULT TRUE,
    attachment_urls   TEXT[],
    reasoning_steps   TEXT[],
    reasoning_duration INTEGER,
    tokens_used       INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- MEMORIES
-- ================================================
CREATE TABLE IF NOT EXISTS memories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    category    VARCHAR(50) NOT NULL DEFAULT 'general',
    importance  SMALLINT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- PROJECTS
-- ================================================
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    type            project_type NOT NULL DEFAULT 'coding',
    description     TEXT,
    language        VARCHAR(100),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    progress        SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    platforms       TEXT[],               -- game platform IDs
    connected_repos JSONB NOT NULL DEFAULT '[]',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_achievements (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    description   TEXT,
    icon          TEXT,
    progress      SMALLINT NOT NULL DEFAULT 0,
    unlocked      BOOLEAN NOT NULL DEFAULT FALSE,
    unlocked_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- PLATFORM CONNECTORS
-- ================================================
CREATE TABLE IF NOT EXISTS platform_connectors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform        VARCHAR(50) NOT NULL,
    display_name    TEXT,
    -- Tokens stored AES-256-GCM encrypted — decryption key in env
    access_token_enc  TEXT,
    refresh_token_enc TEXT,
    token_expires_at  TIMESTAMPTZ,
    scopes          TEXT[],
    metadata        JSONB NOT NULL DEFAULT '{}',
    connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, platform)
);

-- ================================================
-- ANALYTICS CACHE
-- ================================================
CREATE TABLE IF NOT EXISTS analytics_cache (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform    VARCHAR(50) NOT NULL,
    range       VARCHAR(10) NOT NULL,
    data        JSONB NOT NULL,
    fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, platform, range)
);

-- ================================================
-- PAYMENTS
-- ================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier                subscription_tier NOT NULL DEFAULT 'free',
    status              payment_status NOT NULL DEFAULT 'pending',
    payment_method      payment_method_type,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id     TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier            subscription_tier NOT NULL,
    amount_cents    INTEGER NOT NULL,
    currency        VARCHAR(10) NOT NULL DEFAULT 'USD',
    method          payment_method_type NOT NULL,
    status          payment_status NOT NULL DEFAULT 'pending',
    provider_ref    TEXT,              -- Stripe session ID, Coinbase charge ID, etc.
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_cards (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_hash   TEXT NOT NULL UNIQUE,   -- SHA-256 of the 16-char plain code
    tier        subscription_tier NOT NULL,
    used_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- WORKFLOWS
-- ================================================
CREATE TABLE IF NOT EXISTS workflows (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    nodes       JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    is_active   BOOLEAN NOT NULL DEFAULT FALSE,
    last_run    TIMESTAMPTZ,
    run_count   INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    input           JSONB NOT NULL DEFAULT '{}',
    output          JSONB,
    error           TEXT,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ================================================
-- AUDIT LOG (minimal, labeled, dated)
-- ================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    event       VARCHAR(80) NOT NULL,
    severity    VARCHAR(20) NOT NULL DEFAULT 'info',
    details     JSONB NOT NULL DEFAULT '{}',
    ip_address  INET,
    user_agent  TEXT,
    log_hash    TEXT NOT NULL,     -- HMAC-SHA256 integrity check
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- API USAGE METERING
-- ================================================
CREATE TABLE IF NOT EXISTS api_usage (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_type      VARCHAR(60) NOT NULL,
    tokens_input    INTEGER NOT NULL DEFAULT 0,
    tokens_output   INTEGER NOT NULL DEFAULT 0,
    cost_usd        NUMERIC(10, 6) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username      ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role          ON users(role);
CREATE INDEX IF NOT EXISTS idx_chats_user_id       ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at    ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id    ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_user_id    ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id    ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status     ON projects(status);
CREATE INDEX IF NOT EXISTS idx_connectors_user_id  ON platform_connectors(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache     ON analytics_cache(user_id, platform, range);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user  ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user   ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_hash     ON gift_cards(code_hash);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id   ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created   ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event     ON audit_log(event);
CREATE INDEX IF NOT EXISTS idx_api_usage_user      ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created   ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

-- ================================================
-- UPDATED_AT TRIGGER
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['users','chats','projects','workflows','subscriptions'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated ON %s;
       CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ================================================
-- API COST FUNCTION
-- ================================================
CREATE OR REPLACE FUNCTION calculate_api_cost(
    model VARCHAR, tokens_in INTEGER, tokens_out INTEGER
) RETURNS NUMERIC LANGUAGE plpgsql AS $$
BEGIN
    RETURN CASE model
        WHEN 'claude'   THEN (tokens_in * 0.000015) + (tokens_out * 0.000075)
        WHEN 'gpt4'     THEN (tokens_in * 0.00003)  + (tokens_out * 0.00006)
        WHEN 'gemini'   THEN (tokens_in * 0.00001)  + (tokens_out * 0.00003)
        WHEN 'deepseek' THEN (tokens_in * 0.000001) + (tokens_out * 0.000002)
        ELSE                 (tokens_in * 0.00001)  + (tokens_out * 0.00003)
    END;
END;
$$;

-- ================================================
-- SEED (system account only — no real password)
-- ================================================
INSERT INTO users (email, username, password_hash, display_name, role)
VALUES (
    'system@nexusai.pro',
    'system',
    gen_random_bytes(32)::TEXT,   -- random hash, never usable for login
    'System',
    'admin'
) ON CONFLICT (email) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✅ Nexus AI Pro database schema 2026-08-15 initialized successfully.';
END $$;

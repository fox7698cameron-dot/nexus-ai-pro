-- ================================================
-- Nexus AI Pro — Database Schema
-- PostgreSQL 16+
-- date: 2026-06-08
-- ================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ── Users ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT NOT NULL CHECK (char_length(username) BETWEEN 2 AND 50),
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'dev', 'moderator', 'user')),
    display_name TEXT,
    avatar_url TEXT,
    locale VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    settings JSONB DEFAULT '{}',
    totp_secret TEXT,                        -- encrypted TOTP secret
    totp_enabled BOOLEAN DEFAULT FALSE,
    biometric_credentials JSONB DEFAULT '[]',-- stored WebAuthn credentials
    banned BOOLEAN DEFAULT FALSE,
    banned_reason TEXT,
    banned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    last_seen TIMESTAMPTZ
);

-- ── Sessions & auth ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

-- ── Subscriptions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'payment_failed', 'trialing')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    payment_method TEXT DEFAULT 'stripe',   -- stripe | crypto | giftcard
    amount_usd INTEGER DEFAULT 0,           -- in cents
    currency VARCHAR(10) DEFAULT 'usd',
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Gift cards ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gift_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    value_usd INTEGER NOT NULL,             -- in cents
    remaining_usd INTEGER NOT NULL,
    created_by UUID REFERENCES users(id),
    redeemed_by UUID REFERENCES users(id),
    redeemed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Chats & messages ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    model_type TEXT NOT NULL DEFAULT 'claude',
    reasoning_level TEXT DEFAULT 'mid' CHECK (reasoning_level IN ('mini', 'mid', 'max')),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_encrypted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model_type TEXT,
    reasoning_level TEXT,
    is_encrypted BOOLEAN DEFAULT TRUE,
    encrypted_content BYTEA,
    attachment_urls TEXT[],
    tokens_used INTEGER,
    cost_usd NUMERIC(10, 8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Projects & milestones ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    description TEXT DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('coding', 'game', 'ar_vr', '3d', 'mobile', 'web')),
    platform TEXT,
    engine TEXT,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'testing', 'gold', 'shipped', 'on_hold', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    tags TEXT[] DEFAULT '{}',
    team_members UUID[] DEFAULT '{}',
    repo_url TEXT,
    build_targets TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Achievements ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    xp_awarded INTEGER DEFAULT 0,
    UNIQUE (user_id, achievement_id)
);

-- ── Platform connections ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    platform_type TEXT NOT NULL CHECK (platform_type IN ('social', 'game', 'integration')),
    account_id TEXT,
    access_token_enc TEXT,                  -- AES-256-GCM encrypted
    refresh_token_enc TEXT,
    token_expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced TIMESTAMPTZ,
    UNIQUE (user_id, platform)
);

-- ── Analytics cache ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, platform, date)
);

-- ── Memories ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    importance INTEGER DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workflows ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    nodes JSONB DEFAULT '[]',
    connections JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT FALSE,
    last_run TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    input JSONB DEFAULT '{}',
    output JSONB,
    error TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ── Audit log ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    hash TEXT,                              -- SHA-512 integrity hash
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── API usage ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    model_type TEXT NOT NULL,
    reasoning_level TEXT DEFAULT 'mid',
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd NUMERIC(10, 8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_platform_conn_user ON platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_platform ON analytics_snapshots(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_ts ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_ts ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN VALUES ('users'), ('chats'), ('projects'), ('workflows'), ('subscriptions') LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_upd ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END $$;

-- ── API cost function ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_api_cost(model TEXT, tokens_in INT, tokens_out INT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE model
    WHEN 'claude' THEN (tokens_in * 0.000015) + (tokens_out * 0.000075)
    WHEN 'gpt4'   THEN (tokens_in * 0.00003)  + (tokens_out * 0.00006)
    WHEN 'gemini' THEN (tokens_in * 0.00001)  + (tokens_out * 0.00003)
    ELSE                (tokens_in * 0.000005) + (tokens_out * 0.000015)
  END;
END; $$ LANGUAGE plpgsql;

-- ── System account seed ───────────────────────────────────────────────────────

INSERT INTO users (email, password_hash, username, role)
VALUES ('system@nexusai.pro', '$SYSTEM_NO_LOGIN', 'system', 'admin')
ON CONFLICT (email) DO NOTHING;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

DO $$ BEGIN RAISE NOTICE 'Nexus AI Pro database initialized — 2026-06-08'; END $$;

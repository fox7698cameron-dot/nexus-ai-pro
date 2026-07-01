-- ================================================
-- NEXUS AI PRO - Database Schema
-- File: init.sql | Updated: 2026-07-01
-- PostgreSQL 14+ required
-- ================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────────────
-- Usernames support full Unicode including emoji (stored as TEXT, not VARCHAR)
CREATE TABLE IF NOT EXISTS users (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email            VARCHAR(255) UNIQUE NOT NULL,
    username         TEXT        NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    role             VARCHAR(20) NOT NULL DEFAULT 'user'
                                 CHECK (role IN ('user','moderator','developer','admin')),
    language         VARCHAR(10) NOT NULL DEFAULT 'en',
    region           VARCHAR(10),
    avatar_url       TEXT,
    is_suspended     BOOLEAN     DEFAULT FALSE,
    suspension_reason TEXT,
    mfa_enabled      BOOLEAN     DEFAULT FALSE,
    mfa_method       VARCHAR(20) CHECK (mfa_method IN ('totp','sms','email','biometric','backup')),
    totp_secret      VARCHAR(255),
    biometric_credential_id TEXT,
    last_login       TIMESTAMPTZ,
    api_keys         JSONB       DEFAULT '{}',
    settings         JSONB       DEFAULT '{}',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sessions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,
    jti        VARCHAR(36) UNIQUE NOT NULL,
    device     TEXT,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Chats ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    model_type VARCHAR(50) NOT NULL DEFAULT 'claude',
    is_pinned  BOOLEAN     DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Messages ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id           UUID        REFERENCES chats(id) ON DELETE CASCADE,
    role              VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system')),
    content           TEXT        NOT NULL,
    model_type        VARCHAR(50),
    is_encrypted      BOOLEAN     DEFAULT TRUE,
    encrypted_content BYTEA,
    attachment_urls   TEXT[],
    reasoning_steps   TEXT[],
    reasoning_duration INTEGER,
    tokens_used       INTEGER,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Memories ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memories (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT        NOT NULL,
    category   VARCHAR(50) DEFAULT 'general',
    importance INTEGER     DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
    is_active  BOOLEAN     DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workflows ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflows (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    nodes       JSONB       DEFAULT '[]',
    connections JSONB       DEFAULT '[]',
    is_active   BOOLEAN     DEFAULT FALSE,
    last_run    TIMESTAMPTZ,
    run_count   INTEGER     DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id  UUID        REFERENCES workflows(id) ON DELETE CASCADE,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    input        JSONB       DEFAULT '{}',
    output       JSONB,
    error        TEXT,
    started_at   TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ── Audit Log ─────────────────────────────────────────────────────────────
-- Minimal: only security-relevant events
CREATE TABLE IF NOT EXISTS audit_log (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
    event      VARCHAR(50) NOT NULL,
    details    JSONB       DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    hash       VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── API Usage ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID        REFERENCES users(id) ON DELETE CASCADE,
    model_type    VARCHAR(50) NOT NULL,
    tokens_input  INTEGER     DEFAULT 0,
    tokens_output INTEGER     DEFAULT 0,
    cost_usd      DECIMAL(10,6) DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Subscriptions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID        UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan_id                 VARCHAR(50) NOT NULL,
    stripe_subscription_id  VARCHAR(255),
    stripe_customer_id      VARCHAR(255),
    coinbase_charge_id      VARCHAR(255),
    status                  VARCHAR(20) NOT NULL DEFAULT 'active'
                                         CHECK (status IN ('active','trialing','past_due','canceled','unpaid')),
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── Social Analytics Accounts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_accounts (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID        REFERENCES users(id) ON DELETE CASCADE,
    platform     VARCHAR(20) NOT NULL
                              CHECK (platform IN ('tiktok','instagram','facebook','twitch','discord','lemon8','reddit','redgifs')),
    username     VARCHAR(255),
    access_token TEXT,        -- stored encrypted at application layer
    config       JSONB        DEFAULT '{}',
    is_active    BOOLEAN      DEFAULT TRUE,
    connected_at TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (user_id, platform)
);

-- ── Analytics Snapshots ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
    platform    VARCHAR(20) NOT NULL,
    views       BIGINT      DEFAULT 0,
    likes       BIGINT      DEFAULT 0,
    comments    BIGINT      DEFAULT 0,
    shares      BIGINT      DEFAULT 0,
    reach       BIGINT      DEFAULT 0,
    impressions BIGINT      DEFAULT 0,
    retention   DECIMAL(5,2) DEFAULT 0,
    followers   BIGINT      DEFAULT 0,
    engagement  DECIMAL(8,6) DEFAULT 0,
    snapshot_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Projects ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID        REFERENCES users(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    type             VARCHAR(20)  NOT NULL
                                  CHECK (type IN ('web','mobile','desktop','game_2d','game_3d','vr','ar','xr','backend','fullstack','ai_ml','devops','library','other')),
    status           VARCHAR(20)  NOT NULL DEFAULT 'planning'
                                  CHECK (status IN ('planning','active','paused','review','completed','archived')),
    description      TEXT         DEFAULT '',
    tech_stack       JSONB        DEFAULT '[]',
    target_platforms JSONB        DEFAULT '[]',
    due_date         TIMESTAMPTZ,
    metadata         JSONB        DEFAULT '{}',
    created_at       TIMESTAMPTZ  DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Project Milestones ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_milestones (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID        REFERENCES projects(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT         DEFAULT '',
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','in_progress','completed','blocked')),
    sort_order  INTEGER      DEFAULT 0,
    due_date    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Gaming Accounts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gaming_accounts (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID        REFERENCES users(id) ON DELETE CASCADE,
    platform     VARCHAR(20) NOT NULL
                              CHECK (platform IN ('epic_games','playstation','xbox','ubisoft','steam','nintendo','other')),
    access_token TEXT,
    config       JSONB        DEFAULT '{}',
    is_active    BOOLEAN      DEFAULT TRUE,
    connected_at TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (user_id, platform)
);

-- ── Game Achievements ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_achievements (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID        REFERENCES users(id) ON DELETE CASCADE,
    platform       VARCHAR(20) NOT NULL,
    game_id        VARCHAR(255) NOT NULL,
    achievement_id VARCHAR(255) NOT NULL,
    name           TEXT,
    description    TEXT,
    icon_url       TEXT,
    unlocked       BOOLEAN     DEFAULT FALSE,
    unlocked_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, platform, game_id, achievement_id)
);

-- ── Game Progress ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_progress (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID        REFERENCES users(id) ON DELETE CASCADE,
    game_id           VARCHAR(255) NOT NULL,
    platform          VARCHAR(20) NOT NULL,
    progress_percent  DECIMAL(5,2) DEFAULT 0,
    current_chapter   TEXT,
    playtime_minutes  INTEGER     DEFAULT 0,
    metadata          JSONB        DEFAULT '{}',
    updated_at        TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (user_id, game_id, platform)
);

-- ── Connector Registry ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_connectors (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID        REFERENCES users(id) ON DELETE CASCADE,
    connector    VARCHAR(30) NOT NULL,
    config       JSONB        DEFAULT '{}',
    is_active    BOOLEAN      DEFAULT TRUE,
    connected_at TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (user_id, connector)
);

-- ── Content Flags (moderator) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_flags (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id  UUID        REFERENCES users(id) ON DELETE SET NULL,
    content_type VARCHAR(20),
    content_id   UUID,
    reason       TEXT,
    status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
    resolved_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
    resolved_at  TIMESTAMPTZ,
    resolution   VARCHAR(20),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email            ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role             ON users(role);
CREATE INDEX IF NOT EXISTS idx_chats_user_id          ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at       ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id       ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at    ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_user_id       ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id      ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id      ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at   ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id      ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user   ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_plat    ON analytics_snapshots(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshot_at  ON analytics_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_id       ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_type          ON projects(type);
CREATE INDEX IF NOT EXISTS idx_milestones_project     ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_gaming_accounts_user   ON gaming_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user      ON game_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user          ON game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user     ON subscriptions(user_id);

-- ── Triggers ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','chats','workflows','projects','subscriptions']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at_%1$s ON %1$s;
       CREATE TRIGGER trg_updated_at_%1$s BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl
    );
  END LOOP;
END $$;

-- ── Cost calculator ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_api_cost(model VARCHAR, tokens_in INTEGER, tokens_out INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE model
    WHEN 'claude'   THEN (tokens_in * 0.000015) + (tokens_out * 0.000075)
    WHEN 'gpt4'     THEN (tokens_in * 0.00003)  + (tokens_out * 0.00006)
    WHEN 'gemini'   THEN (tokens_in * 0.00001)  + (tokens_out * 0.00003)
    WHEN 'deepseek' THEN (tokens_in * 0.000001) + (tokens_out * 0.000002)
    ELSE                 (tokens_in * 0.00001)  + (tokens_out * 0.00003)
  END;
END;
$$ LANGUAGE plpgsql;

-- ── Default system user ───────────────────────────────────────────────────
INSERT INTO users (email, username, password_hash, role)
VALUES ('system@nexusai.pro', 'system', 'SYSTEM_ACCOUNT_NO_LOGIN', 'admin')
ON CONFLICT (email) DO NOTHING;

GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

DO $$ BEGIN RAISE NOTICE 'Nexus AI Pro database initialized successfully.'; END $$;

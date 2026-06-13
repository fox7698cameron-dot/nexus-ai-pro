-- ================================================
-- NEXUS AI PRO - Database Schema v2.0
-- Enterprise Full-Stack Schema
-- Updated: 2026-06-13
-- ================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================
-- USERS & ROLES
-- ================================================
CREATE TABLE IF NOT EXISTS users (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                 VARCHAR(255) UNIQUE NOT NULL,
    username              TEXT UNIQUE,
    password_hash         VARCHAR(255) NOT NULL,
    display_name          TEXT,
    avatar_url            TEXT,
    role                  VARCHAR(20) NOT NULL DEFAULT 'user'
                          CHECK (role IN ('admin','dev','moderator','user')),
    subscription_tier     VARCHAR(20) NOT NULL DEFAULT 'free'
                          CHECK (subscription_tier IN ('free','pro','enterprise','custom')),
    subscription_status   VARCHAR(20) NOT NULL DEFAULT 'inactive',
    stripe_customer_id    VARCHAR(100),
    language              VARCHAR(10) DEFAULT 'en',
    region                VARCHAR(10) DEFAULT 'US',
    timezone              VARCHAR(60) DEFAULT 'UTC',
    mfa_enabled           BOOLEAN DEFAULT FALSE,
    mfa_secret            TEXT,
    mfa_backup_codes      TEXT[],
    biometric_registered  BOOLEAN DEFAULT FALSE,
    webauthn_credentials  JSONB DEFAULT '[]',
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until          TIMESTAMP WITH TIME ZONE,
    email_verified        BOOLEAN DEFAULT FALSE,
    email_verify_token    TEXT,
    password_reset_token  TEXT,
    password_reset_exp    TIMESTAMP WITH TIME ZONE,
    settings              JSONB DEFAULT '{}',
    api_keys              JSONB DEFAULT '{}',
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login            TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username  ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role      ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_sub_tier  ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin(username gin_trgm_ops);

-- ================================================
-- SESSIONS & REFRESH TOKENS
-- ================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT UNIQUE NOT NULL,
    device_info   JSONB DEFAULT '{}',
    ip_address    INET,
    user_agent    TEXT,
    expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked       BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id       ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at    ON user_sessions(expires_at);

-- ================================================
-- SUBSCRIPTIONS & PAYMENTS
-- ================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                  UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id   VARCHAR(150),
    stripe_payment_intent_id VARCHAR(150),
    tier                     VARCHAR(20) NOT NULL DEFAULT 'free',
    status                   VARCHAR(30) NOT NULL DEFAULT 'inactive',
    payment_method           VARCHAR(30),
    payment_provider         VARCHAR(30) DEFAULT 'stripe',
    amount_cents             INTEGER DEFAULT 0,
    currency                 VARCHAR(10) DEFAULT 'usd',
    current_period_start     TIMESTAMP WITH TIME ZONE,
    current_period_end       TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end     BOOLEAN DEFAULT FALSE,
    cancelled_at             TIMESTAMP WITH TIME ZONE,
    trial_end                TIMESTAMP WITH TIME ZONE,
    metadata                 JSONB DEFAULT '{}',
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subs_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status  ON subscriptions(status);

CREATE TABLE IF NOT EXISTS gift_cards (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code         VARCHAR(64) UNIQUE NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency     VARCHAR(10) DEFAULT 'usd',
    redeemed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    redeemed_at  TIMESTAMP WITH TIME ZONE,
    expires_at   TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- CHATS & MESSAGES
-- ================================================
CREATE TABLE IF NOT EXISTS chats (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(500) NOT NULL DEFAULT 'New Chat',
    model_type VARCHAR(100) NOT NULL DEFAULT 'claude',
    is_pinned  BOOLEAN DEFAULT FALSE,
    metadata   JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id           UUID REFERENCES chats(id) ON DELETE CASCADE,
    role              VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system','tool')),
    content           TEXT NOT NULL,
    model_type        VARCHAR(100),
    is_encrypted      BOOLEAN DEFAULT TRUE,
    encrypted_content BYTEA,
    attachment_urls   TEXT[],
    reasoning_steps   TEXT[],
    reasoning_tier    VARCHAR(20) CHECK (reasoning_tier IN ('mini','mid','max','enterprise')),
    reasoning_duration INTEGER,
    tokens_used       INTEGER,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chats_user_id    ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- ================================================
-- MEMORIES
-- ================================================
CREATE TABLE IF NOT EXISTS memories (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    category   VARCHAR(100) DEFAULT 'general',
    importance INTEGER DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);

-- ================================================
-- SOCIAL ANALYTICS
-- ================================================
CREATE TABLE IF NOT EXISTS social_accounts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    platform    VARCHAR(30) NOT NULL
                CHECK (platform IN ('tiktok','instagram','facebook','twitch',
                                    'discord','lemon8','reddit','redgifs','youtube','twitter')),
    account_id  TEXT NOT NULL,
    handle      TEXT,
    access_token_enc TEXT,
    refresh_token_enc TEXT,
    token_expires_at  TIMESTAMP WITH TIME ZONE,
    scopes      TEXT[],
    connected   BOOLEAN DEFAULT TRUE,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform, account_id)
);

CREATE TABLE IF NOT EXISTS social_metrics (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id   UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
    metric_type  VARCHAR(50) NOT NULL,
    value        BIGINT DEFAULT 0,
    value_float  DOUBLE PRECISION,
    dimensions   JSONB DEFAULT '{}',
    recorded_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user   ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_metrics_account ON social_metrics(account_id);
CREATE INDEX IF NOT EXISTS idx_social_metrics_type    ON social_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_social_metrics_time    ON social_metrics(recorded_at DESC);

-- ================================================
-- PROJECTS (CODING / GAME / AR-VR / 3D)
-- ================================================
CREATE TABLE IF NOT EXISTS projects (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(500) NOT NULL,
    description   TEXT,
    type          VARCHAR(30) NOT NULL
                  CHECK (type IN ('coding','game','ar_vr','3d','mobile','web','desktop','other')),
    engine        VARCHAR(100),
    platform      VARCHAR(100),
    repo_url      TEXT,
    status        VARCHAR(20) DEFAULT 'active'
                  CHECK (status IN ('active','paused','completed','archived')),
    progress      SMALLINT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    collaborators JSONB DEFAULT '[]',
    tags          TEXT[],
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_milestones (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
    name         VARCHAR(500) NOT NULL,
    description  TEXT,
    due_date     TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status       VARCHAR(20) DEFAULT 'pending',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_commits (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
    commit_hash  VARCHAR(64),
    message      TEXT,
    author       TEXT,
    additions    INTEGER DEFAULT 0,
    deletions    INTEGER DEFAULT 0,
    files_changed INTEGER DEFAULT 0,
    committed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_type    ON projects(type);
CREATE INDEX IF NOT EXISTS idx_projects_status  ON projects(status);
CREATE INDEX IF NOT EXISTS idx_milestones_proj  ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_commits_proj     ON project_commits(project_id);

-- ================================================
-- GAME PLATFORM INTEGRATIONS
-- ================================================
CREATE TABLE IF NOT EXISTS game_platform_accounts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    platform     VARCHAR(30) NOT NULL
                 CHECK (platform IN ('epic','playstation','xbox','ubisoft','steam','nintendo','gog')),
    platform_uid TEXT NOT NULL,
    username     TEXT,
    access_token_enc  TEXT,
    refresh_token_enc TEXT,
    token_expires_at  TIMESTAMP WITH TIME ZONE,
    connected    BOOLEAN DEFAULT TRUE,
    metadata     JSONB DEFAULT '{}',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform, platform_uid)
);

CREATE TABLE IF NOT EXISTS game_library (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id  UUID REFERENCES game_platform_accounts(id) ON DELETE CASCADE,
    game_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    platform    VARCHAR(30),
    playtime_minutes INTEGER DEFAULT 0,
    last_played TIMESTAMP WITH TIME ZONE,
    cover_url   TEXT,
    metadata    JSONB DEFAULT '{}',
    added_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_achievements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id      UUID REFERENCES game_platform_accounts(id) ON DELETE CASCADE,
    game_id         TEXT NOT NULL,
    achievement_id  TEXT NOT NULL,
    achievement_name TEXT,
    description     TEXT,
    icon_url        TEXT,
    points          INTEGER DEFAULT 0,
    rarity          VARCHAR(20),
    unlocked        BOOLEAN DEFAULT FALSE,
    unlocked_at     TIMESTAMP WITH TIME ZONE,
    UNIQUE(account_id, game_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_game_accounts_user    ON game_platform_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_game_library_account  ON game_library(account_id);
CREATE INDEX IF NOT EXISTS idx_achievements_account  ON game_achievements(account_id);
CREATE INDEX IF NOT EXISTS idx_achievements_game     ON game_achievements(game_id);

-- ================================================
-- WORKFLOWS
-- ================================================
CREATE TABLE IF NOT EXISTS workflows (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(500) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_workflow  ON workflow_executions(workflow_id);

-- ================================================
-- INTERNATIONALIZATION
-- ================================================
CREATE TABLE IF NOT EXISTS i18n_locales (
    code       VARCHAR(10) PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    direction  VARCHAR(3) DEFAULT 'ltr' CHECK (direction IN ('ltr','rtl')),
    active     BOOLEAN DEFAULT TRUE
);

INSERT INTO i18n_locales VALUES
  ('en','English','ltr',true),
  ('es','Spanish','ltr',true),
  ('fr','French','ltr',true),
  ('de','German','ltr',true),
  ('pt','Portuguese','ltr',true),
  ('ja','Japanese','ltr',true),
  ('ko','Korean','ltr',true),
  ('zh','Chinese','ltr',true),
  ('ar','Arabic','rtl',true),
  ('hi','Hindi','ltr',true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS i18n_translations (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locale     VARCHAR(10) REFERENCES i18n_locales(code) ON DELETE CASCADE,
    ns         VARCHAR(100) DEFAULT 'common',
    key        TEXT NOT NULL,
    value      TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(locale, ns, key)
);

CREATE INDEX IF NOT EXISTS idx_i18n_locale ON i18n_translations(locale);
CREATE INDEX IF NOT EXISTS idx_i18n_key    ON i18n_translations(key);

-- ================================================
-- ENTERPRISE CONNECTORS
-- ================================================
CREATE TABLE IF NOT EXISTS integrations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    provider     VARCHAR(50) NOT NULL,
    name         VARCHAR(200),
    credentials_enc JSONB DEFAULT '{}',
    scopes       TEXT[],
    webhook_url  TEXT,
    status       VARCHAR(20) DEFAULT 'active',
    last_sync    TIMESTAMP WITH TIME ZONE,
    metadata     JSONB DEFAULT '{}',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integrations_user     ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);

-- ================================================
-- AUDIT LOG
-- ================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    event      VARCHAR(100) NOT NULL,
    severity   VARCHAR(10) DEFAULT 'info' CHECK (severity IN ('debug','info','warn','error','critical')),
    details    JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    hash       VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event     ON audit_log(event);
CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_severity  ON audit_log(severity);

-- ================================================
-- API USAGE
-- ================================================
CREATE TABLE IF NOT EXISTS api_usage (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    model_type   VARCHAR(100) NOT NULL,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd     DECIMAL(10, 8) DEFAULT 0,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_id  ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created  ON api_usage(created_at);

-- ================================================
-- TRIGGERS
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','subscriptions','chats','workflows',
                              'projects','social_accounts','integrations','i18n_translations'] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
             CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
            t, t, t, t
        );
    END LOOP;
END;
$$;

-- ================================================
-- API COST FUNCTION
-- ================================================
CREATE OR REPLACE FUNCTION calculate_api_cost(model_name VARCHAR, tokens_in INTEGER, tokens_out INTEGER)
RETURNS DECIMAL(10,8) LANGUAGE plpgsql AS $$
DECLARE cost DECIMAL(10,8);
BEGIN
    CASE model_name
        WHEN 'claude-opus'   THEN cost := (tokens_in * 0.000015) + (tokens_out * 0.000075);
        WHEN 'claude-sonnet' THEN cost := (tokens_in * 0.000003) + (tokens_out * 0.000015);
        WHEN 'claude-haiku'  THEN cost := (tokens_in * 0.00000025) + (tokens_out * 0.00000125);
        WHEN 'gpt-4'         THEN cost := (tokens_in * 0.00003) + (tokens_out * 0.00006);
        WHEN 'gpt-4o'        THEN cost := (tokens_in * 0.000005) + (tokens_out * 0.000015);
        WHEN 'gpt-3.5'       THEN cost := (tokens_in * 0.0000005) + (tokens_out * 0.0000015);
        WHEN 'gemini-pro'    THEN cost := (tokens_in * 0.00001) + (tokens_out * 0.00003);
        WHEN 'deepseek'      THEN cost := (tokens_in * 0.000001) + (tokens_out * 0.000002);
        ELSE                      cost := (tokens_in * 0.00001) + (tokens_out * 0.00003);
    END CASE;
    RETURN cost;
END;
$$;

-- ================================================
-- SEED DATA
-- ================================================
INSERT INTO users (id, email, username, password_hash, display_name, role)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system@nexusai.pro',
    'system',
    'SYSTEM_ACCOUNT_NO_LOGIN',
    'System',
    'admin'
) ON CONFLICT (email) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✅ Nexus AI Pro v2 database initialized successfully!';
    RAISE NOTICE '📋 Tables: users, sessions, subscriptions, gift_cards, chats, messages,';
    RAISE NOTICE '          memories, social_accounts, social_metrics, projects, milestones,';
    RAISE NOTICE '          commits, game_platform_accounts, game_library, game_achievements,';
    RAISE NOTICE '          workflows, i18n_locales, i18n_translations, integrations, audit_log, api_usage';
END;
$$;

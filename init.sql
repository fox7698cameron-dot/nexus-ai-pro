-- ================================================
-- init.sql | Nexus AI Pro | Date: 2026-06-07
-- PostgreSQL 16+ full schema — enterprise edition
-- ================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ===================== ENUMS =====================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user','moderator','developer','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active','suspended','deleted','pending_verification');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('free','pro','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending','completed','failed','refunded','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE platform_type AS ENUM ('tiktok','instagram','facebook','twitch','discord','lemon8','reddit','redgifs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE game_engine AS ENUM ('unreal','unity','godot','blender','custom','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE xr_type AS ENUM ('ar','vr','mixed','3d');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_type AS ENUM ('coding','game-dev','ar-vr','3d');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('active','paused','completed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE connector_service AS ENUM ('azure','aws','google','adobe','slack','zoom','github','bitbucket','unreal','epic','playstation','xbox','ubisoft');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================== USERS =====================

CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email          CITEXT UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    display_name   VARCHAR(100),           -- supports emoji/unicode
    username       VARCHAR(50) UNIQUE,     -- supports emoji/unicode
    avatar_url     TEXT,
    role           user_role DEFAULT 'user' NOT NULL,
    status         user_status DEFAULT 'active' NOT NULL,
    tier           subscription_tier DEFAULT 'free' NOT NULL,
    locale         VARCHAR(10) DEFAULT 'en-US',
    timezone       VARCHAR(50) DEFAULT 'UTC',
    settings       JSONB DEFAULT '{}',
    api_keys       JSONB DEFAULT '{}',     -- stored as hash references only
    stripe_customer_id VARCHAR(255),
    last_login     TIMESTAMP WITH TIME ZONE,
    login_count    INTEGER DEFAULT 0,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===================== MFA / BIOMETRICS =====================

CREATE TABLE IF NOT EXISTS user_mfa (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    totp_secret    TEXT,                   -- encrypted with server key
    totp_enabled   BOOLEAN DEFAULT FALSE,
    backup_codes   JSONB DEFAULT '[]',     -- array of hashed codes
    biometric_data JSONB DEFAULT '[]',     -- array of { type, credentialId, publicKey, deviceName }
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- ===================== SESSIONS =====================

CREATE TABLE IF NOT EXISTS sessions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(128) NOT NULL,
    device_info    JSONB DEFAULT '{}',     -- user agent, platform, ip hash
    ip_hash        VARCHAR(128),
    expires_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked        BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ===================== SUBSCRIPTIONS & PAYMENTS =====================

CREATE TABLE IF NOT EXISTS subscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_sub_id       VARCHAR(255) UNIQUE,
    tier                subscription_tier NOT NULL DEFAULT 'free',
    status              VARCHAR(50) DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end   TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    stripe_payment_id   VARCHAR(255),
    amount_cents        INTEGER NOT NULL,
    currency            VARCHAR(10) DEFAULT 'usd',
    status              payment_status DEFAULT 'pending',
    payment_method      VARCHAR(50),      -- card, crypto, gift_card
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gift_cards (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_hash   VARCHAR(128) UNIQUE NOT NULL,
    value_cents INTEGER NOT NULL,
    redeemed    BOOLEAN DEFAULT FALSE,
    redeemed_by UUID REFERENCES users(id),
    redeemed_at TIMESTAMP WITH TIME ZONE,
    expires_at  TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===================== CHATS & MESSAGES =====================

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

-- ===================== MEMORIES =====================

CREATE TABLE IF NOT EXISTS memories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    category    VARCHAR(50) DEFAULT 'general',
    importance  INTEGER DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===================== WORKFLOWS =====================

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

-- ===================== SOCIAL ANALYTICS =====================

CREATE TABLE IF NOT EXISTS social_accounts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    platform    platform_type NOT NULL,
    account_id  VARCHAR(255),
    username    VARCHAR(255),
    connected   BOOLEAN DEFAULT FALSE,
    connected_at TIMESTAMP WITH TIME ZONE,
    last_sync   TIMESTAMP WITH TIME ZONE,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform)
);

CREATE TABLE IF NOT EXISTS social_metrics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
    recorded_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    views           BIGINT DEFAULT 0,
    likes           BIGINT DEFAULT 0,
    reach           BIGINT DEFAULT 0,
    retention_pct   DECIMAL(5,2) DEFAULT 0,
    followers       BIGINT DEFAULT 0,
    comments        BIGINT DEFAULT 0,
    shares          BIGINT DEFAULT 0,
    engagement_rate DECIMAL(5,4) DEFAULT 0,
    impressions     BIGINT DEFAULT 0,
    clicks          BIGINT DEFAULT 0,
    watch_time_avg  INTEGER DEFAULT 0    -- seconds
);

CREATE INDEX IF NOT EXISTS idx_social_metrics_account_id ON social_metrics(social_account_id);
CREATE INDEX IF NOT EXISTS idx_social_metrics_recorded_at ON social_metrics(recorded_at DESC);

-- ===================== PROJECT TRACKING =====================

CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    type        project_type NOT NULL DEFAULT 'coding',
    status      project_status DEFAULT 'active',
    description TEXT,
    platform    VARCHAR(100),
    team_size   INTEGER DEFAULT 1,
    metadata    JSONB DEFAULT '{}',
    milestones  JSONB DEFAULT '[]',
    metrics     JSONB DEFAULT '{}',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===================== GAME DEVELOPMENT =====================

CREATE TABLE IF NOT EXISTS game_projects (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    engine       game_engine DEFAULT 'custom',
    genre        VARCHAR(100),
    platforms    TEXT[],
    team_size    INTEGER DEFAULT 1,
    status       project_status DEFAULT 'active',
    metrics      JSONB DEFAULT '{}',   -- builds, frame_rate, memory, load_time
    milestones   JSONB DEFAULT '[]',
    last_build   TIMESTAMP WITH TIME ZONE,
    build_count  INTEGER DEFAULT 0,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS xr_projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    type            xr_type NOT NULL DEFAULT 'vr',
    engine          game_engine DEFAULT 'custom',
    target_platform VARCHAR(100),
    status          project_status DEFAULT 'active',
    performance     JSONB DEFAULT '{}',  -- fps_target, fps_actual, latency, render_time
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS achievements (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id     VARCHAR(255) NOT NULL,
    platform    VARCHAR(50) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    icon        VARCHAR(10),           -- emoji
    points      INTEGER DEFAULT 10,
    is_hidden   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, platform, title)
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- ===================== PLATFORM CONNECTORS =====================

CREATE TABLE IF NOT EXISTS connectors (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    service      connector_service NOT NULL,
    connected    BOOLEAN DEFAULT FALSE,
    connected_at TIMESTAMP WITH TIME ZONE,
    last_ping    TIMESTAMP WITH TIME ZONE,
    status       VARCHAR(50) DEFAULT 'disconnected',
    metadata     JSONB DEFAULT '{}',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, service)
);

-- ===================== AUDIT LOG =====================

CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    event       VARCHAR(100) NOT NULL,
    severity    VARCHAR(20) DEFAULT 'info',
    details     JSONB DEFAULT '{}',
    ip_hash     VARCHAR(128),
    user_agent  TEXT,
    hash        VARCHAR(128),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON audit_log(event);

-- ===================== API USAGE =====================

CREATE TABLE IF NOT EXISTS api_usage (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    model_type    VARCHAR(50) NOT NULL,
    tokens_input  INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd      DECIMAL(10,6) DEFAULT 0,
    endpoint      VARCHAR(255),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);

-- ===================== I18N =====================

CREATE TABLE IF NOT EXISTS user_translations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    source_text TEXT NOT NULL,
    target_locale VARCHAR(10) NOT NULL,
    translated  TEXT NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===================== INDEXES =====================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
CREATE INDEX IF NOT EXISTS idx_game_projects_user_id ON game_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_xr_projects_user_id ON xr_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connectors_user_id ON connectors(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- ===================== UPDATED_AT TRIGGER =====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','chats','workflows','projects','game_projects','xr_projects','connectors','subscriptions','user_mfa'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
       CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- ===================== API COST FUNCTION =====================

CREATE OR REPLACE FUNCTION calculate_api_cost(model VARCHAR, tokens_in INTEGER, tokens_out INTEGER)
RETURNS DECIMAL AS $$
DECLARE cost DECIMAL(10,6);
BEGIN
    CASE model
        WHEN 'claude'   THEN cost := (tokens_in * 0.000015) + (tokens_out * 0.000075);
        WHEN 'gpt4'     THEN cost := (tokens_in * 0.00003)  + (tokens_out * 0.00006);
        WHEN 'gemini'   THEN cost := (tokens_in * 0.00001)  + (tokens_out * 0.00003);
        WHEN 'deepseek' THEN cost := (tokens_in * 0.000001) + (tokens_out * 0.000002);
        ELSE                 cost := (tokens_in * 0.00001)  + (tokens_out * 0.00003);
    END CASE;
    RETURN cost;
END;
$$ LANGUAGE plpgsql;

-- ===================== SEED DATA =====================

INSERT INTO users (email, password_hash, display_name, role, status)
VALUES ('system@nexusai.pro', 'SYSTEM_ACCOUNT_NO_LOGIN', 'System', 'admin', 'active')
ON CONFLICT (email) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

DO $$ BEGIN
  RAISE NOTICE 'Nexus AI Pro database initialized — 2026-06-07';
END $$;

-- db/migrations/001_enhanced_auth.sql
-- Nexus AI Pro — Enhanced Authentication & Authorization Schema
-- Author: Cameron Fox <contact@nexusai.pro>
-- Date: 2026-06-09

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";   -- Case-insensitive text for emails/usernames

-- ── Role enum ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'moderator', 'dev', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Enhanced users table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity (email is case-insensitive, username supports full Unicode incl. emoji)
    email               CITEXT      UNIQUE NOT NULL,
    username            TEXT        UNIQUE NOT NULL
        CHECK (char_length(username) BETWEEN 2 AND 64 AND username ~ '^[^\x00-\x1F\x7F]+$'),

    -- Credentials
    password_hash       TEXT        NOT NULL
        CHECK (char_length(password_hash) >= 60),  -- bcrypt hashes are 60 chars

    -- Role & status
    role                user_role   NOT NULL DEFAULT 'user',
    is_active           BOOLEAN     NOT NULL DEFAULT true,
    is_verified         BOOLEAN     NOT NULL DEFAULT false,

    -- Profile
    display_name        TEXT,
    avatar_url          TEXT,
    bio                 TEXT,
    locale              VARCHAR(10) NOT NULL DEFAULT 'en',
    timezone            TEXT        NOT NULL DEFAULT 'UTC',

    -- MFA
    totp_enabled        BOOLEAN     NOT NULL DEFAULT false,
    totp_secret_enc     BYTEA,      -- AES-encrypted TOTP secret
    mfa_enabled         BOOLEAN     NOT NULL DEFAULT false,
    biometric_enabled   BOOLEAN     NOT NULL DEFAULT false,
    biometric_creds     JSONB       NOT NULL DEFAULT '[]',  -- WebAuthn credentials

    -- Subscription (denormalised for fast checks)
    subscription_plan   TEXT        NOT NULL DEFAULT 'free',
    subscription_status TEXT        NOT NULL DEFAULT 'active',
    subscription_expires_at TIMESTAMPTZ,

    -- Settings (app preferences)
    settings            JSONB       NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at       TIMESTAMPTZ,
    email_verified_at   TIMESTAMPTZ
);

-- ── Refresh tokens ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,   -- SHA-256 of the token (never store plain)
    device_info TEXT,
    ip_address  INET,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── MFA codes ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mfa_codes (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   TEXT        NOT NULL,   -- SHA-256 of the 6-digit code
    type        TEXT        NOT NULL DEFAULT 'email',  -- 'email' | 'sms'
    used        BOOLEAN     NOT NULL DEFAULT false,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Password reset tokens ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    used        BOOLEAN     NOT NULL DEFAULT false,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Login attempts (rate limiting in DB) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS login_attempts (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address  INET        NOT NULL,
    email       CITEXT,
    success     BOOLEAN     NOT NULL DEFAULT false,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username     ON users(lower(username));
CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_mfa_codes_user      ON mfa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip   ON login_attempts(ip_address, created_at DESC);

-- ── Triggers ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Seed super-admin (password MUST be changed immediately) ───────────────────
-- In production: remove this seed and create admin via migration tool.

INSERT INTO users (email, username, password_hash, role, is_verified)
VALUES (
    'admin@nexusai.pro',
    'nexus_admin',
    '$2a$12$PLACEHOLDER_CHANGE_IMMEDIATELY',  -- Replace with real bcrypt hash
    'super_admin',
    true
) ON CONFLICT DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '✅ Migration 001 — Enhanced auth schema applied.';
  RAISE NOTICE '⚠️  Change the admin password hash before production use!';
END $$;

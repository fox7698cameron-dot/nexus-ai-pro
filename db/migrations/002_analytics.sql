-- db/migrations/002_analytics.sql
-- Nexus AI Pro — Social Media Analytics Schema
-- Author: Cameron Fox <contact@nexusai.pro>
-- Date: 2026-06-09

DO $$ BEGIN
  CREATE TYPE social_platform AS ENUM ('tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Platform connections ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_connections (
    id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform       social_platform NOT NULL,
    account_id     TEXT            NOT NULL,
    display_name   TEXT,
    -- OAuth tokens stored encrypted — NEVER plain text
    access_token_enc  BYTEA,
    refresh_token_enc BYTEA,
    token_expires_at  TIMESTAMPTZ,
    connected_at   TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMPTZ,
    UNIQUE (user_id, platform)
);

-- ── Cached metrics snapshots ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id             UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform       social_platform NOT NULL,
    period_start   TIMESTAMPTZ    NOT NULL,
    period_end     TIMESTAMPTZ    NOT NULL,
    followers      BIGINT          NOT NULL DEFAULT 0,
    follower_delta INTEGER         NOT NULL DEFAULT 0,
    total_views    BIGINT          NOT NULL DEFAULT 0,
    total_likes    BIGINT          NOT NULL DEFAULT 0,
    total_comments BIGINT          NOT NULL DEFAULT 0,
    total_shares   BIGINT          NOT NULL DEFAULT 0,
    engagement_rate DECIMAL(6,3)   NOT NULL DEFAULT 0,
    reach_estimate BIGINT          NOT NULL DEFAULT 0,
    impressions    BIGINT          NOT NULL DEFAULT 0,
    retention_rate DECIMAL(6,2)    NOT NULL DEFAULT 0,
    completion_rate DECIMAL(6,2)   NOT NULL DEFAULT 0,
    raw_data       JSONB           NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Daily trend data ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_daily (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform    social_platform NOT NULL,
    date        DATE            NOT NULL,
    views       BIGINT          NOT NULL DEFAULT 0,
    likes       BIGINT          NOT NULL DEFAULT 0,
    comments    BIGINT          NOT NULL DEFAULT 0,
    shares      BIGINT          NOT NULL DEFAULT 0,
    reach       BIGINT          NOT NULL DEFAULT 0,
    UNIQUE (user_id, platform, date)
);

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_social_connections_user     ON social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_platform ON social_connections(platform);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_user    ON analytics_snapshots(user_id, platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_user        ON analytics_daily(user_id, platform, date DESC);

DO $$ BEGIN RAISE NOTICE '✅ Migration 002 — Analytics schema applied.'; END $$;

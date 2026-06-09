-- db/migrations/004_subscriptions_and_games.sql
-- Nexus AI Pro — Subscriptions, Payments & Game Connector Schema
-- Author: Cameron Fox <contact@nexusai.pro>
-- Date: 2026-06-09

DO $$ BEGIN
  CREATE TYPE subscription_plan   AS ENUM ('free', 'pro', 'enterprise');
  CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due', 'trialing');
  CREATE TYPE payment_status      AS ENUM ('pending', 'completed', 'failed', 'refunded', 'expired');
  CREATE TYPE payment_method      AS ENUM ('stripe', 'crypto', 'gift_card');
  CREATE TYPE game_platform       AS ENUM ('epic', 'playstation', 'xbox', 'ubisoft', 'steam', 'gog', 'nintendo');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Subscriptions ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
    id                   UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    plan                 subscription_plan   NOT NULL DEFAULT 'free',
    status               subscription_status NOT NULL DEFAULT 'active',
    payment_method       payment_method,
    -- Stripe
    stripe_customer_id   TEXT,
    stripe_sub_id        TEXT,
    stripe_price_id      TEXT,
    -- Crypto
    crypto_currency      TEXT,
    crypto_payment_id    TEXT,
    -- Gift card
    gift_card_code       TEXT,
    -- Period
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    cancelled_at         TIMESTAMPTZ,
    -- Audit
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Payment ledger ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_ledger (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan            subscription_plan NOT NULL,
    method          payment_method  NOT NULL,
    amount_cents    INTEGER         NOT NULL DEFAULT 0,
    currency        TEXT            NOT NULL DEFAULT 'USD',
    status          payment_status  NOT NULL DEFAULT 'pending',
    external_id     TEXT,           -- Stripe payment intent, crypto payment ID, etc.
    metadata        JSONB           NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Gift cards ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gift_cards (
    id            UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
    code          TEXT              UNIQUE NOT NULL,
    plan          subscription_plan NOT NULL DEFAULT 'pro',
    created_by    UUID              REFERENCES users(id) ON DELETE SET NULL,
    redeemed_by   UUID              REFERENCES users(id) ON DELETE SET NULL,
    redeemed_at   TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Game platform connections ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_connections (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform        game_platform   NOT NULL,
    account_id      TEXT            NOT NULL,
    display_name    TEXT,
    -- OAuth tokens stored encrypted
    access_token_enc  BYTEA,
    token_expires_at  TIMESTAMPTZ,
    connected_at    TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_synced_at  TIMESTAMPTZ,
    UNIQUE (user_id, platform)
);

-- ── Achievement cache ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS achievements (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform        game_platform   NOT NULL,
    achievement_id  TEXT            NOT NULL,
    name            TEXT            NOT NULL,
    description     TEXT,
    points          INTEGER         NOT NULL DEFAULT 0,
    rarity          TEXT            NOT NULL DEFAULT 'common',
    unlocked_at     TIMESTAMPTZ,
    synced_at       TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, platform, achievement_id)
);

-- ── Game progress cache ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_progress (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform        game_platform   NOT NULL,
    game_id         TEXT            NOT NULL,
    title           TEXT,
    completion_pct  DECIMAL(5,2)    NOT NULL DEFAULT 0,
    play_time_hours DECIMAL(10,2)   NOT NULL DEFAULT 0,
    current_level   INTEGER,
    max_level       INTEGER,
    trophy_data     JSONB           NOT NULL DEFAULT '{}',
    last_played_at  TIMESTAMPTZ,
    synced_at       TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, platform, game_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id   ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_ledger_user_id  ON payment_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code         ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_game_connections_user   ON game_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user       ON achievements(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_game_progress_user      ON game_progress(user_id, platform);

-- Trigger
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN RAISE NOTICE '✅ Migration 004 — Subscriptions & game connectors schema applied.'; END $$;

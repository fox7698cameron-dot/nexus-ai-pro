/**
 * Filename: SocialConnector.js
 * Purpose:  Social media API connector — multi-platform metrics fetching,
 *           real-time data snapshots, and live update subscriptions.
 *           Reads credentials from environment variables (server-side
 *           process.env or Vite client-side VITE_* prefixed vars).
 *           Falls back to clearly-labeled [MOCK] data when credentials
 *           are not configured so the UI is always functional.
 * Date:     2026-08-22
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 */

// ---------------------------------------------------------------------------
// Environment variable resolution
// Supports both Node.js (process.env.KEY) and Vite client (import.meta.env.VITE_KEY).
// ---------------------------------------------------------------------------
const getEnv = (key) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const viteVal = import.meta.env['VITE_' + key];
      if (viteVal) return viteVal;
    }
  } catch (_) {
    // import.meta not available in all environments
  }
  return null;
};

// ---------------------------------------------------------------------------
// Platform registry
// ---------------------------------------------------------------------------
export const PLATFORM_CONFIG = {
  tiktok: {
    name: 'TikTok',
    apiBase: 'https://open.tiktokapis.com/v2',
    authStyle: 'bearer',
    credentialKeys: ['TIKTOK_API_KEY', 'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    primaryCredential: 'TIKTOK_API_KEY',
  },
  instagram: {
    name: 'Instagram',
    apiBase: 'https://graph.instagram.com',
    authStyle: 'token_param',
    credentialKeys: ['INSTAGRAM_API_KEY', 'INSTAGRAM_ACCOUNT_ID'],
    primaryCredential: 'INSTAGRAM_API_KEY',
  },
  facebook: {
    name: 'Facebook',
    apiBase: 'https://graph.facebook.com/v18.0',
    authStyle: 'token_param',
    credentialKeys: ['FACEBOOK_API_KEY', 'FACEBOOK_PAGE_ID'],
    primaryCredential: 'FACEBOOK_API_KEY',
  },
  twitch: {
    name: 'Twitch',
    apiBase: 'https://api.twitch.tv/helix',
    authStyle: 'twitch',
    credentialKeys: ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'TWITCH_CHANNEL'],
    primaryCredential: 'TWITCH_CLIENT_ID',
  },
  discord: {
    name: 'Discord',
    apiBase: 'https://discord.com/api/v10',
    authStyle: 'bot',
    credentialKeys: ['DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID'],
    primaryCredential: 'DISCORD_BOT_TOKEN',
  },
  lemon8: {
    name: 'Lemon8',
    apiBase: 'https://api.lemon8-app.com/v1',
    authStyle: 'bearer',
    credentialKeys: ['LEMON8_API_KEY'],
    primaryCredential: 'LEMON8_API_KEY',
  },
  reddit: {
    name: 'Reddit',
    apiBase: 'https://oauth.reddit.com',
    authStyle: 'oauth2',
    credentialKeys: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_SUBREDDIT'],
    primaryCredential: 'REDDIT_CLIENT_ID',
  },
  redgifs: {
    name: 'RedGifs',
    apiBase: 'https://api.redgifs.com/v2',
    authStyle: 'bearer',
    credentialKeys: ['REDGIFS_API_KEY'],
    primaryCredential: 'REDGIFS_API_KEY',
  },
};

// ---------------------------------------------------------------------------
// Rate limiter — token-bucket per platform (30 requests / 60 s default)
// ---------------------------------------------------------------------------
class RateLimiter {
  constructor(maxRequests = 30, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this._log = {}; // platform -> number[]
  }

  _purge(platform) {
    const now = Date.now();
    this._log[platform] = (this._log[platform] || []).filter(
      (ts) => now - ts < this.windowMs,
    );
  }

  canRequest(platform) {
    this._purge(platform);
    return (this._log[platform] || []).length < this.maxRequests;
  }

  record(platform) {
    this._purge(platform);
    (this._log[platform] = this._log[platform] || []).push(Date.now());
  }

  /** Returns a promise that resolves once the window has space again. */
  wait(platform) {
    const log = this._log[platform] || [];
    if (!log.length) return Promise.resolve();
    const delay = this.windowMs - (Date.now() - log[0]) + 100;
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, delay)));
  }
}

const rateLimiter = new RateLimiter(30, 60_000);

// ---------------------------------------------------------------------------
// Mock data — clearly flagged, used only when credentials are absent
// ---------------------------------------------------------------------------

/** Sentinel value present on all mock metric objects. */
export const MOCK_FLAG = '[MOCK]';

const _rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const _randF = (min, max, dp = 3) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(dp));

/**
 * Generate a simple random-walk time series.
 * @param {number} count
 * @param {number} baseValue
 * @param {number} [volatility=0.08]
 * @returns {{ ts: number, value: number }[]}
 */
function generateTimeSeries(count, baseValue, volatility = 0.08) {
  const now = Date.now();
  const intervalMs = 60_000; // 1-minute buckets
  let val = baseValue;
  return Array.from({ length: count }, (_, i) => {
    val = Math.max(0, val + val * (_randF(-volatility, volatility)));
    return { ts: now - (count - 1 - i) * intervalMs, value: Math.round(val) };
  });
}

const MOCK_BASE = {
  tiktok:    { views: 1_240_000, likes: 89_400,  followers: 48_200,  reach: 920_000,   retention: 0.61 },
  instagram: { views: 380_000,   likes: 42_100,  followers: 31_800,  reach: 510_000,   retention: 0.54 },
  facebook:  { views: 210_000,   likes: 18_700,  followers: 95_300,  reach: 670_000,   retention: 0.38 },
  twitch:    { views: 14_800,    likes: 3_200,   followers: 22_100,  reach: 18_000,    retention: 0.72 },
  discord:   { views: 0,         likes: 0,       followers: 6_400,   reach: 6_400,     retention: 0.85 },
  lemon8:    { views: 88_000,    likes: 12_300,  followers: 9_100,   reach: 74_000,    retention: 0.49 },
  reddit:    { views: 194_000,   likes: 28_700,  followers: 41_200,  reach: 310_000,   retention: 0.42 },
  redgifs:   { views: 2_100_000, likes: 156_000, followers: 18_400,  reach: 1_800_000, retention: 0.55 },
};

const RANGE_MULTIPLIER = { '1h': 0.04, '24h': 1, '7d': 7, '30d': 30, '90d': 90 };

function getMockMetrics(platform, range) {
  const base = MOCK_BASE[platform] || MOCK_BASE.tiktok;
  const mult = RANGE_MULTIPLIER[range] ?? 1;
  const j = 1 + _randF(-0.05, 0.05); // ±5% jitter

  const common = {
    _isMock: true,
    _mockFlag: MOCK_FLAG,
    platform,
    range,
    fetchedAt: Date.now(),
    views:          Math.round(base.views    * mult * j),
    likes:          Math.round(base.likes    * mult * j),
    followers:      Math.round(base.followers),
    reach:          Math.round(base.reach    * mult * j),
    retention:      _randF(base.retention * 0.95, base.retention * 1.05),
    engagementRate: _randF(0.02, 0.12),
    timeSeries:     generateTimeSeries(50, base.views * mult, 0.08),
  };

  switch (platform) {
    case 'twitch':
      return {
        ...common,
        liveViewers:    _rand(800, 2_200),
        peakViewers:    _rand(2_200, 5_000),
        avgViewers:     _rand(600, 1_800),
        streamDuration: _rand(3_600, 18_000), // seconds
        subsGained:     _rand(5, 40),
        bitsReceived:   _rand(100, 5_000),
      };
    case 'discord':
      return {
        ...common,
        memberCount:   _rand(6_000, 7_000),
        activeMembers: _rand(400, 1_200),
        messagesCount: Math.round(18_000 * mult),
        serverBoosts:  _rand(20, 80),
        newMembers:    _rand(10, 150),
      };
    case 'reddit':
      return {
        ...common,
        upvotes:     Math.round(base.likes * mult * j),
        comments:    Math.round(base.likes * 0.12 * mult * j),
        awards:      _rand(0, 20),
        postKarma:   _rand(10_000, 500_000),
        upvoteRatio: _randF(0.78, 0.97),
      };
    case 'redgifs':
      return {
        ...common,
        plays:          Math.round(base.views * mult * j),
        downloads:      Math.round(base.views * 0.03 * mult * j),
        shares:         Math.round(base.views * 0.02 * mult * j),
        completionRate: _randF(0.45, 0.80),
      };
    case 'instagram':
      return {
        ...common,
        impressions:   Math.round(base.views * 1.3 * mult * j),
        saves:         Math.round(base.likes * 0.15 * mult * j),
        storyViews:    Math.round(base.reach * 0.4 * mult * j),
        reelViews:     Math.round(base.views * 0.6 * mult * j),
        profileVisits: Math.round(base.reach * 0.08 * mult * j),
      };
    case 'tiktok':
      return {
        ...common,
        videoViews:     Math.round(base.views * mult * j),
        completionRate: _randF(0.35, 0.70),
        shares:         Math.round(base.likes * 0.18 * mult * j),
        comments:       Math.round(base.likes * 0.08 * mult * j),
        profileVisits:  Math.round(base.reach * 0.06 * mult * j),
      };
    case 'facebook':
      return {
        ...common,
        pageReach: Math.round(base.reach * mult * j),
        postReach: Math.round(base.reach * 0.3 * mult * j),
        reactions: Math.round(base.likes * mult * j),
        shares:    Math.round(base.likes * 0.12 * mult * j),
        comments:  Math.round(base.likes * 0.09 * mult * j),
      };
    case 'lemon8':
      return {
        ...common,
        saves:     Math.round(base.likes * 0.30 * mult * j),
        shares:    Math.round(base.likes * 0.20 * mult * j),
        comments:  Math.round(base.likes * 0.12 * mult * j),
        bookmarks: Math.round(base.likes * 0.25 * mult * j),
      };
    default:
      return common;
  }
}

// ---------------------------------------------------------------------------
// Auth header builders (no secrets are stored here — only read from env)
// ---------------------------------------------------------------------------
async function buildAuthHeaders(platform) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) throw new Error(`Unknown platform: ${platform}`);

  switch (cfg.authStyle) {
    case 'bearer': {
      const key = getEnv(cfg.primaryCredential);
      return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    }
    case 'token_param':
      // Token is appended as a query parameter; minimal headers only
      return { 'Content-Type': 'application/json' };
    case 'twitch': {
      const clientId = getEnv('TWITCH_CLIENT_ID');
      const accessToken = getEnv('TWITCH_ACCESS_TOKEN') || getEnv('TWITCH_CLIENT_SECRET');
      return {
        'Client-ID': clientId,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };
    }
    case 'bot': {
      const token = getEnv('DISCORD_BOT_TOKEN');
      return { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' };
    }
    case 'oauth2': {
      const accessToken = getEnv('REDDIT_ACCESS_TOKEN');
      return {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'NexusAIPro/2.0 by NexusAnalytics',
        'Content-Type': 'application/json',
      };
    }
    default:
      return { 'Content-Type': 'application/json' };
  }
}

// ---------------------------------------------------------------------------
// Core HTTP fetcher (10 s timeout, surfaces API errors cleanly)
// ---------------------------------------------------------------------------
async function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Platform-specific live API calls
// ---------------------------------------------------------------------------
async function fetchFromAPI(platform, range) {
  const cfg = PLATFORM_CONFIG[platform];
  const headers = await buildAuthHeaders(platform);

  switch (platform) {
    case 'tiktok': {
      return apiFetch(
        `${cfg.apiBase}/research/user/stats/?fields=view_count,like_count,follower_count,reach`,
        { method: 'GET', headers },
      );
    }
    case 'instagram': {
      const token = getEnv('INSTAGRAM_API_KEY');
      const accountId = getEnv('INSTAGRAM_ACCOUNT_ID');
      return apiFetch(
        `${cfg.apiBase}/${accountId}/insights` +
          `?metric=reach,impressions,profile_views&period=day&access_token=${token}`,
        { method: 'GET', headers },
      );
    }
    case 'facebook': {
      const token = getEnv('FACEBOOK_API_KEY');
      const pageId = getEnv('FACEBOOK_PAGE_ID');
      return apiFetch(
        `${cfg.apiBase}/${pageId}/insights` +
          `?metric=page_views_total,page_fan_count&access_token=${token}`,
        { method: 'GET', headers },
      );
    }
    case 'twitch': {
      const channel = getEnv('TWITCH_CHANNEL');
      return apiFetch(`${cfg.apiBase}/streams?user_login=${channel}`, { headers });
    }
    case 'discord': {
      const guildId = getEnv('DISCORD_GUILD_ID');
      return apiFetch(`${cfg.apiBase}/guilds/${guildId}?with_counts=true`, { headers });
    }
    case 'reddit': {
      const subreddit = getEnv('REDDIT_SUBREDDIT');
      return apiFetch(`${cfg.apiBase}/r/${subreddit}/about.json`, { headers });
    }
    case 'redgifs': {
      return apiFetch(`${cfg.apiBase}/users/me/stats`, { method: 'GET', headers });
    }
    case 'lemon8': {
      return apiFetch(`${cfg.apiBase}/analytics/overview`, { method: 'GET', headers });
    }
    default:
      throw new Error(`No live API implementation for platform: ${platform}`);
  }
}

// ---------------------------------------------------------------------------
// Response normalizer — maps raw API shapes to the common metrics contract
// ---------------------------------------------------------------------------
function normalizeResponse(platform, range, raw) {
  const base = {
    platform,
    range,
    fetchedAt: Date.now(),
    _isMock: false,
    views: 0, likes: 0, followers: 0, reach: 0,
    retention: 0, engagementRate: 0,
    timeSeries: [],
  };

  switch (platform) {
    case 'discord': {
      return {
        ...base,
        followers:    raw.approximate_member_count || 0,
        memberCount:  raw.approximate_member_count || 0,
        activeMembers: raw.approximate_presence_count || 0,
        reach:        raw.approximate_member_count || 0,
      };
    }
    case 'twitch': {
      const stream = Array.isArray(raw.data) ? raw.data[0] : null;
      return {
        ...base,
        liveViewers: stream?.viewer_count || 0,
        views:       stream?.viewer_count || 0,
      };
    }
    case 'reddit': {
      const d = raw?.data || {};
      return {
        ...base,
        followers: d.subscribers || 0,
        reach:     d.active_user_count || 0,
        views:     d.accounts_active || 0,
      };
    }
    default:
      // Pass through whatever the API returns, merged over defaults
      return { ...base, ...raw };
  }
}

// ---------------------------------------------------------------------------
// Active subscription registry
// ---------------------------------------------------------------------------
const _subscriptions = new Map(); // subKey -> { intervalId }

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch aggregated metrics for one platform over a time range.
 *
 * If the platform's primary credential is not set in env vars, returns
 * clearly-flagged mock data ({ _isMock: true, _mockFlag: '[MOCK]', ... }).
 *
 * @param {string} platform - tiktok | instagram | facebook | twitch | discord | lemon8 | reddit | redgifs
 * @param {string} [range='24h'] - 1h | 24h | 7d | 30d | 90d
 * @returns {Promise<object>}
 */
export async function fetchMetrics(platform, range = '24h') {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) throw new Error(`Unsupported platform: "${platform}"`);

  if (!getEnv(cfg.primaryCredential)) {
    console.warn(
      `[SocialConnector] ${cfg.primaryCredential} not configured — ` +
        `returning mock data for ${platform}`,
    );
    return getMockMetrics(platform, range);
  }

  if (!rateLimiter.canRequest(platform)) {
    console.warn(`[SocialConnector] Rate limit reached for ${platform}; waiting for window reset`);
    await rateLimiter.wait(platform);
  }

  try {
    rateLimiter.record(platform);
    const raw = await fetchFromAPI(platform, range);
    return normalizeResponse(platform, range, raw);
  } catch (err) {
    console.error(`[SocialConnector] API error (${platform}):`, err.message);
    // Graceful degradation: return mock data tagged with the API error
    const fallback = getMockMetrics(platform, range);
    fallback._apiError = err.message;
    return fallback;
  }
}

/**
 * Fetch a lightweight real-time snapshot (always uses the 1h window).
 *
 * @param {string} platform
 * @returns {Promise<object>}
 */
export async function fetchRealTimeData(platform) {
  return fetchMetrics(platform, '1h');
}

/**
 * Subscribe to periodic metric updates for a platform.
 * Calls `callback` immediately with the first fetch, then on each interval.
 *
 * @param {string}   platform
 * @param {Function} callback      - Receives a metrics object on each tick
 * @param {number}   [intervalMs=30000] - Poll interval; minimum enforced at 5 000 ms
 * @returns {Function} Unsubscribe — call to stop receiving updates
 */
export function subscribeToUpdates(platform, callback, intervalMs = 30_000) {
  const interval = Math.max(5_000, intervalMs);
  const subKey = `${platform}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;

  const fire = () =>
    fetchRealTimeData(platform)
      .then(callback)
      .catch((err) =>
        console.error(`[SocialConnector] Subscription error (${platform}):`, err.message),
      );

  fire(); // immediate first tick

  const intervalId = setInterval(fire, interval);
  _subscriptions.set(subKey, { intervalId });

  return function unsubscribe() {
    clearInterval(intervalId);
    _subscriptions.delete(subKey);
  };
}

/**
 * Cancel every active subscription (call on app teardown).
 */
export function unsubscribeAll() {
  for (const { intervalId } of _subscriptions.values()) {
    clearInterval(intervalId);
  }
  _subscriptions.clear();
}

/**
 * Return true if the given platform has credentials in the environment.
 *
 * @param {string} platform
 * @returns {boolean}
 */
export function isPlatformConfigured(platform) {
  const cfg = PLATFORM_CONFIG[platform];
  return cfg ? Boolean(getEnv(cfg.primaryCredential)) : false;
}

/**
 * Return all supported platform keys.
 *
 * @returns {string[]}
 */
export function getSupportedPlatforms() {
  return Object.keys(PLATFORM_CONFIG);
}

export default {
  fetchMetrics,
  fetchRealTimeData,
  subscribeToUpdates,
  unsubscribeAll,
  isPlatformConfigured,
  getSupportedPlatforms,
  PLATFORM_CONFIG,
  MOCK_FLAG,
};

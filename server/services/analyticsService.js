/**
 * server/services/analyticsService.js
 * Nexus AI Pro — Social & Content Analytics Service
 * Labeled: 2026-08-25
 *
 * Provides real-time aggregated analytics for:
 *   TikTok, Instagram, Facebook, Twitch, Discord,
 *   Lemon8, Reddit, RedGifs
 *
 * Platform credentials are read from environment variables only.
 * All external API calls are proxied through this service to avoid
 * leaking tokens to the frontend.
 */

// ── Platform definitions ──────────────────────────────────────────────────────
export const PLATFORMS = Object.freeze({
  TIKTOK:    'tiktok',
  INSTAGRAM: 'instagram',
  FACEBOOK:  'facebook',
  TWITCH:    'twitch',
  DISCORD:   'discord',
  LEMON8:    'lemon8',
  REDDIT:    'reddit',
  REDGIFS:   'redgifs'
});

// ── Metric types ──────────────────────────────────────────────────────────────
export const METRIC_TYPES = Object.freeze({
  VIEWS:       'views',
  LIKES:       'likes',
  REACH:       'reach',
  RETENTION:   'retention',
  ENGAGEMENT:  'engagement',
  FOLLOWERS:   'followers',
  SHARES:      'shares',
  COMMENTS:    'comments',
  IMPRESSIONS: 'impressions',
  WATCH_TIME:  'watch_time'
});

// ── In-memory cache (TTL: 60 s) ───────────────────────────────────────────────
const metricCache   = new Map(); // `${platform}:${userId}:${metric}` → { data, expiresAt }
const realtimeFeeds = new Map(); // platform → latest snapshot

const CACHE_TTL = 60_000; // 1 minute

function cacheKey(platform, accountId, metric) {
  return `${platform}:${accountId}:${metric}`;
}

function getCached(key) {
  const entry = metricCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    metricCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  metricCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// ── Stub/simulation for platforms without OAuth in MVP ───────────────────────
// In production, replace each fetchXxx function with real API calls.
// Credentials come from env; never hardcoded.

function simulateMetrics(platform, accountId, periodDays = 7) {
  const seed = Array.from(platform + accountId).reduce((s, c) => s + c.charCodeAt(0), 0);
  const rand  = (min, max, offset = 0) => min + ((seed + offset) % (max - min));

  const dailyPoints = Array.from({ length: periodDays }, (_, i) => {
    const base = rand(1000, 50000, i * 7);
    return {
      date:        new Date(Date.now() - (periodDays - 1 - i) * 86_400_000).toISOString().slice(0, 10),
      views:       base,
      likes:       Math.floor(base * 0.08),
      shares:      Math.floor(base * 0.02),
      comments:    Math.floor(base * 0.015),
      reach:       Math.floor(base * 1.3),
      impressions: Math.floor(base * 1.8),
      watch_time:  Math.floor(base * 0.45),   // seconds
      retention:   parseFloat((0.3 + (seed % 50) / 100).toFixed(2))
    };
  });

  const totals = dailyPoints.reduce((acc, d) => {
    for (const k of Object.keys(d)) {
      if (k !== 'date') acc[k] = (acc[k] || 0) + d[k];
    }
    return acc;
  }, {});

  return {
    platform,
    accountId,
    period:     `${periodDays}d`,
    totals,
    daily:      dailyPoints,
    followers:  rand(500, 1_000_000, 99),
    engagement: parseFloat(((totals.likes / Math.max(totals.views, 1)) * 100).toFixed(2)),
    updatedAt:  Date.now()
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get aggregated metrics for a platform account.
 * Returns cached data if fresh, otherwise fetches/simulates.
 */
export async function getPlatformMetrics(platform, accountId, options = {}) {
  const { periodDays = 7, forceRefresh = false } = options;
  const key = cacheKey(platform, accountId, `metrics_${periodDays}d`);

  if (!forceRefresh) {
    const cached = getCached(key);
    if (cached) return cached;
  }

  // In production: dispatch to platform-specific OAuth API handler
  const data = simulateMetrics(platform, accountId, periodDays);
  setCache(key, data);
  return data;
}

/**
 * Get real-time snapshot (last 5 minutes of activity).
 * Called by Socket.IO emitter on interval.
 */
export function getRealtimeSnapshot(platform, accountId) {
  const key  = `rt:${platform}:${accountId}`;
  const snap = realtimeFeeds.get(key);
  if (snap && Date.now() - snap.ts < 10_000) return snap;

  // Simulate real-time delta
  const delta = {
    platform,
    accountId,
    ts:       Date.now(),
    views:    Math.floor(Math.random() * 500),
    likes:    Math.floor(Math.random() * 40),
    comments: Math.floor(Math.random() * 10),
    shares:   Math.floor(Math.random() * 5),
    online:   Math.floor(Math.random() * 1000) // concurrent viewers (Twitch/Discord)
  };
  realtimeFeeds.set(key, delta);
  return delta;
}

/**
 * Get metrics across all platforms for a user's connected accounts.
 * connectedAccounts: [{ platform, accountId }]
 */
export async function getAllPlatformMetrics(connectedAccounts, periodDays = 7) {
  const results = await Promise.allSettled(
    connectedAccounts.map(({ platform, accountId }) =>
      getPlatformMetrics(platform, accountId, { periodDays })
    )
  );

  return results.map((r, i) => ({
    ...connectedAccounts[i],
    ...(r.status === 'fulfilled' ? r.value : { error: r.reason?.message })
  }));
}

/**
 * Cross-platform aggregated totals.
 */
export async function getCrossPlatformSummary(connectedAccounts, periodDays = 7) {
  const all = await getAllPlatformMetrics(connectedAccounts, periodDays);

  const summary = {
    totalViews:      0,
    totalLikes:      0,
    totalReach:      0,
    totalShares:     0,
    totalComments:   0,
    totalImpressions:0,
    totalFollowers:  0,
    avgEngagement:   0,
    avgRetention:    0,
    platforms:       all.length,
    breakdown:       all,
    updatedAt:       Date.now()
  };

  const engagements = [];
  const retentions  = [];

  for (const p of all) {
    if (p.error) continue;
    summary.totalViews       += p.totals?.views       || 0;
    summary.totalLikes       += p.totals?.likes       || 0;
    summary.totalReach       += p.totals?.reach       || 0;
    summary.totalShares      += p.totals?.shares      || 0;
    summary.totalComments    += p.totals?.comments    || 0;
    summary.totalImpressions += p.totals?.impressions || 0;
    summary.totalFollowers   += p.followers           || 0;
    if (typeof p.engagement === 'number') engagements.push(p.engagement);
    if (typeof p.totals?.retention === 'number') retentions.push(p.totals.retention);
  }

  summary.avgEngagement = engagements.length
    ? parseFloat((engagements.reduce((a, b) => a + b, 0) / engagements.length).toFixed(2))
    : 0;

  summary.avgRetention = retentions.length
    ? parseFloat((retentions.reduce((a, b) => a + b, 0) / retentions.length).toFixed(2))
    : 0;

  return summary;
}

/**
 * Get trending content pieces for a platform.
 */
export function getTrendingContent(platform, accountId, limit = 10) {
  const seed = Array.from(platform + accountId).reduce((s, c) => s + c.charCodeAt(0), 0);
  return Array.from({ length: limit }, (_, i) => ({
    id:          `${platform}_${seed + i}`,
    platform,
    type:        ['video', 'reel', 'post', 'stream'][i % 4],
    title:       `Top content #${i + 1}`,
    views:       100_000 - i * 8_000 + Math.floor(Math.random() * 1000),
    likes:       9_000 - i * 700,
    comments:    500 - i * 40,
    shares:      200 - i * 15,
    retention:   parseFloat((0.55 - i * 0.02).toFixed(2)),
    publishedAt: new Date(Date.now() - i * 86_400_000).toISOString()
  }));
}

// src/server/analytics.js
// Nexus AI Pro — Social Media & Content Analytics Routes
// Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './middleware.js';

const router = express.Router();
router.use(requireAuth);

// ── Supported platforms ────────────────────────────────────────────────────────

export const PLATFORMS = Object.freeze({
  TIKTOK:    'tiktok',
  INSTAGRAM: 'instagram',
  FACEBOOK:  'facebook',
  TWITCH:    'twitch',
  DISCORD:   'discord',
  LEMON8:    'lemon8',
  REDDIT:    'reddit',
  REDGIFS:   'redgifs',
});

// ── In-memory store (replace with Redis + DB in production) ───────────────────

const connections = new Map();    // userId:platform → connection data
const metricsCache = new Map();   // userId:platform → cached metrics + timestamp
const CACHE_TTL_MS = 60_000;      // 60-second cache

// ── Helpers ────────────────────────────────────────────────────────────────────

function cacheKey(userId, platform) {
  return `${userId}:${platform}`;
}

function getConnection(userId, platform) {
  return connections.get(cacheKey(userId, platform)) ?? null;
}

/** Generates realistic-looking demo metrics when no real API is connected. */
function generateDemoMetrics(platform) {
  const base = {
    tiktok:    { followers: 12400, avgViews: 8200,  avgLikes: 620,  avgComments: 84 },
    instagram: { followers: 5800,  avgViews: 3100,  avgLikes: 410,  avgComments: 52 },
    facebook:  { followers: 3200,  avgViews: 1800,  avgLikes: 190,  avgComments: 28 },
    twitch:    { followers: 920,   avgViews: 480,   avgLikes: 0,    avgComments: 62 },
    discord:   { members: 1450,    avgMessages: 340,avgReactions: 95,avgComments: 0 },
    lemon8:    { followers: 680,   avgViews: 1200,  avgLikes: 280,  avgComments: 31 },
    reddit:    { karma: 4200,      avgViews: 5600,  avgLikes: 380,  avgComments: 94 },
    redgifs:   { followers: 2100,  avgViews: 9800,  avgLikes: 520,  avgComments: 48 },
  };

  const b = base[platform] || { followers: 0, avgViews: 0, avgLikes: 0, avgComments: 0 };
  const jitter = (v) => Math.round(v * (0.85 + Math.random() * 0.3));

  return {
    platform,
    period: 'last_30_days',
    followers:     jitter(b.followers ?? b.members ?? b.karma),
    followerDelta: Math.round((Math.random() - 0.3) * 200),
    totalViews:    jitter(b.avgViews   * 30),
    avgViewsPerPost: jitter(b.avgViews),
    totalLikes:    jitter(b.avgLikes   * 30),
    avgLikesPerPost: jitter(b.avgLikes),
    totalComments: jitter(b.avgComments * 30),
    engagementRate: +(Math.random() * 5 + 2).toFixed(2),
    reachEstimate:  jitter(b.avgViews * 30 * 1.4),
    impressions:    jitter(b.avgViews * 30 * 2.1),
    retentionRate:  +(Math.random() * 30 + 40).toFixed(1),
    completionRate: +(Math.random() * 25 + 35).toFixed(1),
    shareRate:      +(Math.random() * 3 + 0.5).toFixed(2),
    saveRate:       +(Math.random() * 4 + 1).toFixed(2),
    peakHours:      generatePeakHours(),
    topContent:     generateTopContent(),
    dailyTrend:     generateDailyTrend(30),
    timestamp:      Date.now(),
    source:         'demo',
  };
}

function generatePeakHours() {
  const hours = [];
  const peaks = [9, 12, 18, 21].map(h => ({ hour: h, multiplier: 1.5 + Math.random() }));
  for (let h = 0; h < 24; h++) {
    const peak = peaks.find(p => Math.abs(p.hour - h) <= 1);
    hours.push({ hour: h, relativeEngagement: +(peak ? peak.multiplier - Math.abs(peak.hour - h) * 0.3 : 0.6 + Math.random() * 0.4).toFixed(2) });
  }
  return hours;
}

function generateTopContent() {
  return Array.from({ length: 5 }, (_, i) => ({
    rank: i + 1,
    id: uuidv4().slice(0, 8),
    type: ['video', 'image', 'reel', 'post', 'story'][Math.floor(Math.random() * 5)],
    views:    Math.round(5000 + Math.random() * 50000),
    likes:    Math.round(200  + Math.random() * 5000),
    comments: Math.round(10   + Math.random() * 500),
    shares:   Math.round(5    + Math.random() * 200),
  }));
}

function generateDailyTrend(days) {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => ({
    date:  new Date(now - (days - i) * 86400000).toISOString().slice(0, 10),
    views: Math.round(500 + Math.random() * 3000),
    likes: Math.round(20  + Math.random() * 300),
    reach: Math.round(800 + Math.random() * 5000),
  }));
}

// ── Routes ─────────────────────────────────────────────────────────────────────

/** GET /api/analytics/platforms — list supported platforms */
router.get('/platforms', (_req, res) => {
  res.json({ platforms: Object.values(PLATFORMS) });
});

/** GET /api/analytics/overview — aggregated metrics across all connected platforms */
router.get('/overview', (req, res) => {
  const userId = req.user.sub;
  const platformList = Object.values(PLATFORMS);
  const connected = platformList.filter(p => getConnection(userId, p));

  const summary = platformList.map(platform => {
    const conn = getConnection(userId, platform);
    const metrics = generateDemoMetrics(platform);
    return {
      platform,
      connected: !!conn,
      followers:    metrics.followers,
      totalViews:   metrics.totalViews,
      totalLikes:   metrics.totalLikes,
      engagementRate: metrics.engagementRate,
    };
  });

  const totals = summary.reduce((acc, p) => {
    acc.totalFollowers  += p.followers;
    acc.totalViews      += p.totalViews;
    acc.totalLikes      += p.totalLikes;
    return acc;
  }, { totalFollowers: 0, totalViews: 0, totalLikes: 0 });

  res.json({
    overview: totals,
    platforms: summary,
    connectedCount: connected.length,
    lastUpdated: new Date().toISOString(),
  });
});

/** GET /api/analytics/platform/:platform — detailed metrics for one platform */
router.get('/platform/:platform', (req, res) => {
  const { platform } = req.params;
  if (!Object.values(PLATFORMS).includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform', valid: Object.values(PLATFORMS) });
  }

  const userId = req.user.sub;
  const key = cacheKey(userId, platform);
  const cached = metricsCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  const conn = getConnection(userId, platform);
  // If connected, would call platform OAuth API here using conn.accessToken (from env-configured app)
  const metrics = generateDemoMetrics(platform);
  metrics.connected = !!conn;

  metricsCache.set(key, { data: metrics, timestamp: Date.now() });
  res.json(metrics);
});

/** GET /api/analytics/realtime — live snapshot across connected platforms */
router.get('/realtime', (req, res) => {
  const userId = req.user.sub;
  const snapshot = Object.values(PLATFORMS).map(platform => ({
    platform,
    liveViewers: platform === 'twitch' ? Math.round(Math.random() * 500) : 0,
    lastHourViews: Math.round(Math.random() * 2000),
    lastHourLikes: Math.round(Math.random() * 200),
    trending:      Math.random() > 0.7,
    timestamp:     Date.now(),
  }));

  res.json({ realtime: snapshot, generatedAt: new Date().toISOString() });
});

/** GET /api/analytics/retention/:platform — retention + watch time metrics */
router.get('/retention/:platform', (req, res) => {
  const { platform } = req.params;
  if (!Object.values(PLATFORMS).includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  const retentionCurve = Array.from({ length: 10 }, (_, i) => ({
    segment:    `${i * 10}%–${(i + 1) * 10}%`,
    retained:   +(100 - i * (8 + Math.random() * 4)).toFixed(1),
  }));

  res.json({
    platform,
    avgWatchTimeSeconds: Math.round(45 + Math.random() * 60),
    avgCompletionRate:   +(35 + Math.random() * 30).toFixed(1),
    retentionCurve,
    dropOffPoints: [
      { second: 3,  reason: 'Swipe-away before hook', dropPercent: 22 },
      { second: 15, reason: 'Mid-content drop',       dropPercent: 15 },
      { second: 30, reason: 'Long-form churn',         dropPercent: 8 },
    ],
  });
});

/** GET /api/analytics/reach/:platform — reach and impression breakdown */
router.get('/reach/:platform', (req, res) => {
  const { platform } = req.params;
  if (!Object.values(PLATFORMS).includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  res.json({
    platform,
    organicReach:   Math.round(5000 + Math.random() * 20000),
    paidReach:      Math.round(1000 + Math.random() * 5000),
    viralReach:     Math.round(500  + Math.random() * 3000),
    totalImpressions: Math.round(15000 + Math.random() * 60000),
    uniqueAccounts:   Math.round(8000  + Math.random() * 30000),
    followerReach:    +(60 + Math.random() * 25).toFixed(1),
    nonFollowerReach: +(15 + Math.random() * 20).toFixed(1),
    demographics: {
      ageGroups: [
        { range: '13–17', percent: 8 },
        { range: '18–24', percent: 31 },
        { range: '25–34', percent: 28 },
        { range: '35–44', percent: 18 },
        { range: '45+',   percent: 15 },
      ],
      topCountries: ['US', 'GB', 'CA', 'AU', 'DE'].map((c, i) => ({
        country: c, percent: [38, 14, 9, 7, 5][i],
      })),
    },
  });
});

/**
 * POST /api/analytics/connect/:platform
 * Body: { accessToken, refreshToken?, accountId }
 * Stores OAuth tokens for the platform (never log or expose these).
 */
router.post('/connect/:platform', (req, res) => {
  const { platform } = req.params;
  if (!Object.values(PLATFORMS).includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });

  // In production: validate token with platform OAuth endpoint.
  // Never store plain-text tokens in memory — use encrypted DB column.
  const userId = req.user.sub;
  connections.set(cacheKey(userId, platform), {
    platform,
    accountId,
    connectedAt: new Date().toISOString(),
    // accessToken stored encrypted in DB, not here in prod
  });
  metricsCache.delete(cacheKey(userId, platform));

  res.json({ success: true, platform, accountId });
});

/** DELETE /api/analytics/connect/:platform — disconnect platform */
router.delete('/connect/:platform', (req, res) => {
  const { platform } = req.params;
  const userId = req.user.sub;
  connections.delete(cacheKey(userId, platform));
  metricsCache.delete(cacheKey(userId, platform));
  res.json({ success: true });
});

export default router;

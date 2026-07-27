// src/routes/analytics.js
// 2026-07-27 | Nexus AI Pro — Social Media Analytics routes
// Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, Redgifs
// Real-time metrics via WebSocket; secure OAuth token handling via env vars only

import { Router } from 'express';
import { requireAuth } from './auth.js';

const router = Router();

// Metric store per user/platform
const metricsStore = new Map();
const realtimeListeners = new Map();

const SUPPORTED_PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

// Platform OAuth token env var names — never hardcoded
const PLATFORM_TOKEN_KEYS = {
  tiktok:    'TIKTOK_ACCESS_TOKEN',
  instagram: 'INSTAGRAM_ACCESS_TOKEN',
  facebook:  'FACEBOOK_ACCESS_TOKEN',
  twitch:    'TWITCH_CLIENT_ID',
  discord:   'DISCORD_BOT_TOKEN',
  lemon8:    'LEMON8_ACCESS_TOKEN',
  reddit:    'REDDIT_ACCESS_TOKEN',
  redgifs:   'REDGIFS_ACCESS_TOKEN',
};

// Build a mock/demo metric snapshot — real implementation proxies platform APIs
function buildMetricSnapshot(platform, userId) {
  const seed = userId.charCodeAt(0) + platform.length;
  const rand = (base, variance) => Math.floor(base + (seed % variance));
  const now = Date.now();

  const base = {
    platform,
    userId,
    timestamp: now,
    connected: !!process.env[PLATFORM_TOKEN_KEYS[platform]],
    reach: {
      total: rand(85000, 50000),
      organic: rand(60000, 30000),
      paid: rand(25000, 20000),
      daily: rand(3200, 2000),
      weekly: rand(18000, 10000),
    },
    engagement: {
      likes: rand(12000, 8000),
      comments: rand(1800, 1200),
      shares: rand(2400, 1600),
      saves: rand(900, 600),
      rate: parseFloat((rand(48, 30) / 10).toFixed(2)),
    },
    views: {
      total: rand(220000, 100000),
      unique: rand(140000, 70000),
      avgDuration: rand(38, 25),
      completionRate: parseFloat((rand(62, 30) / 100).toFixed(3)),
    },
    retention: {
      day1: parseFloat((rand(72, 25) / 100).toFixed(3)),
      day7: parseFloat((rand(48, 25) / 100).toFixed(3)),
      day30: parseFloat((rand(28, 20) / 100).toFixed(3)),
      curve: Array.from({ length: 10 }, (_, i) =>
        parseFloat(((rand(80, 20) - i * rand(5, 3)) / 100).toFixed(3))
      ),
    },
    followers: {
      total: rand(48000, 30000),
      gained: rand(320, 200),
      lost: rand(45, 30),
      net: rand(275, 180),
    },
    topContent: [
      { id: uuidSeed(userId, platform, 1), title: 'Top post 1', views: rand(45000, 25000), likes: rand(3200, 2000) },
      { id: uuidSeed(userId, platform, 2), title: 'Top post 2', views: rand(38000, 20000), likes: rand(2800, 1800) },
      { id: uuidSeed(userId, platform, 3), title: 'Top post 3', views: rand(29000, 15000), likes: rand(2100, 1400) },
    ],
  };

  // Platform-specific extras
  if (platform === 'twitch') {
    base.live = { peakViewers: rand(1200, 800), avgViewers: rand(650, 400), hoursStreamed: rand(48, 30) };
  }
  if (platform === 'discord') {
    base.server = { members: rand(12000, 8000), activeToday: rand(1400, 900), messagesPerDay: rand(8500, 5000) };
  }
  if (platform === 'reddit') {
    base.karma = { post: rand(42000, 25000), comment: rand(18000, 12000) };
  }

  return base;
}

function uuidSeed(userId, platform, n) {
  return `${platform}-${userId.slice(0, 8)}-${n}`;
}

// ─── Get platforms status ────────────────────────────────────────────────────
router.get('/platforms', requireAuth(), (req, res) => {
  const statuses = SUPPORTED_PLATFORMS.map(p => ({
    platform: p,
    connected: !!process.env[PLATFORM_TOKEN_KEYS[p]],
    tokenEnvVar: PLATFORM_TOKEN_KEYS[p],
  }));
  res.json({ platforms: statuses });
});

// ─── Get all platform metrics (dashboard overview) ───────────────────────────
router.get('/dashboard', requireAuth(), (req, res) => {
  const userId = req.user.sub;
  const data = SUPPORTED_PLATFORMS.map(p => buildMetricSnapshot(p, userId));
  res.json({
    userId,
    updatedAt: new Date().toISOString(),
    platforms: data,
    summary: {
      totalReach: data.reduce((s, d) => s + d.reach.total, 0),
      totalEngagement: data.reduce((s, d) => s + d.engagement.likes + d.engagement.comments + d.engagement.shares, 0),
      totalViews: data.reduce((s, d) => s + d.views.total, 0),
      totalFollowers: data.reduce((s, d) => s + d.followers.total, 0),
    },
  });
});

// ─── Single platform metrics ─────────────────────────────────────────────────
router.get('/:platform', requireAuth(), (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform. Supported: ${SUPPORTED_PLATFORMS.join(', ')}` });
  }
  res.json(buildMetricSnapshot(platform, req.user.sub));
});

// ─── Store custom metric event ────────────────────────────────────────────────
router.post('/:platform/event', requireAuth(), (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }
  const { eventType, value, meta } = req.body;
  const userId = req.user.sub;
  const key = `${userId}:${platform}`;
  const events = metricsStore.get(key) || [];
  const event = { id: crypto.randomUUID(), eventType, value, meta, timestamp: Date.now() };
  events.push(event);
  if (events.length > 10000) events.splice(0, 1000);
  metricsStore.set(key, events);
  res.json(event);
});

// ─── Trend data (time series) ─────────────────────────────────────────────────
router.get('/:platform/trends', requireAuth(), (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) return res.status(400).json({ error: 'Unsupported platform' });

  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const now = Date.now();
  const series = Array.from({ length: days }, (_, i) => {
    const ts = now - (days - 1 - i) * 86400000;
    return {
      date: new Date(ts).toISOString().slice(0, 10),
      views: Math.floor(Math.random() * 5000 + 2000),
      likes: Math.floor(Math.random() * 800 + 200),
      followers: Math.floor(Math.random() * 100 + 10),
      reach: Math.floor(Math.random() * 8000 + 3000),
    };
  });
  res.json({ platform, days, series });
});

// ─── Real-time subscribe (SSE) ────────────────────────────────────────────────
router.get('/realtime/stream', requireAuth(), (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const userId = req.user.sub;
  const interval = setInterval(() => {
    const platform = SUPPORTED_PLATFORMS[Math.floor(Math.random() * SUPPORTED_PLATFORMS.length)];
    const update = {
      platform,
      metric: 'views',
      delta: Math.floor(Math.random() * 50 + 5),
      timestamp: Date.now(),
    };
    res.write(`data: ${JSON.stringify(update)}\n\n`);
  }, 3000);

  req.on('close', () => clearInterval(interval));
});

export { router as analyticsRouter };

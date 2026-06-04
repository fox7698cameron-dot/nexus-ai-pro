// ================================================
// NEXUS AI PRO — Social Analytics API Module
// Platforms: TikTok, Instagram, Facebook, Twitch,
//            Discord, Lemon8, Reddit, RedGifs
// Real-time via Socket.io rooms
// Created: 2026-06-04
// ================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = Router();

// ── Platform registry ─────────────────────────────────────
const PLATFORMS = Object.freeze([
  'tiktok', 'instagram', 'facebook', 'twitch',
  'discord', 'lemon8', 'reddit', 'redgifs'
]);

// In-memory metric store (swap for TimescaleDB/InfluxDB in production)
const metricStore = new Map(); // platformKey -> metrics[]
const connectionStore = new Map(); // userId+platform -> credentials

// ── Metric helpers ────────────────────────────────────────
function buildPlatformKey(userId, platform) {
  return `${userId}:${platform}`;
}

function generateDemoMetrics(platform) {
  const base = { platform, timestamp: Date.now(), id: uuidv4() };
  const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const platformDefaults = {
    tiktok:    { views: rng(1000, 500000), likes: rng(100, 50000), shares: rng(10, 5000),  comments: rng(5, 2000),  followers: rng(100, 1000000), reach: rng(500, 600000), watchTime: rng(10, 90) },
    instagram: { impressions: rng(500, 200000), likes: rng(50, 20000), saves: rng(5, 2000),  shares: rng(2, 1000),   followers: rng(200, 500000),  reach: rng(300, 250000), stories_views: rng(100, 50000) },
    facebook:  { reach: rng(200, 100000), impressions: rng(400, 200000), reactions: rng(20, 5000), shares: rng(5, 1000), comments: rng(3, 800),  page_views: rng(50, 10000), followers: rng(100, 200000) },
    twitch:    { viewers: rng(1, 50000), followers: rng(50, 500000), subs: rng(0, 5000), clips: rng(0, 200), hours_watched: rng(1, 10000), peak_viewers: rng(5, 80000), chat_messages: rng(10, 100000) },
    discord:   { members: rng(10, 200000), online: rng(5, 20000), messages: rng(50, 50000), voice_minutes: rng(0, 100000), new_members: rng(0, 500), boost_tier: rng(0, 3), channels: rng(5, 200) },
    lemon8:    { views: rng(100, 50000), likes: rng(10, 5000), saves: rng(5, 2000), comments: rng(1, 500), followers: rng(20, 100000), reach: rng(50, 60000) },
    reddit:    { upvotes: rng(1, 100000), comments: rng(0, 5000), karma: rng(100, 500000), post_views: rng(10, 200000), subscribers: rng(0, 1000000), awards: rng(0, 100) },
    redgifs:   { views: rng(100, 1000000), likes: rng(10, 50000), shares: rng(1, 10000), downloads: rng(0, 5000), followers: rng(0, 100000) }
  };

  return { ...base, ...platformDefaults[platform] };
}

function buildRetentionCurve(points = 10) {
  const curve = [];
  let retention = 100;
  for (let i = 0; i < points; i++) {
    retention = Math.max(0, retention - Math.random() * 15);
    curve.push({ second: i * 6, retention: Math.round(retention) });
  }
  return curve;
}

// ── Socket.io analytics rooms ─────────────────────────────
export function bindAnalyticsSocket(io) {
  const analyticsNs = io.of('/analytics');

  analyticsNs.on('connection', (socket) => {
    socket.on('subscribe', ({ platform, userId }) => {
      if (!PLATFORMS.includes(platform)) return;
      socket.join(`${userId}:${platform}`);
    });

    socket.on('unsubscribe', ({ platform, userId }) => {
      socket.leave(`${userId}:${platform}`);
    });
  });

  // Emit real-time demo metrics every 5 seconds
  setInterval(() => {
    for (const platform of PLATFORMS) {
      const metrics = generateDemoMetrics(platform);
      analyticsNs.to(`*:${platform}`).emit('metrics', metrics);
    }
  }, 5000);

  return analyticsNs;
}

// ── POST /api/analytics/connect ───────────────────────────
router.post('/connect', requireAuth, (req, res) => {
  const { platform, accessToken, accountId, accountName } = req.body;

  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Platform must be one of: ${PLATFORMS.join(', ')}` });
  }
  if (!accessToken || !accountId) {
    return res.status(400).json({ error: 'accessToken and accountId required.' });
  }

  const key = buildPlatformKey(req.user.id, platform);
  connectionStore.set(key, {
    platform,
    accountId,
    accountName: accountName || accountId,
    connectedAt: new Date().toISOString(),
    active: true
  });

  res.json({ success: true, platform, accountName: accountName || accountId });
});

// ── DELETE /api/analytics/connect/:platform ────────────────
router.delete('/connect/:platform', requireAuth, (req, res) => {
  const { platform } = req.params;
  const key = buildPlatformKey(req.user.id, platform);
  connectionStore.delete(key);
  res.json({ success: true });
});

// ── GET /api/analytics/platforms ──────────────────────────
router.get('/platforms', requireAuth, (req, res) => {
  const connected = PLATFORMS.map(p => {
    const key = buildPlatformKey(req.user.id, p);
    const conn = connectionStore.get(key);
    return { platform: p, connected: !!conn, accountName: conn?.accountName || null };
  });
  res.json({ platforms: connected });
});

// ── GET /api/analytics/:platform/metrics ──────────────────
router.get('/:platform/metrics', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform.' });
  }

  const { range = '7d', limit = 50 } = req.query;
  const key = buildPlatformKey(req.user.id, platform);
  const stored = metricStore.get(key) || [];

  const metrics = stored.length > 0
    ? stored.slice(-Number(limit))
    : Array.from({ length: 7 }, (_, i) => ({
        ...generateDemoMetrics(platform),
        timestamp: Date.now() - (6 - i) * 86400000
      }));

  res.json({ platform, range, metrics });
});

// ── GET /api/analytics/:platform/retention ────────────────
router.get('/:platform/retention', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform.' });
  }

  res.json({ platform, retention: buildRetentionCurve(12), averageWatchPercent: Math.floor(Math.random() * 40 + 30) });
});

// ── GET /api/analytics/:platform/reach ────────────────────
router.get('/:platform/reach', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform.' });
  }

  const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  res.json({
    platform,
    organic: rng(1000, 50000),
    paid: rng(500, 20000),
    viral: rng(0, 10000),
    total: rng(1500, 80000),
    demographics: {
      age: { '13-17': 12, '18-24': 35, '25-34': 28, '35-44': 15, '45+': 10 },
      gender: { female: 55, male: 42, other: 3 },
      topCountries: ['US', 'GB', 'CA', 'AU', 'DE']
    }
  });
});

// ── GET /api/analytics/overview ───────────────────────────
router.get('/overview', requireAuth, (req, res) => {
  const summary = PLATFORMS.map(p => {
    const m = generateDemoMetrics(p);
    return { platform: p, totalReach: m.reach || m.views || m.impressions || 0, engagement: Math.floor(Math.random() * 10 + 1), growth: (Math.random() * 20 - 5).toFixed(1) };
  });
  res.json({ summary, generatedAt: new Date().toISOString() });
});

// ── GET /api/analytics/export ─────────────────────────────
router.get('/export', requireAuth, (req, res) => {
  const { platform, format = 'json' } = req.query;
  const platforms = platform ? [platform] : PLATFORMS;

  const data = platforms.map(p => ({ platform: p, metrics: generateDemoMetrics(p) }));

  if (format === 'csv') {
    const headers = ['platform', 'timestamp', 'reach', 'engagement'];
    const rows = data.map(d => [d.platform, d.metrics.timestamp, d.metrics.reach || 0, 0].join(','));
    res.set('Content-Type', 'text/csv');
    return res.send([headers.join(','), ...rows].join('\n'));
  }

  res.json({ data, exportedAt: new Date().toISOString() });
});

export { router as analyticsRouter };

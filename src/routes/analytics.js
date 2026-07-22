// src/routes/analytics.js
// 2026-07-22 | Analytics dashboard — social media metrics, reach, retention, real-time

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ─── In-memory metric store ───────────────────────────────────────────────────
// In production: write to PostgreSQL analytics schema and read from Redis cache.

const analyticsStore = new Map(); // userId → { platforms: {}, projects: [] }
const liveConnections = new Map(); // userId → SSE res object

function getOrInit(userId) {
  if (!analyticsStore.has(userId)) {
    analyticsStore.set(userId, { platforms: {}, projects: [], updatedAt: new Date().toISOString() });
  }
  return analyticsStore.get(userId);
}

// ─── Supported platforms ──────────────────────────────────────────────────────

export const PLATFORMS = [
  'tiktok', 'instagram', 'facebook', 'twitch',
  'discord', 'lemon8', 'reddit', 'redgifs',
  'youtube', 'x', 'linkedin', 'snapchat',
];

// ─── GET /api/analytics/dashboard ─────────────────────────────────────────────

router.get('/dashboard', authenticate, (req, res) => {
  const data = getOrInit(req.user.sub);
  return res.json({
    userId: req.user.sub,
    platforms: data.platforms,
    aggregated: aggregate(data.platforms),
    updatedAt: data.updatedAt,
  });
});

// ─── GET /api/analytics/platforms ─────────────────────────────────────────────

router.get('/platforms', authenticate, (req, res) => {
  const data = getOrInit(req.user.sub);
  return res.json({ platforms: Object.keys(data.platforms), available: PLATFORMS });
});

// ─── POST /api/analytics/metrics ──────────────────────────────────────────────
// Ingests metrics pushed from platform webhook integrations or manual entry.

router.post('/metrics', authenticate, (req, res) => {
  const { platform, metrics } = req.body;
  if (!platform || !PLATFORMS.includes(platform.toLowerCase())) {
    return res.status(400).json({ error: `Unsupported platform. Use: ${PLATFORMS.join(', ')}` });
  }
  const data = getOrInit(req.user.sub);
  const p = platform.toLowerCase();
  data.platforms[p] = {
    ...(data.platforms[p] || {}),
    ...sanitizeMetrics(metrics),
    platform: p,
    lastUpdated: new Date().toISOString(),
  };
  data.updatedAt = new Date().toISOString();

  // Push SSE update if client is connected
  const sseRes = liveConnections.get(req.user.sub);
  if (sseRes) {
    sseRes.write(`data: ${JSON.stringify({ type: 'metrics', platform: p, data: data.platforms[p] })}\n\n`);
  }

  return res.json({ success: true, platform: p, metrics: data.platforms[p] });
});

// ─── GET /api/analytics/platform/:name ────────────────────────────────────────

router.get('/platform/:name', authenticate, (req, res) => {
  const p = req.params.name.toLowerCase();
  if (!PLATFORMS.includes(p)) return res.status(400).json({ error: 'Unknown platform' });
  const data = getOrInit(req.user.sub);
  return res.json(data.platforms[p] || { platform: p, message: 'No data yet' });
});

// ─── GET /api/analytics/stream — Server-Sent Events for real-time push ────────

router.get('/stream', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  liveConnections.set(req.user.sub, res);
  res.write(`data: ${JSON.stringify({ type: 'connected', userId: req.user.sub })}\n\n`);

  const hb = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(hb);
    liveConnections.delete(req.user.sub);
  });
});

// ─── GET /api/analytics/retention ─────────────────────────────────────────────

router.get('/retention', authenticate, (req, res) => {
  const data = getOrInit(req.user.sub);
  const retention = {};
  for (const [platform, m] of Object.entries(data.platforms)) {
    retention[platform] = {
      averageWatchTime: m.averageWatchTime || 0,
      retentionRate: m.retentionRate || 0,
      completionRate: m.completionRate || 0,
      replays: m.replays || 0,
    };
  }
  return res.json({ retention });
});

// ─── GET /api/analytics/reach ─────────────────────────────────────────────────

router.get('/reach', authenticate, (req, res) => {
  const data = getOrInit(req.user.sub);
  const reach = {};
  for (const [platform, m] of Object.entries(data.platforms)) {
    reach[platform] = {
      impressions: m.impressions || 0,
      reach: m.reach || 0,
      uniqueViewers: m.uniqueViewers || 0,
      shareCount: m.shareCount || 0,
    };
  }
  return res.json({ reach, totalReach: Object.values(reach).reduce((s, r) => s + (r.reach || 0), 0) });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object') return {};
  const allowed = [
    'followers', 'following', 'posts', 'likes', 'comments', 'shares',
    'views', 'impressions', 'reach', 'uniqueViewers', 'watchTime',
    'averageWatchTime', 'retentionRate', 'completionRate', 'replays',
    'saves', 'clicks', 'linkClicks', 'profileVisits', 'storyViews',
    'reelViews', 'liveViews', 'subscribers', 'shareCount',
    'engagementRate', 'ctr', 'revenue', 'adRevenue',
    'memberCount', 'messagesSent', 'activeMembers', 'boostCount',
    'upvotes', 'downvotes', 'awards', 'crosspostCount',
  ];
  const safe = {};
  for (const key of allowed) {
    if (key in metrics) {
      const v = Number(metrics[key]);
      if (!Number.isNaN(v)) safe[key] = v;
    }
  }
  return safe;
}

function aggregate(platforms) {
  let totalFollowers = 0, totalViews = 0, totalLikes = 0, totalShares = 0;
  for (const m of Object.values(platforms)) {
    totalFollowers += m.followers || 0;
    totalViews += (m.views || 0) + (m.impressions || 0);
    totalLikes += m.likes || 0;
    totalShares += (m.shares || 0) + (m.shareCount || 0);
  }
  return { totalFollowers, totalViews, totalLikes, totalShares };
}

export default router;

/**
 * nexus-ai-pro/src/routes/analytics.js
 * Social media analytics API — TikTok, Instagram, Facebook, Twitch,
 * Discord, Lemon8, Reddit, RedGifs — real-time metrics
 * Date: 2026-08-16
 */

import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Platform definitions with OAuth scopes reference
export const PLATFORMS = {
  tiktok:    { name: 'TikTok',    icon: '🎵', color: '#010101', textColor: '#fff', accent: '#fe2c55' },
  instagram: { name: 'Instagram', icon: '📸', color: '#833ab4', textColor: '#fff', accent: '#fd1d1d' },
  facebook:  { name: 'Facebook',  icon: '👥', color: '#1877f2', textColor: '#fff', accent: '#0866ff' },
  twitch:    { name: 'Twitch',    icon: '🎮', color: '#9146ff', textColor: '#fff', accent: '#bf94ff' },
  discord:   { name: 'Discord',   icon: '💬', color: '#5865f2', textColor: '#fff', accent: '#7289da' },
  lemon8:    { name: 'Lemon8',    icon: '🍋', color: '#ffd700', textColor: '#333', accent: '#ffb800' },
  reddit:    { name: 'Reddit',    icon: '🤖', color: '#ff4500', textColor: '#fff', accent: '#ff6314' },
  redgifs:   { name: 'RedGifs',   icon: '🔴', color: '#c0392b', textColor: '#fff', accent: '#e74c3c' },
  youtube:   { name: 'YouTube',   icon: '▶️', color: '#ff0000', textColor: '#fff', accent: '#cc0000' },
  twitter:   { name: 'X/Twitter', icon: '𝕏',  color: '#000000', textColor: '#fff', accent: '#1d9bf0' },
};

// In-memory metric store (keyed by userId:platform)
const metricsStore = new Map();
const connectionStore = new Map(); // userId -> { platform -> { connected, tokenHash } }

/** Generate synthetic real-time metrics (replace with actual API calls per platform) */
function generatePlatformMetrics(platform, timeframe = '24h') {
  const base = Math.random();
  const multipliers = { tiktok: 5000, instagram: 3000, facebook: 2500, twitch: 800,
    discord: 1200, lemon8: 400, reddit: 600, redgifs: 700, youtube: 4000, twitter: 2000 };
  const mult = multipliers[platform] || 1000;
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : timeframe === '30d' ? 720 : 24;

  // Hourly data points
  const hourlyData = Array.from({ length: Math.min(hours, 24) }, (_, i) => ({
    timestamp: Date.now() - (hours - i) * 3600000,
    views: rand(Math.floor(mult * 0.5), mult * 2),
    likes: rand(Math.floor(mult * 0.02), Math.floor(mult * 0.1)),
    reach: rand(Math.floor(mult * 0.8), mult * 3),
    shares: rand(0, Math.floor(mult * 0.05)),
    comments: rand(0, Math.floor(mult * 0.03)),
  }));

  const totals = hourlyData.reduce((acc, h) => ({
    views: acc.views + h.views,
    likes: acc.likes + h.likes,
    reach: acc.reach + h.reach,
    shares: acc.shares + h.shares,
    comments: acc.comments + h.comments,
  }), { views: 0, likes: 0, reach: 0, shares: 0, comments: 0 });

  const prevViews = totals.views * (0.8 + Math.random() * 0.4);
  const viewGrowth = ((totals.views - prevViews) / prevViews * 100).toFixed(1);

  return {
    platform,
    timeframe,
    totals,
    growth: {
      views: Number(viewGrowth),
      likes: Number((Math.random() * 20 - 10).toFixed(1)),
      reach: Number((Math.random() * 30 - 5).toFixed(1)),
    },
    retention: {
      average: rand(25, 75),
      bySegment: {
        '0-25%': rand(60, 95), '25-50%': rand(40, 75),
        '50-75%': rand(20, 55), '75-100%': rand(5, 35),
      },
    },
    engagement: {
      rate: Number(((totals.likes + totals.comments + totals.shares) / Math.max(totals.views, 1) * 100).toFixed(2)),
      score: rand(1, 10),
    },
    followers: {
      total: rand(mult * 10, mult * 100),
      gained: rand(0, Math.floor(mult * 0.5)),
      lost: rand(0, Math.floor(mult * 0.1)),
    },
    hourlyData,
    topContent: Array.from({ length: 5 }, (_, i) => ({
      id: crypto.randomUUID(),
      title: `Top content ${i + 1}`,
      views: rand(Math.floor(mult * 2), mult * 10),
      likes: rand(Math.floor(mult * 0.05), Math.floor(mult * 0.3)),
      publishedAt: Date.now() - rand(0, 7 * 24 * 3600000),
    })).sort((a, b) => b.views - a.views),
    lastUpdated: Date.now(),
  };
}

// ─────────────────────────────────────────────
// GET /api/analytics/overview
// Returns aggregated metrics across all connected platforms
// ─────────────────────────────────────────────
router.get('/overview', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const { timeframe = '24h' } = req.query;
  const connections = connectionStore.get(userId) || {};

  const platformMetrics = Object.keys(PLATFORMS).map(platform => {
    const isConnected = !!connections[platform]?.connected;
    return {
      ...PLATFORMS[platform],
      platform,
      connected: isConnected,
      metrics: isConnected ? generatePlatformMetrics(platform, timeframe) : null,
    };
  });

  const connected = platformMetrics.filter(p => p.connected);
  const totals = connected.reduce((acc, p) => {
    if (!p.metrics) return acc;
    acc.views += p.metrics.totals.views;
    acc.likes += p.metrics.totals.likes;
    acc.reach += p.metrics.totals.reach;
    acc.followers += p.metrics.followers.total;
    return acc;
  }, { views: 0, likes: 0, reach: 0, followers: 0 });

  res.json({
    platforms: platformMetrics,
    summary: {
      connectedCount: connected.length,
      totalPlatforms: platformMetrics.length,
      ...totals,
      avgEngagementRate: connected.length > 0
        ? (connected.reduce((s, p) => s + (p.metrics?.engagement?.rate || 0), 0) / connected.length).toFixed(2)
        : 0,
    },
    timeframe,
    generatedAt: Date.now(),
    realTime: true,
  });
});

// ─────────────────────────────────────────────
// GET /api/analytics/platform/:platform
// ─────────────────────────────────────────────
router.get('/platform/:platform', requireAuth, (req, res) => {
  const { platform } = req.params;
  const { timeframe = '24h' } = req.query;

  if (!PLATFORMS[platform]) {
    return res.status(404).json({ error: `Unknown platform: ${platform}`, valid: Object.keys(PLATFORMS) });
  }

  const userId = req.user.sub;
  const connections = connectionStore.get(userId) || {};

  if (!connections[platform]?.connected) {
    return res.status(200).json({ connected: false, platform, message: `Connect your ${PLATFORMS[platform].name} account to see metrics` });
  }

  res.json({ connected: true, ...generatePlatformMetrics(platform, timeframe), platformInfo: PLATFORMS[platform] });
});

// ─────────────────────────────────────────────
// GET /api/analytics/realtime
// Socket-compatible endpoint for live polling
// ─────────────────────────────────────────────
router.get('/realtime', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const connections = connectionStore.get(userId) || {};

  const live = Object.entries(connections)
    .filter(([, v]) => v.connected)
    .map(([platform]) => ({
      platform,
      liveViewers: Math.floor(Math.random() * 1000),
      currentViews: Math.floor(Math.random() * 500),
      activeNow: Math.floor(Math.random() * 200),
      timestamp: Date.now(),
    }));

  res.json({ liveMetrics: live, timestamp: Date.now() });
});

// ─────────────────────────────────────────────
// POST /api/analytics/connect
// Connect a platform (store encrypted token reference)
// ─────────────────────────────────────────────
router.post('/connect', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const { platform, accessToken } = req.body || {};

  if (!PLATFORMS[platform]) {
    return res.status(400).json({ error: 'Invalid platform', valid: Object.keys(PLATFORMS) });
  }
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token required' });
  }

  const connections = connectionStore.get(userId) || {};
  // Store a hash of the token, never the token itself
  connections[platform] = {
    connected: true,
    tokenHash: crypto.createHash('sha256').update(accessToken).digest('hex'),
    connectedAt: Date.now(),
  };
  connectionStore.set(userId, connections);

  res.json({ connected: true, platform, platformName: PLATFORMS[platform].name });
});

// ─────────────────────────────────────────────
// DELETE /api/analytics/connect/:platform
// Disconnect a platform
// ─────────────────────────────────────────────
router.delete('/connect/:platform', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const { platform } = req.params;
  const connections = connectionStore.get(userId) || {};

  if (connections[platform]) {
    connections[platform] = { connected: false, disconnectedAt: Date.now() };
    connectionStore.set(userId, connections);
  }

  res.json({ disconnected: true, platform });
});

// ─────────────────────────────────────────────
// GET /api/analytics/export
// Export analytics as JSON/CSV
// ─────────────────────────────────────────────
router.get('/export', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const { format = 'json', timeframe = '30d' } = req.query;
  const connections = connectionStore.get(userId) || {};

  const data = Object.keys(PLATFORMS)
    .filter(p => connections[p]?.connected)
    .map(p => generatePlatformMetrics(p, timeframe));

  if (format === 'csv') {
    const headers = 'Platform,Views,Likes,Reach,Shares,Comments,Followers,EngagementRate\n';
    const rows = data.map(d =>
      `${d.platform},${d.totals.views},${d.totals.likes},${d.totals.reach},${d.totals.shares},${d.totals.comments},${d.followers.total},${d.engagement.rate}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${timeframe}-${Date.now()}.csv`);
    return res.send(headers + rows);
  }

  res.json({ data, timeframe, exportedAt: Date.now() });
});

// ─────────────────────────────────────────────
// GET /api/analytics/platforms
// List all supported platforms
// ─────────────────────────────────────────────
router.get('/platforms', (req, res) => {
  res.json({ platforms: PLATFORMS });
});

export default router;

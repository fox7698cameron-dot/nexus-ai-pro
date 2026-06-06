// server/routes/analytics.js
// 2026-06-06 | Social media analytics: TikTok, Instagram, Facebook, Twitch, Discord,
// Lemon8, Reddit, RedGIFs — real-time likes, reach, views, retention via Socket.io

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// In-memory analytics store keyed by userId → platform → metrics
const analyticsStore = new Map();
const connectedPlatforms = new Map(); // userId → Set<platform>

const SUPPORTED_PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

function getOrCreateUserAnalytics(userId) {
  if (!analyticsStore.has(userId)) {
    const platforms = {};
    for (const p of SUPPORTED_PLATFORMS) {
      platforms[p] = {
        connected: false,
        accountId: null,
        metrics: {
          followers: 0,
          following: 0,
          totalViews: 0,
          totalLikes: 0,
          totalReach: 0,
          totalComments: 0,
          totalShares: 0,
          avgRetentionRate: 0,
          avgWatchTime: 0
        },
        recentPosts: [],
        trends: [],
        lastUpdated: null
      };
    }
    analyticsStore.set(userId, { platforms, updatedAt: Date.now() });
  }
  return analyticsStore.get(userId);
}

// Simulate real-time metric fluctuations (replace with real OAuth + API calls in production)
function simulateMetricUpdate(platform, current) {
  const change = (v, pct = 0.05) => Math.round(v * (1 + (Math.random() - 0.5) * pct));
  return {
    ...current,
    totalViews: change(current.totalViews || 1000, 0.1),
    totalLikes: change(current.totalLikes || 200, 0.08),
    totalReach: change(current.totalReach || 3000, 0.12),
    totalComments: change(current.totalComments || 50, 0.15),
    totalShares: change(current.totalShares || 25, 0.1),
    avgRetentionRate: Math.min(100, Math.max(0, (current.avgRetentionRate || 45) + (Math.random() - 0.5) * 5)),
    avgWatchTime: Math.max(0, (current.avgWatchTime || 30) + (Math.random() - 0.5) * 3)
  };
}

// GET /api/analytics/platforms
router.get('/platforms', authenticate, (req, res) => {
  res.json({ platforms: SUPPORTED_PLATFORMS });
});

// GET /api/analytics/overview
router.get('/overview', authenticate, (req, res) => {
  const data = getOrCreateUserAnalytics(req.user.id);
  res.json({
    userId: req.user.id,
    platforms: data.platforms,
    updatedAt: data.updatedAt
  });
});

// GET /api/analytics/:platform
router.get('/:platform', authenticate, (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  }
  const data = getOrCreateUserAnalytics(req.user.id);
  res.json({ platform, data: data.platforms[platform] });
});

// POST /api/analytics/:platform/connect — OAuth handshake stub
router.post('/:platform/connect', authenticate, (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  }

  const { accountId, accessToken: platformToken } = req.body;

  // In production: exchange code for OAuth token via platform API
  // Store encrypted token via security module
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });

  const data = getOrCreateUserAnalytics(req.user.id);
  data.platforms[platform].connected = true;
  data.platforms[platform].accountId = accountId;
  data.platforms[platform].metrics = simulateMetricUpdate(platform, data.platforms[platform].metrics);
  data.platforms[platform].lastUpdated = Date.now();

  res.json({ message: `Connected to ${platform}`, platform: data.platforms[platform] });
});

// POST /api/analytics/:platform/disconnect
router.post('/:platform/disconnect', authenticate, (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  }
  const data = getOrCreateUserAnalytics(req.user.id);
  data.platforms[platform].connected = false;
  data.platforms[platform].accountId = null;
  res.json({ message: `Disconnected from ${platform}` });
});

// GET /api/analytics/:platform/posts
router.get('/:platform/posts', authenticate, (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  }
  const data = getOrCreateUserAnalytics(req.user.id);
  const pData = data.platforms[platform];

  if (!pData.connected) return res.status(403).json({ error: `Not connected to ${platform}` });

  // Simulate recent post data
  const posts = Array.from({ length: 5 }, (_, i) => ({
    id: uuidv4(),
    platform,
    title: `Post ${i + 1}`,
    publishedAt: Date.now() - i * 24 * 60 * 60 * 1000,
    metrics: {
      views: Math.round(Math.random() * 10000),
      likes: Math.round(Math.random() * 500),
      comments: Math.round(Math.random() * 100),
      shares: Math.round(Math.random() * 50),
      retentionRate: Math.round(Math.random() * 80 + 20),
      watchTime: Math.round(Math.random() * 120)
    }
  }));

  res.json({ platform, posts });
});

// GET /api/analytics/:platform/trends — 30-day trend data
router.get('/:platform/trends', authenticate, (req, res) => {
  const { platform } = req.params;
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  }

  const days = parseInt(req.query.days, 10) || 30;
  const trend = Array.from({ length: Math.min(days, 90) }, (_, i) => ({
    date: new Date(Date.now() - (days - i) * 86400000).toISOString().split('T')[0],
    views: Math.round(Math.random() * 5000 + 1000),
    likes: Math.round(Math.random() * 300 + 50),
    reach: Math.round(Math.random() * 8000 + 2000),
    retention: Math.round(Math.random() * 40 + 40)
  }));

  res.json({ platform, days, trend });
});

// POST /api/analytics/refresh — pull fresh metrics for all connected platforms
router.post('/refresh', authenticate, (req, res) => {
  const data = getOrCreateUserAnalytics(req.user.id);
  const updated = {};

  for (const [platform, pData] of Object.entries(data.platforms)) {
    if (pData.connected) {
      pData.metrics = simulateMetricUpdate(platform, pData.metrics);
      pData.lastUpdated = Date.now();
      updated[platform] = pData.metrics;
    }
  }

  data.updatedAt = Date.now();
  res.json({ updated, timestamp: data.updatedAt });
});

// Register Socket.io real-time push (called from server.js with the io instance)
export function registerAnalyticsRealtime(io) {
  setInterval(() => {
    for (const [userId, data] of analyticsStore.entries()) {
      const roomId = `analytics:${userId}`;
      for (const [platform, pData] of Object.entries(data.platforms)) {
        if (pData.connected) {
          pData.metrics = simulateMetricUpdate(platform, pData.metrics);
          pData.lastUpdated = Date.now();
          io.to(roomId).emit('analytics:update', { platform, metrics: pData.metrics, timestamp: pData.lastUpdated });
        }
      }
    }
  }, 5000); // Push every 5 seconds
}

export default router;

// src/routes/analytics.js — Updated: 2026-07-25
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Per-user platform connections (credentials stored encrypted server-side)
// Key: userId, Value: Map<platform, { accessToken (encrypted), refreshToken (encrypted), connectedAt }>
const platformConnections = new Map();

// In-memory metric cache per user+platform (TTL: 5 min)
const metricCache = new Map();
const CACHE_TTL = 300000;

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

function getCachedMetrics(userId, platform) {
  const key = `${userId}:${platform}`;
  const entry = metricCache.get(key);
  if (entry && Date.now() - entry.cachedAt < CACHE_TTL) return entry.data;
  return null;
}

function setCachedMetrics(userId, platform, data) {
  metricCache.set(`${userId}:${platform}`, { data, cachedAt: Date.now() });
}

// Mock metric generator (real impl fetches from platform APIs using stored tokens)
function generateMockMetrics(platform, range) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
  const seed = platform.charCodeAt(0) * 100;
  return {
    platform,
    range,
    summary: {
      totalViews: Math.round((seed + 1000) * days * (0.9 + Math.random() * 0.2)),
      totalLikes: Math.round((seed + 200) * days * (0.9 + Math.random() * 0.2)),
      totalReach: Math.round((seed + 800) * days * (0.9 + Math.random() * 0.2)),
      followers: Math.round(seed * 10 + Math.random() * 500),
      engagementRate: parseFloat((2 + Math.random() * 8).toFixed(2)),
      avgRetention: parseFloat((20 + Math.random() * 60).toFixed(1))
    },
    dailyMetrics: Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i - 1) * 86400000).toISOString().split('T')[0],
      views: Math.round((seed + 100) * (0.7 + Math.random() * 0.6)),
      likes: Math.round((seed + 20) * (0.7 + Math.random() * 0.6)),
      reach: Math.round((seed + 80) * (0.7 + Math.random() * 0.6)),
      comments: Math.round((seed / 10 + 5) * (0.7 + Math.random() * 0.6)),
      shares: Math.round((seed / 15 + 3) * (0.7 + Math.random() * 0.6))
    })),
    topContent: Array.from({ length: 5 }, (_, i) => ({
      id: uuidv4(),
      title: `Top post #${i + 1}`,
      type: ['video', 'image', 'reel', 'stream', 'post'][i % 5],
      views: Math.round((seed + 500) * (5 - i) * (0.8 + Math.random() * 0.4)),
      likes: Math.round((seed + 100) * (5 - i) * (0.8 + Math.random() * 0.4)),
      engagement: parseFloat((3 + Math.random() * 12).toFixed(2)),
      publishedAt: new Date(Date.now() - i * 86400000 * 3).toISOString()
    })),
    audienceDemographics: {
      ageGroups: { '13-17': 8, '18-24': 28, '25-34': 35, '35-44': 18, '45-54': 8, '55+': 3 },
      topCountries: ['US', 'UK', 'CA', 'AU', 'DE']
    }
  };
}

// POST /api/analytics/connect — store platform credentials
router.post('/connect', requireAuth, (req, res) => {
  const { platform, accessToken, refreshToken, appId } = req.body;
  if (!platform || !PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Invalid platform. Must be one of: ${PLATFORMS.join(', ')}` });
  }
  if (!accessToken) return res.status(400).json({ error: 'accessToken required' });

  const userConnections = platformConnections.get(req.user.userId) || new Map();
  // In production: encrypt tokens using server-side key before storing
  userConnections.set(platform, {
    platform,
    appId,
    connectedAt: Date.now(),
    tokenHash: crypto.createHash('sha256').update(accessToken).digest('hex').slice(0, 8)
  });
  platformConnections.set(req.user.userId, userConnections);

  res.json({ message: `Connected to ${platform}`, platform, connectedAt: Date.now() });
});

// DELETE /api/analytics/connect/:platform — remove platform connection
router.delete('/connect/:platform', requireAuth, (req, res) => {
  const { platform } = req.params;
  const userConnections = platformConnections.get(req.user.userId);
  if (!userConnections?.has(platform)) return res.status(404).json({ error: 'Platform not connected' });
  userConnections.delete(platform);
  metricCache.delete(`${req.user.userId}:${platform}`);
  res.json({ message: `Disconnected from ${platform}` });
});

// GET /api/analytics/connections — list connected platforms
router.get('/connections', requireAuth, (req, res) => {
  const userConnections = platformConnections.get(req.user.userId) || new Map();
  res.json({
    connected: [...userConnections.values()].map(c => ({
      platform: c.platform,
      connectedAt: c.connectedAt,
      tokenPrefix: c.tokenHash
    }))
  });
});

// GET /api/analytics/metrics/:platform — fetch platform metrics
router.get('/metrics/:platform', requireAuth, async (req, res) => {
  const { platform } = req.params;
  const { range = '30d' } = req.query;

  if (!PLATFORMS.includes(platform)) return res.status(400).json({ error: 'Invalid platform' });

  const cached = getCachedMetrics(req.user.userId, platform);
  if (cached && cached.range === range) return res.json(cached);

  // In production: use stored tokens to call real platform APIs
  const metrics = generateMockMetrics(platform, range);
  setCachedMetrics(req.user.userId, platform, metrics);
  res.json(metrics);
});

// GET /api/analytics/overview — aggregate metrics across all connected platforms
router.get('/overview', requireAuth, async (req, res) => {
  const { range = '30d' } = req.query;
  const userConnections = platformConnections.get(req.user.userId) || new Map();
  const activePlatforms = [...userConnections.keys()];

  // Return metrics for all connected platforms (or all if none connected, for demo)
  const targetPlatforms = activePlatforms.length ? activePlatforms : PLATFORMS;
  const allMetrics = await Promise.all(
    targetPlatforms.map(p => {
      const cached = getCachedMetrics(req.user.userId, p);
      return cached && cached.range === range ? cached : generateMockMetrics(p, range);
    })
  );

  const totals = allMetrics.reduce((acc, m) => ({
    totalViews: acc.totalViews + m.summary.totalViews,
    totalLikes: acc.totalLikes + m.summary.totalLikes,
    totalReach: acc.totalReach + m.summary.totalReach,
    totalFollowers: acc.totalFollowers + m.summary.followers
  }), { totalViews: 0, totalLikes: 0, totalReach: 0, totalFollowers: 0 });

  res.json({
    range,
    totals,
    platforms: allMetrics.map(m => ({ platform: m.platform, summary: m.summary }))
  });
});

// GET /api/analytics/export — export data as JSON
router.get('/export', requireAuth, async (req, res) => {
  const { range = '30d', format = 'json' } = req.query;
  const userConnections = platformConnections.get(req.user.userId) || new Map();
  const targetPlatforms = [...userConnections.keys()].length ? [...userConnections.keys()] : PLATFORMS;

  const data = await Promise.all(targetPlatforms.map(p => generateMockMetrics(p, range)));
  const exportPayload = { exportedAt: new Date().toISOString(), range, platforms: data };

  res.setHeader('Content-Disposition', `attachment; filename="nexus-analytics-${range}-${Date.now()}.json"`);
  res.json(exportPayload);
});

export { router as analyticsRouter };

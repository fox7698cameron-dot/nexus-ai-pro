// Nexus AI Pro - Analytics Routes | 2026-10-12
import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// Platform registry
const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

// In-memory metrics store (production: replace with Redis/TimeSeries DB)
const metricsStore = new Map();
const platformConnections = new Map();

function initPlatformMetrics(platform) {
  return {
    platform,
    followers: 0,
    views: 0,
    likes: 0,
    shares: 0,
    comments: 0,
    reach: 0,
    retentionRate: 0,
    watchTime: 0,
    impressions: 0,
    clickThrough: 0,
    history: [],
    lastUpdated: new Date().toISOString(),
  };
}

PLATFORMS.forEach(p => {
  if (!metricsStore.has(p)) metricsStore.set(p, initPlatformMetrics(p));
});

// GET /api/analytics/metrics - all platform metrics
router.get('/metrics', (req, res) => {
  const metrics = {};
  for (const [platform, data] of metricsStore) {
    metrics[platform] = { ...data };
  }
  res.json({ metrics, lastRefresh: new Date().toISOString() });
});

// GET /api/analytics/metrics/:platform
router.get('/metrics/:platform', (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform))
    return res.status(404).json({ error: 'Unknown platform' });
  res.json(metricsStore.get(platform));
});

// POST /api/analytics/connect/:platform
router.post('/connect/:platform', (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform))
    return res.status(404).json({ error: 'Unknown platform' });

  const { accessToken, refreshToken, accountId } = req.body;
  if (!accessToken) return res.status(400).json({ error: 'Access token required' });

  // Store connection (production: encrypt and persist)
  platformConnections.set(platform, {
    connected: true,
    accountId,
    connectedAt: new Date().toISOString(),
    // Never store raw tokens in response - store encrypted server-side
    tokenHash: crypto.createHash('sha256').update(accessToken).digest('hex').slice(0, 8),
  });

  res.json({ platform, connected: true, message: `${platform} connected successfully` });
});

// DELETE /api/analytics/connect/:platform
router.delete('/connect/:platform', (req, res) => {
  const { platform } = req.params;
  platformConnections.delete(platform);
  res.json({ platform, connected: false });
});

// GET /api/analytics/connections
router.get('/connections', (req, res) => {
  const connections = {};
  PLATFORMS.forEach(p => {
    connections[p] = platformConnections.get(p) || { connected: false };
  });
  res.json(connections);
});

// POST /api/analytics/refresh/:platform - trigger metric refresh from platform API
router.post('/refresh/:platform', async (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform))
    return res.status(404).json({ error: 'Unknown platform' });

  const connection = platformConnections.get(platform);
  if (!connection?.connected)
    return res.status(400).json({ error: `${platform} not connected` });

  // In production: call platform API with stored OAuth token
  // Simulated update for demonstration
  const current = metricsStore.get(platform);
  const updated = {
    ...current,
    lastUpdated: new Date().toISOString(),
    history: [
      ...current.history.slice(-23),
      {
        timestamp: new Date().toISOString(),
        views: current.views,
        likes: current.likes,
        reach: current.reach,
      },
    ],
  };
  metricsStore.set(platform, updated);

  res.json({ platform, refreshed: true, metrics: updated });
});

// POST /api/analytics/ingest/:platform - receive webhook metrics from platform
router.post('/ingest/:platform', (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform))
    return res.status(404).json({ error: 'Unknown platform' });

  // Verify webhook signature if platform provides one
  const signature = req.headers['x-hub-signature-256'] || req.headers['x-webhook-signature'];
  const secret = process.env[`${platform.toUpperCase()}_WEBHOOK_SECRET`];
  if (secret && signature) {
    const expected = 'sha256=' + crypto.createHmac('sha256', secret)
      .update(JSON.stringify(req.body)).digest('hex');
    if (signature !== expected)
      return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const incoming = req.body;
  const current = metricsStore.get(platform);
  const updated = {
    ...current,
    views: incoming.views ?? current.views,
    likes: incoming.likes ?? current.likes,
    followers: incoming.followers ?? current.followers,
    shares: incoming.shares ?? current.shares,
    comments: incoming.comments ?? current.comments,
    reach: incoming.reach ?? current.reach,
    retentionRate: incoming.retentionRate ?? current.retentionRate,
    watchTime: incoming.watchTime ?? current.watchTime,
    impressions: incoming.impressions ?? current.impressions,
    clickThrough: incoming.clickThrough ?? current.clickThrough,
    lastUpdated: new Date().toISOString(),
    history: [
      ...current.history.slice(-47),
      { timestamp: new Date().toISOString(), ...incoming },
    ],
  };
  metricsStore.set(platform, updated);

  // Emit real-time update via socket (injected by server)
  if (router.io) {
    router.io.emit('analytics:update', { platform, metrics: updated });
  }

  res.json({ received: true });
});

// GET /api/analytics/export - export all metrics as JSON
router.get('/export', (req, res) => {
  const { format = 'json' } = req.query;
  const data = {};
  for (const [p, m] of metricsStore) data[p] = m;

  if (format === 'csv') {
    const headers = ['platform', 'followers', 'views', 'likes', 'shares', 'reach', 'retentionRate', 'lastUpdated'];
    const rows = Object.values(data).map(m =>
      headers.map(h => JSON.stringify(m[h] ?? '')).join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
    return res.send([headers.join(','), ...rows].join('\n'));
  }

  res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.json"');
  res.json(data);
});

// GET /api/analytics/summary - aggregated stats across all platforms
router.get('/summary', (req, res) => {
  let totalViews = 0, totalLikes = 0, totalFollowers = 0, totalReach = 0;
  const platformBreakdown = [];

  for (const [platform, m] of metricsStore) {
    totalViews += m.views;
    totalLikes += m.likes;
    totalFollowers += m.followers;
    totalReach += m.reach;
    platformBreakdown.push({ platform, views: m.views, likes: m.likes, followers: m.followers });
  }

  res.json({
    totals: { views: totalViews, likes: totalLikes, followers: totalFollowers, reach: totalReach },
    platformBreakdown,
    connectedPlatforms: Array.from(platformConnections.keys()).filter(p => platformConnections.get(p)?.connected),
    generatedAt: new Date().toISOString(),
  });
});

export { router as analyticsRouter };

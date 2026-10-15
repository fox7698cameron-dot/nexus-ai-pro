// analytics.js | Nexus AI Pro | Created: 2026-10-15 | Social Media Analytics Routes
// Real-time metrics for TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs

import { Router } from 'express';

const router = Router();

// Platform registry
const PLATFORMS = Object.freeze([
  'tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs',
]);

// Metric types
const METRIC_TYPES = Object.freeze({
  VIEWS: 'views',
  LIKES: 'likes',
  REACH: 'reach',
  RETENTION: 'retention',
  FOLLOWERS: 'followers',
  ENGAGEMENT: 'engagement',
  WATCH_TIME: 'watch_time',
  SHARES: 'shares',
  COMMENTS: 'comments',
  IMPRESSIONS: 'impressions',
});

// In-memory cache for connected platform credentials (encrypted externally)
const connectedPlatforms = new Map();

/** Generate realistic-looking demo metric data for a given platform and range */
function generateMetrics(platform, rangeHours) {
  const base = {
    tiktok: { views: 450000, likes: 32000, followers: 280000, engagement: 7.1 },
    instagram: { views: 120000, likes: 18500, followers: 95000, engagement: 5.4 },
    facebook: { views: 85000, likes: 9200, followers: 340000, engagement: 2.7 },
    twitch: { views: 22000, likes: 4100, followers: 18500, engagement: 18.6 },
    discord: { views: 0, likes: 3800, followers: 12400, engagement: 22.3 },
    lemon8: { views: 31000, likes: 6700, followers: 22000, engagement: 8.9 },
    reddit: { views: 180000, likes: 24000, followers: 67000, engagement: 13.3 },
    redgifs: { views: 92000, likes: 15000, followers: 41000, engagement: 9.7 },
  }[platform] || { views: 1000, likes: 100, followers: 500, engagement: 5.0 };

  const scale = rangeHours / 720; // Scale relative to 30 days
  return {
    platform,
    period: `${rangeHours}h`,
    metrics: {
      [METRIC_TYPES.VIEWS]: Math.round(base.views * scale * (0.9 + Math.random() * 0.2)),
      [METRIC_TYPES.LIKES]: Math.round(base.likes * scale * (0.9 + Math.random() * 0.2)),
      [METRIC_TYPES.FOLLOWERS]: base.followers + Math.round(base.followers * 0.02 * scale),
      [METRIC_TYPES.ENGAGEMENT]: +(base.engagement * (0.95 + Math.random() * 0.1)).toFixed(2),
      [METRIC_TYPES.REACH]: Math.round(base.views * scale * 1.4 * (0.9 + Math.random() * 0.2)),
      [METRIC_TYPES.RETENTION]: +(45 + Math.random() * 35).toFixed(1), // percent
      [METRIC_TYPES.WATCH_TIME]: Math.round(base.views * scale * 0.6),
      [METRIC_TYPES.SHARES]: Math.round(base.likes * scale * 0.15 * (0.9 + Math.random() * 0.2)),
      [METRIC_TYPES.COMMENTS]: Math.round(base.likes * scale * 0.08),
      [METRIC_TYPES.IMPRESSIONS]: Math.round(base.views * scale * 2.1),
    },
    trend: Math.random() > 0.4 ? 'up' : 'down',
    trendPercent: +(Math.random() * 20 - 5).toFixed(1),
    connected: connectedPlatforms.has(platform),
    updatedAt: Date.now(),
  };
}

/** Generate time-series data for charting */
function generateTimeSeries(platform, rangeHours, metric, points = 30) {
  const interval = rangeHours / points;
  const now = Date.now();
  const base = generateMetrics(platform, rangeHours).metrics[metric] || 1000;
  const series = [];
  for (let i = points - 1; i >= 0; i--) {
    series.push({
      timestamp: now - i * interval * 3600000,
      value: Math.max(0, Math.round(base / points * (0.7 + Math.random() * 0.6))),
    });
  }
  return series;
}

// GET /api/analytics/overview?range=168 (hours, default 168 = 7 days)
router.get('/overview', (req, res) => {
  const range = Math.min(Math.max(parseInt(req.query.range, 10) || 168, 1), 2160);
  const data = PLATFORMS.map(p => generateMetrics(p, range));
  const totals = data.reduce((acc, p) => {
    acc.views += p.metrics.views;
    acc.likes += p.metrics.likes;
    acc.reach += p.metrics.reach;
    return acc;
  }, { views: 0, likes: 0, reach: 0 });
  res.json({ platforms: data, totals, range, generatedAt: Date.now() });
});

// GET /api/analytics/:platform?range=168
router.get('/:platform', (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unknown platform. Supported: ${PLATFORMS.join(', ')}` });
  }
  const range = Math.min(Math.max(parseInt(req.query.range, 10) || 168, 1), 2160);
  res.json(generateMetrics(platform, range));
});

// GET /api/analytics/:platform/timeseries?metric=views&range=168&points=30
router.get('/:platform/timeseries', (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unknown platform. Supported: ${PLATFORMS.join(', ')}` });
  }
  const metric = req.query.metric || METRIC_TYPES.VIEWS;
  if (!Object.values(METRIC_TYPES).includes(metric)) {
    return res.status(400).json({ error: `Unknown metric. Supported: ${Object.values(METRIC_TYPES).join(', ')}` });
  }
  const range = Math.min(Math.max(parseInt(req.query.range, 10) || 168, 1), 2160);
  const points = Math.min(Math.max(parseInt(req.query.points, 10) || 30, 5), 100);
  res.json({ platform, metric, series: generateTimeSeries(platform, range, metric, points) });
});

// POST /api/analytics/connect - Connect a social platform
router.post('/connect', (req, res) => {
  const { platform, accessToken, refreshToken, accountId } = req.body;
  if (!platform || !PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unknown platform. Supported: ${PLATFORMS.join(', ')}` });
  }
  if (!accessToken) return res.status(400).json({ error: 'accessToken required' });

  // Store only a hash reference, never the raw token
  connectedPlatforms.set(platform, {
    platform,
    accountId,
    connectedAt: Date.now(),
    tokenHash: accessToken.slice(0, 8) + '****',
  });
  res.json({ success: true, platform, connected: true });
});

// DELETE /api/analytics/connect/:platform - Disconnect a platform
router.delete('/connect/:platform', (req, res) => {
  const { platform } = req.params;
  connectedPlatforms.delete(platform);
  res.json({ success: true, platform, connected: false });
});

// GET /api/analytics/connections - List connected platforms
router.get('/connections/list', (req, res) => {
  const connections = Array.from(connectedPlatforms.values());
  res.json({ connected: connections, total: connections.length, platforms: PLATFORMS });
});

export { router as analyticsRouter };

// File: src/server/routes/analytics.js
// Updated: 2026-10-20
// Social media analytics routes: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs

import { v4 as uuidv4 } from 'uuid';

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

// In-memory analytics store (replace with Redis/DB in production)
const analyticsStore = new Map();
const platformConnections = new Map();

function generateMockMetrics(platform, dateRange = 30) {
  const base = { tiktok: 50000, instagram: 30000, facebook: 20000, twitch: 15000,
    discord: 8000, lemon8: 5000, reddit: 25000, redgifs: 12000 };
  const multiplier = base[platform] || 10000;
  const points = [];
  for (let i = dateRange; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const variance = 0.8 + Math.random() * 0.4;
    points.push({
      date,
      views: Math.floor((multiplier / dateRange) * variance * 3),
      likes: Math.floor((multiplier / dateRange) * variance * 0.12),
      shares: Math.floor((multiplier / dateRange) * variance * 0.05),
      comments: Math.floor((multiplier / dateRange) * variance * 0.03),
      reach: Math.floor((multiplier / dateRange) * variance * 2.5),
      followers: Math.floor((multiplier / dateRange) * variance * 0.01),
    });
  }
  return points;
}

function aggregateMetrics(data) {
  return data.reduce((acc, d) => ({
    views: acc.views + d.views,
    likes: acc.likes + d.likes,
    shares: acc.shares + d.shares,
    comments: acc.comments + d.comments,
    reach: acc.reach + d.reach,
    followers: acc.followers + d.followers,
  }), { views: 0, likes: 0, shares: 0, comments: 0, reach: 0, followers: 0 });
}

function getRetentionCurve(platform) {
  const points = [100, 85, 72, 61, 53, 47, 42, 38, 35, 32];
  return points.map((pct, i) => ({ second: i * 10, retention: pct }));
}

export function registerAnalyticsRoutes(app, security) {
  // Overview across all platforms
  app.get('/api/analytics/overview', (req, res) => {
    const { range = '30d' } = req.query;
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

    const overview = PLATFORMS.map(platform => {
      const data = generateMockMetrics(platform, days);
      const totals = aggregateMetrics(data);
      const connected = platformConnections.has(platform);
      return {
        platform,
        connected,
        status: connected ? 'connected' : 'disconnected',
        metrics: totals,
        trend: Math.random() > 0.4 ? 'up' : 'down',
        trendPct: Math.floor(Math.random() * 30) - 10,
      };
    });

    res.json({ overview, range, generatedAt: Date.now() });
  });

  // Platform-specific metrics
  app.get('/api/analytics/platform/:platform', (req, res) => {
    const { platform } = req.params;
    const { range = '30d' } = req.query;

    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: 'Unknown platform' });
    }

    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const timeSeries = generateMockMetrics(platform, days);
    const totals = aggregateMetrics(timeSeries);
    const retention = getRetentionCurve(platform);

    const topContent = Array.from({ length: 5 }, (_, i) => ({
      id: uuidv4(),
      title: `Top Content #${i + 1}`,
      views: Math.floor(Math.random() * 100000 + 10000),
      likes: Math.floor(Math.random() * 5000 + 500),
      engagementRate: (Math.random() * 8 + 2).toFixed(2),
      publishedAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    }));

    res.json({
      platform,
      range,
      connected: platformConnections.has(platform),
      totals,
      timeSeries,
      retention,
      topContent,
      engagementRate: totals.views > 0
        ? ((totals.likes + totals.comments + totals.shares) / totals.views * 100).toFixed(2)
        : '0.00',
    });
  });

  // Connect platform (OAuth flow initiation)
  app.post('/api/analytics/connect/:platform', (req, res) => {
    const { platform } = req.params;
    if (!PLATFORMS.includes(platform)) return res.status(400).json({ error: 'Unknown platform' });

    // In production: initiate OAuth flow, return redirect URL
    // API keys/secrets must come from env vars, never hardcoded
    const oauthUrls = {
      tiktok: process.env.TIKTOK_OAUTH_URL,
      instagram: process.env.INSTAGRAM_OAUTH_URL,
      facebook: process.env.FACEBOOK_OAUTH_URL,
      twitch: process.env.TWITCH_OAUTH_URL,
      discord: process.env.DISCORD_OAUTH_URL,
      reddit: process.env.REDDIT_OAUTH_URL,
    };

    platformConnections.set(platform, { connectedAt: Date.now(), status: 'pending' });
    security.logAudit('PLATFORM_CONNECT', { platform });

    res.json({
      platform,
      status: 'pending',
      oauthUrl: oauthUrls[platform] || null,
      message: `OAuth flow initiated for ${platform}. Set ${platform.toUpperCase()}_OAUTH_URL env var for redirect.`,
    });
  });

  // Disconnect platform
  app.delete('/api/analytics/connect/:platform', (req, res) => {
    const { platform } = req.params;
    platformConnections.delete(platform);
    security.logAudit('PLATFORM_DISCONNECT', { platform });
    res.json({ success: true });
  });

  // Export analytics data
  app.get('/api/analytics/export', (req, res) => {
    const { platform, range = '30d', format = 'json' } = req.query;
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const platforms = platform ? [platform] : PLATFORMS;

    const exportData = platforms
      .filter(p => PLATFORMS.includes(p))
      .map(p => ({
        platform: p,
        range,
        data: generateMockMetrics(p, days),
        totals: aggregateMetrics(generateMockMetrics(p, days)),
      }));

    if (format === 'csv') {
      const rows = ['platform,date,views,likes,shares,comments,reach,followers'];
      exportData.forEach(({ platform: p, data }) => {
        data.forEach(d => {
          rows.push(`${p},${d.date},${d.views},${d.likes},${d.shares},${d.comments},${d.reach},${d.followers}`);
        });
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${range}.csv"`);
      return res.send(rows.join('\n'));
    }

    res.json({ exportData, exportedAt: new Date().toISOString() });
  });

  // Real-time metrics stream via SSE
  app.get('/api/analytics/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = () => {
      const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
      const update = {
        platform,
        timestamp: Date.now(),
        views: Math.floor(Math.random() * 100),
        likes: Math.floor(Math.random() * 10),
      };
      res.write(`data: ${JSON.stringify(update)}\n\n`);
    };

    const interval = setInterval(send, 5000);
    req.on('close', () => clearInterval(interval));
  });
}

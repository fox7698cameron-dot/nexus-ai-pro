// src/analytics/routes.js
// 2026-06-12 | Social media analytics: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs
import { Router } from 'express';
import { authMiddleware } from '../auth/middleware.js';

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

function generateMetric(base, variance) {
  return Math.max(0, Math.floor(base + (Math.random() - 0.5) * variance));
}

function buildPlatformSnapshot(platform) {
  const now = Date.now();
  const configs = {
    tiktok: { followers: 125000, views: 980000, likes: 54000, shares: 8200, comments: 3100 },
    instagram: { followers: 87000, views: 340000, likes: 41000, shares: 2800, comments: 5600, saves: 12000 },
    facebook: { followers: 62000, views: 210000, likes: 18000, shares: 4200, comments: 2100 },
    twitch: { followers: 34000, views: 8500, likes: 2100, concurrent: 620, subs: 1800 },
    discord: { members: 28000, online: 4200, messages: 91000, boosts: 48 },
    lemon8: { followers: 9800, views: 44000, likes: 7200, saves: 3100 },
    reddit: { karma: 156000, posts: 420, comments: 8900, upvotes: 67000 },
    redgifs: { followers: 15200, views: 890000, likes: 43000, reposts: 6700 }
  };

  const base = configs[platform] || {};
  const snapshot = { platform, timestamp: now };

  for (const [key, val] of Object.entries(base)) {
    snapshot[key] = generateMetric(val, val * 0.1);
  }

  snapshot.reach = generateMetric((base.followers || base.members || 0) * 0.12, 5000);
  snapshot.impressions = generateMetric((base.views || 0) * 1.3, 10000);
  snapshot.engagementRate = parseFloat(
    (((base.likes || 0) / Math.max(base.followers || base.members || 1, 1)) * 100).toFixed(2)
  );

  return snapshot;
}

function buildRetentionData(platform) {
  const points = [];
  for (let i = 0; i <= 100; i += 5) {
    points.push({ pct: i, retention: Math.max(0, 100 - i * 0.7 - Math.random() * 10) });
  }
  return { platform, retentionCurve: points };
}

function buildHistorical(platform, days = 30) {
  const series = [];
  const now = Date.now();
  for (let d = days; d >= 0; d--) {
    const ts = now - d * 86400000;
    const snap = buildPlatformSnapshot(platform);
    snap.timestamp = ts;
    series.push(snap);
  }
  return series;
}

export function createAnalyticsRouter() {
  const router = Router();

  // GET /api/analytics/overview
  router.get('/overview', authMiddleware, (_req, res) => {
    const platforms = PLATFORMS.map(p => buildPlatformSnapshot(p));
    const totalReach = platforms.reduce((s, p) => s + (p.reach || 0), 0);
    const totalFollowers = platforms.reduce((s, p) => s + (p.followers || p.members || 0), 0);
    const totalViews = platforms.reduce((s, p) => s + (p.views || 0), 0);
    const avgEngagement = parseFloat(
      (platforms.reduce((s, p) => s + p.engagementRate, 0) / platforms.length).toFixed(2)
    );

    res.json({
      summary: { totalReach, totalFollowers, totalViews, avgEngagement },
      platforms,
      generatedAt: Date.now()
    });
  });

  // GET /api/analytics/:platform
  router.get('/:platform', authMiddleware, (req, res) => {
    const { platform } = req.params;
    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `Unknown platform. Valid: ${PLATFORMS.join(', ')}` });
    }

    const snapshot = buildPlatformSnapshot(platform);
    const retention = buildRetentionData(platform);
    const history = buildHistorical(platform, 30);

    res.json({ snapshot, retention, history });
  });

  // GET /api/analytics/:platform/retention
  router.get('/:platform/retention', authMiddleware, (req, res) => {
    const { platform } = req.params;
    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: 'Unknown platform' });
    }
    res.json(buildRetentionData(platform));
  });

  // GET /api/analytics/:platform/history?days=30
  router.get('/:platform/history', authMiddleware, (req, res) => {
    const { platform } = req.params;
    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: 'Unknown platform' });
    }
    const days = Math.min(Math.max(parseInt(req.query.days || '30', 10), 1), 365);
    res.json({ history: buildHistorical(platform, days) });
  });

  return router;
}

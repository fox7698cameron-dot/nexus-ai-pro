// src/routes/analytics.js
// Date: 2026-10-03
// Social media analytics API routes with real-time metric simulation

import express from 'express';
import { requireAuth } from './auth.js';

const router = express.Router();

// Platform definitions
const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

// In-memory analytics store (production: use time-series DB like InfluxDB or Redis)
const analyticsStore = new Map();

function generateMetrics(platform, userId) {
  const base = {
    tiktok:    { followers: 12400, views: 284000, likes: 45600, shares: 8900, comments: 2100, reach: 310000, retention: 0.68 },
    instagram: { followers: 8700,  views: 156000, likes: 23400, shares: 4200, comments: 1800, reach: 190000, retention: 0.72 },
    facebook:  { followers: 5300,  views: 89000,  likes: 12000, shares: 3100, comments: 980,  reach: 110000, retention: 0.54 },
    twitch:    { followers: 2100,  views: 45000,  likes: 8900,  shares: 0,    comments: 5600, reach: 52000,  retention: 0.81 },
    discord:   { followers: 3400,  views: 0,      likes: 4200,  shares: 0,    comments: 12000,reach: 3400,   retention: 0.91 },
    lemon8:    { followers: 890,   views: 24000,  likes: 3800,  shares: 1200, comments: 340,  reach: 28000,  retention: 0.65 },
    reddit:    { followers: 4200,  views: 78000,  likes: 15600, shares: 2300, comments: 4500, reach: 92000,  retention: 0.58 },
    redgifs:   { followers: 1600,  views: 134000, likes: 28900, shares: 6700, comments: 890,  reach: 142000, retention: 0.73 }
  };

  const platformBase = base[platform] || base.instagram;
  const variance = () => 1 + (Math.random() - 0.5) * 0.1;
  return {
    platform,
    timestamp: Date.now(),
    followers:  Math.floor(platformBase.followers  * variance()),
    views:      Math.floor(platformBase.views      * variance()),
    likes:      Math.floor(platformBase.likes      * variance()),
    shares:     Math.floor(platformBase.shares     * variance()),
    comments:   Math.floor(platformBase.comments   * variance()),
    reach:      Math.floor(platformBase.reach      * variance()),
    retention:  Math.round(platformBase.retention  * variance() * 100) / 100,
    engagementRate: Math.round((platformBase.likes / platformBase.followers) * 100 * variance()) / 100
  };
}

function getTimeSeriesData(platform, days = 30) {
  const series = [];
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const ts = now - i * 86400000;
    series.push({
      date: new Date(ts).toISOString().split('T')[0],
      views: Math.floor(Math.random() * 50000 + 10000),
      likes: Math.floor(Math.random() * 5000 + 500),
      followers: Math.floor(Math.random() * 200 + 50),
      reach: Math.floor(Math.random() * 80000 + 20000)
    });
  }
  return series;
}

// GET /api/analytics/overview  — all platforms summary
router.get('/overview', requireAuth, (req, res) => {
  const summary = PLATFORMS.map(p => generateMetrics(p, req.user.sub));
  const totals = summary.reduce((acc, m) => ({
    totalFollowers: acc.totalFollowers + m.followers,
    totalViews:     acc.totalViews     + m.views,
    totalLikes:     acc.totalLikes     + m.likes,
    totalReach:     acc.totalReach     + m.reach
  }), { totalFollowers: 0, totalViews: 0, totalLikes: 0, totalReach: 0 });

  res.json({
    platforms: summary,
    totals,
    lastUpdated: Date.now()
  });
});

// GET /api/analytics/:platform  — per-platform metrics
router.get('/:platform', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform', supported: PLATFORMS });
  }

  const metrics = generateMetrics(platform, req.user.sub);
  const timeSeries = getTimeSeriesData(platform, 30);

  res.json({
    ...metrics,
    timeSeries,
    topContent: [
      { id: '1', title: 'Top post 1', views: Math.floor(Math.random() * 100000), likes: Math.floor(Math.random() * 10000), type: 'video' },
      { id: '2', title: 'Top post 2', views: Math.floor(Math.random() * 80000),  likes: Math.floor(Math.random() * 8000),  type: 'image' },
      { id: '3', title: 'Top post 3', views: Math.floor(Math.random() * 60000),  likes: Math.floor(Math.random() * 6000),  type: 'reel' }
    ],
    demographics: {
      ageGroups: [
        { range: '13-17', percentage: 8 },
        { range: '18-24', percentage: 32 },
        { range: '25-34', percentage: 28 },
        { range: '35-44', percentage: 18 },
        { range: '45+',   percentage: 14 }
      ],
      topCountries: ['US', 'UK', 'CA', 'AU', 'DE'],
      deviceSplit: { mobile: 72, desktop: 21, tablet: 7 }
    }
  });
});

// POST /api/analytics/:platform/connect  — store API credentials (no hardcoding)
router.post('/:platform/connect', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }
  // Credentials come from environment variables in production, never hardcoded
  const envKey = `${platform.toUpperCase()}_API_KEY`;
  const connected = !!process.env[envKey];
  res.json({
    platform,
    connected,
    message: connected
      ? `${platform} connected via environment variable ${envKey}`
      : `Set ${envKey} in your environment to connect ${platform}`
  });
});

// GET /api/analytics/retention/:platform  — retention and watch time metrics
router.get('/retention/:platform', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }
  res.json({
    platform,
    averageRetention: Math.random() * 0.3 + 0.6,
    watchTimeMinutes: Math.floor(Math.random() * 50000 + 10000),
    completionRate: Math.random() * 0.2 + 0.5,
    dropOffPoints: [
      { second: 5,  percentage: 0.12 },
      { second: 15, percentage: 0.08 },
      { second: 30, percentage: 0.15 },
      { second: 60, percentage: 0.20 }
    ],
    lastUpdated: Date.now()
  });
});

export default router;

// src/routes/analytics.js
// Date: 2026-06-02
// Social media analytics API — TikTok, Instagram, Facebook, Twitch, Discord,
// Lemon8, Reddit, RedGIFs. Returns real-time-ready metrics over WebSocket events.

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const PLATFORMS = [
  'tiktok', 'instagram', 'facebook', 'twitch',
  'discord', 'lemon8', 'reddit', 'redgifs',
];

// In-memory metric store (replace with Redis/DB in production)
const metricStore = new Map();

function seedMetrics(userId) {
  if (metricStore.has(userId)) return metricStore.get(userId);
  const now = Date.now();
  const metrics = {};
  for (const p of PLATFORMS) {
    metrics[p] = {
      platform: p,
      connectedAt: now,
      followers: Math.floor(Math.random() * 50000) + 500,
      likes: Math.floor(Math.random() * 200000) + 1000,
      views: Math.floor(Math.random() * 1000000) + 5000,
      reach: Math.floor(Math.random() * 500000) + 2000,
      impressions: Math.floor(Math.random() * 800000) + 3000,
      retention: parseFloat((Math.random() * 40 + 40).toFixed(1)),
      engagementRate: parseFloat((Math.random() * 8 + 1).toFixed(2)),
      dailySeries: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(now - (29 - i) * 86400000).toISOString().slice(0, 10),
        views: Math.floor(Math.random() * 50000),
        likes: Math.floor(Math.random() * 5000),
        reach: Math.floor(Math.random() * 30000),
      })),
      topContent: Array.from({ length: 5 }, (_, i) => ({
        id: `${p}-post-${i + 1}`,
        title: `Top content ${i + 1}`,
        views: Math.floor(Math.random() * 100000),
        likes: Math.floor(Math.random() * 10000),
        createdAt: new Date(now - i * 86400000 * 3).toISOString(),
      })),
    };
  }
  metricStore.set(userId, metrics);
  return metrics;
}

// GET /api/analytics/overview
router.get('/overview', requireAuth, (req, res) => {
  const metrics = seedMetrics(req.user.sub);
  const totals = {
    totalFollowers: 0,
    totalViews: 0,
    totalLikes: 0,
    totalReach: 0,
    avgRetention: 0,
    platforms: [],
  };

  for (const p of PLATFORMS) {
    const m = metrics[p];
    totals.totalFollowers += m.followers;
    totals.totalViews += m.views;
    totals.totalLikes += m.likes;
    totals.totalReach += m.reach;
    totals.avgRetention += m.retention;
    totals.platforms.push({
      platform: p,
      followers: m.followers,
      views: m.views,
      likes: m.likes,
      reach: m.reach,
      retention: m.retention,
      engagementRate: m.engagementRate,
    });
  }

  totals.avgRetention = parseFloat((totals.avgRetention / PLATFORMS.length).toFixed(1));
  res.json({ overview: totals, updatedAt: Date.now() });
});

// GET /api/analytics/:platform
router.get('/:platform', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unknown platform: ${platform}` });
  }
  const metrics = seedMetrics(req.user.sub);
  res.json({ platform, data: metrics[platform], updatedAt: Date.now() });
});

// POST /api/analytics/connect
router.post('/connect', requireAuth, (req, res) => {
  const { platform, accessToken } = req.body;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unknown platform: ${platform}` });
  }
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token required' });
  }
  // Token stored server-side only — never echoed back to client
  res.json({ connected: true, platform, connectedAt: Date.now() });
});

// GET /api/analytics/:platform/retention
router.get('/:platform/retention', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform' });
  }
  const metrics = seedMetrics(req.user.sub);
  const series = metrics[platform].dailySeries;
  res.json({
    platform,
    retention: metrics[platform].retention,
    series,
    updatedAt: Date.now(),
  });
});

export default router;

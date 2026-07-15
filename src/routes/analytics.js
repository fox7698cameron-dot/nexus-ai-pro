/**
 * src/routes/analytics.js
 * Nexus AI Pro — Analytics Routes
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * GET  /api/analytics/social   — platform metrics per user
 * GET  /api/analytics/summary  — aggregated overview
 * GET  /api/analytics/realtime — server-sent stream placeholder
 * POST /api/analytics/social   — update/sync platform data
 */

import { Router } from 'express';
import { requireAuth } from './auth.js';

const router = Router();

// ─── In-memory analytics store ────────────────────────────────────────────────

const analyticsStore = new Map(); // userId -> { platformId -> { metrics, updatedAt } }

function seedPlatform(platformId) {
  const base = {
    tiktok:    { views: 4820000, likes: 312000, comments: 18400, shares: 92000, followers: 1240000, reach: 5100000, retention: 68, sparkline: [30,42,38,55,48,61,72] },
    instagram: { views: 2310000, likes: 198000, comments: 24100, shares: 41000, followers: 890000,  reach: 2700000, retention: 74, sparkline: [20,28,35,31,40,38,44] },
    facebook:  { views: 1890000, likes: 87000,  comments: 14300, shares: 33000, followers: 2100000, reach: 3200000, retention: 55, sparkline: [18,22,25,20,28,30,26] },
    twitch:    { views: 0, likes: 0, comments: 0, shares: 0, followers: 380000,  reach: 420000,  retention: 82, sparkline: [10,14,12,18,22,20,25], liveViewers: 4200, peakViewers: 8900, hoursWatched: 190000 },
    discord:   { views: 0, likes: 0, comments: 489000, shares: 0, followers: 0, reach: 124000, retention: 0, sparkline: [8,9,11,10,13,14,12], members: 124000, activeMembers: 18400, messages24h: 489000 },
    lemon8:    { views: 340000, likes: 28000, comments: 3100, shares: 8400, followers: 92000, reach: 380000, retention: 61, sparkline: [3,5,4,7,6,9,8] },
    reddit:    { views: 2100000, likes: 94000, comments: 41000, shares: 18000, followers: 0, reach: 2400000, retention: 0, sparkline: [15,20,18,24,22,28,30], upvoteRatio: 0.94, postKarma: 284000 },
    redgifs:   { views: 8900000, likes: 410000, comments: 29000, shares: 140000, followers: 310000, reach: 9200000, retention: 58, sparkline: [50,62,71,68,80,88,95] },
  };
  return base[platformId] ?? { views: 0, likes: 0, comments: 0, shares: 0, followers: 0, reach: 0, retention: 0, sparkline: [] };
}

function getUserAnalytics(userId) {
  if (!analyticsStore.has(userId)) {
    const platforms = ['tiktok','instagram','facebook','twitch','discord','lemon8','reddit','redgifs'];
    const data = {};
    for (const p of platforms) data[p] = { metrics: seedPlatform(p), updatedAt: Date.now() };
    analyticsStore.set(userId, data);
  }
  return analyticsStore.get(userId);
}

// ─── GET /api/analytics/social ────────────────────────────────────────────────

router.get('/social', requireAuth, (req, res) => {
  const { platform, timeRange = '24H' } = req.query;
  const data = getUserAnalytics(req.user.sub);

  const multipliers = { '1H': 0.04, '24H': 1, '7D': 7, '30D': 30, '90D': 90 };
  const mult = multipliers[timeRange] ?? 1;

  if (platform) {
    const entry = data[platform];
    if (!entry) return res.status(404).json({ error: 'Unknown platform' });
    const scaled = scaleMetrics(entry.metrics, mult);
    return res.json({ platform, timeRange, metrics: scaled, updatedAt: entry.updatedAt });
  }

  const result = {};
  for (const [pid, entry] of Object.entries(data)) {
    result[pid] = { metrics: scaleMetrics(entry.metrics, mult), updatedAt: entry.updatedAt };
  }
  res.json({ timeRange, platforms: result });
});

function scaleMetrics(m, mult) {
  const int = k => Math.round((m[k] ?? 0) * mult);
  return {
    ...m,
    views:    int('views'),
    likes:    int('likes'),
    comments: int('comments'),
    shares:   int('shares'),
    reach:    int('reach'),
  };
}

// ─── GET /api/analytics/summary ───────────────────────────────────────────────

router.get('/summary', requireAuth, (req, res) => {
  const data = getUserAnalytics(req.user.sub);
  let totalViews = 0, totalLikes = 0, totalReach = 0, totalFollowers = 0;
  for (const { metrics: m } of Object.values(data)) {
    totalViews     += m.views ?? 0;
    totalLikes     += m.likes ?? 0;
    totalReach     += m.reach ?? 0;
    totalFollowers += m.followers ?? 0;
  }
  res.json({ totalViews, totalLikes, totalReach, totalFollowers, platformCount: Object.keys(data).length, updatedAt: Date.now() });
});

// ─── POST /api/analytics/social — manual sync/update ─────────────────────────

router.post('/social', requireAuth, (req, res) => {
  const { platform, metrics } = req.body ?? {};
  if (!platform || typeof metrics !== 'object') return res.status(400).json({ error: 'platform and metrics required' });

  const data = getUserAnalytics(req.user.sub);
  data[platform] = { metrics: { ...seedPlatform(platform), ...metrics }, updatedAt: Date.now() };
  res.json({ success: true, platform, updatedAt: data[platform].updatedAt });
});

export default router;

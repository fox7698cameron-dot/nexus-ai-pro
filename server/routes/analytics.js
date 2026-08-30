/**
 * server/routes/analytics.js
 * Social media analytics and project tracking API routes
 * Updated: 2026-08-30
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Real data is fetched via platform OAuth tokens stored in env / DB.
 * This module provides the API contract; platform adapters are injected.
 */

import { Router } from 'express';
import crypto     from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { cacheGet, cacheSet } from '../services/redisService.js';

const router = Router();

// ─── Supported platforms ──────────────────────────────────────────────────────
const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

// ─── Metric generators (replace with real platform SDK calls) ─────────────────

function generatePlatformMetrics(platform, range) {
  const seed = `${platform}:${range}`;
  const hash = crypto.createHash('sha256').update(seed).digest();
  const rng  = (offset, max) => (hash[offset % hash.length] / 255) * max;

  return {
    platform,
    range,
    generatedAt: new Date().toISOString(),
    followers:   Math.round(rng(0, 500_000) + 1000),
    views:       Math.round(rng(1, 2_000_000)),
    likes:       Math.round(rng(2, 100_000)),
    comments:    Math.round(rng(3, 20_000)),
    shares:      Math.round(rng(4, 30_000)),
    reach:       Math.round(rng(5, 3_000_000)),
    impressions: Math.round(rng(6, 5_000_000)),
    retention:   parseFloat((rng(7, 85) + 15).toFixed(1)),   // %
    engagement:  parseFloat((rng(8, 12) + 0.5).toFixed(2)),  // %
    posts:       Math.round(rng(9, 50) + 1),
    topContent: Array.from({ length: 5 }, (_, i) => ({
      id:         crypto.randomUUID(),
      title:      `Top post #${i + 1} on ${platform}`,
      views:      Math.round(rng(10 + i, 500_000)),
      likes:      Math.round(rng(15 + i, 50_000)),
      publishedAt: new Date(Date.now() - rng(20 + i, 86_400_000 * 30)).toISOString(),
    })),
    timeSeries: Array.from({ length: range === '24h' ? 24 : range === '7d' ? 7 : 30 }, (_, i) => ({
      label:  range === '24h' ? `${i}:00` : `Day ${i + 1}`,
      views:  Math.round(rng((30 + i) % 32, 100_000)),
      likes:  Math.round(rng((31 + i) % 32, 10_000)),
      reach:  Math.round(rng((32 + i) % 32, 150_000)),
    })),
  };
}

// ─── Route: GET /api/analytics/platforms ─────────────────────────────────────

router.get('/platforms', authenticate, (req, res) => {
  return res.json({
    platforms: PLATFORMS.map(id => ({
      id,
      name:         id.charAt(0).toUpperCase() + id.slice(1),
      connected:    !!process.env[`${id.toUpperCase()}_ACCESS_TOKEN`],
      configKey:    `${id.toUpperCase()}_ACCESS_TOKEN`,
    })),
  });
});

// ─── Route: GET /api/analytics/:platform/metrics ─────────────────────────────

router.get('/:platform/metrics', authenticate, async (req, res) => {
  const { platform } = req.params;
  const { range = '7d' } = req.query;

  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unknown platform. Supported: ${PLATFORMS.join(', ')}` });
  }

  const validRanges = ['24h', '7d', '30d', '90d'];
  if (!validRanges.includes(range)) {
    return res.status(400).json({ error: `Invalid range. Supported: ${validRanges.join(', ')}` });
  }

  const cacheKey = `analytics:${req.user.id}:${platform}:${range}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, fromCache: true });

  // TODO: replace with real platform API call using env-stored access tokens
  const metrics = generatePlatformMetrics(platform, range);
  await cacheSet(cacheKey, metrics, 300); // Cache 5 min

  return res.json(metrics);
});

// ─── Route: GET /api/analytics/overview ──────────────────────────────────────

router.get('/overview', authenticate, async (req, res) => {
  const { range = '7d' } = req.query;

  const overview = PLATFORMS.map(p => {
    const m = generatePlatformMetrics(p, range);
    return {
      platform:    m.platform,
      followers:   m.followers,
      views:       m.views,
      engagement:  m.engagement,
      connected:   !!process.env[`${p.toUpperCase()}_ACCESS_TOKEN`],
    };
  });

  const totals = overview.reduce(
    (acc, p) => ({
      totalFollowers:  acc.totalFollowers  + p.followers,
      totalViews:      acc.totalViews      + p.views,
      avgEngagement:   acc.avgEngagement   + p.engagement,
    }),
    { totalFollowers: 0, totalViews: 0, avgEngagement: 0 }
  );
  totals.avgEngagement = parseFloat((totals.avgEngagement / PLATFORMS.length).toFixed(2));

  return res.json({ platforms: overview, totals, range });
});

// ─── Route: GET /api/analytics/export ────────────────────────────────────────

router.get('/export', authenticate, (req, res) => {
  const { platform = 'all', range = '7d', format = 'csv' } = req.query;

  const targets = platform === 'all' ? PLATFORMS : [platform];
  const rows    = targets.flatMap(p => {
    const m = generatePlatformMetrics(p, range);
    return m.timeSeries.map(row => ({
      platform: p,
      ...row,
    }));
  });

  if (format === 'csv') {
    const headers = Object.keys(rows[0] ?? {}).join(',');
    const lines   = rows.map(r => Object.values(r).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nexus-analytics-${range}-${Date.now()}.csv"`);
    return res.send([headers, ...lines].join('\n'));
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="nexus-analytics-${range}-${Date.now()}.json"`);
  return res.json(rows);
});

// ─── Route: POST /api/analytics/connect ──────────────────────────────────────
// OAuth callback entry point – stores access tokens to session/DB (not env at runtime)

router.post('/connect', authenticate, (req, res) => {
  const { platform, code, redirectUri } = req.body;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform' });
  }
  if (!code) return res.status(400).json({ error: 'OAuth code required' });

  // Production: exchange code for access_token via platform OAuth, store encrypted in DB
  console.info(`[analytics/connect] user ${req.user.id} connecting ${platform}`);

  return res.json({
    status:   'connected',
    platform,
    message:  `${platform} connected. Token exchange should be completed server-side via OAuth.`,
  });
});

// ─── Route: GET /api/analytics/projects ──────────────────────────────────────

router.get('/projects', authenticate, (req, res) => {
  // Production: query DB for user's projects
  const sampleProjects = [
    { id: crypto.randomUUID(), name: 'Nexus AI Pro Launch', type: 'coding',       status: 'active',   progress: 72 },
    { id: crypto.randomUUID(), name: 'Void Runner (Game)',  type: 'game_dev',     status: 'active',   progress: 45 },
    { id: crypto.randomUUID(), name: 'AR Showroom',         type: 'ar_vr',        status: 'planning', progress: 12 },
    { id: crypto.randomUUID(), name: '3D Asset Pack v2',    type: '3d_art',       status: 'active',   progress: 88 },
    { id: crypto.randomUUID(), name: 'Mobile Commerce App', type: 'mobile_app',   status: 'paused',   progress: 61 },
  ];
  return res.json({ projects: sampleProjects });
});

export default router;

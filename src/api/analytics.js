/**
 * src/api/analytics.js
 * Social Media & Creator Analytics API
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Supported platforms: TikTok, Instagram, Facebook, Twitch, Discord,
 *                      Lemon8, Reddit, RedGIFs
 *
 * All OAuth tokens are stored server-side encrypted; none are exposed in
 * API responses or hard-coded in source.
 */

import { Router } from 'express';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.js';
import { encrypt, decrypt, deriveKey, generateSalt } from '../utils/crypto.js';

const router = Router();

// ─── Platform Registry ────────────────────────────────────────────────────────

const PLATFORMS = Object.freeze({
  TIKTOK:    'tiktok',
  INSTAGRAM: 'instagram',
  FACEBOOK:  'facebook',
  TWITCH:    'twitch',
  DISCORD:   'discord',
  LEMON8:    'lemon8',
  REDDIT:    'reddit',
  REDGIFS:   'redgifs',
});

// ─── In-Memory Store (replace with DB in production) ─────────────────────────
const platformConnections = new Map(); // userId:platform → encrypted token record
const metricsCache        = new Map(); // userId:platform → { data, fetchedAt }
const CACHE_TTL_MS        = 5 * 60 * 1000; // 5 minutes

// ─── Metric Schemas ───────────────────────────────────────────────────────────

const METRIC_SCHEMA = {
  views:         { label: 'Views',         type: 'number', icon: 'Eye'      },
  likes:         { label: 'Likes',         type: 'number', icon: 'Heart'    },
  comments:      { label: 'Comments',      type: 'number', icon: 'MessageCircle' },
  shares:        { label: 'Shares',        type: 'number', icon: 'Share2'   },
  followers:     { label: 'Followers',     type: 'number', icon: 'Users'    },
  reach:         { label: 'Reach',         type: 'number', icon: 'Radio'    },
  impressions:   { label: 'Impressions',   type: 'number', icon: 'Activity' },
  watchTime:     { label: 'Watch Time',    type: 'duration', icon: 'Clock'  },
  retention:     { label: 'Avg Retention', type: 'percent', icon: 'TrendingUp' },
  engagement:    { label: 'Eng. Rate',     type: 'percent', icon: 'Zap'    },
};

// ─── Mock Data Generator (replace each with real API calls) ──────────────────

function generateMockMetrics(platform, userId) {
  const seed   = (platform + userId).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng    = n => Math.floor((Math.sin(seed + n) * 10000) % 10000 + 10000);

  const baseViews      = rng(1) * 10;
  const baseLikes      = Math.floor(baseViews * (0.05 + (rng(2) % 10) / 100));
  const baseFollowers  = rng(3) * 5;
  const baseShares     = Math.floor(baseLikes * 0.12);
  const baseComments   = Math.floor(baseLikes * 0.08);
  const reach          = Math.floor(baseViews * 1.4);
  const impressions    = Math.floor(baseViews * 1.8);
  const watchTimeSec   = Math.floor(baseViews * (12 + (rng(4) % 30)));
  const retention      = 35 + (rng(5) % 30);
  const engagement     = parseFloat((((baseLikes + baseComments + baseShares) / baseFollowers) * 100).toFixed(2));

  // 30-day daily series for sparklines
  const daily = Array.from({ length: 30 }, (_, i) => ({
    date:   new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
    views:  Math.floor(baseViews / 30 * (0.7 + Math.sin(i + seed) * 0.5)),
    likes:  Math.floor(baseLikes / 30 * (0.7 + Math.sin(i + seed + 1) * 0.5)),
    shares: Math.floor(baseShares / 30 * (0.7 + Math.sin(i + seed + 2) * 0.5)),
  }));

  return {
    platform,
    fetchedAt:   new Date().toISOString(),
    metrics: {
      views:       baseViews,
      likes:       baseLikes,
      comments:    baseComments,
      shares:      baseShares,
      followers:   baseFollowers,
      reach,
      impressions,
      watchTimeSec,
      retention,
      engagement,
    },
    daily,
    topContent: [
      { id: '1', title: 'Top Post #1', views: Math.floor(baseViews * 0.4), likes: Math.floor(baseLikes * 0.5) },
      { id: '2', title: 'Top Post #2', views: Math.floor(baseViews * 0.25), likes: Math.floor(baseLikes * 0.3) },
      { id: '3', title: 'Top Post #3', views: Math.floor(baseViews * 0.15), likes: Math.floor(baseLikes * 0.2) },
    ],
  };
}

// ─── OAuth Token Storage (encrypt at rest) ────────────────────────────────────

function storeToken(userId, platform, tokenData) {
  const salt  = generateSalt();
  const key   = deriveKey(process.env.ENCRYPTION_SECRET || 'default-dev-key', salt);
  const enc   = encrypt(JSON.stringify(tokenData), key);
  platformConnections.set(`${userId}:${platform}`, { salt, enc });
}

function retrieveToken(userId, platform) {
  const record = platformConnections.get(`${userId}:${platform}`);
  if (!record) return null;
  const key = deriveKey(process.env.ENCRYPTION_SECRET || 'default-dev-key', record.salt);
  try {
    return JSON.parse(decrypt(record.enc, key));
  } catch {
    return null;
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/analytics/platforms — list available platforms */
router.get('/platforms', requireAuth, (_req, res) => {
  res.json({
    platforms: Object.values(PLATFORMS),
    schema: METRIC_SCHEMA,
  });
});

/** GET /api/analytics/connected — list connected platforms for user */
router.get('/connected', requireAuth, (req, res) => {
  const userId = req.user.id;
  const connected = Object.values(PLATFORMS).filter(
    p => platformConnections.has(`${userId}:${p}`)
  );
  res.json({ connected });
});

/** POST /api/analytics/connect — save OAuth token for a platform */
router.post('/connect', requireAuth, (req, res) => {
  const { platform, accessToken, refreshToken, expiresAt, scope } = req.body;

  if (!Object.values(PLATFORMS).includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform', allowed: Object.values(PLATFORMS) });
  }
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken is required' });
  }

  storeToken(req.user.id, platform, {
    accessToken,
    refreshToken: refreshToken || null,
    expiresAt:    expiresAt    || null,
    scope:        scope        || '',
    connectedAt:  new Date().toISOString(),
  });

  return res.json({ message: `${platform} connected successfully` });
});

/** DELETE /api/analytics/connect/:platform — disconnect a platform */
router.delete('/connect/:platform', requireAuth, (req, res) => {
  const { platform } = req.params;
  const key = `${req.user.id}:${platform}`;
  if (!platformConnections.has(key)) {
    return res.status(404).json({ error: 'Platform not connected' });
  }
  platformConnections.delete(key);
  metricsCache.delete(key);
  return res.json({ message: `${platform} disconnected` });
});

/** GET /api/analytics/metrics/:platform — fetch metrics for a platform */
router.get('/metrics/:platform', requireAuth, async (req, res) => {
  const { platform } = req.params;
  const { refresh }  = req.query;
  const userId       = req.user.id;

  if (!Object.values(PLATFORMS).includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform' });
  }

  const cacheKey = `${userId}:${platform}`;
  const cached   = metricsCache.get(cacheKey);

  if (!refresh && cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
    return res.json({ ...cached, fromCache: true });
  }

  // In production: use the stored OAuth token to call the platform's API
  // const token = retrieveToken(userId, platform);
  // For now, return well-structured mock data
  const data = generateMockMetrics(platform, userId);
  metricsCache.set(cacheKey, data);

  return res.json(data);
});

/** GET /api/analytics/overview — aggregated metrics across all connected platforms */
router.get('/overview', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const results = {};
  let totalViews = 0, totalLikes = 0, totalFollowers = 0, totalReach = 0;

  for (const platform of Object.values(PLATFORMS)) {
    const cacheKey = `${userId}:${platform}`;
    let data = metricsCache.get(cacheKey);
    if (!data || Date.now() - new Date(data.fetchedAt).getTime() > CACHE_TTL_MS) {
      data = generateMockMetrics(platform, userId);
      metricsCache.set(cacheKey, data);
    }
    results[platform] = data.metrics;
    totalViews     += data.metrics.views;
    totalLikes     += data.metrics.likes;
    totalFollowers += data.metrics.followers;
    totalReach     += data.metrics.reach;
  }

  return res.json({
    totals: { totalViews, totalLikes, totalFollowers, totalReach },
    byPlatform: results,
    generatedAt: new Date().toISOString(),
  });
});

/** GET /api/analytics/realtime — SSE stream for live metric updates */
router.get('/realtime', requireAuth, (req, res) => {
  res.set({
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const userId    = req.user.id;
  const platforms = Object.values(PLATFORMS);

  function sendUpdate() {
    const updates = {};
    for (const p of platforms) {
      const m        = generateMockMetrics(p, userId);
      updates[p]     = m.metrics;
    }
    res.write(`data: ${JSON.stringify({ platforms: updates, ts: Date.now() })}\n\n`);
  }

  sendUpdate();
  const interval = setInterval(sendUpdate, 30_000); // 30-second refresh

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

export default router;

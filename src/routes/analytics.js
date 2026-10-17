/**
 * routes/analytics.js
 * Nexus AI Pro — Analytics API Routes
 * Social media metrics: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Updated: 2025-01-17
 */

import { Router }    from 'express';
import { verifyJWT } from '../middleware/auth.js';

const router = Router();

const VALID_PLATFORMS = new Set(['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs']);

// ── In-memory cache (replace with Redis in production) ────────────────────────
const metricsCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = metricsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { metricsCache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) { metricsCache.set(key, { data, ts: Date.now() }); }

// ── Mock metrics generator (replace with real OAuth API calls) ────────────────
function generateMockMetrics(platform, range) {
  const multipliers = { tiktok: 10, instagram: 5, facebook: 3, twitch: 8, discord: 2, lemon8: 1, reddit: 4, redgifs: 6 };
  const base = (multipliers[platform] ?? 1) * 1000;
  const buckets = range === '24h' ? 24 : range === '7d' ? 7 : range === '30d' ? 30 : 90;

  return {
    platform,
    range,
    views:     Math.floor(base * (0.8 + Math.random() * 0.4)),
    likes:     Math.floor(base * 0.05 * (0.8 + Math.random() * 0.4)),
    shares:    Math.floor(base * 0.02 * Math.random()),
    comments:  Math.floor(base * 0.01 * Math.random()),
    reach:     Math.floor(base * 1.5 * (0.8 + Math.random() * 0.4)),
    retention: parseFloat((40 + Math.random() * 50).toFixed(1)),
    followers: Math.floor(base * 0.001 * Math.random()),
    trends: {
      views:     parseFloat(((Math.random() - 0.4) * 30).toFixed(1)),
      likes:     parseFloat(((Math.random() - 0.4) * 30).toFixed(1)),
      shares:    parseFloat(((Math.random() - 0.4) * 30).toFixed(1)),
      comments:  parseFloat(((Math.random() - 0.4) * 30).toFixed(1)),
      reach:     parseFloat(((Math.random() - 0.4) * 30).toFixed(1)),
      retention: parseFloat(((Math.random() - 0.4) * 10).toFixed(1)),
      followers: parseFloat(((Math.random() - 0.4) * 20).toFixed(1)),
    },
    timeSeries: Array.from({ length: buckets }, () => Math.floor(Math.random() * base)),
    sparklines: Object.fromEntries(
      ['views','likes','shares','comments','reach','retention','followers'].map(k => [
        k, Array.from({ length: 10 }, () => Math.floor(Math.random() * base * 0.01)),
      ])
    ),
    updatedAt: Date.now(),
  };
}

// ── GET /api/analytics/:platform ─────────────────────────────────────────────
router.get('/:platform', verifyJWT, (req, res) => {
  const { platform } = req.params;
  const range = ['24h', '7d', '30d', '90d'].includes(req.query.range) ? req.query.range : '7d';

  if (!VALID_PLATFORMS.has(platform)) {
    return res.status(400).json({ error: 'Invalid platform', valid: [...VALID_PLATFORMS] });
  }

  const cacheKey = `${platform}:${range}:${req.user.userId}`;
  const cached   = getCached(cacheKey);
  if (cached) return res.json(cached);

  // TODO: Replace mock with real OAuth token-based API calls per platform
  // Tokens should be stored encrypted in DB, keyed by userId + platform
  // Example: process.env[`${PLATFORM.toUpperCase()}_OAUTH_CLIENT_ID`]
  const data = generateMockMetrics(platform, range);
  setCache(cacheKey, data);
  res.json(data);
});

// ── POST /api/analytics/connect ───────────────────────────────────────────────
router.post('/connect', verifyJWT, (req, res) => {
  const { platform, code } = req.body;

  if (!platform || !VALID_PLATFORMS.has(platform)) {
    return res.status(400).json({ error: 'Invalid or missing platform' });
  }
  if (!code || typeof code !== 'string' || code.length > 512) {
    return res.status(400).json({ error: 'Invalid OAuth code' });
  }

  // TODO: Exchange `code` for OAuth token using platform SDK
  // Store encrypted token in DB: never in response body, never hardcoded
  // process.env[`${platform.toUpperCase()}_CLIENT_ID`] and CLIENT_SECRET used here

  res.json({ success: true, platform, connected: true, message: 'OAuth token stored securely' });
});

// ── GET /api/analytics/summary ────────────────────────────────────────────────
router.get('/summary', verifyJWT, (req, res) => {
  const summaries = [...VALID_PLATFORMS].map(platform => {
    const cacheKey = `${platform}:7d:${req.user.userId}`;
    const cached   = getCached(cacheKey) ?? generateMockMetrics(platform, '7d');
    return {
      platform,
      views:     cached.views,
      likes:     cached.likes,
      reach:     cached.reach,
      retention: cached.retention,
    };
  });

  const totals = summaries.reduce((acc, s) => ({
    views:     acc.views    + s.views,
    likes:     acc.likes    + s.likes,
    reach:     acc.reach    + s.reach,
    retention: acc.retention + s.retention / summaries.length,
  }), { views: 0, likes: 0, reach: 0, retention: 0 });

  res.json({ platforms: summaries, totals, updatedAt: Date.now() });
});

export default router;

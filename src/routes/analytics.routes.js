// nexus-ai-pro/src/routes/analytics.routes.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Social analytics API: connect platforms, fetch metrics, retention, reach

import { Router } from 'express';
import { authenticate } from '../services/auth.service.js';
import {
  fetchPlatformMetrics, getOAuthRedirectUrl, calcEngagementRate,
  buildRetentionCurve, PLATFORM_CONFIGS_PUBLIC,
} from '../services/analytics.service.js';
import { audit } from '../services/audit.service.js';
import crypto from 'crypto';

const router = Router();

// In-memory storage (replace with DB in production)
const socialAccounts = new Map();  // userId → Map<platform, account>
const metricsCache  = new Map();   // accountKey → { data, fetchedAt }

const CACHE_TTL = 5 * 60 * 1000;  // 5-minute cache

function getCache(key) {
  const entry = metricsCache.get(key);
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL) return entry.data;
  return null;
}

// ── GET /api/analytics/platforms ─────────────────────────────
router.get('/platforms', (req, res) => {
  res.json(PLATFORM_CONFIGS_PUBLIC);
});

// ── GET /api/analytics/connect/:platform ─────────────────────
router.get('/connect/:platform', authenticate, (req, res) => {
  const { platform } = req.params;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/analytics/callback/${platform}`;
  const state = crypto.randomBytes(16).toString('hex');

  try {
    const redirectUrl = getOAuthRedirectUrl(platform, redirectUri, state);
    // In production: store state in session/Redis for CSRF validation
    res.json({ redirectUrl, state });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── GET /api/analytics/callback/:platform ────────────────────
router.get('/callback/:platform', authenticate, async (req, res) => {
  const { platform } = req.params;
  const { code } = req.query;

  if (!code) return res.status(400).json({ error: 'No authorization code' });

  // In production: exchange code for access token via platform OAuth endpoint
  // Store encrypted tokens in DB
  const userId = req.user.id;
  if (!socialAccounts.has(userId)) socialAccounts.set(userId, new Map());

  socialAccounts.get(userId).set(platform, {
    platform,
    connected: true,
    handle: '@placeholder',
    connectedAt: new Date().toISOString(),
    accessToken: `placeholder_${code.slice(0, 8)}`,  // real: encrypted OAuth token
  });

  audit({ label: 'SOCIAL_CONNECT', actorId: userId, detail: { platform }, result: 'ok' });
  res.redirect('/?connected=' + platform);
});

// ── GET /api/analytics/metrics ───────────────────────────────
router.get('/metrics', authenticate, async (req, res) => {
  const userId = req.user.id;
  const userAccounts = socialAccounts.get(userId) ?? new Map();
  const accounts = {};
  const metrics = {};
  const history = buildMockHistory();
  const retention = buildRetentionCurve(mockRetentionPoints());

  for (const [platform, account] of userAccounts.entries()) {
    accounts[platform] = { connected: account.connected, handle: account.handle };
    const cacheKey = `${userId}:${platform}`;
    const cached = getCache(cacheKey);

    if (cached) {
      metrics[platform] = cached;
      continue;
    }

    try {
      // In production: decrypt stored access token before passing
      const data = await fetchPlatformMetrics(platform, account.accessToken, {});
      data.engagement_rate = calcEngagementRate(data);
      metricsCache.set(cacheKey, { data, fetchedAt: Date.now() });
      metrics[platform] = data;
    } catch {
      metrics[platform] = getMockMetrics(platform);
    }
  }

  res.json({ accounts, metrics, history, retention });
});

// ── GET /api/analytics/posts/:platform ───────────────────────
router.get('/posts/:platform', authenticate, (req, res) => {
  const { platform } = req.params;
  res.json({ posts: [], platform, note: 'Connect your account to see post analytics' });
});

// ── Mock data helpers (used until OAuth tokens are stored) ────
function buildMockHistory() {
  const now = Date.now();
  return Array.from({ length: 14 }, (_, i) => ({
    date: new Date(now - (13 - i) * 86_400_000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    tiktok:    Math.floor(Math.random() * 50_000 + 10_000),
    instagram: Math.floor(Math.random() * 30_000 + 5_000),
    facebook:  Math.floor(Math.random() * 20_000 + 3_000),
    twitch:    Math.floor(Math.random() * 5_000 + 500),
  }));
}

function mockRetentionPoints() {
  return Array.from({ length: 60 }, (_, s) => ({
    second: s,
    viewers: Math.max(0, Math.floor(1000 * Math.pow(0.97, s) + Math.random() * 20)),
  }));
}

function getMockMetrics(platform) {
  const base = {
    tiktok:    { followers: 12_400, views: 340_000, likes: 28_000, comments: 1_200, shares: 3_400, reach: 89_000 },
    instagram: { followers: 8_700,  views: 120_000, likes: 15_000, comments: 850,   shares: 1_100, reach: 42_000 },
    facebook:  { followers: 5_200,  views: 75_000,  likes: 6_800,  comments: 420,   shares: 890,   reach: 31_000 },
    twitch:    { followers: 2_100,  views: 45_000,  currentViewers: 87, isLive: false, reach: 8_000 },
    discord:   { members: 3_400,    onlineMembers: 234 },
    reddit:    { subscribers: 1_800, activeUsers: 45 },
    lemon8:    { followers: 890,     views: 12_000, likes: 980 },
    redgifs:   { views: 67_000,      likes: 4_200 },
  };
  const data = base[platform] ?? { followers: 0, views: 0 };
  data.engagement_rate = calcEngagementRate(data);
  return data;
}

export default router;

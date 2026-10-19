// src/api/analytics.js
// Created: 2026-10-19
// Server-side analytics API — social media metrics, reach, retention, real-time Socket.IO feed

import { v4 as uuidv4 } from 'uuid';

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

// In-memory stores (swap for Redis when available)
const connectedPlatforms = new Map(); // platformKey -> { userId, connectedAt, tokenRef }
const platformMetrics = new Map();    // platform -> metrics snapshot

// ── helpers ────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildBaseMetrics(platform) {
  const bases = {
    tiktok:    { followers: 124_800, views: 4_210_000, likes: 830_000 },
    instagram: { followers: 89_300,  views: 1_980_000, likes: 412_000 },
    facebook:  { followers: 61_500,  views: 720_000,   likes: 98_000  },
    twitch:    { followers: 18_200,  views: 560_000,   likes: 42_000  },
    discord:   { followers: 9_400,   views: 0,         likes: 0       },
    lemon8:    { followers: 7_100,   views: 320_000,   likes: 51_000  },
    reddit:    { followers: 31_600,  views: 1_140_000, likes: 218_000 },
    redgifs:   { followers: 5_200,   views: 890_000,   likes: 74_000  },
  };
  const b = bases[platform] ?? { followers: 10_000, views: 100_000, likes: 10_000 };
  return {
    platform,
    followers:     b.followers + rand(-500, 500),
    views:         b.views     + rand(-5_000, 5_000),
    likes:         b.likes     + rand(-1_000, 1_000),
    comments:      rand(500, 8_000),
    shares:        rand(200, 4_000),
    impressions:   Math.floor(b.views * 1.4) + rand(-2_000, 2_000),
    reach:         Math.floor(b.followers * 2.3) + rand(-1_000, 1_000),
    engagementRate: parseFloat((rand(25, 95) / 10).toFixed(2)), // %
    avgWatchTime:  parseFloat((rand(10, 180) / 10).toFixed(1)), // seconds
    retentionRate: parseFloat((rand(200, 750) / 10).toFixed(1)), // %
    viralCoefficient: parseFloat((rand(5, 30) / 10).toFixed(2)),
    updatedAt: Date.now(),
  };
}

function refreshMetrics() {
  for (const p of PLATFORMS) {
    platformMetrics.set(p, buildBaseMetrics(p));
  }
}

// seed on load
refreshMetrics();

// ── aggregation ─────────────────────────────────────────────────────────────

function buildOverview() {
  const all = PLATFORMS.map(p => platformMetrics.get(p) ?? buildBaseMetrics(p));
  return {
    totalFollowers:   all.reduce((s, m) => s + m.followers, 0),
    totalViews:       all.reduce((s, m) => s + m.views, 0),
    totalLikes:       all.reduce((s, m) => s + m.likes, 0),
    totalImpressions: all.reduce((s, m) => s + m.impressions, 0),
    totalReach:       all.reduce((s, m) => s + m.reach, 0),
    avgEngagementRate: parseFloat(
      (all.reduce((s, m) => s + m.engagementRate, 0) / all.length).toFixed(2)
    ),
    platforms: all,
    connectedCount: connectedPlatforms.size,
    timestamp: Date.now(),
  };
}

// ── route factory ───────────────────────────────────────────────────────────

export function createAnalyticsRoutes(app, io) {

  // GET /api/analytics/social/overview
  app.get('/api/analytics/social/overview', (_req, res) => {
    res.json({ ok: true, data: buildOverview() });
  });

  // GET /api/analytics/social/platform/:platform
  app.get('/api/analytics/social/platform/:platform', (req, res) => {
    const platform = req.params.platform.toLowerCase();
    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ ok: false, error: 'Unknown platform', allowed: PLATFORMS });
    }
    const metrics = platformMetrics.get(platform) ?? buildBaseMetrics(platform);
    const connected = connectedPlatforms.has(platform);
    res.json({ ok: true, data: { ...metrics, connected } });
  });

  // GET /api/analytics/social/realtime
  app.get('/api/analytics/social/realtime', (_req, res) => {
    const snapshot = PLATFORMS.map(p => {
      const m = platformMetrics.get(p) ?? buildBaseMetrics(p);
      return {
        platform: p,
        liveViewers: rand(0, p === 'twitch' ? 4_000 : 500),
        recentLikes: rand(0, 200),
        recentComments: rand(0, 50),
        trendingScore: parseFloat((rand(1, 100) / 10).toFixed(1)),
        updatedAt: Date.now(),
      };
    });
    res.json({ ok: true, data: snapshot, timestamp: Date.now() });
  });

  // POST /api/analytics/social/connect
  app.post('/api/analytics/social/connect', (req, res) => {
    const { platform, userId, tokenRef } = req.body ?? {};
    const p = (platform ?? '').toLowerCase();
    if (!PLATFORMS.includes(p)) {
      return res.status(400).json({ ok: false, error: 'Unknown platform' });
    }
    if (!tokenRef || typeof tokenRef !== 'string' || tokenRef.length < 8) {
      return res.status(400).json({ ok: false, error: 'Provide a tokenRef (reference ID, not the token itself)' });
    }
    connectedPlatforms.set(p, {
      userId: userId ?? 'anonymous',
      connectedAt: Date.now(),
      tokenRef, // only a reference/identifier stored, not the actual token
    });
    res.json({ ok: true, platform: p, connectedAt: Date.now() });
  });

  // GET /api/analytics/reach
  app.get('/api/analytics/reach', (_req, res) => {
    const data = PLATFORMS.map(p => {
      const m = platformMetrics.get(p) ?? buildBaseMetrics(p);
      return {
        platform: p,
        impressions: m.impressions,
        uniqueReach: m.reach,
        viralCoefficient: m.viralCoefficient,
        shareRate: parseFloat((rand(5, 25) / 10).toFixed(2)),
      };
    });
    res.json({ ok: true, data, timestamp: Date.now() });
  });

  // GET /api/analytics/retention
  app.get('/api/analytics/retention', (_req, res) => {
    const data = PLATFORMS.map(p => {
      const m = platformMetrics.get(p) ?? buildBaseMetrics(p);
      return {
        platform: p,
        avgWatchTimeSec: m.avgWatchTime,
        retentionRate: m.retentionRate,
        completionRate: parseFloat((rand(150, 900) / 10).toFixed(1)),
        dropOffPoints: [rand(10, 30), rand(40, 60), rand(70, 90)].sort((a, b) => a - b),
      };
    });
    res.json({ ok: true, data, timestamp: Date.now() });
  });

  // GET /api/analytics/engagement
  app.get('/api/analytics/engagement', (_req, res) => {
    const data = PLATFORMS.map(p => {
      const m = platformMetrics.get(p) ?? buildBaseMetrics(p);
      return {
        platform: p,
        engagementRate: m.engagementRate,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        saves: rand(1_000, 50_000),
        clickThroughRate: parseFloat((rand(5, 40) / 10).toFixed(2)),
      };
    });
    res.json({ ok: true, data, timestamp: Date.now() });
  });

  // ── Socket.IO real-time feed (every 5 s) ──────────────────────────────────
  setInterval(() => {
    refreshMetrics();
    const payload = {
      overview: buildOverview(),
      realtime: PLATFORMS.map(p => ({
        platform: p,
        liveViewers: rand(0, p === 'twitch' ? 4_000 : 500),
        recentLikes: rand(0, 200),
        trendingScore: parseFloat((rand(1, 100) / 10).toFixed(1)),
        updatedAt: Date.now(),
      })),
      timestamp: Date.now(),
    };
    io.emit('analytics:update', payload);
  }, 5_000);
}

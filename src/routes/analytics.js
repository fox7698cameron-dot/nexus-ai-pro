/**
 * routes/analytics.js
 * Nexus AI Pro — Analytics API Routes
 * Date: 2026-08-27
 * Routes: GET /metrics, GET /platforms, GET /summary, POST /sync
 * Social platforms: TikTok, Instagram, Facebook, Twitch, Discord,
 *                   Lemon8, Reddit, RedGIFs
 * Real-time: Socket.IO events pushed on data refresh
 * No platform API keys hard-coded — all from process.env.*
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ── Platform credential helpers (env-only, no hard-coding) ────────────────────
const PLATFORM_CREDENTIALS = {
  tiktok:    { clientId: 'TIKTOK_CLIENT_ID',    secret: 'TIKTOK_CLIENT_SECRET'    },
  instagram: { clientId: 'IG_CLIENT_ID',         secret: 'IG_CLIENT_SECRET'         },
  facebook:  { clientId: 'FB_APP_ID',            secret: 'FB_APP_SECRET'            },
  twitch:    { clientId: 'TWITCH_CLIENT_ID',     secret: 'TWITCH_CLIENT_SECRET'     },
  discord:   { clientId: 'DISCORD_CLIENT_ID',    secret: 'DISCORD_CLIENT_SECRET'    },
  lemon8:    { clientId: 'LEMON8_CLIENT_ID',     secret: 'LEMON8_CLIENT_SECRET'     },
  reddit:    { clientId: 'REDDIT_CLIENT_ID',     secret: 'REDDIT_CLIENT_SECRET'     },
  redgifs:   { clientId: 'REDGIFS_CLIENT_ID',    secret: 'REDGIFS_CLIENT_SECRET'    },
};

function isPlatformConfigured(platform) {
  const creds = PLATFORM_CREDENTIALS[platform];
  return creds && process.env[creds.clientId] && process.env[creds.secret];
}

// ── Mock data (replace with real platform API calls in production) ────────────
function buildMetrics(platform) {
  const base = {
    tiktok:    { views: 2_450_000, likes: 189_000, reach: 1_900_000, retention: 62.4, shares: 45_000, comments: 12_300, followers: 340_000 },
    instagram: { views: 980_000,   likes: 87_500,  reach: 750_000,   retention: 54.1, shares: 18_200, comments: 9_100,  followers: 215_000 },
    facebook:  { views: 620_000,   likes: 43_000,  reach: 490_000,   retention: 38.7, shares: 22_100, comments: 7_800,  followers: 98_000  },
    twitch:    { views: 310_000,   likes: 28_000,  reach: 280_000,   retention: 71.2, shares: 5_400,  comments: 34_500, followers: 62_000  },
    discord:   { views: 0,         likes: 12_100,  reach: 45_000,    retention: 0,    shares: 3_200,  comments: 67_800, followers: 28_900  },
    lemon8:    { views: 145_000,   likes: 21_000,  reach: 130_000,   retention: 48.3, shares: 8_700,  comments: 4_200,  followers: 18_500  },
    reddit:    { views: 880_000,   likes: 54_000,  reach: 820_000,   retention: 0,    shares: 31_000, comments: 15_600, followers: 42_000  },
    redgifs:   { views: 1_200_000, likes: 98_000,  reach: 1_100_000, retention: 44.8, shares: 27_000, comments: 6_900,  followers: 55_000  },
  };
  const m = base[platform] || base.instagram;
  const fuzz = v => Math.round(v * (0.92 + Math.random() * 0.16));
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, typeof v === 'number' && v > 0 ? fuzz(v) : v]));
}

// ── GET /api/analytics/metrics?platform=tiktok&range=24h ─────────────────────
router.get('/metrics', requireAuth, (req, res) => {
  const { platform = 'all', range = '24h' } = req.query;
  if (platform !== 'all' && !PLATFORM_CREDENTIALS[platform]) {
    return res.status(400).json({ error: 'Unknown platform' });
  }
  const platforms = platform === 'all' ? Object.keys(PLATFORM_CREDENTIALS) : [platform];
  const result = Object.fromEntries(
    platforms.map(p => [p, {
      metrics:      buildMetrics(p),
      configured:   isPlatformConfigured(p),
      range,
      updatedAt:    new Date().toISOString(),
    }])
  );
  return res.json({ data: result, range, generatedAt: new Date().toISOString() });
});

// ── GET /api/analytics/platforms ─────────────────────────────────────────────
router.get('/platforms', requireAuth, (req, res) => {
  const platforms = Object.entries(PLATFORM_CREDENTIALS).map(([id, creds]) => ({
    id,
    configured: isPlatformConfigured(id),
    envKeys:    Object.values(creds), // tell the user which env vars to set
  }));
  return res.json({ platforms });
});

// ── GET /api/analytics/summary ────────────────────────────────────────────────
router.get('/summary', requireAuth, (req, res) => {
  const allMetrics = Object.keys(PLATFORM_CREDENTIALS).map(p => buildMetrics(p));
  const totals = allMetrics.reduce((acc, m) => {
    Object.entries(m).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
    return acc;
  }, {});
  return res.json({ totals, platformCount: allMetrics.length, updatedAt: new Date().toISOString() });
});

// ── POST /api/analytics/sync ──────────────────────────────────────────────────
// Triggers a fresh sync with all configured platforms
router.post('/sync', requireAuth, async (req, res) => {
  const results = [];
  for (const platform of Object.keys(PLATFORM_CREDENTIALS)) {
    if (!isPlatformConfigured(platform)) {
      results.push({ platform, status: 'skipped', reason: 'Not configured' });
      continue;
    }
    // Production: call platform-specific SDK with env-loaded credentials
    results.push({ platform, status: 'synced', updatedAt: new Date().toISOString() });
  }
  return res.json({ results });
});

export default router;

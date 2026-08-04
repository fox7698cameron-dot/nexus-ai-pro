/**
 * @file analytics.js
 * @description Real-time analytics API router for social media platforms.
 *   Provides aggregated metrics, per-platform breakdowns, retention curves,
 *   reach data, OAuth connection management, SSE live updates, and trending
 *   content analytics for TikTok, Instagram, Facebook, Twitch, Discord,
 *   Lemon8, Reddit, and RedGifs.
 * @created 2026-08-04
 * @copyright Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @license Apache-2.0
 *
 * SECURITY NOTE:
 *   OAuth access tokens are NEVER stored in this module or returned in
 *   responses. They must be encrypted at rest via a secrets manager
 *   (e.g. AWS Secrets Manager, HashiCorp Vault) or stored as environment
 *   variables (process.env.PLATFORM_TOKEN_<PLATFORM>). The connect endpoint
 *   accepts a token, encrypts it, and stores only the ciphertext reference.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Supported platforms
// ---------------------------------------------------------------------------

/** @type {string[]} All supported social platform identifiers (lowercase). */
export const PLATFORMS = Object.freeze([
  'tiktok',
  'instagram',
  'facebook',
  'twitch',
  'discord',
  'lemon8',
  'reddit',
  'redgifs',
]);

// ---------------------------------------------------------------------------
// In-memory stores
// NOTE: Replace with Redis or a time-series DB (InfluxDB, TimescaleDB) in
// production for persistence and horizontal scaling.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PlatformConnection
 * @property {string}  platform
 * @property {boolean} connected
 * @property {string|null} tokenRef    - Encrypted token reference (not raw token)
 * @property {number|null} connectedAt - Unix ms timestamp
 * @property {string|null} accountId
 * @property {string|null} accountHandle
 */

/**
 * @typedef {Object} MetricSnapshot
 * @property {string} platform
 * @property {number} timestamp
 * @property {number} views
 * @property {number} likes
 * @property {number} reach
 * @property {number} retention       - Average % retention (0-100)
 * @property {number} followers
 * @property {number} engagement_rate - Decimal percentage (0-100)
 * @property {number} comments
 * @property {number} shares
 */

/**
 * @typedef {Object} PostAnalytics
 * @property {string} postId
 * @property {string} platform
 * @property {string} contentType    - 'video'|'image'|'story'|'reel'|'stream'
 * @property {number} publishedAt
 * @property {number} views
 * @property {number} likes
 * @property {number} comments
 * @property {number} shares
 * @property {number} retention      - % of video watched (0-100)
 * @property {number} reach
 */

/** @type {Map<string, PlatformConnection>} platform -> connection record */
const connections = new Map(
  PLATFORMS.map((p) => [
    p,
    {
      platform: p,
      connected: false,
      tokenRef: null,
      connectedAt: null,
      accountId: null,
      accountHandle: null,
    },
  ])
);

/** @type {Map<string, MetricSnapshot[]>} platform -> snapshots (newest first) */
const metricHistory = new Map(PLATFORMS.map((p) => [p, []]));

/** @type {Map<string, PostAnalytics[]>} platform -> post analytics */
const postStore = new Map(PLATFORMS.map((p) => [p, []]));

/** @type {Set<import('http').ServerResponse>} Active SSE clients */
const sseClients = new Set();

// ---------------------------------------------------------------------------
// Deterministic mock-data helpers
// Seeded on timestamp bucket so values evolve realistically over time but are
// reproducible for the same minute.  NO Math.random() usage.
// ---------------------------------------------------------------------------

/**
 * Produces a deterministic pseudo-random integer in [min, max] seeded by an
 * integer seed. Uses a simple linear-congruential generator (LCG).
 * @param {number} seed
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function seededInt(seed, min, max) {
  // LCG parameters from Numerical Recipes
  const s = ((seed * 1664525 + 1013904223) >>> 0);
  return min + (s % (max - min + 1));
}

/**
 * Produces a deterministic float in [0, 1) from a seed.
 * @param {number} seed
 * @returns {number}
 */
function seededFloat(seed) {
  return ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

/**
 * Generates a platform-specific metric snapshot using deterministic patterns.
 * The seed is derived from the platform name and the current 5-minute bucket,
 * so metrics drift realistically across calls but are never truly random.
 *
 * @param {string} platform
 * @param {number} [now=Date.now()]
 * @returns {MetricSnapshot}
 */
function generateMetricSnapshot(platform, now = Date.now()) {
  const bucket = Math.floor(now / (5 * 60 * 1000)); // 5-min buckets
  const platformHash = platform.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seed = (bucket * 31 + platformHash) >>> 0;

  // Base values differ per platform to simulate realistic scale differences
  const baseProfiles = {
    tiktok:    { views: 500_000, followers: 1_200_000, reach: 800_000 },
    instagram: { views: 300_000, followers:   900_000, reach: 500_000 },
    facebook:  { views: 200_000, followers:   700_000, reach: 400_000 },
    twitch:    { views:  50_000, followers:   250_000, reach:  60_000 },
    discord:   { views:  20_000, followers:   180_000, reach:  25_000 },
    lemon8:    { views:  80_000, followers:   150_000, reach: 100_000 },
    reddit:    { views: 150_000, followers:   400_000, reach: 200_000 },
    redgifs:   { views: 250_000, followers:   350_000, reach: 300_000 },
  };

  const base = baseProfiles[platform] ?? { views: 100_000, followers: 200_000, reach: 120_000 };
  const variance = seededFloat(seed);

  const views = Math.floor(base.views * (0.85 + variance * 0.30));
  const followers = Math.floor(base.followers * (0.98 + seededFloat(seed + 1) * 0.04));
  const reach = Math.floor(base.reach * (0.80 + seededFloat(seed + 2) * 0.40));
  const likes = Math.floor(views * (0.04 + seededFloat(seed + 3) * 0.06));
  const comments = Math.floor(likes * (0.05 + seededFloat(seed + 4) * 0.10));
  const shares = Math.floor(likes * (0.02 + seededFloat(seed + 5) * 0.08));
  const retention = Math.round(30 + seededFloat(seed + 6) * 45); // 30-75%
  const engagement_rate = parseFloat(((likes + comments + shares) / (reach || 1) * 100).toFixed(2));

  return {
    platform,
    timestamp: now,
    views,
    likes,
    reach,
    retention,
    followers,
    engagement_rate,
    comments,
    shares,
  };
}

/**
 * Generates a deterministic retention curve (array of {second, pct} points).
 * @param {string} platform
 * @param {number} [now=Date.now()]
 * @returns {{ second: number, pct: number }[]}
 */
function generateRetentionCurve(platform, now = Date.now()) {
  const bucket = Math.floor(now / (60 * 60 * 1000)); // hourly buckets
  const platformHash = platform.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seed = (bucket * 17 + platformHash) >>> 0;

  const points = [];
  const totalSeconds = platform === 'twitch' ? 3600 : 60;
  const step = platform === 'twitch' ? 60 : 5;
  let pct = 100;

  for (let s = 0; s <= totalSeconds; s += step) {
    const dropRate = 0.02 + seededFloat((seed + s) >>> 0) * 0.04;
    pct = s === 0 ? 100 : Math.max(5, pct * (1 - dropRate));
    points.push({ second: s, pct: parseFloat(pct.toFixed(1)) });
  }

  return points;
}

/**
 * Generates deterministic geo reach breakdown for a platform.
 * @param {string} platform
 * @param {number} [now=Date.now()]
 * @returns {{ country: string, reach: number, pct: number }[]}
 */
function generateGeoReach(platform, now = Date.now()) {
  const regions = [
    { country: 'US', weight: 35 },
    { country: 'GB', weight: 10 },
    { country: 'DE', weight: 8 },
    { country: 'BR', weight: 7 },
    { country: 'IN', weight: 9 },
    { country: 'JP', weight: 6 },
    { country: 'CA', weight: 5 },
    { country: 'AU', weight: 4 },
    { country: 'FR', weight: 5 },
    { country: 'Other', weight: 11 },
  ];

  const snapshot = generateMetricSnapshot(platform, now);
  const totalReach = snapshot.reach;
  const platformHash = platform.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bucket = Math.floor(now / (30 * 60 * 1000));

  return regions.map(({ country, weight }, i) => {
    const seed = ((bucket + platformHash + i) * 1664525 + 1013904223) >>> 0;
    const variance = 0.8 + seededFloat(seed) * 0.4;
    const pct = parseFloat((weight * variance).toFixed(1));
    return { country, reach: Math.floor(totalReach * pct / 100), pct };
  });
}

/**
 * Generates a list of mock trending posts for a platform.
 * @param {string} platform
 * @param {number} [now=Date.now()]
 * @returns {PostAnalytics[]}
 */
function generateTrendingPosts(platform, now = Date.now()) {
  const count = 5;
  const platformHash = platform.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return Array.from({ length: count }, (_, i) => {
    const seed = ((Math.floor(now / 3600000) + platformHash + i) * 1664525 + 1013904223) >>> 0;
    const contentTypes = ['video', 'image', 'story', 'reel', 'stream'];
    const contentType = contentTypes[seededInt(seed, 0, contentTypes.length - 1)];
    return {
      postId: uuidv4().replace(/-/g, '').slice(0, 12),
      platform,
      contentType,
      publishedAt: now - seededInt(seed + 1, 3600000, 86400000),
      views: seededInt(seed + 2, 10_000, 2_000_000),
      likes: seededInt(seed + 3, 500, 80_000),
      comments: seededInt(seed + 4, 50, 8_000),
      shares: seededInt(seed + 5, 20, 4_000),
      retention: seededInt(seed + 6, 15, 85),
      reach: seededInt(seed + 7, 15_000, 2_500_000),
    };
  });
}

// ---------------------------------------------------------------------------
// Token encryption helpers
// IMPORTANT: Raw OAuth tokens are NEVER stored. Only an encrypted reference
// is held in memory. In production use a KMS-backed key (AWS KMS, GCP CKMS).
// ---------------------------------------------------------------------------

const ENCRYPTION_KEY_HEX = process.env.TOKEN_ENCRYPTION_KEY;
// Warn at startup; do not throw so tests can run without real keys.
if (!ENCRYPTION_KEY_HEX) {
  console.warn(
    '[analytics] WARNING: TOKEN_ENCRYPTION_KEY must be a 64-char hex string in process.env'
  );
}

/**
 * Encrypts an OAuth token using AES-256-GCM.
 * Returns a compact string containing IV + authTag + ciphertext (all base64).
 * @param {string} rawToken
 * @returns {string} encrypted reference
 */
function encryptToken(rawToken) {
  if (!ENCRYPTION_KEY_HEX) {
    // Fallback for dev/test: store an opaque placeholder, never the real token.
    return `dev-encrypted-placeholder:${uuidv4()}`;
  }
  const key = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(rawToken, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.');
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

/**
 * Sends an SSE event to a single client.
 * @param {import('http').ServerResponse} res
 * @param {string} event
 * @param {object} data
 */
function sendSSEEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Broadcasts an SSE event to all connected SSE clients.
 * @param {string} event
 * @param {object} data
 */
function broadcastSSE(event, data) {
  for (const client of sseClients) {
    try {
      sendSSEEvent(client, event, data);
    } catch {
      sseClients.delete(client);
    }
  }
}

// ---------------------------------------------------------------------------
// Socket.io event emitter
// Attached lazily via router.io injected by the server bootstrap.
// ---------------------------------------------------------------------------

/**
 * Emits a socket.io event if the io instance has been attached to the router.
 * @param {Router} router
 * @param {string} event
 * @param {object} payload
 */
function emitSocketEvent(router, event, payload) {
  if (router.io) {
    router.io.emit(event, payload);
  }
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

/**
 * Creates and returns the analytics Express router.
 * @returns {Router}
 */
export function createAnalyticsRouter() {
  const router = Router();

  // -------------------------------------------------------------------------
  // GET /overview
  // Returns aggregated metrics across all connected platforms.
  // -------------------------------------------------------------------------
  router.get('/overview', (req, res) => {
    const now = Date.now();
    const snapshots = PLATFORMS.map((p) => generateMetricSnapshot(p, now));

    const overview = {
      timestamp: now,
      connectedPlatforms: PLATFORMS.filter((p) => connections.get(p)?.connected),
      totals: {
        views: snapshots.reduce((s, m) => s + m.views, 0),
        likes: snapshots.reduce((s, m) => s + m.likes, 0),
        reach: snapshots.reduce((s, m) => s + m.reach, 0),
        followers: snapshots.reduce((s, m) => s + m.followers, 0),
        comments: snapshots.reduce((s, m) => s + m.comments, 0),
        shares: snapshots.reduce((s, m) => s + m.shares, 0),
        avg_engagement_rate: parseFloat(
          (snapshots.reduce((s, m) => s + m.engagement_rate, 0) / snapshots.length).toFixed(2)
        ),
        avg_retention: parseFloat(
          (snapshots.reduce((s, m) => s + m.retention, 0) / snapshots.length).toFixed(1)
        ),
      },
      byPlatform: Object.fromEntries(snapshots.map((m) => [m.platform, m])),
    };

    res.json({ ok: true, data: overview });
  });

  // -------------------------------------------------------------------------
  // GET /platform/:name
  // Returns metrics for a specific platform.
  // -------------------------------------------------------------------------
  router.get('/platform/:name', (req, res) => {
    const platform = req.params.name.toLowerCase();
    if (!PLATFORMS.includes(platform)) {
      return res.status(404).json({ ok: false, error: `Unknown platform: ${platform}` });
    }

    const now = Date.now();
    const snapshot = generateMetricSnapshot(platform, now);
    const connection = connections.get(platform);

    res.json({
      ok: true,
      data: {
        ...snapshot,
        connection: {
          connected: connection.connected,
          accountHandle: connection.accountHandle,
          connectedAt: connection.connectedAt,
        },
      },
    });
  });

  // -------------------------------------------------------------------------
  // GET /retention
  // Returns view retention curves per platform.
  // -------------------------------------------------------------------------
  router.get('/retention', (req, res) => {
    const now = Date.now();
    const curves = Object.fromEntries(
      PLATFORMS.map((p) => [p, generateRetentionCurve(p, now)])
    );
    res.json({ ok: true, data: { timestamp: now, curves } });
  });

  // -------------------------------------------------------------------------
  // GET /reach
  // Returns reach breakdown by platform and geography.
  // -------------------------------------------------------------------------
  router.get('/reach', (req, res) => {
    const now = Date.now();
    const breakdown = Object.fromEntries(
      PLATFORMS.map((p) => [
        p,
        {
          total: generateMetricSnapshot(p, now).reach,
          geo: generateGeoReach(p, now),
        },
      ])
    );
    res.json({ ok: true, data: { timestamp: now, breakdown } });
  });

  // -------------------------------------------------------------------------
  // POST /connect/:platform
  // Registers an OAuth token for a platform.
  // The raw token is encrypted immediately; only the ciphertext reference is
  // stored. The token itself is never logged or returned.
  // -------------------------------------------------------------------------
  router.post('/connect/:platform', (req, res) => {
    const platform = req.params.platform.toLowerCase();
    if (!PLATFORMS.includes(platform)) {
      return res.status(404).json({ ok: false, error: `Unknown platform: ${platform}` });
    }

    const { token, accountId, accountHandle } = req.body ?? {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ ok: false, error: 'token is required' });
    }

    // Encrypt and store the token reference; NEVER store the raw token.
    const tokenRef = encryptToken(token);

    const connection = connections.get(platform);
    connection.connected = true;
    connection.tokenRef = tokenRef;
    connection.connectedAt = Date.now();
    connection.accountId = accountId ?? null;
    connection.accountHandle = accountHandle ?? null;

    emitSocketEvent(router, 'analytics:update', {
      event: 'platform_connected',
      platform,
      connectedAt: connection.connectedAt,
    });

    res.json({
      ok: true,
      data: {
        platform,
        connected: true,
        accountHandle: connection.accountHandle,
        connectedAt: connection.connectedAt,
        // tokenRef intentionally omitted from response
      },
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /disconnect/:platform
  // Removes a platform connection and clears the stored token reference.
  // -------------------------------------------------------------------------
  router.delete('/disconnect/:platform', (req, res) => {
    const platform = req.params.platform.toLowerCase();
    if (!PLATFORMS.includes(platform)) {
      return res.status(404).json({ ok: false, error: `Unknown platform: ${platform}` });
    }

    const connection = connections.get(platform);
    connection.connected = false;
    connection.tokenRef = null;
    connection.connectedAt = null;
    connection.accountId = null;
    connection.accountHandle = null;

    emitSocketEvent(router, 'analytics:update', {
      event: 'platform_disconnected',
      platform,
    });

    res.json({ ok: true, data: { platform, connected: false } });
  });

  // -------------------------------------------------------------------------
  // GET /realtime
  // Server-Sent Events stream of live metric updates (~10-second cadence).
  // -------------------------------------------------------------------------
  router.get('/realtime', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    });
    res.flushHeaders();

    sseClients.add(res);

    // Send initial snapshot immediately
    const now = Date.now();
    sendSSEEvent(res, 'connected', { timestamp: now, message: 'Analytics SSE stream connected' });

    PLATFORMS.forEach((p) => {
      sendSSEEvent(res, 'metrics', generateMetricSnapshot(p, now));
    });

    // Periodic updates every 10 seconds
    const interval = setInterval(() => {
      const ts = Date.now();
      PLATFORMS.forEach((p) => {
        try {
          sendSSEEvent(res, 'metrics', generateMetricSnapshot(p, ts));
        } catch {
          clearInterval(interval);
          sseClients.delete(res);
        }
      });

      // Simulate occasional alert events
      const alertSeed = Math.floor(ts / 10000) % PLATFORMS.length;
      if (alertSeed === 0) {
        const alertPlatform = PLATFORMS[seededInt(Math.floor(ts / 1000), 0, PLATFORMS.length - 1)];
        const metric = generateMetricSnapshot(alertPlatform, ts);
        if (metric.engagement_rate > 6) {
          sendSSEEvent(res, 'alert', {
            type: 'high_engagement',
            platform: alertPlatform,
            engagement_rate: metric.engagement_rate,
            timestamp: ts,
          });
          emitSocketEvent(router, 'analytics:alert', {
            type: 'high_engagement',
            platform: alertPlatform,
            engagement_rate: metric.engagement_rate,
          });
        }
      }
    }, 10_000);

    req.on('close', () => {
      clearInterval(interval);
      sseClients.delete(res);
    });
  });

  // -------------------------------------------------------------------------
  // GET /trends
  // Returns trending content analytics across all platforms.
  // -------------------------------------------------------------------------
  router.get('/trends', (req, res) => {
    const now = Date.now();
    const trends = Object.fromEntries(
      PLATFORMS.map((p) => [p, generateTrendingPosts(p, now)])
    );

    // Cross-platform top posts (by views)
    const allPosts = Object.values(trends).flat();
    allPosts.sort((a, b) => b.views - a.views);

    res.json({
      ok: true,
      data: {
        timestamp: now,
        topPosts: allPosts.slice(0, 10),
        byPlatform: trends,
      },
    });
  });

  return router;
}

export default createAnalyticsRouter();

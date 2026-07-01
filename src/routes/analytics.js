// ================================================
// NEXUS AI PRO - Analytics Routes
// File: src/routes/analytics.js
// Updated: 2026-07-01
// Social media analytics: TikTok, Instagram,
// Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
// ================================================

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/authMiddleware.js';
import { fetchAllPlatformMetrics, SUPPORTED_PLATFORMS } from '../services/analyticsService.js';

const router = Router();

function ok(req, res) {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ error: 'Validation failed', details: e.array() }); return false; }
  return true;
}

// ── GET /api/analytics/overview ───────────────────────────────────────────

router.get('/overview', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const redis = req.app.locals.redis;
  const userId = req.user.sub;
  const cacheKey = `analytics:overview:${userId}`;

  // Serve from cache (TTL 5 minutes)
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return res.json(JSON.parse(cached));

  // Load connected accounts
  const accountsResult = await db.query(
    'SELECT platform, access_token, config FROM social_accounts WHERE user_id = $1 AND is_active = true',
    [userId]
  );
  const connectedAccounts = {};
  for (const row of accountsResult.rows) {
    connectedAccounts[row.platform] = { accessToken: row.access_token, ...row.config };
  }

  const metrics = await fetchAllPlatformMetrics(connectedAccounts);
  await redis.setex(cacheKey, 300, JSON.stringify(metrics)).catch(() => null);
  return res.json(metrics);
});

// ── GET /api/analytics/platforms ──────────────────────────────────────────

router.get('/platforms', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const result = await db.query(
    'SELECT platform, connected_at, username, config FROM social_accounts WHERE user_id = $1',
    [req.user.sub]
  );
  return res.json({
    supported: SUPPORTED_PLATFORMS,
    connected: result.rows,
  });
});

// ── POST /api/analytics/connect ───────────────────────────────────────────

router.post(
  '/connect',
  requireAuth,
  [
    body('platform').isIn(SUPPORTED_PLATFORMS),
    body('accessToken').optional().isString(),
    body('config').optional().isObject(),
  ],
  async (req, res) => {
    if (!ok(req, res)) return;
    const { platform, accessToken, config = {} } = req.body;
    const db = req.app.locals.db;
    const userId = req.user.sub;
    try {
      await db.query(
        `INSERT INTO social_accounts (id, user_id, platform, access_token, config, is_active, connected_at)
         VALUES ($1,$2,$3,$4,$5,true,NOW())
         ON CONFLICT (user_id, platform)
         DO UPDATE SET access_token=$3, config=$4, is_active=true, connected_at=NOW()`,
        [uuidv4(), userId, platform, accessToken || null, JSON.stringify(config)]
      );
      return res.json({ success: true, platform, connected: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ── DELETE /api/analytics/disconnect/:platform ────────────────────────────

router.delete(
  '/disconnect/:platform',
  requireAuth,
  [param('platform').isIn(SUPPORTED_PLATFORMS)],
  async (req, res) => {
    if (!ok(req, res)) return;
    const db = req.app.locals.db;
    await db.query(
      'UPDATE social_accounts SET is_active = false WHERE user_id = $1 AND platform = $2',
      [req.user.sub, req.params.platform]
    );
    return res.json({ success: true });
  }
);

// ── GET /api/analytics/platform/:platform ─────────────────────────────────

router.get(
  '/platform/:platform',
  requireAuth,
  [param('platform').isIn(SUPPORTED_PLATFORMS)],
  async (req, res) => {
    if (!ok(req, res)) return;
    const { platform } = req.params;
    const db = req.app.locals.db;
    const result = await db.query(
      'SELECT access_token, config FROM social_accounts WHERE user_id = $1 AND platform = $2 AND is_active = true',
      [req.user.sub, platform]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Platform not connected' });
    const row = result.rows[0];
    const connectedAccounts = { [platform]: { accessToken: row.access_token, ...row.config } };
    const metrics = await fetchAllPlatformMetrics(connectedAccounts);
    const platformData = metrics.platforms.find(p => p.platform === platform);
    return res.json(platformData || { platform, error: 'No data' });
  }
);

// ── GET /api/analytics/snapshots ─────────────────────────────────────────

router.get('/snapshots', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const { platform, limit = 30 } = req.query;
  const params = [req.user.sub, Math.min(parseInt(limit) || 30, 100)];
  let query = 'SELECT * FROM analytics_snapshots WHERE user_id = $1';
  if (platform && SUPPORTED_PLATFORMS.includes(platform)) {
    query += ' AND platform = $3';
    params.push(platform);
  }
  query += ' ORDER BY snapshot_at DESC LIMIT $2';
  const result = await db.query(query, params);
  return res.json(result.rows);
});

// ── POST /api/analytics/snapshot ──────────────────────────────────────────
// Manually trigger a metrics snapshot (also runs automatically via cron)

router.post('/snapshot', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.sub;
  const accountsResult = await db.query(
    'SELECT platform, access_token, config FROM social_accounts WHERE user_id = $1 AND is_active = true',
    [userId]
  );
  const connectedAccounts = {};
  for (const row of accountsResult.rows) {
    connectedAccounts[row.platform] = { accessToken: row.access_token, ...row.config };
  }
  const metrics = await fetchAllPlatformMetrics(connectedAccounts);
  for (const m of metrics.platforms) {
    if (!m.error) {
      await db.query(
        `INSERT INTO analytics_snapshots
          (id, user_id, platform, views, likes, comments, shares, reach, impressions, retention, followers, engagement, snapshot_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
        [uuidv4(), userId, m.platform, m.views, m.likes, m.comments, m.shares, m.reach, m.impressions, m.retention, m.followers, m.engagement]
      );
    }
  }
  return res.json({ success: true, platforms: metrics.platforms.length, totals: metrics.totals });
});

export default router;

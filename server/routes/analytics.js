/**
 * server/routes/analytics.js
 * Nexus AI Pro — Analytics API Routes
 * Labeled: 2026-08-25
 *
 * GET  /api/analytics/summary              — cross-platform summary
 * GET  /api/analytics/:platform/:accountId — single platform metrics
 * GET  /api/analytics/:platform/:accountId/trending — top content
 * GET  /api/analytics/:platform/:accountId/realtime — live snapshot
 * POST /api/analytics/accounts            — save connected accounts
 * GET  /api/analytics/accounts            — list connected accounts
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  PLATFORMS,
  getPlatformMetrics,
  getAllPlatformMetrics,
  getCrossPlatformSummary,
  getRealtimeSnapshot,
  getTrendingContent
} from '../services/analyticsService.js';

const router = express.Router();

// In-memory connected accounts store (userId → accounts[])
const connectedAccounts = new Map();

// Validate platform param
function validatePlatform(platform) {
  return Object.values(PLATFORMS).includes(platform);
}

// ── Connected accounts ────────────────────────────────────────────────────────
router.get('/accounts', requireAuth, (req, res) => {
  const accounts = connectedAccounts.get(req.user.sub) || [];
  return res.json({ accounts });
});

router.post('/accounts', requireAuth, (req, res) => {
  const { platform, accountId, displayName } = req.body;

  if (!validatePlatform(platform)) {
    return res.status(400).json({ error: `Unknown platform: ${platform}` });
  }
  if (!accountId || typeof accountId !== 'string') {
    return res.status(400).json({ error: 'accountId required' });
  }

  const accounts = connectedAccounts.get(req.user.sub) || [];
  const existing = accounts.findIndex(a => a.platform === platform);

  const record = { platform, accountId: String(accountId), displayName: displayName || accountId };
  if (existing >= 0) {
    accounts[existing] = record;
  } else {
    accounts.push(record);
  }

  connectedAccounts.set(req.user.sub, accounts);
  return res.status(201).json({ message: 'Account connected', account: record });
});

router.delete('/accounts/:platform', requireAuth, (req, res) => {
  const { platform } = req.params;
  const accounts = (connectedAccounts.get(req.user.sub) || [])
    .filter(a => a.platform !== platform);
  connectedAccounts.set(req.user.sub, accounts);
  return res.json({ message: 'Account disconnected' });
});

// ── Cross-platform summary ────────────────────────────────────────────────────
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const accounts = connectedAccounts.get(req.user.sub) || [];
    const period   = parseInt(req.query.period, 10) || 7;

    if (accounts.length === 0) {
      return res.json({ message: 'No connected accounts', summary: null });
    }

    const summary = await getCrossPlatformSummary(accounts, period);
    return res.json(summary);
  } catch (err) {
    console.error('[ANALYTICS] summary error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// ── Single platform metrics ───────────────────────────────────────────────────
router.get('/:platform/:accountId', requireAuth, async (req, res) => {
  try {
    const { platform, accountId } = req.params;
    if (!validatePlatform(platform)) {
      return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }

    const period   = parseInt(req.query.period, 10) || 7;
    const data     = await getPlatformMetrics(platform, accountId, { periodDays: period });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch platform metrics' });
  }
});

// ── Trending content ──────────────────────────────────────────────────────────
router.get('/:platform/:accountId/trending', requireAuth, (req, res) => {
  const { platform, accountId } = req.params;
  if (!validatePlatform(platform)) {
    return res.status(400).json({ error: `Unknown platform: ${platform}` });
  }

  const limit   = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const content = getTrendingContent(platform, accountId, limit);
  return res.json({ platform, accountId, content });
});

// ── Real-time snapshot ────────────────────────────────────────────────────────
router.get('/:platform/:accountId/realtime', requireAuth, (req, res) => {
  const { platform, accountId } = req.params;
  if (!validatePlatform(platform)) {
    return res.status(400).json({ error: `Unknown platform: ${platform}` });
  }

  const snapshot = getRealtimeSnapshot(platform, accountId);
  return res.json(snapshot);
});

export default router;

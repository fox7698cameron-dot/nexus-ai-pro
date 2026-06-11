// src/routes/analytics.routes.js
// Social media analytics endpoints — real-time metrics via Socket.IO
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { PERMISSIONS, SOCIAL_PLATFORMS } from '../config/constants.js';
import { getAggregatedMetrics, recordSnapshot, getTimeSeries, getContentMetrics, seedDemoMetrics } from '../services/analytics.service.js';

const router = Router();

// All analytics routes require authentication + analytics:view permission
router.use(requireAuth, requirePermission(PERMISSIONS.ANALYTICS_VIEW));

// GET /api/analytics/summary — aggregated across all platforms
router.get('/summary', (req, res) => {
  const metrics = getAggregatedMetrics(req.user.sub);
  return res.json(metrics);
});

// GET /api/analytics/platform/:platform — platform-specific metrics
router.get('/platform/:platform', (req, res) => {
  const { platform } = req.params;
  if (!SOCIAL_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform', supported: SOCIAL_PLATFORMS });
  }
  const metrics = getContentMetrics(req.user.sub, platform);
  if (!metrics) return res.status(404).json({ error: 'No data for this platform — connect your account first' });
  return res.json(metrics);
});

// GET /api/analytics/timeseries/:platform — chart data
router.get('/timeseries/:platform', (req, res) => {
  const { platform } = req.params;
  const limit = parseInt(req.query.limit) || 30;
  if (!SOCIAL_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform' });
  }
  return res.json(getTimeSeries(req.user.sub, platform, limit));
});

// GET /api/analytics/platforms — list all connected platforms
router.get('/platforms', (req, res) => {
  return res.json({ platforms: SOCIAL_PLATFORMS });
});

// POST /api/analytics/ingest — receive webhook from social platform connector
router.post('/ingest', (req, res) => {
  const { platform, metrics } = req.body;
  if (!platform || !metrics) return res.status(400).json({ error: 'platform and metrics required' });
  if (!SOCIAL_PLATFORMS.includes(platform)) return res.status(400).json({ error: 'Unknown platform' });
  const snapshot = recordSnapshot(req.user.sub, platform, metrics);
  return res.status(201).json(snapshot);
});

// POST /api/analytics/demo — seed demo data (dev only)
router.post('/demo', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  seedDemoMetrics(req.user.sub);
  return res.json({ message: 'Demo data seeded' });
});

export default router;

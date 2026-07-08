// src/routes/analytics-routes.js
// Date: 2026-07-08
// Social media analytics API routes

import express from 'express';
import { createAuthMiddleware } from '../middleware/auth-middleware.js';
import { PLATFORMS } from '../services/analytics-service.js';

export function createAnalyticsRouter(analyticsService, authService) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(authService);

  // GET /api/analytics/platforms
  router.get('/platforms', (req, res) => {
    res.json({ platforms: Object.values(PLATFORMS) });
  });

  // POST /api/analytics/connect
  router.post('/connect', authenticate, (req, res) => {
    const { platform, credentials } = req.body;
    if (!platform || !credentials) {
      return res.status(400).json({ error: 'platform and credentials required' });
    }
    const result = analyticsService.connectAccount(req.user.id, platform, credentials);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  });

  // GET /api/analytics/accounts
  router.get('/accounts', authenticate, (req, res) => {
    const accounts = analyticsService.getConnectedAccounts(req.user.id);
    res.json({ accounts });
  });

  // GET /api/analytics/metrics/:platform
  router.get('/metrics/:platform', authenticate, async (req, res) => {
    try {
      const { platform } = req.params;
      const { timeRange = '7d' } = req.query;
      if (!Object.values(PLATFORMS).includes(platform)) {
        return res.status(400).json({ error: `Invalid platform: ${platform}` });
      }
      const metrics = await analyticsService.getMetrics(req.user.id, platform, timeRange);
      res.json(metrics);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/analytics/dashboard
  router.get('/dashboard', authenticate, async (req, res) => {
    try {
      const { timeRange = '7d' } = req.query;
      const summary = await analyticsService.getDashboardSummary(req.user.id, timeRange);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/analytics/retention/:platform/:contentId
  router.get('/retention/:platform/:contentId', authenticate, (req, res) => {
    const { platform, contentId } = req.params;
    const data = analyticsService.getRetentionData(req.user.id, platform, contentId);
    res.json(data);
  });

  // POST /api/analytics/demo-connect
  // Connects demo accounts for all platforms (no real credentials needed)
  router.post('/demo-connect', authenticate, (req, res) => {
    const results = [];
    for (const platform of Object.values(PLATFORMS)) {
      const result = analyticsService.connectAccount(req.user.id, platform, {
        accountId: `demo_${platform}_${req.user.id.slice(0, 8)}`,
        username: `@demo_${platform}_user`,
        tokenRef: 'demo'
      });
      results.push(result);
    }
    res.json({ success: true, connected: results.filter(r => r.success).length });
  });

  return router;
}

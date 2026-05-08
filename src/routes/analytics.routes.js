// src/routes/analytics.routes.js
// Nexus AI Pro - Analytics API Routes
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import { Router } from 'express';
import { param, query, validationResult } from 'express-validator';

const VALID_PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

export function createAnalyticsRouter(aggregator, authService) {
  const router = Router();
  const auth = authService.requireAuth();

  // ─── Platform metrics ─────────────────────────────────────────────────────────
  router.get('/:platform/metrics', auth,
    [param('platform').isIn(VALID_PLATFORMS)],
    async (req, res) => {
      const errs = validationResult(req);
      if (!errs.isEmpty()) return res.status(400).json({ error: 'Invalid platform' });
      const { platform } = req.params;
      const { accountId } = req.query;
      try {
        const connector = aggregator.getConnector(platform);
        let data = null;
        if (platform === 'tiktok') data = await connector.getAccountMetrics(accountId);
        else if (platform === 'instagram') data = await connector.getAccountInsights(accountId);
        else if (platform === 'facebook') data = await connector.getPageInsights(accountId);
        else if (platform === 'twitch') data = await connector.getChannelInfo(accountId);
        else if (platform === 'discord') data = await connector.getGuildMetrics(accountId);
        else if (platform === 'reddit') data = await connector.getSubredditStats(accountId);
        else if (platform === 'redgifs') data = await connector.getCreatorStats(accountId);
        else data = await connector.getAccountMetrics?.(accountId);
        res.json({ platform, data });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );

  // ─── Aggregated cross-platform summary ───────────────────────────────────────
  router.post('/aggregate', auth, async (req, res) => {
    const { platforms } = req.body;
    if (!Array.isArray(platforms)) return res.status(400).json({ error: 'platforms array required' });
    try {
      const results = await aggregator.getAggregatedMetrics(platforms);
      res.json({ results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Top content ──────────────────────────────────────────────────────────────
  router.get('/:platform/top-content', auth,
    [param('platform').isIn(VALID_PLATFORMS)],
    async (req, res) => {
      const errs = validationResult(req);
      if (!errs.isEmpty()) return res.status(400).json({ error: 'Invalid platform' });
      const { platform } = req.params;
      try {
        if (platform === 'tiktok') {
          const data = await aggregator.getConnector('tiktok').getTopVideos();
          return res.json({ platform, content: data });
        }
        res.json({ platform, content: [] });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );

  // ─── Platform connection status ───────────────────────────────────────────────
  router.get('/status', auth, (req, res) => {
    const connected = VALID_PLATFORMS.filter(p => {
      const envMap = {
        tiktok: 'TIKTOK_ACCESS_TOKEN',
        instagram: 'INSTAGRAM_ACCESS_TOKEN',
        facebook: 'FACEBOOK_PAGE_TOKEN',
        twitch: 'TWITCH_ACCESS_TOKEN',
        discord: 'DISCORD_BOT_TOKEN',
        reddit: 'REDDIT_CLIENT_ID',
        redgifs: null,
        lemon8: null,
      };
      const key = envMap[p];
      return key ? !!process.env[key] : false;
    });
    res.json({ platforms: VALID_PLATFORMS, connected });
  });

  return router;
}

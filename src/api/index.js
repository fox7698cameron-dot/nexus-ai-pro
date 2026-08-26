/**
 * NEXUS AI PRO - API Router Index
 * File: src/api/index.js
 * Date: 2026-08-26
 *
 * Central API router — mounts all sub-routers with versioning.
 * No secrets hardcoded.
 */

import express from 'express';
import { authRouter } from './auth.js';
import { analyticsRouter, setupAnalyticsSocket } from './analytics.js';
import { securityScanRouter, setupSecuritySocket } from './security-scan.js';
import { projectsRouter, setupProjectSocket } from './projects.js';
import { subscriptionsRouter } from './subscriptions.js';
import { connectorsRouter } from './connectors.js';
import { i18nRouter, i18nMiddleware } from '../i18n/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ─── i18n middleware (auto-detect language for all API responses) ───────────────
router.use(i18nMiddleware);

// ─── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    node: process.versions.node,
    platform: process.platform,
    uptime: Math.floor(process.uptime()),
    memory: { heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB` },
  });
});

// ─── Route mounts ──────────────────────────────────────────────────────────────
router.use('/auth', authRouter);
router.use('/analytics', analyticsRouter);
router.use('/security', securityScanRouter);
router.use('/projects', projectsRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/connectors', connectorsRouter);
router.use('/i18n', i18nRouter);

export { router as apiRouter, setupAnalyticsSocket, setupSecuritySocket, setupProjectSocket };

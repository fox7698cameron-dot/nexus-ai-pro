// src/routes/admin.routes.js
// Nexus AI Pro - Admin API Routes
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import { Router } from 'express';
import { ROLES } from '../auth/authService.js';

export function createAdminRouter(authService, kvStore) {
  const router = Router();
  const requireAdmin = authService.requireRoles(ROLES.ADMIN);
  const requireAdminOrMod = authService.requireRoles(ROLES.ADMIN, ROLES.MODERATOR);

  // ─── User management (admin only) ────────────────────────────────────────────
  router.get('/users', requireAdmin, async (req, res) => {
    const keys = await kvStore.keys('user:id:*');
    const users = [];
    for (const key of keys) {
      const user = await kvStore.get(key);
      if (user) {
        const { passwordHash, mfaSecret, mfaTempSecret, ...safe } = user;
        users.push(safe);
      }
    }
    res.json({ users, total: users.length });
  });

  router.put('/users/:userId/role', requireAdmin, async (req, res) => {
    const { role } = req.body;
    if (!Object.values(ROLES).includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const user = await kvStore.get(`user:id:${req.params.userId}`);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.role = role;
    user.updatedAt = Date.now();
    await kvStore.set(`user:id:${req.params.userId}`, user);
    res.json({ message: 'Role updated' });
  });

  router.delete('/users/:userId', requireAdmin, async (req, res) => {
    const user = await kvStore.get(`user:id:${req.params.userId}`);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await kvStore.del(`user:id:${req.params.userId}`);
    await kvStore.del(`user:email:${user.emailHash}`);
    await kvStore.del(`user:username:${user.username?.toLowerCase()}`);
    res.json({ success: true });
  });

  // ─── System stats ─────────────────────────────────────────────────────────────
  router.get('/stats', requireAdmin, async (req, res) => {
    const userKeys = await kvStore.keys('user:id:*');
    res.json({
      totalUsers: userKeys.length,
      timestamp: Date.now(),
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    });
  });

  // ─── Content reports (admin/mod) ──────────────────────────────────────────────
  router.get('/reports', requireAdminOrMod, async (req, res) => {
    const reports = (await kvStore.get('moderation:reports')) || [];
    res.json({ reports });
  });

  router.post('/reports/:reportId/resolve', requireAdminOrMod, async (req, res) => {
    const reports = (await kvStore.get('moderation:reports')) || [];
    const idx = reports.findIndex(r => r.id === req.params.reportId);
    if (idx === -1) return res.status(404).json({ error: 'Report not found' });
    reports[idx].status = 'resolved';
    reports[idx].resolvedBy = req.user.sub;
    reports[idx].resolvedAt = Date.now();
    await kvStore.set('moderation:reports', reports);
    res.json({ success: true });
  });

  // ─── Content report submission (any user) ────────────────────────────────────
  router.post('/reports', authService.requireAuth(), async (req, res) => {
    const { content, reason } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const reports = (await kvStore.get('moderation:reports')) || [];
    const report = { id: require('crypto').randomUUID(), content, reason, reporter: req.user.sub, status: 'pending', createdAt: Date.now() };
    reports.push(report);
    await kvStore.set('moderation:reports', reports);
    res.status(201).json({ id: report.id });
  });

  // ─── Connectors status ────────────────────────────────────────────────────────
  router.get('/connectors', requireAdmin, (req, res) => {
    const connectors = [
      { name: 'GitHub', configured: !!process.env.GITHUB_TOKEN },
      { name: 'Azure', configured: !!process.env.AZURE_ACCESS_TOKEN },
      { name: 'AWS', configured: !!process.env.AWS_ACCESS_KEY_ID },
      { name: 'Google', configured: !!process.env.GOOGLE_ACCESS_TOKEN },
      { name: 'Slack', configured: !!process.env.SLACK_BOT_TOKEN },
      { name: 'Zoom', configured: !!process.env.ZOOM_CLIENT_ID },
      { name: 'Bitbucket', configured: !!process.env.BITBUCKET_ACCESS_TOKEN },
      { name: 'Adobe', configured: !!process.env.ADOBE_ACCESS_TOKEN },
      { name: 'Epic Games', configured: !!process.env.EPIC_CLIENT_ID },
      { name: 'Xbox', configured: !!process.env.XBOX_ACCESS_TOKEN },
      { name: 'PlayStation', configured: !!process.env.SONY_PSN_ACCESS_TOKEN },
      { name: 'Ubisoft', configured: !!process.env.UBISOFT_ACCESS_TOKEN },
      { name: 'Stripe', configured: !!process.env.STRIPE_SECRET_KEY },
      { name: 'Redis', configured: !!process.env.REDIS_URL },
      { name: 'Azure Blob', configured: !!process.env.AZURE_STORAGE_CONNECTION_STRING },
    ];
    res.json({ connectors });
  });

  return router;
}

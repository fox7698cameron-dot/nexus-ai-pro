// nexus-ai-pro/src/routes/admin.routes.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Admin-only routes: user management, stats, audit, integrations

import { Router } from 'express';
import { authenticate, requireRole, ROLES } from '../services/auth.service.js';
import { getRecentAuditEntries } from '../services/audit.service.js';
import { getIntegrationStatus } from '../services/integrations.service.js';
import { audit } from '../services/audit.service.js';

const router = Router();

// All admin routes require admin role
router.use(authenticate, requireRole(ROLES.ADMIN));

// In-memory user registry (shared reference from auth routes in production — use DB)
// This is a stub; production code queries the users table directly.
const userRegistry = new Map();

// ── GET /api/admin/stats ──────────────────────────────────────
router.get('/stats', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    totalUsers: userRegistry.size,
    activeToday: 0,  // populated from DB in production
    monthRevenue: 0, // populated from Stripe in production
    apiCallsToday: 0,
    memoryMB: Math.round(mem.heapUsed / 1024 / 1024),
    uptime: Math.round(process.uptime()),
    nodeVersion: process.versions.node,
    platform: process.platform,
  });
});

// ── GET /api/admin/users ──────────────────────────────────────
router.get('/users', (req, res) => {
  const { page = 1, limit = 50, role, status } = req.query;
  let list = [...userRegistry.values()];
  if (role) list = list.filter(u => u.role === role);
  if (status) list = list.filter(u => u.status === status);
  const start = (page - 1) * limit;
  const users = list.slice(start, start + parseInt(limit)).map(u => {
    const { passwordHash, ...safe } = u;
    return safe;
  });
  res.json({ users, total: list.length, page: parseInt(page), limit: parseInt(limit) });
});

// ── PATCH /api/admin/users/:id/status ────────────────────────
router.patch('/users/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['active', 'suspended', 'banned'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const user = userRegistry.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === ROLES.SUPERADMIN) return res.status(403).json({ error: 'Cannot modify superadmin' });

  user.status = status;
  userRegistry.set(user.id, user);
  audit({ label: 'ADMIN_USER_STATUS', actorId: req.user.id, targetType: 'user', targetId: user.id, detail: { status }, result: 'ok' });
  res.json({ ok: true, status });
});

// ── PATCH /api/admin/users/:id/role ──────────────────────────
router.patch('/users/:id/role', requireRole(ROLES.SUPERADMIN), (req, res) => {
  const { role } = req.body;
  const validRoles = Object.values(ROLES);
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const user = userRegistry.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.role = role;
  userRegistry.set(user.id, user);
  audit({ label: 'ADMIN_ROLE_CHANGE', actorId: req.user.id, targetType: 'user', targetId: user.id, detail: { role }, result: 'ok' });
  res.json({ ok: true, role });
});

// ── GET /api/admin/audit ──────────────────────────────────────
router.get('/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? 100), 500);
  res.json({ entries: getRecentAuditEntries(limit) });
});

// ── GET /api/admin/integrations ───────────────────────────────
router.get('/integrations', (req, res) => {
  res.json(getIntegrationStatus());
});

// ── GET /api/admin/health ─────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    env: process.env.NODE_ENV,
  });
});

export { userRegistry };
export default router;

// admin.js | Nexus AI Pro | Created: 2026-10-15 | Admin API Routes
// Role-based admin, moderator, and developer management endpoints

import { Router } from 'express';
import { ROLES } from './auth.js';

const router = Router();

// Role middleware factory
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.headers['x-user-role'] || req.query.role || ROLES.USER;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.userRole = role;
    next();
  };
}

// System health stats
function getSystemHealth() {
  const memUsage = process.memoryUsage();
  return {
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    },
    cpu: process.cpuUsage(),
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    env: process.env.NODE_ENV || 'development',
  };
}

// Mock revenue data (replace with DB queries in production)
function getRevenueMetrics() {
  const now = Date.now();
  return {
    mrr: 4920.50,
    arr: 59046.00,
    churn: 2.3,
    newSignups: 127,
    activeSubscriptions: { free: 2840, pro: 412, enterprise: 38 },
    revenueByDay: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(now - (29 - i) * 86400000).toISOString().slice(0, 10),
      revenue: +(200 + Math.random() * 150).toFixed(2),
    })),
    updatedAt: now,
  };
}

// In-memory feature flags
const featureFlags = new Map([
  ['biometric_auth', { enabled: true, rollout: 100 }],
  ['crypto_payments', { enabled: true, rollout: 100 }],
  ['ai_code_review', { enabled: false, rollout: 0 }],
  ['game_dev_connectors', { enabled: true, rollout: 50 }],
  ['auto_translate', { enabled: true, rollout: 100 }],
]);

// GET /api/admin/health
router.get('/health', requireRole(ROLES.ADMIN, ROLES.DEVELOPER), (req, res) => {
  res.json(getSystemHealth());
});

// GET /api/admin/revenue
router.get('/revenue', requireRole(ROLES.ADMIN), (req, res) => {
  res.json(getRevenueMetrics());
});

// GET /api/admin/feature-flags
router.get('/feature-flags', requireRole(ROLES.ADMIN, ROLES.DEVELOPER), (req, res) => {
  const flags = Object.fromEntries(featureFlags.entries());
  res.json(flags);
});

// PUT /api/admin/feature-flags/:flag
router.put('/feature-flags/:flag', requireRole(ROLES.ADMIN), (req, res) => {
  const { flag } = req.params;
  const { enabled, rollout } = req.body;
  if (!featureFlags.has(flag)) return res.status(404).json({ error: 'Feature flag not found' });
  const current = featureFlags.get(flag);
  featureFlags.set(flag, { ...current, enabled: enabled ?? current.enabled, rollout: rollout ?? current.rollout });
  res.json({ flag, ...featureFlags.get(flag) });
});

// GET /api/admin/users (moderator and admin can list users)
router.get('/users', requireRole(ROLES.ADMIN, ROLES.MODERATOR), (req, res) => {
  const { role, search, page = 1, limit = 25 } = req.query;
  // In a real app, query the DB; return mock data here
  const mockUsers = Array.from({ length: 50 }, (_, i) => ({
    id: `user-${i + 1}`,
    username: `user${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: i === 0 ? ROLES.ADMIN : i < 3 ? ROLES.MODERATOR : i < 6 ? ROLES.DEVELOPER : ROLES.USER,
    active: i % 10 !== 0,
    createdAt: Date.now() - i * 86400000,
  }));
  const filtered = mockUsers.filter(u => {
    if (role && u.role !== role) return false;
    if (search && !u.username.includes(search) && !u.email.includes(search)) return false;
    return true;
  });
  const start = (page - 1) * limit;
  res.json({ users: filtered.slice(start, start + Number(limit)), total: filtered.length, page: Number(page), limit: Number(limit) });
});

// PUT /api/admin/users/:userId/status (moderator can ban; admin can do anything)
router.put('/users/:userId/status', requireRole(ROLES.ADMIN, ROLES.MODERATOR), (req, res) => {
  const { active, reason } = req.body;
  // In production: update DB record
  res.json({ userId: req.params.userId, active, reason, updatedAt: Date.now() });
});

// PUT /api/admin/users/:userId/role (admin only)
router.put('/users/:userId/role', requireRole(ROLES.ADMIN), (req, res) => {
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) return res.status(400).json({ error: 'Invalid role' });
  res.json({ userId: req.params.userId, role, updatedAt: Date.now() });
});

// GET /api/admin/api-keys (developer and admin)
router.get('/api-keys', requireRole(ROLES.ADMIN, ROLES.DEVELOPER), (req, res) => {
  // Never return actual key values
  res.json({
    keys: [
      { id: 'key-1', name: 'Production API', prefix: 'nxs_prod_****', createdAt: Date.now() - 86400000 * 10, active: true },
      { id: 'key-2', name: 'Staging API', prefix: 'nxs_stg_****', createdAt: Date.now() - 86400000 * 5, active: true },
    ],
  });
});

// POST /api/admin/api-keys (developer and admin)
router.post('/api-keys', requireRole(ROLES.ADMIN, ROLES.DEVELOPER), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Key name required' });
  // In production: generate securely, store hash only
  const rawKey = `nxs_${process.env.NODE_ENV === 'production' ? 'prod' : 'dev'}_` + (await import('crypto')).randomBytes(24).toString('hex');
  res.status(201).json({ id: `key-${Date.now()}`, name, key: rawKey, message: 'Store this key securely — it will not be shown again' });
});

// DELETE /api/admin/api-keys/:keyId (developer and admin)
router.delete('/api-keys/:keyId', requireRole(ROLES.ADMIN, ROLES.DEVELOPER), (req, res) => {
  res.json({ success: true, keyId: req.params.keyId });
});

export { router as adminRouter };

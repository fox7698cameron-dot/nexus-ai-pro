// server/routes/admin.js
// 2026-06-06 | Admin, moderator, and dev dashboard routes — role-gated

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import { users } from './auth.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ─── Admin-only routes ────────────────────────────────────────────────────────

// GET /api/admin/users — list all users
router.get('/users', requireRole('admin'), (req, res) => {
  const { page = 1, limit = 50, role, search } = req.query;
  let list = Array.from(users.values()).map(({ passwordHash, mfaSecret, ...u }) => u);

  if (role) list = list.filter(u => u.role === role);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(u => u.email.includes(q) || u.username?.toLowerCase().includes(q));
  }

  const start = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  res.json({
    users: list.slice(start, start + parseInt(limit, 10)),
    total: list.length,
    page: parseInt(page, 10)
  });
});

// DELETE /api/admin/users/:id — ban user
router.delete('/users/:id', requireRole('admin'), (req, res) => {
  if (!users.has(req.params.id)) return res.status(404).json({ error: 'User not found' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account via admin route' });
  users.delete(req.params.id);
  res.json({ message: 'User removed' });
});

// PATCH /api/admin/users/:id — update user (role, subscription, etc.)
router.patch('/users/:id', requireRole('admin'), (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const allowed = ['role', 'subscription', 'displayName', 'locale'];
  for (const key of allowed) {
    if (key in req.body) user[key] = req.body[key];
  }
  user.updatedAt = Date.now();

  const { passwordHash, mfaSecret, ...safeUser } = user;
  res.json(safeUser);
});

// GET /api/admin/stats — platform statistics
router.get('/stats', requireRole('admin'), (req, res) => {
  const allUsers = Array.from(users.values());
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  res.json({
    totalUsers: allUsers.length,
    activeToday: allUsers.filter(u => u.lastLogin && now - u.lastLogin < day).length,
    byRole: {
      admin: allUsers.filter(u => u.role === 'admin').length,
      dev: allUsers.filter(u => u.role === 'dev').length,
      moderator: allUsers.filter(u => u.role === 'moderator').length,
      user: allUsers.filter(u => u.role === 'user').length
    },
    bySubscription: {
      free: allUsers.filter(u => u.subscription === 'free').length,
      pro: allUsers.filter(u => u.subscription === 'pro').length,
      enterprise: allUsers.filter(u => u.subscription === 'enterprise').length
    },
    mfaEnabled: allUsers.filter(u => u.mfaEnabled).length,
    newUsersToday: allUsers.filter(u => now - u.createdAt < day).length
  });
});

// ─── Moderator routes ─────────────────────────────────────────────────────────

// GET /api/admin/reports — moderation queue (stub)
router.get('/reports', requireRole('admin', 'moderator'), (req, res) => {
  res.json({
    reports: [],
    pending: 0,
    message: 'Moderation queue empty'
  });
});

// POST /api/admin/users/:id/warn — issue warning to user
router.post('/users/:id/warn', requireRole('admin', 'moderator'), (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.warnings) user.warnings = [];
  user.warnings.push({
    id: uuidv4(),
    reason: req.body.reason || 'No reason provided',
    issuedBy: req.user.id,
    issuedAt: Date.now()
  });

  res.json({ message: 'Warning issued', warningCount: user.warnings.length });
});

// ─── Dev routes ───────────────────────────────────────────────────────────────

// GET /api/admin/system — system health for devs
router.get('/system', requireRole('admin', 'dev'), (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024)
    },
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV || 'development',
    pid: process.pid
  });
});

// GET /api/admin/config — current runtime config (non-sensitive)
router.get('/config', requireRole('admin', 'dev'), (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 3001,
    corsOrigin: process.env.CORS_ORIGIN || '*',
    aiProviders: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      mistral: !!process.env.MISTRAL_API_KEY
    },
    payments: {
      stripe: !!process.env.STRIPE_SECRET_KEY
    },
    storage: {
      redis: !!process.env.REDIS_URL,
      postgres: !!process.env.DATABASE_URL,
      blob: !!process.env.BLOB_STORAGE_URL
    }
  });
});

export default router;

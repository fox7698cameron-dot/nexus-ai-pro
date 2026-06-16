// File: admin.js | Date: 2026-06-16
import { Router } from 'express';
import { z } from 'zod';
import authService from '../services/authService.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeMinRole } from '../middleware/authorize.js';
import auditLogger from '../utils/audit.js';

const router = Router();
const ROLE_HIERARCHY = ['user', 'moderator', 'developer', 'admin', 'super_admin'];

// All admin routes require authentication + admin role
router.use(authenticate, authorizeMinRole('admin'));

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten().fieldErrors });
    }
    req.validated = result.data;
    next();
  };
}

function getRoleLevel(role) { return ROLE_HIERARCHY.indexOf(role); }

// GET /users — paginated user list
router.get('/users', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const result = authService.getAllUsers(page, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/:id
router.get('/users/:id', (req, res) => {
  try {
    const user = authService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /users/:id — update user
router.put('/users/:id', async (req, res) => {
  try {
    const user = authService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Cannot elevate a user above own role level
    if (req.body.role) {
      const targetLevel = getRoleLevel(req.body.role);
      const ownLevel = getRoleLevel(req.user.role);
      if (targetLevel >= ownLevel) {
        return res.status(403).json({ error: 'Cannot assign a role equal to or higher than your own' });
      }
    }

    const updated = await authService.updateProfile(req.params.id, req.body);
    auditLogger.log('admin.user.updated', req.user.id, { targetUserId: req.params.id }, 'info');
    res.json({ user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /users/:id
router.delete('/users/:id', authorizeMinRole('admin'), (req, res) => {
  try {
    const user = authService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Cannot delete admins or super_admins
    if (['admin', 'super_admin'].includes(user.role)) {
      return res.status(403).json({ error: 'Cannot delete admin accounts via this endpoint' });
    }
    // Cannot delete self
    if (user.id === req.user.id) {
      return res.status(403).json({ error: 'Cannot delete your own account via admin endpoint' });
    }

    auditLogger.log('admin.user.deleted', req.user.id, { targetUserId: req.params.id }, 'warn');
    res.json({ success: true, message: 'User account deactivated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /users/:id/audit — user audit log
router.get('/users/:id/audit', (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
    const log = auditLogger.getLog({ userId: req.params.id, limit });
    res.json({ log, total: log.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /stats — platform-wide stats
router.get('/stats', (req, res) => {
  try {
    const allUsers = authService.getAllUsers(1, 10000);
    const roleBreakdown = {};
    for (const user of allUsers.users) {
      roleBreakdown[user.role] = (roleBreakdown[user.role] || 0) + 1;
    }

    res.json({
      stats: {
        totalUsers: allUsers.total,
        roleBreakdown,
        auditLogSize: auditLogger.size,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /security/overview — security dashboard for admins
router.get('/security/overview', (req, res) => {
  try {
    const recentEvents = auditLogger.getLog({ severity: 'error', limit: 20 });
    const criticalEvents = auditLogger.getLog({ severity: 'critical', limit: 10 });
    const warnEvents = auditLogger.getLog({ severity: 'warn', limit: 30 });

    res.json({
      overview: {
        recentErrors: recentEvents.length,
        criticalAlerts: criticalEvents.length,
        recentWarnings: warnEvents.length,
        recentErrorEvents: recentEvents.slice(0, 5),
        criticalAlertEvents: criticalEvents.slice(0, 3),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /security/scan — trigger security scan
router.post('/security/scan', authorizeMinRole('admin'), (req, res) => {
  // Stub: in production, trigger actual security scan tools
  auditLogger.log('admin.security.scan', req.user.id, {}, 'info');
  res.json({
    scan: {
      id: `scan-${Date.now()}`,
      status: 'initiated',
      message: 'Security scan queued. Results will be available in the security dashboard.',
      initiatedAt: new Date().toISOString(),
    },
  });
});

// GET /subscriptions — list all subscriptions
router.get('/subscriptions', (req, res) => {
  // In production, query Stripe for all subscriptions
  res.json({
    subscriptions: [],
    message: 'Configure Stripe to list all subscriptions',
    total: 0,
  });
});

// GET /revenue — revenue analytics
router.get('/revenue', (req, res) => {
  // In production, pull from Stripe balance/payouts API
  res.json({
    revenue: {
      monthly: 0,
      annual: 0,
      currency: 'usd',
      message: 'Configure Stripe to view revenue data',
      generatedAt: new Date().toISOString(),
    },
  });
});

// POST /broadcast — send message to all users
router.post('/broadcast', authorizeMinRole('admin'), async (req, res) => {
  try {
    const schema = z.object({
      message: z.string().min(1).max(2000),
      type: z.enum(['info', 'warning', 'maintenance']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    auditLogger.log('admin.broadcast', req.user.id, { message: parsed.data.message.slice(0, 100) }, 'info');

    res.json({
      success: true,
      broadcast: {
        message: parsed.data.message,
        type: parsed.data.type || 'info',
        sentAt: new Date().toISOString(),
        sentBy: req.user.id,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /moderators — list moderators
router.get('/moderators', (req, res) => {
  try {
    const all = authService.getAllUsers(1, 10000);
    const moderators = all.users.filter(u => u.role === 'moderator');
    res.json({ moderators, total: moderators.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /moderators — promote user to moderator
router.post('/moderators', async (req, res) => {
  try {
    const schema = z.object({ userId: z.string().uuid() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed' });

    const user = authService.getUserById(parsed.data.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (getRoleLevel(user.role) >= getRoleLevel('moderator')) {
      return res.status(400).json({ error: 'User is already a moderator or higher' });
    }

    await authService.updateProfile(parsed.data.userId, { role: 'moderator' });
    auditLogger.log('admin.moderator.promoted', req.user.id, { targetUserId: parsed.data.userId }, 'info');
    res.json({ success: true, userId: parsed.data.userId, newRole: 'moderator' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /moderators/:id — demote moderator
router.delete('/moderators/:id', async (req, res) => {
  try {
    const user = authService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'moderator') return res.status(400).json({ error: 'User is not a moderator' });

    await authService.updateProfile(req.params.id, { role: 'user' });
    auditLogger.log('admin.moderator.demoted', req.user.id, { targetUserId: req.params.id }, 'info');
    res.json({ success: true, userId: req.params.id, newRole: 'user' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /developers — list developers
router.get('/developers', (req, res) => {
  try {
    const all = authService.getAllUsers(1, 10000);
    const developers = all.users.filter(u => u.role === 'developer');
    res.json({ developers, total: developers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /developers — promote to developer
router.post('/developers', async (req, res) => {
  try {
    const schema = z.object({ userId: z.string().uuid() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed' });

    const user = authService.getUserById(parsed.data.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (getRoleLevel(user.role) >= getRoleLevel('developer')) {
      return res.status(400).json({ error: 'User is already a developer or higher' });
    }

    await authService.updateProfile(parsed.data.userId, { role: 'developer' });
    auditLogger.log('admin.developer.promoted', req.user.id, { targetUserId: parsed.data.userId }, 'info');
    res.json({ success: true, userId: parsed.data.userId, newRole: 'developer' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

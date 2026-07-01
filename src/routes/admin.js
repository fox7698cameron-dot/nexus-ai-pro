// ================================================
// NEXUS AI PRO - Admin Routes
// File: src/routes/admin.js
// Updated: 2026-07-01
// Admin, Developer, Moderator dashboard data
// All routes require appropriate role
// ================================================

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

function ok(req, res) {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ error: 'Validation failed', details: e.array() }); return false; }
  return true;
}

// ── Admin: user list ──────────────────────────────────────────────────────

router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const db = req.app.locals.db;
  const { limit = 50, offset = 0, role, search } = req.query;
  const params = [];
  let query = 'SELECT id, email, username, role, language, mfa_enabled, created_at, last_login FROM users WHERE 1=1';
  if (role) { params.push(role); query += ` AND role = $${params.length}`; }
  if (search) { params.push(`%${search}%`); query += ` AND (email ILIKE $${params.length} OR username ILIKE $${params.length})`; }
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Math.min(parseInt(limit) || 50, 200), Math.max(parseInt(offset) || 0, 0));
  const result = await db.query(query, params);
  const count = await db.query('SELECT COUNT(*) FROM users');
  return res.json({ users: result.rows, total: parseInt(count.rows[0].count) });
});

// ── Admin: update user role ───────────────────────────────────────────────

router.put(
  '/users/:id/role',
  requireAuth,
  requireRole('admin'),
  [param('id').isUUID(), body('role').isIn(['user', 'moderator', 'developer', 'admin'])],
  async (req, res) => {
    if (!ok(req, res)) return;
    const db = req.app.locals.db;
    const result = await db.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role',
      [req.body.role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json(result.rows[0]);
  }
);

// ── Admin: ban / suspend user ─────────────────────────────────────────────

router.post(
  '/users/:id/suspend',
  requireAuth,
  requireRole('admin', 'moderator'),
  [param('id').isUUID(), body('reason').optional().isString()],
  async (req, res) => {
    if (!ok(req, res)) return;
    const db = req.app.locals.db;
    await db.query("UPDATE users SET is_suspended = true, suspension_reason = $1, updated_at = NOW() WHERE id = $2", [req.body.reason || null, req.params.id]);
    return res.json({ success: true });
  }
);

// ── Admin: system stats ───────────────────────────────────────────────────

router.get('/stats', requireAuth, requireRole('admin', 'developer'), async (req, res) => {
  const db = req.app.locals.db;
  const [users, chats, projects, subs] = await Promise.all([
    db.query('SELECT COUNT(*) as total, SUM(CASE WHEN last_login > NOW() - INTERVAL \'7 days\' THEN 1 ELSE 0 END) as active_7d FROM users'),
    db.query('SELECT COUNT(*) as total FROM chats'),
    db.query('SELECT COUNT(*) as total, type, COUNT(*) FROM projects GROUP BY type'),
    db.query("SELECT COUNT(*) as total, plan_id FROM subscriptions WHERE status = 'active' GROUP BY plan_id"),
  ]);
  return res.json({
    users: { total: parseInt(users.rows[0].total), active7d: parseInt(users.rows[0].active_7d) },
    chats: parseInt(chats.rows[0].total),
    projects: projects.rows,
    subscriptions: subs.rows,
    timestamp: Date.now(),
  });
});

// ── Admin: audit log ─────────────────────────────────────────────────────

router.get('/audit-log', requireAuth, requireRole('admin'), async (req, res) => {
  const db = req.app.locals.db;
  const { limit = 50, offset = 0, event } = req.query;
  const params = [];
  let query = 'SELECT * FROM audit_log WHERE 1=1';
  if (event) { params.push(event); query += ` AND event = $${params.length}`; }
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Math.min(parseInt(limit) || 50, 500), Math.max(parseInt(offset) || 0, 0));
  const result = await db.query(query, params);
  return res.json(result.rows);
});

// ── Developer: API usage stats ────────────────────────────────────────────

router.get('/api-usage', requireAuth, requireRole('admin', 'developer'), async (req, res) => {
  const db = req.app.locals.db;
  const result = await db.query(
    `SELECT model_type, SUM(tokens_input) as tokens_in, SUM(tokens_output) as tokens_out, SUM(cost_usd) as cost, COUNT(*) as calls
     FROM api_usage GROUP BY model_type ORDER BY cost DESC`
  );
  return res.json(result.rows);
});

// ── Moderator: content flags ──────────────────────────────────────────────

router.get('/flags', requireAuth, requireRole('admin', 'moderator'), async (req, res) => {
  const db = req.app.locals.db;
  const result = await db.query(
    "SELECT * FROM content_flags WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50"
  );
  return res.json(result.rows);
});

router.post(
  '/flags/:id/resolve',
  requireAuth,
  requireRole('admin', 'moderator'),
  [param('id').isUUID(), body('action').isIn(['dismiss', 'remove', 'warn'])],
  async (req, res) => {
    if (!ok(req, res)) return;
    const db = req.app.locals.db;
    await db.query(
      "UPDATE content_flags SET status = 'resolved', resolved_by = $1, resolved_at = NOW(), resolution = $2 WHERE id = $3",
      [req.user.sub, req.body.action, req.params.id]
    );
    return res.json({ success: true });
  }
);

export default router;

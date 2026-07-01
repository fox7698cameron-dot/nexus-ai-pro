// ================================================
// NEXUS AI PRO - Project Tracking Routes
// File: src/routes/projects.js
// Updated: 2026-07-01
// Tracks: coding, game dev, AR/VR/3D projects
// Real-time updates via Socket.IO
// ================================================

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Project types — enumerated
const PROJECT_TYPES = ['web', 'mobile', 'desktop', 'game_2d', 'game_3d', 'vr', 'ar', 'xr', 'backend', 'fullstack', 'ai_ml', 'devops', 'library', 'other'];
const PROJECT_STATUSES = ['planning', 'active', 'paused', 'review', 'completed', 'archived'];
const MILESTONE_STATUSES = ['pending', 'in_progress', 'completed', 'blocked'];
const TECH_STACKS = ['javascript', 'typescript', 'python', 'rust', 'go', 'csharp', 'cpp', 'java', 'swift', 'kotlin', 'dart', 'ruby', 'php', 'elixir', 'other'];

function ok(req, res) {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ error: 'Validation failed', details: e.array() }); return false; }
  return true;
}

// ── POST /api/projects ────────────────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  [
    body('name').trim().isLength({ min: 1, max: 255 }),
    body('type').isIn(PROJECT_TYPES),
    body('status').optional().isIn(PROJECT_STATUSES),
    body('description').optional().isString().isLength({ max: 2000 }),
    body('techStack').optional().isArray(),
    body('targetPlatforms').optional().isArray(),
    body('dueDate').optional().isISO8601(),
  ],
  async (req, res) => {
    if (!ok(req, res)) return;
    const { name, type, status = 'planning', description = '', techStack = [], targetPlatforms = [], dueDate, metadata = {} } = req.body;
    const db = req.app.locals.db;
    const id = uuidv4();
    try {
      await db.query(
        `INSERT INTO projects
          (id, user_id, name, type, status, description, tech_stack, target_platforms, due_date, metadata, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [id, req.user.sub, name, type, status, description, JSON.stringify(techStack), JSON.stringify(targetPlatforms), dueDate || null, JSON.stringify(metadata)]
      );
      // Emit real-time event
      const io = req.app.locals.io;
      if (io) io.to(`user:${req.user.sub}`).emit('project:created', { id, name, type, status });
      return res.status(201).json({ id, name, type, status, description, techStack, targetPlatforms });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/projects ─────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const { type, status, limit = 20, offset = 0 } = req.query;
  let query = 'SELECT * FROM projects WHERE user_id = $1';
  const params = [req.user.sub];
  if (type && PROJECT_TYPES.includes(type)) { params.push(type); query += ` AND type = $${params.length}`; }
  if (status && PROJECT_STATUSES.includes(status)) { params.push(status); query += ` AND status = $${params.length}`; }
  query += ` ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Math.min(parseInt(limit) || 20, 100), Math.max(parseInt(offset) || 0, 0));
  const result = await db.query(query, params);
  return res.json(result.rows);
});

// ── GET /api/projects/:id ─────────────────────────────────────────────────

router.get('/:id', requireAuth, [param('id').isUUID()], async (req, res) => {
  if (!ok(req, res)) return;
  const db = req.app.locals.db;
  const project = await db.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.user.sub]);
  if (project.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
  const milestones = await db.query('SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY sort_order', [req.params.id]);
  return res.json({ ...project.rows[0], milestones: milestones.rows });
});

// ── PUT /api/projects/:id ─────────────────────────────────────────────────

router.put(
  '/:id',
  requireAuth,
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 255 }),
    body('status').optional().isIn(PROJECT_STATUSES),
    body('type').optional().isIn(PROJECT_TYPES),
  ],
  async (req, res) => {
    if (!ok(req, res)) return;
    const db = req.app.locals.db;
    const { name, status, description, techStack, targetPlatforms, dueDate, metadata } = req.body;
    const fields = [];
    const params = [];
    if (name !== undefined) { params.push(name); fields.push(`name = $${params.length}`); }
    if (status !== undefined) { params.push(status); fields.push(`status = $${params.length}`); }
    if (description !== undefined) { params.push(description); fields.push(`description = $${params.length}`); }
    if (techStack !== undefined) { params.push(JSON.stringify(techStack)); fields.push(`tech_stack = $${params.length}`); }
    if (targetPlatforms !== undefined) { params.push(JSON.stringify(targetPlatforms)); fields.push(`target_platforms = $${params.length}`); }
    if (dueDate !== undefined) { params.push(dueDate); fields.push(`due_date = $${params.length}`); }
    if (metadata !== undefined) { params.push(JSON.stringify(metadata)); fields.push(`metadata = $${params.length}`); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    fields.push(`updated_at = NOW()`);
    params.push(req.params.id, req.user.sub);
    const result = await db.query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    const io = req.app.locals.io;
    if (io) io.to(`user:${req.user.sub}`).emit('project:updated', result.rows[0]);
    return res.json(result.rows[0]);
  }
);

// ── DELETE /api/projects/:id ──────────────────────────────────────────────

router.delete('/:id', requireAuth, [param('id').isUUID()], async (req, res) => {
  if (!ok(req, res)) return;
  const db = req.app.locals.db;
  const result = await db.query('DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.sub]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
  const io = req.app.locals.io;
  if (io) io.to(`user:${req.user.sub}`).emit('project:deleted', { id: req.params.id });
  return res.json({ success: true });
});

// ── POST /api/projects/:id/milestones ─────────────────────────────────────

router.post(
  '/:id/milestones',
  requireAuth,
  [
    param('id').isUUID(),
    body('title').trim().isLength({ min: 1, max: 255 }),
    body('dueDate').optional().isISO8601(),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    if (!ok(req, res)) return;
    const db = req.app.locals.db;
    const { title, description = '', dueDate, sortOrder = 0 } = req.body;
    // Verify project ownership
    const proj = await db.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.user.sub]);
    if (proj.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    const id = uuidv4();
    await db.query(
      `INSERT INTO project_milestones (id, project_id, title, description, status, sort_order, due_date, created_at)
       VALUES ($1,$2,$3,$4,'pending',$5,$6,NOW())`,
      [id, req.params.id, title, description, sortOrder, dueDate || null]
    );
    const io = req.app.locals.io;
    if (io) io.to(`user:${req.user.sub}`).emit('milestone:created', { projectId: req.params.id, id, title });
    return res.status(201).json({ id, title, status: 'pending', sortOrder });
  }
);

// ── PUT /api/projects/:id/milestones/:milestoneId ─────────────────────────

router.put(
  '/:id/milestones/:milestoneId',
  requireAuth,
  [param('id').isUUID(), param('milestoneId').isUUID(), body('status').optional().isIn(MILESTONE_STATUSES)],
  async (req, res) => {
    if (!ok(req, res)) return;
    const db = req.app.locals.db;
    const { title, status, description, dueDate } = req.body;
    const fields = [];
    const params = [];
    if (title !== undefined) { params.push(title); fields.push(`title = $${params.length}`); }
    if (status !== undefined) { params.push(status); fields.push(`status = $${params.length}`); }
    if (description !== undefined) { params.push(description); fields.push(`description = $${params.length}`); }
    if (dueDate !== undefined) { params.push(dueDate); fields.push(`due_date = $${params.length}`); }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(req.params.milestoneId, req.params.id);
    const result = await db.query(
      `UPDATE project_milestones SET ${fields.join(', ')} WHERE id = $${params.length - 1} AND project_id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });
    const io = req.app.locals.io;
    if (io) io.to(`user:${req.user.sub}`).emit('milestone:updated', result.rows[0]);
    return res.json(result.rows[0]);
  }
);

// ── GET /api/projects/types ───────────────────────────────────────────────

router.get('/meta/types', requireAuth, (req, res) => res.json({ types: PROJECT_TYPES, statuses: PROJECT_STATUSES, techStacks: TECH_STACKS }));

export default router;

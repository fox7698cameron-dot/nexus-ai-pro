/**
 * src/api/projects.js
 * Real-Time Project Tracking API — Coding, Game Dev, AR/VR/3D Projects
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Supports project types: software, game, ar_vr, mobile, web, api, library
 * Integrates with: GitHub, Bitbucket, Unreal/Epic, Unity, Sony, Microsoft, Ubisoft
 * Real-time updates via Socket.IO events emitted from this module.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole, requireMFA, ROLES } from '../middleware/auth.js';
import { requireField, returnValidationErrors } from '../utils/validation.js';

const router = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

export const PROJECT_TYPES = Object.freeze([
  'software',    // General software / coding
  'game',        // Game development
  'ar_vr',       // AR / VR experiences
  '3d',          // 3D modeling / rendering
  'mobile',      // iOS / Android
  'web',         // Web applications
  'api',         // Backend / API
  'library',     // Open-source library / SDK
]);

export const PROJECT_STATUS = Object.freeze([
  'planning', 'in_progress', 'review', 'testing', 'released', 'archived',
]);

export const PLATFORMS_GAME = Object.freeze([
  'pc', 'ps5', 'xbox', 'switch', 'ios', 'android', 'web', 'vr_quest', 'vr_psvr',
]);

export const ENGINES = Object.freeze([
  'unreal5', 'unreal4', 'unity', 'godot', 'cryengine', 'custom', 'bevy', 'cocos',
]);

// ─── In-Memory Store ──────────────────────────────────────────────────────────
const projects   = new Map(); // projectId → project record
const milestones = new Map(); // milestoneId → milestone
const tasks      = new Map(); // taskId → task
let projectEventEmitter; // set by mountRoutes()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emit(event, data) {
  if (projectEventEmitter) {
    projectEventEmitter.emit('project:update', { event, data, ts: Date.now() });
  }
}

function visibleTo(project, userId, role) {
  if (role === ROLES.ADMIN || role === ROLES.DEV) return true;
  return project.ownerId === userId || (project.collaborators || []).includes(userId);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/projects — list user's projects */
router.get('/', requireAuth, (req, res) => {
  const { type, status } = req.query;
  let list = [...projects.values()].filter(p =>
    visibleTo(p, req.user.id, req.user.role)
  );

  if (type)   list = list.filter(p => p.type   === type);
  if (status) list = list.filter(p => p.status === status);

  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return res.json({ projects: list, total: list.length });
});

/** POST /api/projects — create a project */
router.post('/', requireAuth, (req, res) => {
  const {
    name, description = '', type = 'software', status = 'planning',
    engine, platforms = [], tags = [], repoUrl, gameDetails,
  } = req.body;

  const errors = [
    requireField(name, 'name'),
    !PROJECT_TYPES.includes(type)   ? `type must be one of: ${PROJECT_TYPES.join(', ')}` : null,
    !PROJECT_STATUS.includes(status) ? `status must be one of: ${PROJECT_STATUS.join(', ')}` : null,
  ];
  if (returnValidationErrors(errors, res)) return;

  const id  = crypto.randomUUID();
  const now = new Date().toISOString();

  const project = {
    id,
    name:         name.trim(),
    description,
    type,
    status,
    engine:       engine || null,
    platforms,
    tags,
    repoUrl:      repoUrl || null,
    ownerId:      req.user.id,
    collaborators: [],
    createdAt:    now,
    updatedAt:    now,
    stats: {
      commits:     0,
      openIssues:  0,
      closedIssues: 0,
      coverage:    0,
      buildStatus: 'unknown',
    },
    // Game-specific
    gameDetails: type === 'game' ? {
      genre:           gameDetails?.genre || '',
      targetPlatforms: gameDetails?.targetPlatforms || [],
      engine:          gameDetails?.engine || '',
      achievements:    [],
      builds: [],
    } : null,
    // AR/VR specific
    arvrDetails: type === 'ar_vr' ? {
      xrType:     gameDetails?.xrType || 'vr',
      targetHMDs: gameDetails?.targetHMDs || [],
    } : null,
  };

  projects.set(id, project);
  emit('created', project);

  return res.status(201).json(project);
});

/** GET /api/projects/:id */
router.get('/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!visibleTo(project, req.user.id, req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  return res.json(project);
});

/** PUT /api/projects/:id */
router.put('/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.id && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Only the project owner can update it' });
  }

  const allowed = ['name', 'description', 'type', 'status', 'engine', 'platforms', 'tags', 'repoUrl', 'gameDetails', 'arvrDetails'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      project[key] = req.body[key];
    }
  }
  project.updatedAt = new Date().toISOString();
  projects.set(req.params.id, project);
  emit('updated', project);

  return res.json(project);
});

/** DELETE /api/projects/:id */
router.delete('/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.id && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Only the project owner can delete it' });
  }
  projects.delete(req.params.id);
  emit('deleted', { id: req.params.id });
  return res.json({ message: 'Project deleted' });
});

// ─── Milestones ───────────────────────────────────────────────────────────────

/** GET /api/projects/:id/milestones */
router.get('/:id/milestones', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || !visibleTo(project, req.user.id, req.user.role)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const list = [...milestones.values()].filter(m => m.projectId === req.params.id);
  return res.json({ milestones: list });
});

/** POST /api/projects/:id/milestones */
router.post('/:id/milestones', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { title, dueDate, description = '' } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const id = crypto.randomUUID();
  const milestone = {
    id, projectId: req.params.id, title, description,
    dueDate: dueDate || null, status: 'pending',
    createdAt: new Date().toISOString(),
  };
  milestones.set(id, milestone);
  emit('milestone:created', milestone);
  return res.status(201).json(milestone);
});

// ─── Game Achievement Tracking ────────────────────────────────────────────────

/** GET /api/projects/:id/achievements */
router.get('/:id/achievements', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project?.gameDetails) return res.status(400).json({ error: 'Not a game project' });
  return res.json({ achievements: project.gameDetails.achievements || [] });
});

/** POST /api/projects/:id/achievements */
router.post('/:id/achievements', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project?.gameDetails) return res.status(400).json({ error: 'Not a game project' });
  if (project.ownerId !== req.user.id && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { name, description, icon = '🏆', points = 10, unlocked = false } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const achievement = {
    id:          crypto.randomUUID(),
    name, description, icon, points, unlocked,
    createdAt:   new Date().toISOString(),
  };
  project.gameDetails.achievements.push(achievement);
  project.updatedAt = new Date().toISOString();
  projects.set(req.params.id, project);

  return res.status(201).json(achievement);
});

// ─── Project Stats (sync from external sources) ───────────────────────────────

/** POST /api/projects/:id/stats — update build / commit / coverage stats */
router.post('/:id/stats', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!visibleTo(project, req.user.id, req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { commits, openIssues, closedIssues, coverage, buildStatus } = req.body;
  if (commits      !== undefined) project.stats.commits      = commits;
  if (openIssues   !== undefined) project.stats.openIssues   = openIssues;
  if (closedIssues !== undefined) project.stats.closedIssues = closedIssues;
  if (coverage     !== undefined) project.stats.coverage     = coverage;
  if (buildStatus  !== undefined) project.stats.buildStatus  = buildStatus;

  project.updatedAt = new Date().toISOString();
  projects.set(req.params.id, project);
  emit('stats:updated', { id: req.params.id, stats: project.stats });

  return res.json({ stats: project.stats });
});

/** GET /api/projects/summary — quick overview across all projects */
router.get('/summary/all', requireAuth, (req, res) => {
  const userProjects = [...projects.values()].filter(p =>
    visibleTo(p, req.user.id, req.user.role)
  );

  const byType   = {};
  const byStatus = {};

  for (const p of userProjects) {
    byType[p.type]     = (byType[p.type]     || 0) + 1;
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  }

  return res.json({
    total:     userProjects.length,
    byType,
    byStatus,
    recent:    userProjects.slice(-5).reverse(),
  });
});

// ─── Mount helper (called from server.js to wire Socket.IO emitter) ───────────
export function mountRoutes(app, eventEmitter) {
  projectEventEmitter = eventEmitter;
  app.use('/api/projects', router);
}

export default router;

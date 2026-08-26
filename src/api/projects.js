/**
 * NEXUS AI PRO - Project Tracking API
 * File: src/api/projects.js
 * Date: 2026-08-26
 *
 * Real-time project tracking for:
 * - Coding / Software projects
 * - Game Development (with Unreal Engine, Epic, Sony, Microsoft, Ubisoft connectors)
 * - AR/VR projects
 * - 3D projects
 * Achievement and game progress tracking included.
 */

import express from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { auditLog, paginatedResponse, sanitizeInput } from '../utils/helpers.js';

const router = express.Router();

// ─── Project types ─────────────────────────────────────────────────────────────
const PROJECT_TYPES = Object.freeze({
  CODING: 'coding',
  GAME_DEV: 'game_dev',
  ARVR: 'ar_vr',
  THREED: '3d',
  WEB: 'web',
  MOBILE: 'mobile',
  BACKEND: 'backend',
  FULLSTACK: 'fullstack',
  ML_AI: 'ml_ai',
});

// ─── Game engine connectors ────────────────────────────────────────────────────
const GAME_CONNECTORS = Object.freeze({
  UNREAL: 'unreal',
  EPIC: 'epic_games',
  SONY: 'playstation',
  MICROSOFT: 'xbox',
  UBISOFT: 'ubisoft_connect',
  STEAM: 'steam',
  UNITY: 'unity',
});

// ─── Stores ────────────────────────────────────────────────────────────────────
const projectStore = new Map(); // id → project
const achievementStore = new Map(); // userId → achievements[]
const gameProgressStore = new Map(); // userId+gameId → progress
const connectorStore = new Map(); // userId → { connector → config }

// ─── Helpers ───────────────────────────────────────────────────────────────────
function createProject(data, userId) {
  const id = crypto.randomUUID();
  return {
    id,
    ownerId: userId,
    name: sanitizeInput(data.name, { allowEmoji: true, allowSpecial: true, maxLength: 128 }),
    description: sanitizeInput(data.description || '', { allowEmoji: true, allowSpecial: true, maxLength: 2048 }),
    type: PROJECT_TYPES[data.type?.toUpperCase()] || PROJECT_TYPES.CODING,
    status: 'active',
    progress: 0,
    tags: (data.tags || []).map(t => sanitizeInput(t, { maxLength: 64 })).slice(0, 20),
    connectors: [],
    milestones: [],
    tasks: [],
    gameEngine: data.gameEngine || null,
    platform: data.platform || [],
    language: data.language || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metrics: { commits: 0, linesOfCode: 0, openIssues: 0, closedIssues: 0, testCoverage: 0 },
  };
}

// ─── CRUD Routes ───────────────────────────────────────────────────────────────

router.post('/', requireAuth, (req, res) => {
  try {
    const project = createProject(req.body, req.user.sub);
    projectStore.set(project.id, project);
    auditLog('PROJECT_CREATED', { projectId: project.id, type: project.type, userId: req.user.sub });
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', requireAuth, (req, res) => {
  const { type, status, page = 1, pageSize = 20 } = req.query;
  let userProjects = [];

  for (const [, p] of projectStore) {
    if (p.ownerId === req.user.sub) {
      if (type && p.type !== type) continue;
      if (status && p.status !== status) continue;
      userProjects.push(p);
    }
  }

  userProjects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json(paginatedResponse(userProjects, Number(page), Number(pageSize)));
});

router.get('/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(project);
});

router.patch('/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

  const allowed = ['name', 'description', 'status', 'progress', 'tags', 'platform', 'language', 'gameEngine'];
  allowed.forEach(key => {
    if (req.body[key] !== undefined) project[key] = req.body[key];
  });
  project.updatedAt = new Date().toISOString();
  projectStore.set(project.id, project);
  auditLog('PROJECT_UPDATED', { projectId: project.id });
  res.json(project);
});

router.delete('/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  projectStore.delete(req.params.id);
  auditLog('PROJECT_DELETED', { projectId: req.params.id });
  res.json({ message: 'Project deleted' });
});

// ─── Milestones ────────────────────────────────────────────────────────────────
router.post('/:id/milestones', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

  const milestone = {
    id: crypto.randomUUID(),
    title: sanitizeInput(req.body.title, { maxLength: 256 }),
    dueDate: req.body.dueDate || null,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  project.milestones.push(milestone);
  project.updatedAt = new Date().toISOString();
  projectStore.set(project.id, project);
  res.status(201).json(milestone);
});

router.patch('/:id/milestones/:mid', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

  const milestone = project.milestones.find(m => m.id === req.params.mid);
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

  if (req.body.completed !== undefined) milestone.completed = req.body.completed;
  if (req.body.title) milestone.title = sanitizeInput(req.body.title, { maxLength: 256 });
  if (req.body.dueDate !== undefined) milestone.dueDate = req.body.dueDate;
  milestone.updatedAt = new Date().toISOString();

  // Auto-compute overall progress
  const done = project.milestones.filter(m => m.completed).length;
  if (project.milestones.length > 0) {
    project.progress = Math.round((done / project.milestones.length) * 100);
  }
  project.updatedAt = new Date().toISOString();
  projectStore.set(project.id, project);
  res.json(milestone);
});

// ─── Metrics update ────────────────────────────────────────────────────────────
router.post('/:id/metrics', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

  const { commits, linesOfCode, openIssues, closedIssues, testCoverage } = req.body;
  if (commits !== undefined) project.metrics.commits = Number(commits);
  if (linesOfCode !== undefined) project.metrics.linesOfCode = Number(linesOfCode);
  if (openIssues !== undefined) project.metrics.openIssues = Number(openIssues);
  if (closedIssues !== undefined) project.metrics.closedIssues = Number(closedIssues);
  if (testCoverage !== undefined) project.metrics.testCoverage = Math.min(100, Math.max(0, Number(testCoverage)));
  project.updatedAt = new Date().toISOString();
  projectStore.set(project.id, project);
  res.json({ metrics: project.metrics });
});

// ─── Game Engine Connectors ────────────────────────────────────────────────────

router.post('/:id/connectors', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

  const { connector, config = {} } = req.body;
  if (!Object.values(GAME_CONNECTORS).includes(connector)) {
    return res.status(400).json({ error: `Invalid connector. Valid: ${Object.values(GAME_CONNECTORS).join(', ')}` });
  }

  // Config must not contain raw secrets — only references to env var names
  const safeConfig = { connector, configuredAt: new Date().toISOString(), status: 'pending' };
  if (!project.connectors) project.connectors = [];
  const existing = project.connectors.findIndex(c => c.connector === connector);
  if (existing >= 0) {
    project.connectors[existing] = safeConfig;
  } else {
    project.connectors.push(safeConfig);
  }
  project.updatedAt = new Date().toISOString();
  projectStore.set(project.id, project);
  auditLog('CONNECTOR_ADDED', { projectId: project.id, connector });
  res.json({ message: `${connector} connector added`, config: safeConfig });
});

// ─── Achievement Tracking ──────────────────────────────────────────────────────

router.get('/achievements/:userId', requireAuth, (req, res) => {
  if (req.params.userId !== req.user.sub && !['admin', 'dev'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const achievements = achievementStore.get(req.params.userId) || [];
  res.json({ achievements, total: achievements.length });
});

router.post('/achievements/:userId', requireAuth, (req, res) => {
  if (req.params.userId !== req.user.sub && !['admin', 'dev'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const achievements = achievementStore.get(req.params.userId) || [];
  const achievement = {
    id: crypto.randomUUID(),
    title: sanitizeInput(req.body.title, { allowEmoji: true, maxLength: 128 }),
    description: sanitizeInput(req.body.description || '', { allowEmoji: true, maxLength: 512 }),
    game: req.body.game || null,
    platform: req.body.platform || null,
    unlockedAt: new Date().toISOString(),
    xp: Number(req.body.xp) || 0,
    rarity: req.body.rarity || 'common',
  };

  achievements.push(achievement);
  achievementStore.set(req.params.userId, achievements);
  auditLog('ACHIEVEMENT_UNLOCKED', { userId: req.params.userId, achievementId: achievement.id });
  res.status(201).json(achievement);
});

// ─── Game Progress Tracking ────────────────────────────────────────────────────

router.get('/game-progress/:userId', requireAuth, (req, res) => {
  if (req.params.userId !== req.user.sub && !['admin', 'dev'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const allProgress = [];
  for (const [key, val] of gameProgressStore) {
    if (key.startsWith(`${req.params.userId}:`)) {
      allProgress.push(val);
    }
  }
  res.json({ progress: allProgress, total: allProgress.length });
});

router.post('/game-progress/:userId/:gameId', requireAuth, (req, res) => {
  if (req.params.userId !== req.user.sub && !['admin', 'dev'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const key = `${req.params.userId}:${req.params.gameId}`;
  const existing = gameProgressStore.get(key) || { userId: req.params.userId, gameId: req.params.gameId };
  const update = {
    ...existing,
    level: req.body.level ?? existing.level ?? 1,
    score: req.body.score ?? existing.score ?? 0,
    completionPct: req.body.completionPct ?? existing.completionPct ?? 0,
    playTimeHours: req.body.playTimeHours ?? existing.playTimeHours ?? 0,
    lastPlayed: new Date().toISOString(),
    platform: req.body.platform || existing.platform,
  };
  gameProgressStore.set(key, update);
  res.json(update);
});

// ─── Real-time project updates (socket setup) ──────────────────────────────────
export function setupProjectSocket(io) {
  io.on('connection', (socket) => {
    socket.on('project:join', (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('project:update', (data) => {
      const { projectId, update } = data;
      const project = projectStore.get(projectId);
      if (project) {
        Object.assign(project, update, { updatedAt: new Date().toISOString() });
        projectStore.set(projectId, project);
        io.to(`project:${projectId}`).emit('project:changed', project);
      }
    });

    socket.on('project:leave', (projectId) => {
      socket.leave(`project:${projectId}`);
    });
  });
}

export { router as projectsRouter, PROJECT_TYPES, GAME_CONNECTORS };

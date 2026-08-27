/**
 * routes/projects.js
 * Nexus AI Pro — Project Tracker API Routes
 * Date: 2026-08-27
 * Routes: CRUD for projects, game dev connectors, achievements, real-time via WS
 * Connectors: Unreal Engine, Epic Games, Sony PlayStation, Microsoft Xbox, Ubisoft Connect
 * Credentials loaded from environment — never hard-coded
 */

import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ── In-memory store (replace with PostgreSQL + Redis in production) ───────────
const projectsStore = new Map();

// ── Project types & connector configs (env-keyed, no hard-coded tokens) ───────
const CONNECTOR_ENV_KEYS = {
  unreal:    { token:  'UNREAL_ENGINE_TOKEN'           },
  epic:      { id:     'EPIC_GAMES_CLIENT_ID',
               secret: 'EPIC_GAMES_CLIENT_SECRET'      },
  sony:      { token:  'SONY_DEV_TOKEN'                },
  microsoft: { id:     'MICROSOFT_XBOX_CLIENT_ID',
               secret: 'MICROSOFT_XBOX_CLIENT_SECRET'  },
  ubisoft:   { id:     'UBISOFT_CLIENT_ID',
               secret: 'UBISOFT_CLIENT_SECRET'         },
};

function isConnectorReady(key) {
  const cfg = CONNECTOR_ENV_KEYS[key];
  return cfg && Object.values(cfg).every(envKey => !!process.env[envKey]);
}

// ── Sanitize project input ────────────────────────────────────────────────────
function sanitizeProject(raw) {
  const VALID_TYPES    = ['coding', 'game', 'arvr', 'project3d'];
  const VALID_STATUSES = ['planning', 'in-progress', 'review', 'completed', 'on-hold'];
  return {
    name:       String(raw.name   || '').slice(0, 120),
    type:       VALID_TYPES.includes(raw.type)     ? raw.type   : 'coding',
    status:     VALID_STATUSES.includes(raw.status)? raw.status : 'planning',
    dueDate:    raw.dueDate ? String(raw.dueDate).slice(0, 10) : null,
    tags:       Array.isArray(raw.tags) ? raw.tags.slice(0, 10).map(t => String(t).slice(0, 32)) : [],
    connectors: Array.isArray(raw.connectors) ? raw.connectors.filter(c => CONNECTOR_ENV_KEYS[c]) : [],
    description:String(raw.description || '').slice(0, 1000),
  };
}

// ── GET /api/projects ─────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const userProjects = [...projectsStore.values()].filter(p => p.userId === req.user.id);
  return res.json({ projects: userProjects, count: userProjects.length });
});

// ── POST /api/projects ────────────────────────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  const data = sanitizeProject(req.body);
  if (!data.name.trim()) return res.status(400).json({ error: 'Project name is required' });
  const project = {
    id:           crypto.randomUUID(),
    userId:       req.user.id,
    ...data,
    progress:     0,
    tasks:        0,
    tasksDone:    0,
    commits:      0,
    linesChanged: 0,
    achievements: [],
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
    lastActivity: Date.now(),
  };
  projectsStore.set(project.id, project);
  return res.status(201).json({ project });
});

// ── GET /api/projects/:id ─────────────────────────────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }
  return res.json({ project });
});

// ── PUT /api/projects/:id ─────────────────────────────────────────────────────
router.put('/:id', requireAuth, (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const updates = sanitizeProject({ ...project, ...req.body });
  const updated = { ...project, ...updates, id: project.id, userId: project.userId, updatedAt: new Date().toISOString() };
  projectsStore.set(project.id, updated);
  return res.json({ project: updated });
});

// ── DELETE /api/projects/:id ──────────────────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }
  projectsStore.delete(req.params.id);
  return res.json({ message: 'Project deleted' });
});

// ── POST /api/projects/:id/achievements ───────────────────────────────────────
router.post('/:id/achievements', requireAuth, (req, res) => {
  const project = projectsStore.get(req.params.id);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const { title, points = 100 } = req.body;
  if (!title) return res.status(400).json({ error: 'Achievement title required' });
  const ach = { id: crypto.randomUUID(), title: String(title).slice(0, 80), points: Number(points), unlocked: true, unlockedAt: new Date().toISOString() };
  project.achievements.push(ach);
  project.updatedAt = new Date().toISOString();
  projectsStore.set(project.id, project);
  return res.status(201).json({ achievement: ach });
});

// ── GET /api/projects/connectors/status ──────────────────────────────────────
router.get('/connectors/status', requireAuth, (req, res) => {
  const connectors = Object.entries(CONNECTOR_ENV_KEYS).map(([id]) => ({
    id,
    ready:    isConnectorReady(id),
    envKeys:  Object.values(CONNECTOR_ENV_KEYS[id]),
  }));
  return res.json({ connectors });
});

export default router;

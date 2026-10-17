/**
 * routes/gamedev.js
 * Nexus AI Pro — Game Development Tracker API Routes
 * Projects CRUD, achievements, platform connectors, build history
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Updated: 2025-01-17
 * TODO: Replace in-memory Map stores with a proper database (PostgreSQL/Redis)
 */

import { Router }    from 'express';
import { v4 as uuid } from 'uuid';
import { verifyJWT } from '../middleware/auth.js';

const router = Router();

// ── In-memory stores (TODO: replace with DB) ──────────────────────────────────
/** @type {Map<string, object>} projectId → project */
const projects     = new Map();

/** @type {Map<string, object[]>} projectId → achievement[] */
const achievements = new Map();

/** @type {Map<string, object[]>} projectId → build[] */
const builds       = new Map();

// ── Connector config ──────────────────────────────────────────────────────────
const CONNECTORS = [
  { id: 'unreal',  name: 'Unreal Engine',    status: 'pending', configEnvKey: 'UNREAL_ENGINE_API_KEY'  },
  { id: 'epic',    name: 'Epic Games Store', status: 'pending', configEnvKey: 'EPIC_GAMES_API_KEY'     },
  { id: 'unity',   name: 'Unity',            status: 'pending', configEnvKey: 'UNITY_API_KEY'          },
  { id: 'psn',     name: 'PlayStation (PSN)',status: 'pending', configEnvKey: 'PSN_API_KEY'            },
  { id: 'xbox',    name: 'Xbox Live',        status: 'pending', configEnvKey: 'XBOX_LIVE_API_KEY'      },
  { id: 'ubisoft', name: 'Ubisoft Connect', status: 'pending', configEnvKey: 'UBISOFT_API_KEY'        },
];

const connectorStatus = new Map(CONNECTORS.map(c => [c.id, { ...c, lastSync: null }]));

// ── Input helpers ─────────────────────────────────────────────────────────────
const VALID_STATUSES = new Set(['planning', 'in_progress', 'testing', 'shipped']);
const VALID_ENGINES  = new Set(['Unreal Engine', 'Unity', 'Godot', 'CryEngine', 'GameMaker', 'Custom', '']);

function validateProject(body) {
  const errors = [];
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) errors.push('name is required');
  if (body.name?.length > 200) errors.push('name must be ≤ 200 characters');
  if (body.status && !VALID_STATUSES.has(body.status)) errors.push('invalid status');
  if (body.engine && !VALID_ENGINES.has(body.engine)) errors.push('invalid engine');
  if (body.description?.length > 2000) errors.push('description must be ≤ 2000 characters');
  return errors;
}

// ── Projects ──────────────────────────────────────────────────────────────────
// GET /api/gamedev/projects
router.get('/projects', verifyJWT, (req, res) => {
  const userProjects = [...projects.values()].filter(p => p.userId === req.user.userId);
  res.json(userProjects);
});

// POST /api/gamedev/projects
router.post('/projects', verifyJWT, (req, res) => {
  const errors = validateProject(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const project = {
    id:          uuid(),
    userId:      req.user.userId,
    name:        req.body.name.trim(),
    description: req.body.description?.trim() ?? '',
    status:      req.body.status ?? 'planning',
    engine:      req.body.engine ?? '',
    platforms:   Array.isArray(req.body.platforms) ? req.body.platforms.slice(0, 20) : [],
    techStack:   Array.isArray(req.body.techStack)  ? req.body.techStack.slice(0, 30)  : [],
    isVRAR:      Boolean(req.body.isVRAR),
    tasks:       [],
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  projects.set(project.id, project);
  res.status(201).json(project);
});

// PUT /api/gamedev/projects/:id
router.put('/projects/:id', verifyJWT, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project)                          return res.status(404).json({ error: 'Not found' });
  if (project.userId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

  const errors = validateProject({ ...project, ...req.body });
  if (errors.length) return res.status(400).json({ errors });

  const updated = {
    ...project,
    name:        req.body.name?.trim()        ?? project.name,
    description: req.body.description?.trim() ?? project.description,
    status:      req.body.status  ?? project.status,
    engine:      req.body.engine  ?? project.engine,
    platforms:   req.body.platforms  ? req.body.platforms.slice(0, 20)  : project.platforms,
    techStack:   req.body.techStack  ? req.body.techStack.slice(0, 30)  : project.techStack,
    isVRAR:      req.body.isVRAR  !== undefined ? Boolean(req.body.isVRAR) : project.isVRAR,
    updatedAt:   new Date().toISOString(),
  };

  projects.set(project.id, updated);
  res.json(updated);
});

// DELETE /api/gamedev/projects/:id
router.delete('/projects/:id', verifyJWT, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project)                          return res.status(404).json({ error: 'Not found' });
  if (project.userId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

  projects.delete(req.params.id);
  achievements.delete(req.params.id);
  builds.delete(req.params.id);
  res.json({ deleted: true });
});

// ── Achievements ──────────────────────────────────────────────────────────────
// GET /api/gamedev/projects/:id/achievements
router.get('/projects/:id/achievements', verifyJWT, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project)                          return res.status(404).json({ error: 'Not found' });
  if (project.userId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });
  res.json(achievements.get(req.params.id) ?? []);
});

// POST /api/gamedev/projects/:id/achievements
router.post('/projects/:id/achievements', verifyJWT, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project)                          return res.status(404).json({ error: 'Not found' });
  if (project.userId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

  const { name, icon, rarity, completion } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0)
    return res.status(400).json({ error: 'name is required' });

  const ach = {
    id:         uuid(),
    name:       name.trim().slice(0, 200),
    icon:       typeof icon === 'string' ? icon.slice(0, 10) : '🏆',
    rarity:     ['common','rare','epic','legendary'].includes(rarity) ? rarity : 'common',
    completion: typeof completion === 'number' ? Math.min(100, Math.max(0, completion)) : 0,
    createdAt:  new Date().toISOString(),
  };

  const list = achievements.get(req.params.id) ?? [];
  list.push(ach);
  achievements.set(req.params.id, list);
  res.status(201).json(ach);
});

// ── Connectors ────────────────────────────────────────────────────────────────
// GET /api/gamedev/connectors
router.get('/connectors', verifyJWT, (req, res) => {
  const list = [...connectorStatus.values()].map(c => ({
    id:       c.id,
    name:     c.name,
    status:   process.env[c.configEnvKey] ? 'connected' : 'pending',
    lastSync: c.lastSync,
  }));
  res.json(list);
});

// POST /api/gamedev/connectors/:name/sync
router.post('/connectors/:name/sync', verifyJWT, (req, res) => {
  const connector = connectorStatus.get(req.params.name);
  if (!connector) return res.status(404).json({ error: 'Unknown connector' });

  // TODO: Implement real sync using platform SDKs + process.env[connector.configEnvKey]
  const updated = { ...connector, lastSync: new Date().toISOString(), status: 'connected' };
  connectorStatus.set(req.params.name, updated);

  res.json({ success: true, connector: req.params.name, lastSync: updated.lastSync });
});

// ── Build history ─────────────────────────────────────────────────────────────
// GET /api/gamedev/projects/:id/builds
router.get('/projects/:id/builds', verifyJWT, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project)                          return res.status(404).json({ error: 'Not found' });
  if (project.userId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });
  res.json(builds.get(req.params.id) ?? []);
});

export default router;

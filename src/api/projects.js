// src/api/projects.js
// 2026-10-23 - Project tracking API for game/AR/VR/3D/coding projects
// Engine connector keys from process.env

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── Valid enumerations ───────────────────────────────────────────────────────
const PROJECT_TYPES    = ['web', 'mobile', 'game', 'ar_vr', '3d', 'ai', 'other'];
const GAME_ENGINES     = ['unreal', 'unity', 'godot', 'custom'];
const GAME_PLATFORMS   = ['pc', 'console', 'mobile', 'vr', 'multi'];
const PROJECT_STATUSES = ['planning', 'dev', 'testing', 'shipped', 'archived'];
const AR_HEADSETS      = ['quest', 'vision_pro', 'psvr2', 'index', 'other'];
const RENDER_ENGINES   = ['blender', 'cinema4d', 'unreal', 'unity', 'other'];

// ─── External connector status ────────────────────────────────────────────────
const CONNECTORS = {
  epic_games:  { name: 'Epic Games / Unreal',  envKey: 'EPIC_API_KEY' },
  playstation: { name: 'Sony PlayStation',     envKey: 'SONY_API_KEY' },
  xbox:        { name: 'Microsoft Xbox',       envKey: 'XBOX_API_KEY' },
  ubisoft:     { name: 'Ubisoft Connect',      envKey: 'UBISOFT_API_KEY' },
};

// ─── In-memory stores ─────────────────────────────────────────────────────────
/** @type {Map<string, object>} projectId → project */
const projects = new Map();

/** @type {Map<string, object[]>} projectId → achievements */
const achievements = new Map();

/** @type {Map<string, object[]>} projectId → builds */
const builds = new Map();

// ─── Socket reference ─────────────────────────────────────────────────────────
let _io = null;
export function setIo(io) { _io = io; }

function emitUpdate(event, data) {
  if (_io) _io.emit(event, data);
}

// ─── Route helpers ────────────────────────────────────────────────────────────
function validateProject(body) {
  const { name, type } = body;
  if (!name || typeof name !== 'string' || name.trim().length < 1) return 'Project name required';
  if (!PROJECT_TYPES.includes(type)) return `type must be one of: ${PROJECT_TYPES.join(', ')}`;
  if (type === 'game' && body.engine && !GAME_ENGINES.includes(body.engine)) return 'Invalid game engine';
  return null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/projects */
router.get('/', (req, res) => {
  const { type, status } = req.query;
  let list = Array.from(projects.values()).filter(p => p.ownerId === req.user.id);
  if (type && PROJECT_TYPES.includes(type)) list = list.filter(p => p.type === type);
  if (status && PROJECT_STATUSES.includes(status)) list = list.filter(p => p.status === status);
  res.json(list);
});

/** POST /api/projects */
router.post('/', (req, res) => {
  const err = validateProject(req.body);
  if (err) return res.status(400).json({ error: err });

  const id = uuidv4();
  const project = {
    id,
    ownerId: req.user.id,
    name: req.body.name.trim(),
    type: req.body.type,
    status: 'planning',
    description: req.body.description || '',
    engine: req.body.type === 'game' ? (req.body.engine || 'custom') : null,
    gamePlatform: req.body.type === 'game' ? (req.body.gamePlatform || 'pc') : null,
    arHeadsets: req.body.type === 'ar_vr' ? (req.body.arHeadsets || []) : null,
    renderEngine: req.body.type === '3d' ? (req.body.renderEngine || 'other') : null,
    milestones: req.body.milestones || [],
    tags: req.body.tags || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  projects.set(id, project);
  achievements.set(id, []);
  builds.set(id, []);

  emitUpdate('project:update', { action: 'created', project });
  res.status(201).json(project);
});

/** GET /api/projects/:id */
router.get('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  res.json({
    ...project,
    achievements: achievements.get(req.params.id) || [],
    builds: (builds.get(req.params.id) || []).slice(-20),
  });
});

/** PATCH /api/projects/:id */
router.patch('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const allowed = ['name', 'description', 'status', 'engine', 'gamePlatform', 'arHeadsets', 'renderEngine', 'milestones', 'tags'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) project[key] = req.body[key];
  }
  if (req.body.status && !PROJECT_STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  project.updatedAt = Date.now();

  emitUpdate('project:update', { action: 'updated', project });
  res.json(project);
});

/** DELETE /api/projects/:id */
router.delete('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  projects.delete(req.params.id);
  emitUpdate('project:update', { action: 'deleted', projectId: req.params.id });
  res.json({ message: 'Project deleted' });
});

// ─── Achievements ─────────────────────────────────────────────────────────────

/** POST /api/projects/:id/achievements */
router.post('/:id/achievements', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const { name, description, icon, points } = req.body;
  if (!name) return res.status(400).json({ error: 'Achievement name required' });

  const achievement = {
    id: uuidv4(),
    projectId: req.params.id,
    name,
    description: description || '',
    icon: icon || '🏆',
    points: Math.min(Math.max(Number(points) || 10, 1), 1000),
    unlockedBy: [],
    createdAt: Date.now(),
  };

  achievements.get(req.params.id).push(achievement);
  emitUpdate('project:update', { action: 'achievement_created', achievement });
  res.status(201).json(achievement);
});

/** POST /api/projects/:id/achievements/:achId/unlock */
router.post('/:id/achievements/:achId/unlock', (req, res) => {
  const projectAchs = achievements.get(req.params.id);
  if (!projectAchs) return res.status(404).json({ error: 'Project not found' });

  const ach = projectAchs.find(a => a.id === req.params.achId);
  if (!ach) return res.status(404).json({ error: 'Achievement not found' });

  const userId = req.user.id;
  if (!ach.unlockedBy.includes(userId)) {
    ach.unlockedBy.push(userId);
    ach.unlockedAt = Date.now();
    emitUpdate('project:update', { action: 'achievement_unlocked', achievement: ach, userId });
  }
  res.json(ach);
});

// ─── Builds ───────────────────────────────────────────────────────────────────

/** POST /api/projects/:id/builds */
router.post('/:id/builds', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const { version, platform, status, notes } = req.body;
  if (!version) return res.status(400).json({ error: 'Build version required' });

  const build = {
    id: uuidv4(),
    projectId: req.params.id,
    version,
    platform: platform || 'all',
    status: status || 'building',
    notes: notes || '',
    triggeredBy: req.user.id,
    createdAt: Date.now(),
  };

  builds.get(req.params.id).push(build);
  if (builds.get(req.params.id).length > 100) builds.get(req.params.id).shift();

  emitUpdate('project:build', { build });
  res.status(201).json(build);
});

// ─── Connector status ─────────────────────────────────────────────────────────

/** GET /api/projects/connectors/status */
router.get('/connectors/status', (req, res) => {
  const status = Object.entries(CONNECTORS).map(([key, c]) => ({
    key,
    name: c.name,
    connected: !!process.env[c.envKey],
  }));
  res.json(status);
});

export default router;

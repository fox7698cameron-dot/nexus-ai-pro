// server/routes/projects.js
// 2026-06-06 | Real-time project tracking: coding, game dev, AR/VR, 3D projects
// Connectors: Unreal/Epic, Sony PSN, Xbox/Microsoft, Ubisoft Connect
// Achievement and game progress tracking

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

const projectStore = new Map(); // userId → projects[]
const achievementStore = new Map(); // userId → achievements[]
const gameProgressStore = new Map(); // userId → gameProgress{}

const PROJECT_TYPES = ['coding', 'game', 'ar', 'vr', 'ar_vr', '3d', 'unreal', 'unity', 'godot'];
const GAME_ENGINES = ['unreal', 'unity', 'godot', 'cryengine', 'rpgmaker', 'construct3', 'gms2', 'cocos2d', 'pygame', 'custom'];

// ─── Projects ───────────────────────────────────────────────────────────────

// GET /api/projects
router.get('/', authenticate, (req, res) => {
  const { type, status } = req.query;
  let projects = projectStore.get(req.user.id) || [];
  if (type) projects = projects.filter(p => p.type === type);
  if (status) projects = projects.filter(p => p.status === status);
  res.json({ projects, total: projects.length });
});

// POST /api/projects
router.post('/', authenticate, (req, res) => {
  const { name, type, description, engine, platform, tags, milestones } = req.body;

  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  if (!PROJECT_TYPES.includes(type)) return res.status(400).json({ error: `Invalid type. Supported: ${PROJECT_TYPES.join(', ')}` });

  const project = {
    id: uuidv4(),
    userId: req.user.id,
    name,
    type,
    description: description || '',
    engine: engine || null,
    platform: platform || [],
    tags: tags || [],
    status: 'active',
    progress: 0,
    milestones: (milestones || []).map(m => ({ ...m, id: uuidv4(), completed: false })),
    commits: 0,
    linesOfCode: 0,
    buildStatus: 'unknown',
    lastBuildAt: null,
    collaborators: [req.user.id],
    connectors: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const userProjects = projectStore.get(req.user.id) || [];
  userProjects.push(project);
  projectStore.set(req.user.id, userProjects);

  res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', authenticate, (req, res) => {
  const projects = projectStore.get(req.user.id) || [];
  const project = projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// PUT /api/projects/:id
router.put('/:id', authenticate, (req, res) => {
  const projects = projectStore.get(req.user.id) || [];
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });

  const allowed = ['name', 'description', 'status', 'progress', 'engine', 'platform', 'tags', 'milestones', 'commits', 'linesOfCode', 'buildStatus'];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }

  projects[idx] = { ...projects[idx], ...updates, updatedAt: Date.now() };
  projectStore.set(req.user.id, projects);

  res.json(projects[idx]);
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, (req, res) => {
  let projects = projectStore.get(req.user.id) || [];
  const before = projects.length;
  projects = projects.filter(p => p.id !== req.params.id);
  projectStore.set(req.user.id, projects);
  if (projects.length === before) return res.status(404).json({ error: 'Project not found' });
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:id/milestone/:milestoneId/complete
router.post('/:id/milestone/:milestoneId/complete', authenticate, (req, res) => {
  const projects = projectStore.get(req.user.id) || [];
  const project = projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const ms = (project.milestones || []).find(m => m.id === req.params.milestoneId);
  if (!ms) return res.status(404).json({ error: 'Milestone not found' });

  ms.completed = true;
  ms.completedAt = Date.now();

  const completed = project.milestones.filter(m => m.completed).length;
  project.progress = Math.round((completed / project.milestones.length) * 100);
  project.updatedAt = Date.now();

  res.json({ project, milestone: ms });
});

// ─── Game Engine Connectors ──────────────────────────────────────────────────

// POST /api/projects/:id/connect/:service
// service: unreal | epic | playstation | xbox | ubisoft
router.post('/:id/connect/:service', authenticate, (req, res) => {
  const SUPPORTED_SERVICES = ['unreal', 'epic', 'playstation', 'xbox', 'ubisoft', 'steam', 'gog', 'itch'];
  const { service } = req.params;

  if (!SUPPORTED_SERVICES.includes(service)) {
    return res.status(400).json({ error: `Unsupported service. Supported: ${SUPPORTED_SERVICES.join(', ')}` });
  }

  const projects = projectStore.get(req.user.id) || [];
  const project = projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { accountId, projectId: externalId } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });

  // In production: store encrypted OAuth token, verify via platform API
  project.connectors[service] = {
    connected: true,
    accountId,
    externalId: externalId || null,
    connectedAt: Date.now()
  };
  project.updatedAt = Date.now();

  res.json({ message: `Connected to ${service}`, connector: project.connectors[service] });
});

// ─── Achievements ────────────────────────────────────────────────────────────

// GET /api/projects/achievements/:platform
router.get('/achievements/:platform', authenticate, (req, res) => {
  const { platform } = req.params;
  const userAchievements = achievementStore.get(req.user.id) || {};
  res.json({ platform, achievements: userAchievements[platform] || [] });
});

// POST /api/projects/achievements/sync
router.post('/achievements/sync', authenticate, (req, res) => {
  const { platform, achievements } = req.body;
  if (!platform || !Array.isArray(achievements)) {
    return res.status(400).json({ error: 'platform and achievements array required' });
  }

  const userAchievements = achievementStore.get(req.user.id) || {};
  userAchievements[platform] = achievements.map(a => ({
    ...a,
    id: a.id || uuidv4(),
    syncedAt: Date.now()
  }));
  achievementStore.set(req.user.id, userAchievements);

  res.json({ message: `Synced ${achievements.length} achievements for ${platform}`, count: achievements.length });
});

// GET /api/projects/game-progress/:gameId
router.get('/game-progress/:gameId', authenticate, (req, res) => {
  const userProgress = gameProgressStore.get(req.user.id) || {};
  const progress = userProgress[req.params.gameId];
  if (!progress) return res.status(404).json({ error: 'No progress found for this game' });
  res.json({ gameId: req.params.gameId, progress });
});

// POST /api/projects/game-progress/:gameId
router.post('/game-progress/:gameId', authenticate, (req, res) => {
  const { platform, completionPercent, playtime, level, checkpoints, achievements } = req.body;
  const userProgress = gameProgressStore.get(req.user.id) || {};

  userProgress[req.params.gameId] = {
    gameId: req.params.gameId,
    platform: platform || 'unknown',
    completionPercent: completionPercent || 0,
    playtime: playtime || 0,
    level: level || 1,
    checkpoints: checkpoints || [],
    achievements: achievements || [],
    updatedAt: Date.now()
  };

  gameProgressStore.set(req.user.id, userProgress);
  res.json({ gameId: req.params.gameId, progress: userProgress[req.params.gameId] });
});

// GET /api/projects/stats/summary
router.get('/stats/summary', authenticate, (req, res) => {
  const projects = projectStore.get(req.user.id) || [];
  const byType = {};
  for (const p of projects) {
    byType[p.type] = (byType[p.type] || 0) + 1;
  }

  res.json({
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    byType,
    totalCommits: projects.reduce((s, p) => s + (p.commits || 0), 0),
    totalLinesOfCode: projects.reduce((s, p) => s + (p.linesOfCode || 0), 0),
    avgProgress: projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0
  });
});

export default router;

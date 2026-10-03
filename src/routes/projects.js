// src/routes/projects.js
// Date: 2026-10-03
// Real-time project tracking: coding, game dev, AR/VR/3D

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = express.Router();

const projects = new Map();
const milestones = new Map();

const PROJECT_TYPES = ['coding', 'game', 'ar', 'vr', '3d', 'mobile', 'web', 'desktop'];
const ENGINES = ['unreal', 'unity', 'godot', 'o3de', 'webxr', 'threejs', 'blender', 'maya', 'custom'];
const CONNECTORS = {
  unreal:    { name: 'Unreal Engine',  envKey: 'UNREAL_API_KEY',    docs: 'https://docs.unrealengine.com/5.0/en-US/remote-control-api-for-unreal-engine/' },
  epic:      { name: 'Epic Games',     envKey: 'EPIC_CLIENT_ID',    docs: 'https://dev.epicgames.com/docs' },
  sony:      { name: 'Sony PS Network',envKey: 'PSN_CLIENT_ID',     docs: 'https://ps4.siedev.net' },
  microsoft: { name: 'Xbox Live',      envKey: 'XBOX_CLIENT_ID',    docs: 'https://developer.microsoft.com/en-us/games/xbox' },
  ubisoft:   { name: 'Ubisoft Connect',envKey: 'UBISOFT_APP_ID',    docs: 'https://ubisoftconnect.com/developer' }
};

// POST /api/projects  — create project
router.post('/', requireAuth, (req, res) => {
  const { name, type, engine, description, tags = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  if (type && !PROJECT_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid project type', valid: PROJECT_TYPES });
  }

  const id = uuidv4();
  const project = {
    id, name, type: type || 'coding', engine, description, tags,
    userId: req.user.sub,
    status: 'active',
    progress: 0,
    commits: 0,
    linesOfCode: 0,
    bugsOpen: 0,
    bugsClosed: 0,
    testsTotal: 0,
    testsPassing: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    milestones: [],
    connectors: []
  };
  projects.set(id, project);
  res.status(201).json(project);
});

// GET /api/projects  — list user projects
router.get('/', requireAuth, (req, res) => {
  const userProjects = [...projects.values()].filter(p => p.userId === req.user.sub);
  res.json(userProjects);
});

// GET /api/projects/:id
router.get('/:id', requireAuth, (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });
  res.json(p);
});

// PUT /api/projects/:id  — update metrics
router.put('/:id', requireAuth, (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const allowed = ['name', 'description', 'status', 'progress', 'commits', 'linesOfCode',
    'bugsOpen', 'bugsClosed', 'testsTotal', 'testsPassing', 'tags'];
  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const updated = { ...p, ...update, updatedAt: Date.now() };
  projects.set(req.params.id, updated);
  res.json(updated);
});

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });
  projects.delete(req.params.id);
  res.json({ success: true });
});

// POST /api/projects/:id/milestones
router.post('/:id/milestones', requireAuth, (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const { title, description, dueDate, priority = 'medium' } = req.body;
  if (!title) return res.status(400).json({ error: 'Milestone title required' });

  const id = uuidv4();
  const milestone = {
    id, title, description,
    dueDate: dueDate ? new Date(dueDate).getTime() : null,
    priority,
    status: 'pending',
    projectId: req.params.id,
    createdAt: Date.now()
  };
  milestones.set(id, milestone);
  p.milestones.push(id);
  projects.set(req.params.id, p);
  res.status(201).json(milestone);
});

// GET /api/projects/:id/milestones
router.get('/:id/milestones', requireAuth, (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });
  const list = (p.milestones || []).map(mid => milestones.get(mid)).filter(Boolean);
  res.json(list);
});

// GET /api/projects/connectors/list  — game engine connectors
router.get('/connectors/list', requireAuth, (req, res) => {
  const status = Object.entries(CONNECTORS).map(([id, c]) => ({
    id,
    name: c.name,
    connected: !!process.env[c.envKey],
    envVar: c.envKey,
    docs: c.docs
  }));
  res.json(status);
});

// POST /api/projects/:id/connectors/:connector  — link game engine
router.post('/:id/connectors/:connector', requireAuth, (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const connector = req.params.connector;
  if (!CONNECTORS[connector]) {
    return res.status(400).json({ error: 'Unknown connector', available: Object.keys(CONNECTORS) });
  }

  const c = CONNECTORS[connector];
  const isConfigured = !!process.env[c.envKey];
  if (!isConfigured) {
    return res.status(400).json({
      error: `${c.name} not configured`,
      message: `Set ${c.envKey} environment variable to enable this connector`
    });
  }

  if (!p.connectors.includes(connector)) {
    p.connectors.push(connector);
    projects.set(req.params.id, p);
  }
  res.json({ success: true, connector: c.name, projectId: req.params.id });
});

// GET /api/projects/:id/achievements  — game achievement tracking
router.get('/:id/achievements', requireAuth, (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  res.json({
    projectId: req.params.id,
    achievements: [
      { id: 'first_commit',   name: 'First Commit',        unlocked: p.commits > 0,    unlockedAt: p.createdAt,    platform: 'all' },
      { id: 'hundred_lines',  name: '100 Lines of Code',   unlocked: p.linesOfCode >= 100, platform: 'all' },
      { id: 'bug_squasher',   name: 'Bug Squasher',        unlocked: p.bugsClosed >= 10,   platform: 'all' },
      { id: 'milestone_done', name: 'First Milestone',     unlocked: p.milestones.length > 0, platform: 'all' },
      { id: 'ps_trophy',      name: 'PlayStation Trophy',  unlocked: false, platform: 'sony',   requiresConnector: 'sony' },
      { id: 'xbox_achieve',   name: 'Xbox Achievement',    unlocked: false, platform: 'microsoft', requiresConnector: 'microsoft' },
      { id: 'epic_challenge', name: 'Epic Challenge',      unlocked: false, platform: 'epic',   requiresConnector: 'epic' }
    ],
    gameProgress: {
      level: Math.floor(p.commits / 10) + 1,
      xp: p.commits * 100 + p.linesOfCode,
      rank: p.commits > 100 ? 'Senior Dev' : p.commits > 50 ? 'Mid Dev' : 'Junior Dev'
    }
  });
});

export default router;

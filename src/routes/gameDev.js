// src/routes/gameDev.js
// 2026-07-22 | Game development tracking — projects, achievements, connectors (Unreal, Epic, Sony, MS, Ubisoft)

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ─── Stores ───────────────────────────────────────────────────────────────────

const projects = new Map();       // projectId → project
const achievements = new Map();   // achievementId → achievement
const userProjects = new Map();   // userId → Set<projectId>
const connectorTokens = new Map(); // userId:platform → encryptedToken

// ─── Supported connectors ─────────────────────────────────────────────────────

export const GAME_CONNECTORS = {
  unreal: { name: 'Unreal Engine', company: 'Epic Games', authType: 'oauth2' },
  epic:   { name: 'Epic Games Store', company: 'Epic Games', authType: 'oauth2' },
  sony:   { name: 'PlayStation Network', company: 'Sony Interactive', authType: 'oauth2' },
  xbox:   { name: 'Xbox / Microsoft', company: 'Microsoft', authType: 'oauth2' },
  ubisoft:{ name: 'Ubisoft Connect', company: 'Ubisoft', authType: 'oauth2' },
  steam:  { name: 'Steam', company: 'Valve', authType: 'api_key' },
  unity:  { name: 'Unity Cloud', company: 'Unity Technologies', authType: 'api_key' },
  godot:  { name: 'Godot', company: 'Open Source', authType: 'none' },
  itch:   { name: 'itch.io', company: 'itch.io', authType: 'api_key' },
};

export const PROJECT_TYPES = ['game', 'vr', 'ar', 'xr', '3d', 'mobile_game', 'indie', 'aaa', 'mod'];
export const PLATFORMS = ['pc', 'playstation', 'xbox', 'nintendo', 'mobile', 'vr', 'web', 'streaming'];
export const ENGINES = ['unreal', 'unity', 'godot', 'gamemaker', 'cryengine', 'custom', 'bevy', 'o3de'];

// ─── Projects CRUD ────────────────────────────────────────────────────────────

router.post('/projects', authenticate, (req, res) => {
  const {
    name, description, type = 'game', engine, targetPlatforms = [],
    genre, teamSize = 1, startDate, targetReleaseDate,
  } = req.body;

  if (!name) return res.status(400).json({ error: 'Project name required' });
  if (!PROJECT_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Use: ${PROJECT_TYPES.join(', ')}` });
  }

  const id = uuidv4();
  const project = {
    id,
    userId: req.user.sub,
    name,
    description,
    type,
    engine,
    targetPlatforms,
    genre,
    teamSize,
    startDate,
    targetReleaseDate,
    status: 'planning',
    progress: 0,
    milestones: [],
    builds: [],
    connectors: [],
    metrics: { bugsOpen: 0, bugsClosed: 0, commits: 0, linesOfCode: 0, testCoverage: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  projects.set(id, project);
  if (!userProjects.has(req.user.sub)) userProjects.set(req.user.sub, new Set());
  userProjects.get(req.user.sub).add(id);

  return res.status(201).json(project);
});

router.get('/projects', authenticate, (req, res) => {
  const ids = userProjects.get(req.user.sub) || new Set();
  const list = [...ids].map(id => projects.get(id)).filter(Boolean);
  return res.json({ projects: list, total: list.length });
});

router.get('/projects/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.sub && !['admin', 'dev'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  return res.json(project);
});

router.patch('/projects/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

  const allowed = [
    'name', 'description', 'status', 'progress', 'engine',
    'targetPlatforms', 'genre', 'teamSize', 'targetReleaseDate',
  ];
  for (const key of allowed) {
    if (key in req.body) project[key] = req.body[key];
  }
  if (req.body.metrics) {
    Object.assign(project.metrics, req.body.metrics);
  }
  project.updatedAt = new Date().toISOString();
  projects.set(project.id, project);
  return res.json(project);
});

router.delete('/projects/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  projects.delete(req.params.id);
  userProjects.get(req.user.sub)?.delete(req.params.id);
  return res.json({ success: true });
});

// ─── Milestones ───────────────────────────────────────────────────────────────

router.post('/projects/:id/milestones', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });

  const milestone = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description,
    dueDate: req.body.dueDate,
    completed: false,
    completedAt: null,
  };
  project.milestones.push(milestone);
  project.updatedAt = new Date().toISOString();
  projects.set(project.id, project);
  return res.status(201).json(milestone);
});

router.patch('/projects/:id/milestones/:milestoneId', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  const m = project.milestones.find(m => m.id === req.params.milestoneId);
  if (!m) return res.status(404).json({ error: 'Milestone not found' });
  if (typeof req.body.completed === 'boolean') {
    m.completed = req.body.completed;
    m.completedAt = req.body.completed ? new Date().toISOString() : null;
  }
  if (req.body.name) m.name = req.body.name;
  project.updatedAt = new Date().toISOString();
  projects.set(project.id, project);
  return res.json(m);
});

// ─── Achievements ─────────────────────────────────────────────────────────────

router.post('/achievements', authenticate, (req, res) => {
  const { projectId, name, description, points = 10, hidden = false, platform } = req.body;
  const project = projects.get(projectId);
  if (!project || project.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const id = uuidv4();
  const achievement = {
    id, projectId, userId: req.user.sub,
    name, description, points, hidden, platform,
    unlocked: false, unlockedAt: null,
    iconUrl: req.body.iconUrl || null,
    createdAt: new Date().toISOString(),
  };
  achievements.set(id, achievement);
  return res.status(201).json(achievement);
});

router.get('/achievements', authenticate, (req, res) => {
  const { projectId } = req.query;
  const list = [...achievements.values()].filter(a => {
    if (a.userId !== req.user.sub) return false;
    if (projectId && a.projectId !== projectId) return false;
    return true;
  });
  return res.json({ achievements: list, total: list.length });
});

router.post('/achievements/:id/unlock', authenticate, (req, res) => {
  const a = achievements.get(req.params.id);
  if (!a || a.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  if (a.unlocked) return res.status(409).json({ error: 'Already unlocked' });
  a.unlocked = true;
  a.unlockedAt = new Date().toISOString();
  achievements.set(a.id, a);
  return res.json(a);
});

// ─── Game connectors ──────────────────────────────────────────────────────────

router.get('/connectors', authenticate, (req, res) => {
  return res.json({ connectors: GAME_CONNECTORS });
});

router.post('/connectors/:platform/connect', authenticate, (req, res) => {
  const { platform } = req.params;
  if (!GAME_CONNECTORS[platform]) {
    return res.status(400).json({ error: `Unknown connector. Use: ${Object.keys(GAME_CONNECTORS).join(', ')}` });
  }
  const connector = GAME_CONNECTORS[platform];

  // OAuth flow: in production return the OAuth redirect URL.
  // For api_key platforms, store the key encrypted.
  if (connector.authType === 'api_key') {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'apiKey required for this platform' });
    // Store reference (never log or expose the key itself)
    connectorTokens.set(`${req.user.sub}:${platform}`, { stored: true, platform });
    return res.json({ connected: true, platform, authType: 'api_key' });
  }

  // OAuth2: return authorization URL
  const state = `${req.user.sub}:${platform}:${Date.now()}`;
  const oauthUrls = {
    epic:    'https://www.epicgames.com/id/authorize',
    unreal:  'https://www.epicgames.com/id/authorize',
    sony:    'https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorize',
    xbox:    'https://login.live.com/oauth20_authorize.srf',
    ubisoft: 'https://connect.ubisoft.com/authorize',
  };
  const redirectUri = `${process.env.APP_URL || 'https://nexusai.pro'}/api/gamedev/connectors/${platform}/callback`;
  const authUrl = `${oauthUrls[platform]}?client_id=${process.env[`${platform.toUpperCase()}_CLIENT_ID`] || 'CONFIGURE_ME'}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}&scope=basic`;

  return res.json({ authUrl, platform, state });
});

router.get('/connectors/:platform/callback', (req, res) => {
  const { code, state } = req.query;
  const { platform } = req.params;
  if (!code || !state) return res.status(400).json({ error: 'Missing OAuth params' });
  // Exchange code for token — production: call platform token endpoint, encrypt, store in DB
  connectorTokens.set(`${state.split(':')[0]}:${platform}`, { connected: true, platform });
  return res.redirect(`/?connected=${platform}`);
});

router.get('/connectors/status', authenticate, (req, res) => {
  const status = {};
  for (const platform of Object.keys(GAME_CONNECTORS)) {
    status[platform] = connectorTokens.has(`${req.user.sub}:${platform}`);
  }
  return res.json({ status });
});

router.delete('/connectors/:platform', authenticate, (req, res) => {
  connectorTokens.delete(`${req.user.sub}:${req.params.platform}`);
  return res.json({ success: true });
});

// ─── AR/VR/3D project tracking ────────────────────────────────────────────────

router.get('/projects/:id/arvr', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!['vr', 'ar', 'xr', '3d'].includes(project.type)) {
    return res.status(400).json({ error: 'Project is not VR/AR/3D type' });
  }
  return res.json({
    id: project.id,
    name: project.name,
    type: project.type,
    xrMetrics: project.xrMetrics || {
      polyCount: 0,
      textureMemoryMB: 0,
      shaderComplexity: 'low',
      frameRateTarget: 72,
      latencyMs: 0,
      fovDegrees: 110,
      renderPipeline: 'forward',
      supportedHeadsets: [],
    },
  });
});

router.patch('/projects/:id/arvr', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  project.xrMetrics = { ...(project.xrMetrics || {}), ...req.body };
  project.updatedAt = new Date().toISOString();
  projects.set(project.id, project);
  return res.json({ success: true, xrMetrics: project.xrMetrics });
});

// ─── Real-time game progress sync (Socket.IO pushes from server) ──────────────
// See server.js for Socket.IO event registration.

export default router;

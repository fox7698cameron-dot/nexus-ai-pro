// ================================================
// routes/gamedev.js
// Game Development & AR/VR/3D Project Tracking API
// Connectors: Unreal/Epic, Sony, Microsoft, Ubisoft, Steam
// Real-time build monitoring, achievement tracking
// Date: 2026-08-22
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// ================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = Router();

// In-memory stores (replace with DB/Redis in production)
const projects = new Map();
const builds = new Map();
const achievements = new Map();
const platformConnections = new Map();

// ─── Platform Definitions ────────────────────────────────────────────────────
const PLATFORMS = {
  epic: {
    name: 'Unreal / Epic Games',
    envVars: ['EPIC_CLIENT_ID', 'EPIC_CLIENT_SECRET'],
    apiBase: 'https://api.epicgames.com',
    projectTypes: ['UE5', 'UE4', 'Fortnite Creative'],
  },
  sony: {
    name: 'Sony / PlayStation',
    envVars: ['SONY_PARTNER_ID', 'SONY_API_KEY'],
    apiBase: 'https://devnet.playstation.com',
    projectTypes: ['PS5', 'PS4', 'PSVR2'],
  },
  microsoft: {
    name: 'Microsoft / Xbox',
    envVars: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_TENANT_ID'],
    apiBase: 'https://developer.microsoft.com/en-us/games',
    projectTypes: ['Xbox Series X|S', 'Xbox One', 'PC (Game Pass)'],
  },
  ubisoft: {
    name: 'Ubisoft Connect',
    envVars: ['UBISOFT_APP_ID', 'UBISOFT_API_KEY'],
    apiBase: 'https://connect.ubisoft.com',
    projectTypes: ['PC', 'Console'],
  },
  steam: {
    name: 'Steam / Valve',
    envVars: ['STEAM_PUBLISHER_KEY'],
    apiBase: 'https://partner.steam-api.com',
    projectTypes: ['PC', 'Steam Deck', 'VR'],
  },
  meta: {
    name: 'Meta / Quest',
    envVars: ['META_APP_ID', 'META_APP_SECRET'],
    apiBase: 'https://graph.oculus.com',
    projectTypes: ['Meta Quest 3', 'Meta Quest 2', 'Rift'],
  },
};

// ─── Project Types ───────────────────────────────────────────────────────────
const PROJECT_TYPES = {
  game: 'Game Development',
  app: 'App Development',
  arvr: 'AR/VR/3D',
  coding: 'Coding Project',
  engine: 'Game Engine',
  tool: 'Dev Tool',
};

// ─── Mock data generators ────────────────────────────────────────────────────
function mockBuildStatus(projectId) {
  const statuses = ['success', 'running', 'failed', 'queued', 'cancelled'];
  const platforms = ['PC', 'PS5', 'Xbox Series X', 'Nintendo Switch', 'iOS', 'Android', 'VR'];
  return platforms.map(p => ({
    platform: p,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    duration: Math.floor(Math.random() * 600 + 60),
    timestamp: Date.now() - Math.floor(Math.random() * 3600000),
    artifacts: Math.floor(Math.random() * 50),
    errorCount: Math.floor(Math.random() * 5),
    warningCount: Math.floor(Math.random() * 20),
  }));
}

function mockPerformanceMetrics() {
  return {
    fps: { current: 60 + Math.random() * 30, target: 90, platform: 'PC' },
    frameTime: (1000 / (60 + Math.random() * 30)).toFixed(2),
    drawCalls: Math.floor(Math.random() * 2000 + 500),
    triangles: Math.floor(Math.random() * 2000000 + 500000),
    textureMemory: Math.floor(Math.random() * 4096 + 1024),
    gpuMemory: Math.floor(Math.random() * 8192 + 2048),
    cpuTime: (Math.random() * 10 + 2).toFixed(2),
    gpuTime: (Math.random() * 15 + 3).toFixed(2),
    shaderCount: Math.floor(Math.random() * 5000 + 1000),
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/gamedev/platforms - List available platform connectors
router.get('/platforms', (req, res) => {
  const result = Object.entries(PLATFORMS).map(([id, cfg]) => ({
    id,
    name: cfg.name,
    connected: cfg.envVars.every(v => process.env[v] && !process.env[v].includes('placeholder')),
    projectTypes: cfg.projectTypes,
    requiredEnvVars: cfg.envVars,
  }));
  res.json({ platforms: result });
});

// POST /api/gamedev/platforms/:platform/connect
router.post('/platforms/:platform/connect', requireAuth, async (req, res) => {
  const { platform } = req.params;
  const cfg = PLATFORMS[platform];
  if (!cfg) return res.status(400).json({ error: `Unknown platform: ${platform}` });

  const missing = cfg.envVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    return res.status(400).json({
      error: `Platform credentials not configured`,
      missingEnvVars: missing,
      message: `Set ${missing.join(', ')} in your .env file`,
    });
  }

  const connKey = `${req.user.sub}:${platform}`;
  platformConnections.set(connKey, {
    userId: req.user.sub,
    platform,
    connectedAt: Date.now(),
    status: 'connected',
  });

  res.json({ success: true, platform, connectedAt: Date.now() });
});

// GET /api/gamedev/projects - List user projects
router.get('/projects', requireAuth, (req, res) => {
  const { type, limit = 20, offset = 0 } = req.query;
  let userProjects = [...projects.values()].filter(p => p.userId === req.user.sub);
  if (type) userProjects = userProjects.filter(p => p.type === type);
  const sorted = userProjects.sort((a, b) => b.updatedAt - a.updatedAt);
  res.json({
    projects: sorted.slice(Number(offset), Number(offset) + Number(limit)),
    total: sorted.length,
    types: Object.entries(PROJECT_TYPES).map(([id, name]) => ({ id, name })),
  });
});

// POST /api/gamedev/projects - Create a project
router.post('/projects', requireAuth, (req, res) => {
  const { name, type, platform, engine, description, targetPlatforms = [] } = req.body;

  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Project name required' });
  if (!PROJECT_TYPES[type]) return res.status(400).json({ error: 'Invalid project type', valid: Object.keys(PROJECT_TYPES) });

  const project = {
    id: uuidv4(),
    userId: req.user.sub,
    name: name.trim(),
    type,
    platform: platform || null,
    engine: engine || null,
    description: description || '',
    targetPlatforms,
    status: 'active',
    progress: 0,
    builds: [],
    achievements: [],
    performance: mockPerformanceMetrics(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  projects.set(project.id, project);
  res.status(201).json(project);
});

// GET /api/gamedev/projects/:id - Get project details
router.get('/projects/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  // Attach real-time build status
  project.buildStatus = mockBuildStatus(project.id);
  project.performance = mockPerformanceMetrics();
  project.updatedAt = Date.now();

  res.json(project);
});

// PUT /api/gamedev/projects/:id - Update project
router.put('/projects/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const { name, description, status, progress, targetPlatforms } = req.body;
  if (name !== undefined) project.name = name.trim();
  if (description !== undefined) project.description = description;
  if (status !== undefined) project.status = status;
  if (progress !== undefined) project.progress = Math.min(100, Math.max(0, Number(progress)));
  if (targetPlatforms !== undefined) project.targetPlatforms = targetPlatforms;
  project.updatedAt = Date.now();

  res.json(project);
});

// DELETE /api/gamedev/projects/:id
router.delete('/projects/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });
  projects.delete(req.params.id);
  res.json({ success: true });
});

// GET /api/gamedev/builds/:projectId - Get build pipeline status
router.get('/builds/:projectId', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  res.json({
    projectId: req.params.projectId,
    builds: mockBuildStatus(req.params.projectId),
    pipelineStatus: {
      compile: { status: 'success', duration: 45 },
      shaderCompile: { status: 'running', progress: 67 },
      assetCook: { status: 'queued' },
      package: { status: 'pending' },
      sign: { status: 'pending' },
      upload: { status: 'pending' },
    },
    lastBuild: Date.now() - Math.floor(Math.random() * 3600000),
  });
});

// POST /api/gamedev/builds/:projectId/trigger - Trigger a build
router.post('/builds/:projectId/trigger', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const { platform = 'PC', config = 'Development' } = req.body;
  const buildId = uuidv4();

  const build = {
    id: buildId,
    projectId: req.params.projectId,
    platform,
    config,
    status: 'queued',
    queuedAt: Date.now(),
    triggeredBy: req.user.sub,
  };

  builds.set(buildId, build);
  res.json({ build, message: `Build queued for ${platform}` });
});

// GET /api/gamedev/achievements/:projectId - Achievement tracking
router.get('/achievements/:projectId', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  // Generate demo achievements
  const demoAchievements = [
    { id: uuidv4(), name: 'First Build', description: 'Successfully build the project for the first time', unlocked: true, platform: 'PC', unlockedAt: Date.now() - 86400000 * 5, xp: 100, rarity: 'common' },
    { id: uuidv4(), name: 'Ship It', description: 'Deploy to production', unlocked: false, platform: 'multi', xp: 500, rarity: 'rare' },
    { id: uuidv4(), name: 'Console Launch', description: 'Pass cert for a console platform', unlocked: false, platform: 'PS5/Xbox', xp: 1000, rarity: 'epic' },
    { id: uuidv4(), name: 'Gold Master', description: 'Achieve 100% completion', unlocked: false, platform: 'multi', xp: 5000, rarity: 'legendary' },
    { id: uuidv4(), name: 'Bug Squasher', description: 'Fix 50 bugs', unlocked: true, platform: 'any', unlockedAt: Date.now() - 86400000 * 2, xp: 250, rarity: 'uncommon' },
  ];

  const userAchievements = [...achievements.values()].filter(a => a.projectId === req.params.projectId);

  res.json({
    projectId: req.params.projectId,
    achievements: userAchievements.length > 0 ? userAchievements : demoAchievements,
    total: demoAchievements.length,
    unlocked: demoAchievements.filter(a => a.unlocked).length,
    totalXP: demoAchievements.filter(a => a.unlocked).reduce((s, a) => s + a.xp, 0),
  });
});

// POST /api/gamedev/achievements - Unlock/create achievement
router.post('/achievements', requireAuth, (req, res) => {
  const { projectId, name, description, platform, xp = 100, rarity = 'common' } = req.body;

  if (!projectId || !name) return res.status(400).json({ error: 'projectId and name required' });

  const achievement = {
    id: uuidv4(),
    projectId,
    userId: req.user.sub,
    name: name.trim(),
    description: description || '',
    platform: platform || 'any',
    xp: Number(xp),
    rarity,
    unlocked: true,
    unlockedAt: Date.now(),
    createdAt: Date.now(),
  };

  achievements.set(achievement.id, achievement);
  res.status(201).json(achievement);
});

// GET /api/gamedev/performance/:projectId - Real-time performance metrics
router.get('/performance/:projectId', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  res.json({
    projectId: req.params.projectId,
    timestamp: Date.now(),
    metrics: mockPerformanceMetrics(),
    vr: {
      targetFps: 90,
      actualFps: 85 + Math.random() * 10,
      latency: Math.random() * 10 + 10,
      reprojectionRate: (Math.random() * 5).toFixed(1),
    },
    history: Array.from({ length: 60 }, (_, i) => ({
      t: Date.now() - (60 - i) * 1000,
      fps: 55 + Math.random() * 35,
      frameTime: (Math.random() * 10 + 10).toFixed(2),
    })),
  });
});

// GET /api/gamedev/stats - Overall game dev statistics
router.get('/stats', requireAuth, (req, res) => {
  const userProjects = [...projects.values()].filter(p => p.userId === req.user.sub);
  const stats = {
    totalProjects: userProjects.length,
    byType: {},
    totalBuilds: builds.size,
    successRate: (Math.random() * 20 + 75).toFixed(1),
    avgBuildTime: Math.floor(Math.random() * 300 + 120),
    totalAchievements: achievements.size,
    connectedPlatforms: [...platformConnections.keys()].filter(k => k.startsWith(req.user.sub + ':')).length,
  };

  for (const [id, name] of Object.entries(PROJECT_TYPES)) {
    stats.byType[id] = userProjects.filter(p => p.type === id).length;
  }

  res.json(stats);
});

export default router;

// src/projects/project-routes.js
// Created: 2026-07-30
// Real-time project tracking: coding, game dev, AR/VR/3D, achievements

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../auth/auth-middleware.js';

const router = Router();

// In-memory stores (replace with DB in production)
const projects = new Map();
const achievements = new Map();
const gameProgress = new Map();

// Project types
const PROJECT_TYPES = ['coding', 'game', 'ar', 'vr', 'xr', '3d', 'mobile', 'web', 'desktop', 'engine', 'plugin'];

// Game engine platforms
const GAME_ENGINES = {
  unreal: { name: 'Unreal Engine 5', vendor: 'Epic Games', languages: ['C++', 'Blueprints'] },
  unity: { name: 'Unity 6', vendor: 'Unity Technologies', languages: ['C#', 'Shader Lab'] },
  godot: { name: 'Godot 4', vendor: 'Godot Foundation', languages: ['GDScript', 'C#', 'C++'] },
  gamemaker: { name: 'GameMaker Studio 2', vendor: 'YoYo Games', languages: ['GML'] },
  rpgmaker: { name: 'RPG Maker MZ', vendor: 'Kadokawa', languages: ['JavaScript'] },
  construct: { name: 'Construct 3', vendor: 'Scirra', languages: ['JavaScript', 'Visual'] },
  cocos: { name: 'Cocos Creator', vendor: 'Cocos', languages: ['TypeScript', 'C++'] },
  o3de: { name: 'O3DE', vendor: 'Linux Foundation', languages: ['C++', 'Python', 'Lua'] }
};

// Gaming platforms
const GAMING_PLATFORMS = {
  steam: { name: 'Steam', vendor: 'Valve', connector: 'steam_web_api' },
  epic: { name: 'Epic Games Store', vendor: 'Epic Games', connector: 'epic_online_services' },
  psn: { name: 'PlayStation Network', vendor: 'Sony', connector: 'psn_api' },
  xbox: { name: 'Xbox / Game Pass', vendor: 'Microsoft', connector: 'xbox_live_api' },
  ubisoft: { name: 'Ubisoft Connect', vendor: 'Ubisoft', connector: 'ubisoft_connect_api' },
  gog: { name: 'GOG Galaxy', vendor: 'CD Projekt', connector: 'gog_galaxy_api' },
  battlenet: { name: 'Battle.net', vendor: 'Blizzard', connector: 'battlenet_api' },
  origin: { name: 'EA App', vendor: 'Electronic Arts', connector: 'ea_api' }
};

// GET /api/projects
router.get('/', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const userProjects = [...projects.values()].filter(p => p.userId === userId);
  return res.json({ projects: userProjects, total: userProjects.length });
});

// POST /api/projects
router.post('/', requireAuth, (req, res) => {
  const {
    name, type, description, engine, platform, languages,
    repoUrl, targetPlatforms, tags, milestones
  } = req.body;

  if (!name || !type) return res.status(400).json({ error: 'name and type are required.' });
  if (!PROJECT_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${PROJECT_TYPES.join(', ')}` });
  }

  const project = {
    id: uuidv4(),
    userId: req.user.sub,
    name: name.trim(),
    type,
    description: description || '',
    engine: engine || null,
    platform: platform || null,
    languages: Array.isArray(languages) ? languages : [],
    repoUrl: repoUrl || null,
    targetPlatforms: Array.isArray(targetPlatforms) ? targetPlatforms : [],
    tags: Array.isArray(tags) ? tags : [],
    milestones: Array.isArray(milestones) ? milestones : [],
    status: 'active',
    progress: 0,
    linesOfCode: 0,
    bugsOpen: 0,
    bugsClosed: 0,
    testCoverage: 0,
    buildStatus: 'unknown',
    deployStatus: 'not_deployed',
    metrics: {
      commits: 0,
      contributors: 1,
      files: 0,
      size: 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  projects.set(project.id, project);
  return res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Access denied.' });
  return res.json(project);
});

// PUT /api/projects/:id
router.put('/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Access denied.' });

  const allowedUpdates = [
    'name', 'description', 'status', 'progress', 'linesOfCode',
    'bugsOpen', 'bugsClosed', 'testCoverage', 'buildStatus',
    'deployStatus', 'metrics', 'milestones', 'tags', 'targetPlatforms'
  ];
  allowedUpdates.forEach(k => {
    if (req.body[k] !== undefined) project[k] = req.body[k];
  });
  project.updatedAt = new Date().toISOString();
  projects.set(project.id, project);
  return res.json(project);
});

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Access denied.' });
  projects.delete(req.params.id);
  return res.json({ message: 'Project deleted.' });
});

// POST /api/projects/:id/milestone
router.post('/:id/milestone', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Access denied.' });

  const { title, description, dueDate, completed } = req.body;
  if (!title) return res.status(400).json({ error: 'Milestone title required.' });

  const milestone = {
    id: uuidv4(),
    title,
    description: description || '',
    dueDate: dueDate || null,
    completed: Boolean(completed),
    completedAt: completed ? new Date().toISOString() : null,
    createdAt: new Date().toISOString()
  };

  project.milestones = [...(project.milestones || []), milestone];
  project.updatedAt = new Date().toISOString();
  projects.set(project.id, project);
  return res.status(201).json(milestone);
});

// GET /api/projects/engines/list
router.get('/engines/list', (req, res) => {
  return res.json({ engines: GAME_ENGINES });
});

// GET /api/projects/platforms/list
router.get('/platforms/list', (req, res) => {
  return res.json({ platforms: GAMING_PLATFORMS });
});

// GET /api/projects/connectors/status
router.get('/connectors/status', requireAuth, (req, res) => {
  const connectorStatus = Object.entries(GAMING_PLATFORMS).map(([id, platform]) => ({
    id,
    name: platform.name,
    vendor: platform.vendor,
    connector: platform.connector,
    status: process.env[`${platform.connector.toUpperCase()}_KEY`] ? 'configured' : 'not_configured',
    configured: Boolean(process.env[`${platform.connector.toUpperCase()}_KEY`])
  }));
  return res.json({ connectors: connectorStatus });
});

// -----------------------------------------------
// ACHIEVEMENT & GAME PROGRESS TRACKING
// -----------------------------------------------

// POST /api/projects/achievements
router.post('/achievements', requireAuth, (req, res) => {
  const { projectId, title, description, category, points, icon, unlockCondition } = req.body;
  if (!projectId || !title) return res.status(400).json({ error: 'projectId and title required.' });

  const achievement = {
    id: uuidv4(),
    projectId,
    userId: req.user.sub,
    title,
    description: description || '',
    category: category || 'general',
    points: points || 10,
    icon: icon || '🏆',
    unlockCondition: unlockCondition || null,
    unlocked: false,
    unlockedAt: null,
    createdAt: new Date().toISOString()
  };

  const key = `${req.user.sub}:${projectId}`;
  const existing = achievements.get(key) || [];
  existing.push(achievement);
  achievements.set(key, existing);
  return res.status(201).json(achievement);
});

// GET /api/projects/achievements/:projectId
router.get('/achievements/:projectId', requireAuth, (req, res) => {
  const key = `${req.user.sub}:${req.params.projectId}`;
  const list = achievements.get(key) || [];
  const total = list.reduce((acc, a) => acc + (a.unlocked ? a.points : 0), 0);
  return res.json({ achievements: list, totalPoints: total, unlocked: list.filter(a => a.unlocked).length });
});

// POST /api/projects/achievements/:achievementId/unlock
router.post('/achievements/:achievementId/unlock', requireAuth, (req, res) => {
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId required.' });

  const key = `${req.user.sub}:${projectId}`;
  const list = achievements.get(key) || [];
  const achievement = list.find(a => a.id === req.params.achievementId);
  if (!achievement) return res.status(404).json({ error: 'Achievement not found.' });
  if (achievement.unlocked) return res.json({ message: 'Already unlocked.', achievement });

  achievement.unlocked = true;
  achievement.unlockedAt = new Date().toISOString();
  achievements.set(key, list);
  return res.json({ message: 'Achievement unlocked!', achievement });
});

// POST /api/projects/game-progress
router.post('/game-progress', requireAuth, (req, res) => {
  const { projectId, platform, userId: gameUserId, level, xp, stats, saves } = req.body;
  if (!projectId || !platform) return res.status(400).json({ error: 'projectId and platform required.' });

  const key = `${req.user.sub}:${projectId}:${platform}`;
  const progress = {
    id: uuidv4(),
    projectId,
    platform,
    gameUserId: gameUserId || null,
    level: level || 1,
    xp: xp || 0,
    stats: stats || {},
    saves: Array.isArray(saves) ? saves : [],
    lastUpdated: new Date().toISOString()
  };

  gameProgress.set(key, progress);
  return res.status(201).json(progress);
});

// GET /api/projects/game-progress/:projectId/:platform
router.get('/game-progress/:projectId/:platform', requireAuth, (req, res) => {
  const key = `${req.user.sub}:${req.params.projectId}:${req.params.platform}`;
  const progress = gameProgress.get(key);
  if (!progress) return res.status(404).json({ error: 'Game progress not found.' });
  return res.json(progress);
});

// GET /api/projects/summary - dashboard summary
router.get('/summary/all', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const userProjects = [...projects.values()].filter(p => p.userId === userId);

  const summary = {
    total: userProjects.length,
    active: userProjects.filter(p => p.status === 'active').length,
    completed: userProjects.filter(p => p.status === 'completed').length,
    byType: PROJECT_TYPES.reduce((acc, t) => {
      acc[t] = userProjects.filter(p => p.type === t).length;
      return acc;
    }, {}),
    avgProgress: userProjects.length
      ? Math.round(userProjects.reduce((a, p) => a + p.progress, 0) / userProjects.length)
      : 0,
    recentActivity: userProjects
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
  };

  return res.json(summary);
});

export default router;

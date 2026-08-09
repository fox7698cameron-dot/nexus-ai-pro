/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Game Development Routes
 * Real-time project tracking: coding, game dev, AR/VR/3D
 * Connectors: Unreal/Epic, Sony PlayStation, Microsoft Xbox, Ubisoft Connect
 * Achievement & game progress tracking
 * Date: 2026-08-09
 */

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import crypto from 'crypto';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/security.js';
import { redisGet, redisSet, publish } from '../db/redis.js';

const router = Router();

// ─── In-memory stores (replace with PostgreSQL in production) ─────────────────

const projects = new Map();
const achievements = new Map();
const connectors = new Map();

// ─── Enums ────────────────────────────────────────────────────────────────────

const PROJECT_TYPES = ['coding', 'game', 'ar', 'vr', '3d', 'mobile', 'web', 'cli', 'ai'];
const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived'];
const ENGINES = ['unreal', 'unity', 'godot', 'o3de', 'custom'];
const PLATFORMS_GAME = ['pc', 'ps5', 'ps4', 'xbox_series', 'xbox_one', 'switch', 'mobile', 'web', 'vr'];
const CONNECTOR_TYPES = ['epic_games', 'sony_psn', 'microsoft_xbox', 'ubisoft_connect', 'steam', 'gog', 'itch'];

// ─── Connector config (keys from env) ────────────────────────────────────────

const CONNECTOR_CONFIG = {
  epic_games: {
    name: 'Epic Games / Unreal',
    apiBase: 'https://api.epicgames.dev',
    envKey: 'EPIC_CLIENT_SECRET',
    icon: 'unreal',
    features: ['achievements', 'leaderboards', 'matchmaking', 'stats', 'builds'],
  },
  sony_psn: {
    name: 'Sony PlayStation Network',
    apiBase: 'https://m.np.playstation.com/api',
    envKey: 'SONY_PSN_CLIENT_SECRET',
    icon: 'playstation',
    features: ['trophies', 'activity', 'friends', 'save_data'],
  },
  microsoft_xbox: {
    name: 'Microsoft Xbox',
    apiBase: 'https://xsapi.xboxlive.com',
    envKey: 'XBOX_CLIENT_SECRET',
    icon: 'xbox',
    features: ['achievements', 'gamerscore', 'friends', 'leaderboards'],
  },
  ubisoft_connect: {
    name: 'Ubisoft Connect',
    apiBase: 'https://public-ubiservices.ubi.com',
    envKey: 'UBISOFT_APP_ID',
    icon: 'ubisoft',
    features: ['achievements', 'stats', 'challenges'],
  },
  steam: {
    name: 'Steam',
    apiBase: 'https://api.steampowered.com',
    envKey: 'STEAM_WEB_API_KEY',
    icon: 'steam',
    features: ['achievements', 'stats', 'leaderboards', 'workshop'],
  },
  gog: {
    name: 'GOG Galaxy',
    apiBase: 'https://api.gog.com',
    envKey: 'GOG_CLIENT_SECRET',
    icon: 'gog',
    features: ['achievements', 'stats', 'friends'],
  },
  itch: {
    name: 'itch.io',
    apiBase: 'https://itch.io/api/1',
    envKey: 'ITCH_API_KEY',
    icon: 'itch',
    features: ['uploads', 'analytics', 'sales'],
  },
};

// ─── POST /api/gamedev/projects ───────────────────────────────────────────────

router.post(
  '/projects',
  requireAuth,
  [
    body('name').trim().isLength({ min: 1, max: 120 }),
    body('type').isIn(PROJECT_TYPES),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('engine').optional().isIn(ENGINES),
    body('targetPlatforms').optional().isArray(),
    body('targetPlatforms.*').optional().isIn(PLATFORMS_GAME),
    body('language').optional().isString(),
    body('repo').optional().isURL(),
    body('tags').optional().isArray(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed', details: errors.array() });

    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    const project = {
      id: projectId,
      ownerId: req.user.sub,
      name: req.body.name,
      type: req.body.type,
      description: req.body.description ?? '',
      engine: req.body.engine ?? null,
      targetPlatforms: req.body.targetPlatforms ?? [],
      language: req.body.language ?? null,
      repo: req.body.repo ?? null,
      tags: req.body.tags ?? [],
      status: 'active',
      progress: 0,
      milestones: [],
      tasks: [],
      buildCount: 0,
      lastBuildAt: null,
      deployments: [],
      connectors: [],
      createdAt: now,
      updatedAt: now,
      metrics: {
        linesOfCode: 0,
        filesChanged: 0,
        commitsThisWeek: 0,
        openBugs: 0,
        testsPass: 0,
        testsFail: 0,
        coveragePct: 0,
        buildTimeSec: 0,
        bundleSizeKB: 0,
      },
    };

    projects.set(projectId, project);
    logAuditEvent('project_created', { userId: req.user.sub, projectId, type: project.type });

    return res.status(201).json(project);
  }
);

// ─── GET /api/gamedev/projects ────────────────────────────────────────────────

router.get('/projects', requireAuth, (req, res) => {
  const userProjects = [...projects.values()].filter(p => p.ownerId === req.user.sub);
  return res.json({ projects: userProjects, total: userProjects.length });
});

// ─── GET /api/gamedev/projects/:id ───────────────────────────────────────────

router.get('/projects/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Access denied' });
  }
  return res.json(project);
});

// ─── PATCH /api/gamedev/projects/:id ─────────────────────────────────────────

router.patch(
  '/projects/:id',
  requireAuth,
  [
    body('name').optional().trim().isLength({ min: 1, max: 120 }),
    body('status').optional().isIn(PROJECT_STATUSES),
    body('progress').optional().isInt({ min: 0, max: 100 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('metrics').optional().isObject(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed', details: errors.array() });

    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.ownerId !== req.user.sub && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const allowed = ['name', 'description', 'status', 'progress', 'engine', 'targetPlatforms', 'tags', 'language', 'repo'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) project[key] = req.body[key];
    }

    if (req.body.metrics) {
      Object.assign(project.metrics, req.body.metrics);
    }

    project.updatedAt = new Date().toISOString();
    publish('project:update', { projectId: project.id, userId: req.user.sub });
    return res.json(project);
  }
);

// ─── POST /api/gamedev/projects/:id/milestones ────────────────────────────────

router.post(
  '/projects/:id/milestones',
  requireAuth,
  [body('title').trim().isLength({ min: 1, max: 200 }), body('dueDate').optional().isISO8601()],
  (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.ownerId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed', details: errors.array() });

    const milestone = {
      id: crypto.randomUUID(),
      title: req.body.title,
      description: req.body.description ?? '',
      dueDate: req.body.dueDate ?? null,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    project.milestones.push(milestone);
    project.updatedAt = new Date().toISOString();
    return res.status(201).json(milestone);
  }
);

// ─── POST /api/gamedev/projects/:id/tasks ────────────────────────────────────

router.post(
  '/projects/:id/tasks',
  requireAuth,
  [
    body('title').trim().isLength({ min: 1, max: 200 }),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('category').optional().isIn(['bug', 'feature', 'refactor', 'art', 'audio', 'design', 'test', 'deploy']),
  ],
  (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.ownerId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed', details: errors.array() });

    const task = {
      id: crypto.randomUUID(),
      title: req.body.title,
      priority: req.body.priority ?? 'medium',
      category: req.body.category ?? 'feature',
      status: 'open',
      assignee: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    project.tasks.push(task);
    project.updatedAt = new Date().toISOString();
    return res.status(201).json(task);
  }
);

// ─── GET /api/gamedev/connectors ──────────────────────────────────────────────

router.get('/connectors', requireAuth, (req, res) => {
  const available = Object.entries(CONNECTOR_CONFIG).map(([type, cfg]) => ({
    type,
    name: cfg.name,
    icon: cfg.icon,
    features: cfg.features,
    configured: !!process.env[cfg.envKey],
    connected: connectors.has(`${req.user.sub}:${type}`),
  }));
  return res.json({ connectors: available });
});

// ─── POST /api/gamedev/connectors/:type/connect ───────────────────────────────

router.post('/connectors/:type/connect', requireAuth, (req, res) => {
  const { type } = req.params;
  if (!CONNECTOR_CONFIG[type]) return res.status(400).json({ error: 'Unknown connector type' });

  const cfg = CONNECTOR_CONFIG[type];
  if (!process.env[cfg.envKey]) {
    return res.status(503).json({ error: `${cfg.name} not configured — set ${cfg.envKey}` });
  }

  const connectionId = `${req.user.sub}:${type}`;
  connectors.set(connectionId, {
    type,
    userId: req.user.sub,
    name: cfg.name,
    connectedAt: new Date().toISOString(),
    status: 'active',
    features: cfg.features,
  });

  logAuditEvent('connector_linked', { userId: req.user.sub, connector: type });
  return res.json({ success: true, connector: connectors.get(connectionId) });
});

// ─── GET /api/gamedev/achievements ───────────────────────────────────────────

router.get('/achievements', requireAuth, async (req, res) => {
  const cacheKey = `achievements:${req.user.sub}`;
  const cached = await redisGet(cacheKey);
  if (cached) return res.json(cached);

  // Fetch from connected platforms
  const userConnectors = [...connectors.entries()]
    .filter(([k]) => k.startsWith(`${req.user.sub}:`))
    .map(([, v]) => v);

  const allAchievements = [];

  for (const conn of userConnectors) {
    if (conn.features.includes('achievements') || conn.features.includes('trophies')) {
      allAchievements.push(...generateMockAchievements(conn.type, req.user.sub));
    }
  }

  // Include locally tracked achievements
  const local = achievements.get(req.user.sub) ?? [];
  allAchievements.push(...local);

  const payload = {
    achievements: allAchievements,
    total: allAchievements.length,
    unlocked: allAchievements.filter(a => a.unlocked).length,
    completionPct: allAchievements.length
      ? Math.round((allAchievements.filter(a => a.unlocked).length / allAchievements.length) * 100)
      : 0,
  };

  await redisSet(cacheKey, payload, 300);
  return res.json(payload);
});

// ─── POST /api/gamedev/achievements ──────────────────────────────────────────

router.post(
  '/achievements',
  requireAuth,
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('icon').optional().isString(),
    body('xp').optional().isInt({ min: 0, max: 10000 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed', details: errors.array() });

    const achievement = {
      id: crypto.randomUUID(),
      name: req.body.name,
      description: req.body.description ?? '',
      icon: req.body.icon ?? '🏆',
      xp: req.body.xp ?? 100,
      source: 'nexus',
      unlocked: false,
      unlockedAt: null,
      createdAt: new Date().toISOString(),
    };

    if (!achievements.has(req.user.sub)) achievements.set(req.user.sub, []);
    achievements.get(req.user.sub).push(achievement);
    return res.status(201).json(achievement);
  }
);

// ─── POST /api/gamedev/achievements/:id/unlock ───────────────────────────────

router.post('/achievements/:id/unlock', requireAuth, (req, res) => {
  const userAch = achievements.get(req.user.sub) ?? [];
  const ach = userAch.find(a => a.id === req.params.id);
  if (!ach) return res.status(404).json({ error: 'Achievement not found' });

  ach.unlocked = true;
  ach.unlockedAt = new Date().toISOString();
  publish('achievement:unlocked', { userId: req.user.sub, achievementId: ach.id, name: ach.name });
  logAuditEvent('achievement_unlocked', { userId: req.user.sub, achievementId: ach.id });
  return res.json({ success: true, achievement: ach });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateMockAchievements(platform, userId) {
  const templates = {
    epic_games: [
      { name: 'First Victory', description: 'Win your first match', icon: '🏆', xp: 100 },
      { name: 'Builder', description: 'Create 100 structures', icon: '🔨', xp: 200 },
      { name: 'Explorer', description: 'Visit all named locations', icon: '🗺️', xp: 300 },
    ],
    sony_psn: [
      { name: 'Platinum Trophy', description: 'Earn all other trophies', icon: '🥇', xp: 1000 },
      { name: 'Speed Demon', description: 'Complete under par time', icon: '⚡', xp: 250 },
    ],
    microsoft_xbox: [
      { name: 'Completion', description: 'Complete the main story', icon: '⭐', xp: 500 },
      { name: 'Collector', description: 'Collect all items', icon: '💎', xp: 400 },
    ],
    steam: [
      { name: 'Perfectionist', description: '100% game completion', icon: '✅', xp: 800 },
      { name: 'Veteran', description: 'Play for 100 hours', icon: '🕐', xp: 300 },
    ],
  };

  const list = templates[platform] ?? [];
  const seed = [...userId].reduce((a, c) => a + c.charCodeAt(0), 0);
  return list.map((t, i) => ({
    id: crypto.randomUUID(),
    ...t,
    source: platform,
    unlocked: (seed + i) % 3 !== 0,
    unlockedAt: (seed + i) % 3 !== 0 ? new Date(Date.now() - i * 86400000).toISOString() : null,
  }));
}

export default router;

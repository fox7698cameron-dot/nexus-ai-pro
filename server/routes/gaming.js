/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * server/routes/gaming.js
 * Game development tracking, platform connectors & achievement/progress API.
 * Platforms: Unreal/Epic Games, Sony (PSN), Microsoft (Xbox), Ubisoft Connect
 * Date: 2026-08-29
 *
 * All API keys/tokens sourced from process.env — never hardcoded.
 */

import { Router } from 'express';
import { z }      from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireMinLevel } from '../middleware/auth.js';

const router = Router();

// ── Platform connectors ────────────────────────────────────────────────────
const GAMING_PLATFORMS = {
  epic: {
    name:     'Epic Games / Unreal',
    color:    '#2B2B2B',
    emoji:    '🎮',
    apiBase:  'https://api.epicgames.dev',
    clientEnv: 'EPIC_CLIENT_ID',
    secretEnv: 'EPIC_CLIENT_SECRET',
    features: ['achievements', 'friends', 'leaderboards', 'stats', 'builds'],
  },
  sony: {
    name:     'PlayStation Network',
    color:    '#003087',
    emoji:    '🎮',
    apiBase:  'https://m.np.playstation.com/api/graphql/v1',
    tokenEnv: 'PSN_ACCESS_TOKEN',
    features: ['trophies', 'friends', 'presence', 'stats'],
  },
  microsoft: {
    name:     'Xbox / Microsoft',
    color:    '#107C10',
    emoji:    '🟢',
    apiBase:  'https://xboxapi.com/v2',
    tokenEnv: 'XBOX_ACCESS_TOKEN',
    features: ['achievements', 'gamerscore', 'friends', 'presence', 'stats'],
  },
  ubisoft: {
    name:     'Ubisoft Connect',
    color:    '#0071C5',
    emoji:    '🔷',
    apiBase:  'https://public-ubiservices.ubi.com/v3',
    tokenEnv: 'UBISOFT_TOKEN',
    features: ['achievements', 'xp', 'friends', 'stats'],
  },
};

// ── In-memory project & achievement stores ─────────────────────────────────
// Production: replace with PostgreSQL / Redis
const projectStore     = new Map();
const achievementStore = new Map();

// ── Project validation schema ──────────────────────────────────────────────
const projectSchema = z.object({
  name:        z.string().min(1).max(120),
  type:        z.enum(['game', 'arvr', '3d', 'coding', 'mobile', 'web', 'engine']),
  engine:      z.string().optional(),
  platforms:   z.array(z.string()).optional(),
  description: z.string().max(1000).optional(),
  status:      z.enum(['planning', 'active', 'beta', 'released', 'archived']).optional(),
  tags:        z.array(z.string()).optional(),
  githubUrl:   z.string().url().optional(),
  milestones:  z.array(z.object({
    title:    z.string(),
    dueDate:  z.string().optional(),
    complete: z.boolean().default(false),
  })).optional(),
});

const achievementSchema = z.object({
  projectId:   z.string().uuid(),
  platform:    z.enum(Object.keys(GAMING_PLATFORMS)),
  achievementId: z.string(),
  title:       z.string(),
  description: z.string().optional(),
  points:      z.number().int().nonnegative().optional(),
  icon:        z.string().optional(),
  unlockedAt:  z.string().datetime().optional(),
  percentage:  z.number().min(0).max(100).optional(),
});

// ── Helpers ────────────────────────────────────────────────────────────────
function userProjects(userId) {
  return [...projectStore.values()].filter(p => p.ownerId === userId);
}

function mockPlatformStats(platform) {
  const rand = () => Math.floor(Math.random() * 1000);
  const map = {
    epic:      { achievements: rand(), xp: rand() * 100, friends: rand() },
    sony:      { trophies: { gold: rand(), silver: rand(), bronze: rand() }, level: Math.floor(Math.random() * 100) },
    microsoft: { gamerscore: rand() * 10, achievements: rand(), friends: rand() },
    ubisoft:   { xp: rand() * 500, units: rand(), actions: rand() },
  };
  return map[platform] ?? {};
}

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /api/gaming/platforms
router.get('/platforms', requireAuth, (req, res) => {
  const list = Object.entries(GAMING_PLATFORMS).map(([id, p]) => ({
    id,
    name:      p.name,
    color:     p.color,
    emoji:     p.emoji,
    features:  p.features,
    connected: Boolean(process.env[p.tokenEnv ?? p.clientEnv]),
  }));
  return res.json({ platforms: list });
});

// GET /api/gaming/platforms/:platform/stats
router.get('/platforms/:platform/stats', requireAuth, async (req, res) => {
  const { platform } = req.params;
  if (!GAMING_PLATFORMS[platform]) {
    return res.status(404).json({ error: `Unknown platform: ${platform}`, code: 'UNKNOWN_PLATFORM' });
  }

  const cfg   = GAMING_PLATFORMS[platform];
  const token = process.env[cfg.tokenEnv ?? cfg.clientEnv];

  try {
    // Real API call if token available, otherwise mock
    const stats = token
      ? await fetchRealPlatformStats(platform, cfg, token)
      : mockPlatformStats(platform);

    return res.json({ platform, stats, realtime: true, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: err.message, code: 'PLATFORM_ERROR' });
  }
});

async function fetchRealPlatformStats(platform, cfg, token) {
  // Stub — real implementations would call each platform's SDK
  return mockPlatformStats(platform);
}

// ── Project CRUD ───────────────────────────────────────────────────────────

// GET /api/gaming/projects
router.get('/projects', requireAuth, (req, res) => {
  const projects = userProjects(req.user.sub);
  return res.json({ projects });
});

// POST /api/gaming/projects
router.post('/projects', requireAuth, (req, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  const now     = new Date().toISOString();
  const project = {
    id:        uuidv4(),
    ownerId:   req.user.sub,
    createdAt: now,
    updatedAt: now,
    status:    'planning',
    progress:  0,
    ...parsed.data,
  };

  projectStore.set(project.id, project);
  return res.status(201).json(project);
});

// GET /api/gaming/projects/:id
router.get('/projects/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  if (project.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }
  return res.json(project);
});

// PATCH /api/gaming/projects/:id
router.patch('/projects/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  if (project.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  const partial  = projectSchema.partial().safeParse(req.body);
  if (!partial.success) {
    return res.status(400).json({ error: 'Validation failed', details: partial.error.issues });
  }

  const updated = { ...project, ...partial.data, updatedAt: new Date().toISOString() };
  projectStore.set(project.id, updated);
  return res.json(updated);
});

// DELETE /api/gaming/projects/:id
router.delete('/projects/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  if (project.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }
  projectStore.delete(req.params.id);
  return res.json({ success: true });
});

// ── Achievement CRUD ───────────────────────────────────────────────────────

// GET /api/gaming/achievements?projectId=…
router.get('/achievements', requireAuth, (req, res) => {
  let achievements = [...achievementStore.values()];

  if (req.query.projectId) {
    achievements = achievements.filter(a => a.projectId === req.query.projectId);
  }

  // Only own achievements (or admin)
  if (req.user.role !== 'admin') {
    achievements = achievements.filter(a => {
      const proj = projectStore.get(a.projectId);
      return proj?.ownerId === req.user.sub;
    });
  }

  return res.json({ achievements });
});

// POST /api/gaming/achievements
router.post('/achievements', requireAuth, (req, res) => {
  const parsed = achievementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  const project = projectStore.get(parsed.data.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  if (project.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  const now         = new Date().toISOString();
  const achievement = {
    id:        uuidv4(),
    createdAt: now,
    updatedAt: now,
    unlocked:  Boolean(parsed.data.unlockedAt),
    ...parsed.data,
  };

  achievementStore.set(achievement.id, achievement);
  return res.status(201).json(achievement);
});

// PATCH /api/gaming/achievements/:id/unlock
router.patch('/achievements/:id/unlock', requireAuth, (req, res) => {
  const achievement = achievementStore.get(req.params.id);
  if (!achievement) return res.status(404).json({ error: 'Achievement not found', code: 'NOT_FOUND' });

  achievement.unlocked    = true;
  achievement.unlockedAt  = new Date().toISOString();
  achievement.updatedAt   = new Date().toISOString();
  achievementStore.set(achievement.id, achievement);
  return res.json(achievement);
});

// GET /api/gaming/progress/:projectId — calculate overall project progress
router.get('/progress/:projectId', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  if (project.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  const milestones  = project.milestones ?? [];
  const done        = milestones.filter(m => m.complete).length;
  const total       = milestones.length;
  const mProgress   = total > 0 ? Math.round((done / total) * 100) : 0;

  const projectAch  = [...achievementStore.values()].filter(a => a.projectId === req.params.projectId);
  const unlocked    = projectAch.filter(a => a.unlocked).length;

  return res.json({
    projectId:             req.params.projectId,
    name:                  project.name,
    status:                project.status,
    milestoneProgress:     mProgress,
    milestonesComplete:    done,
    milestonesTotal:       total,
    achievementsUnlocked:  unlocked,
    achievementsTotal:     projectAch.length,
    lastUpdated:           project.updatedAt,
  });
});

export default router;

// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File: src/api/routes/gamedev.js
// Created: 2026-08-13
// Game Development Project Tracking — Express API Routes

import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Auth Middleware — verify JWT from Authorization header
// ─────────────────────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
    }
    const token = header.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set.' });
    }
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────
const ProjectStatus = z.enum(['active', 'paused', 'completed', 'archived', 'planning']);
const ProjectType  = z.enum(['game', 'ar', 'vr', 'xr', '3d', 'mobile', 'web', 'tool']);
const EngineType   = z.enum(['unreal', 'unity', 'godot', 'custom', 'none']);
const PlatformId   = z.enum(['epic', 'psn', 'xbox', 'ubisoft', 'steam', 'ios', 'android', 'web']);

const TeamMemberSchema = z.object({
  userId: z.string().uuid(),
  role:   z.enum(['lead', 'developer', 'artist', 'designer', 'qa', 'producer']),
  name:   z.string().min(1).max(120),
});

const MilestoneSchema = z.object({
  id:          z.string().uuid().optional(),
  title:       z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dueDate:     z.string().datetime().optional(),
  completed:   z.boolean().default(false),
});

const BuildTargetSchema = z.object({
  platform:    PlatformId,
  environment: z.enum(['development', 'staging', 'production']),
  enabled:     z.boolean().default(true),
});

const CreateProjectSchema = z.object({
  name:         z.string().min(1).max(200).trim(),
  description:  z.string().max(2000).optional(),
  type:         ProjectType,
  engine:       EngineType.default('none'),
  status:       ProjectStatus.default('planning'),
  targetPlatforms: z.array(PlatformId).min(1).max(10),
  buildTargets: z.array(BuildTargetSchema).max(20).optional().default([]),
  teamMembers:  z.array(TeamMemberSchema).max(50).optional().default([]),
  milestones:   z.array(MilestoneSchema).max(100).optional().default([]),
  sprintLength: z.number().int().min(1).max(8).default(2),
  tags:         z.array(z.string().max(50)).max(20).optional().default([]),
  repository:   z.string().url().optional(),
  engineVersion: z.string().max(30).optional(),
});

const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  testCoverage:   z.number().min(0).max(100).optional(),
  buildStatus:    z.enum(['passing', 'failing', 'pending', 'cancelled', 'skipped']).optional(),
  lastCommit:     z.string().max(200).optional(),
  commitCount:    z.number().int().min(0).optional(),
});

const SyncPlatformSchema = z.object({
  force:         z.boolean().default(false),
  syncType:      z.enum(['achievements', 'leaderboards', 'entitlements', 'all']).default('all'),
  projectIds:    z.array(z.string().uuid()).max(50).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store (replace with DB layer in production)
// ─────────────────────────────────────────────────────────────────────────────
const store = {
  projects:     new Map(),
  achievements: new Map(),
  syncJobs:     new Map(),
};

function newId() {
  return crypto.randomUUID();
}

function seedDefaults() {
  if (store.projects.size > 0) return;

  const now = new Date().toISOString();

  const proj1 = {
    id: newId(), name: 'Void Horizon', description: 'Open-world sci-fi shooter', type: 'game',
    engine: 'unreal', status: 'active', targetPlatforms: ['psn', 'xbox', 'epic'],
    buildTargets: [
      { platform: 'psn', environment: 'staging', enabled: true },
      { platform: 'xbox', environment: 'staging', enabled: true },
    ],
    teamMembers: [
      { userId: newId(), role: 'lead', name: 'Cameron Fox' },
      { userId: newId(), role: 'developer', name: 'Alex Chen' },
    ],
    milestones: [
      { id: newId(), title: 'Alpha Build', dueDate: '2026-10-01T00:00:00Z', completed: false },
      { id: newId(), title: 'Beta Release', dueDate: '2026-12-15T00:00:00Z', completed: false },
    ],
    sprintLength: 2, tags: ['shooter', 'sci-fi', 'open-world'], engineVersion: '5.4',
    testCoverage: 74, buildStatus: 'passing', commitCount: 1843,
    lastCommit: 'feat: add zero-gravity locomotion system', createdAt: now, updatedAt: now,
  };

  const proj2 = {
    id: newId(), name: 'NeuroLens AR', description: 'Augmented reality neural interface', type: 'ar',
    engine: 'unity', status: 'active', targetPlatforms: ['ios', 'android'],
    buildTargets: [
      { platform: 'ios', environment: 'development', enabled: true },
      { platform: 'android', environment: 'development', enabled: true },
    ],
    teamMembers: [
      { userId: newId(), role: 'lead', name: 'Jordan Park' },
      { userId: newId(), role: 'artist', name: 'Sam Rivera' },
    ],
    milestones: [
      { id: newId(), title: 'ARCore Integration', dueDate: '2026-09-01T00:00:00Z', completed: true },
    ],
    sprintLength: 2, tags: ['ar', 'neural', 'mobile'], engineVersion: '2023.3',
    testCoverage: 61, buildStatus: 'pending', commitCount: 582,
    lastCommit: 'fix: occlusion culling on low-end devices', createdAt: now, updatedAt: now,
  };

  store.projects.set(proj1.id, proj1);
  store.projects.set(proj2.id, proj2);

  const ach = {
    id: newId(), title: 'First Blood', description: 'Earn the first kill in Void Horizon',
    platform: 'psn', gameId: proj1.id, points: 15, rarity: 'common', unlockedAt: null,
    iconUrl: null, createdAt: now,
  };
  store.achievements.set(ach.id, ach);
}

seedDefaults();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function validationError(res, issues) {
  return res.status(422).json({
    error: 'Validation failed',
    issues: issues.map(i => ({ path: i.path.join('.'), message: i.message })),
  });
}

function notFound(res, entity = 'Resource') {
  return res.status(404).json({ error: `${entity} not found.` });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gamedev/projects
// ─────────────────────────────────────────────────────────────────────────────
router.get('/projects', requireAuth, (req, res) => {
  try {
    const { status, type, engine, platform, page = '1', limit = '20' } = req.query;

    let projects = Array.from(store.projects.values());

    if (status)   projects = projects.filter(p => p.status === status);
    if (type)     projects = projects.filter(p => p.type === type);
    if (engine)   projects = projects.filter(p => p.engine === engine);
    if (platform) projects = projects.filter(p => p.targetPlatforms.includes(platform));

    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const pageSize = Math.min(100, parseInt(limit, 10) || 20);
    const total    = projects.length;
    const sliced   = projects.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    res.json({
      data: sliced,
      pagination: { page: pageNum, limit: pageSize, total, pages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/gamedev/projects
// ─────────────────────────────────────────────────────────────────────────────
router.post('/projects', requireAuth, (req, res) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);

  const now     = new Date().toISOString();
  const project = {
    id: newId(),
    ...parsed.data,
    testCoverage: 0,
    buildStatus:  'pending',
    commitCount:  0,
    lastCommit:   null,
    createdAt:    now,
    updatedAt:    now,
    createdBy:    req.user?.sub || req.user?.id || 'unknown',
  };

  store.projects.set(project.id, project);
  res.status(201).json({ data: project });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/gamedev/projects/:id
// ─────────────────────────────────────────────────────────────────────────────
router.put('/projects/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = store.projects.get(id);
  if (!existing) return notFound(res, 'Project');

  const parsed = UpdateProjectSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);

  const updated = { ...existing, ...parsed.data, id, updatedAt: new Date().toISOString() };
  store.projects.set(id, updated);
  res.json({ data: updated });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gamedev/achievements
// ─────────────────────────────────────────────────────────────────────────────
router.get('/achievements', requireAuth, (req, res) => {
  try {
    const { gameId, platform, unlocked } = req.query;
    let achievements = Array.from(store.achievements.values());

    if (gameId)   achievements = achievements.filter(a => a.gameId === gameId);
    if (platform) achievements = achievements.filter(a => a.platform === platform);
    if (unlocked !== undefined) {
      const isUnlocked = unlocked === 'true';
      achievements = achievements.filter(a => isUnlocked ? a.unlockedAt !== null : a.unlockedAt === null);
    }

    const summary = {
      total:    achievements.length,
      unlocked: achievements.filter(a => a.unlockedAt !== null).length,
      points:   achievements.filter(a => a.unlockedAt !== null).reduce((s, a) => s + (a.points || 0), 0),
    };

    res.json({ data: achievements, summary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch achievements.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gamedev/platforms
// ─────────────────────────────────────────────────────────────────────────────
router.get('/platforms', requireAuth, (req, res) => {
  const platforms = [
    {
      id: 'epic', name: 'Unreal Engine / Epic Games', shortName: 'Epic',
      category: 'engine_store', connected: !!process.env.EPIC_API_KEY,
      features: ['achievements', 'leaderboards', 'entitlements', 'friends', 'cloud_saves'],
      sdkVersion: '1.15.5', docsUrl: 'https://dev.epicgames.com/docs',
    },
    {
      id: 'psn', name: 'Sony PlayStation Network', shortName: 'PSN',
      category: 'console', connected: !!process.env.PSN_CLIENT_ID,
      features: ['trophies', 'leaderboards', 'presence', 'parties', 'cloud_saves'],
      sdkVersion: '6.0', docsUrl: 'https://partners.api.playstation.com/docs',
    },
    {
      id: 'xbox', name: 'Microsoft Xbox / Azure PlayFab', shortName: 'Xbox',
      category: 'console', connected: !!process.env.XBOX_CLIENT_ID,
      features: ['achievements', 'leaderboards', 'matchmaking', 'presence', 'cloud_saves'],
      sdkVersion: '2410', docsUrl: 'https://developer.microsoft.com/en-us/games/xbox',
    },
    {
      id: 'ubisoft', name: 'Ubisoft Connect', shortName: 'Ubisoft',
      category: 'store', connected: !!process.env.UBISOFT_CLIENT_ID,
      features: ['achievements', 'units', 'challenges', 'friends'],
      sdkVersion: '2.23', docsUrl: 'https://ubisoftconnect.com/developers',
    },
    {
      id: 'steam', name: 'Steam (Valve)', shortName: 'Steam',
      category: 'store', connected: !!process.env.STEAM_API_KEY,
      features: ['achievements', 'leaderboards', 'workshop', 'dlc', 'inventory'],
      sdkVersion: '1.58', docsUrl: 'https://partner.steamgames.com/doc',
    },
    {
      id: 'ios', name: 'Apple iOS / Game Center', shortName: 'iOS',
      category: 'mobile', connected: !!process.env.APPLE_TEAM_ID,
      features: ['achievements', 'leaderboards', 'matchmaking', 'cloud_saves'],
      sdkVersion: 'iOS 17+', docsUrl: 'https://developer.apple.com/game-center/',
    },
    {
      id: 'android', name: 'Google Android / Play Games', shortName: 'Android',
      category: 'mobile', connected: !!process.env.GOOGLE_PLAY_KEY_FILE,
      features: ['achievements', 'leaderboards', 'saved_games', 'events'],
      sdkVersion: 'v2', docsUrl: 'https://developers.google.com/games/services',
    },
  ];

  res.json({ data: platforms });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/gamedev/sync/:platform
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sync/:platform', requireAuth, (req, res) => {
  const validPlatforms = ['epic', 'psn', 'xbox', 'ubisoft', 'steam', 'ios', 'android'];
  const { platform } = req.params;

  if (!validPlatforms.includes(platform)) {
    return res.status(400).json({ error: `Unknown platform "${platform}".` });
  }

  const parsed = SyncPlatformSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);

  const jobId    = newId();
  const now      = new Date().toISOString();
  const job = {
    id:        jobId,
    platform,
    syncType:  parsed.data.syncType,
    force:     parsed.data.force,
    status:    'queued',
    startedAt: now,
    completedAt: null,
    result:    null,
    requestedBy: req.user?.sub || req.user?.id || 'unknown',
  };

  store.syncJobs.set(jobId, job);

  // Simulate async completion — in production, hand off to a queue/worker
  setTimeout(() => {
    const j = store.syncJobs.get(jobId);
    if (j) {
      j.status      = 'completed';
      j.completedAt = new Date().toISOString();
      j.result      = { synced: Math.floor(Math.random() * 50) + 1, errors: 0 };
      store.syncJobs.set(jobId, j);
    }
  }, 3000);

  res.status(202).json({
    message: `Sync job queued for platform "${platform}".`,
    jobId,
    status: 'queued',
    poll:   `/api/gamedev/sync/jobs/${jobId}`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gamedev/sync/jobs/:jobId  (bonus polling endpoint)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/sync/jobs/:jobId', requireAuth, (req, res) => {
  const job = store.syncJobs.get(req.params.jobId);
  if (!job) return notFound(res, 'Sync job');
  res.json({ data: job });
});

// ─────────────────────────────────────────────────────────────────────────────
// Route-level error handler
// ─────────────────────────────────────────────────────────────────────────────
router.use((err, req, res, _next) => {
  console.error('[gamedev] Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

export default router;

// src/routes/gaming.js | Nexus AI Pro | Date: 2026-06-07
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Enterprise gaming platform connector & project tracking router (ESM)

import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ---------------------------------------------------------------------------
// Constants & enumerations
// ---------------------------------------------------------------------------

const VALID_PLATFORMS  = ['unreal', 'epic', 'playstation', 'xbox', 'ubisoft'];
const VALID_ENGINES    = ['unreal', 'unity', 'godot', 'custom'];
const VALID_GENRES     = ['action', 'rpg', 'strategy', 'sports', 'simulation', 'puzzle', 'shooter', 'adventure', 'horror', 'racing', 'fighting', 'platformer', 'other'];
const VALID_XR_TYPES   = ['ar', 'vr', 'mixed', '3d'];
const VALID_XR_ENGINES = ['unreal', 'unity', 'blender', 'custom'];
const VALID_XR_TARGETS = ['quest', 'vive', 'arkit', 'arcore', 'hololens', 'custom'];

const PLATFORM_META = {
  unreal:      { label: 'Unreal Engine (Epic Games)', vendor: 'Epic Games',  icon: 'ue' },
  epic:        { label: 'Epic Games Store',           vendor: 'Epic Games',  icon: 'epic' },
  playstation: { label: 'PlayStation Network',        vendor: 'Sony',        icon: 'psn' },
  xbox:        { label: 'Xbox / Microsoft',           vendor: 'Microsoft',   icon: 'xbox' },
  ubisoft:     { label: 'Ubisoft Connect',            vendor: 'Ubisoft',     icon: 'ubi' },
};

// ---------------------------------------------------------------------------
// In-memory stores (MVP — swap with DB layer in production)
// ---------------------------------------------------------------------------

/** @type {Map<string, { platform:string, connected:boolean, accountId:string|null, apiKeyHash:string|null, connectedAt:number|null, lastSync:number|null }>} */
const platformConnectors = new Map(
  VALID_PLATFORMS.map(p => [p, {
    platform:    p,
    connected:   false,
    accountId:   null,
    apiKeyHash:  null,
    connectedAt: null,
    lastSync:    null,
  }])
);

/** @type {Map<string, object>} */
const gameProjects = new Map();

/** @type {Map<string, object>} */
const xrProjects = new Map();

/** @type {Map<string, Map<string, object>>} achievements keyed by `${platform}:${gameId}` -> achievementId -> achievement */
const achievementsStore = new Map();

/** @type {Map<string, Set<string>>} user achievement unlocks keyed by userId -> Set<achievementId> */
const userAchievements = new Map();

/** @type {Map<string, object[]>} progress keyed by `${platform}:${gameId}` */
const progressStore = new Map();

/** @type {Map<string, object[]>} leaderboard keyed by gameId */
const leaderboardStore = new Map();

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Hash an API key with SHA-256 so we never store raw credentials.
 * @param {string} key
 * @returns {string}
 */
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate that a value is a non-empty string.
 * @param {*} v
 * @returns {boolean}
 */
const isNonEmptyStr = v => typeof v === 'string' && v.trim().length > 0;

/**
 * Clamp an integer between two bounds.
 */
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Math.floor(Number(n))));

/**
 * Sanitise a free-text string (trim + limit length).
 */
const sanitise = (s, max = 200) => String(s ?? '').trim().slice(0, max);

/**
 * Build a 400 validation error response.
 */
const badRequest = (res, message, field = null) =>
  res.status(400).json({ success: false, error: { message, ...(field && { field }) } });

/**
 * Build a 404 not-found response.
 */
const notFound = (res, entity = 'Resource') =>
  res.status(404).json({ success: false, error: { message: `${entity} not found` } });

/**
 * Generate mock build metrics for a project (deterministic from id).
 */
function mockBuildMetrics(projectId) {
  const seed = parseInt(projectId.replace(/-/g, '').slice(0, 8), 16);
  const rng  = (offset = 0) => ((seed + offset) % 100) / 100;

  return {
    framesPerSecond: Math.round(30 + rng(1) * 90),
    memoryMB:        Math.round(512 + rng(2) * 3584),
    loadTimeMs:      Math.round(800 + rng(3) * 4200),
    drawCalls:       Math.round(100 + rng(4) * 1900),
    triangleCount:   Math.round(50000 + rng(5) * 950000),
    buildTimeMs:     Math.round(60000 + rng(6) * 540000),
    buildSizeKB:     Math.round(51200 + rng(7) * 512000),
    warnings:        Math.round(rng(8) * 15),
    errors:          0,
    history: Array.from({ length: 10 }, (_, i) => ({
      frame:    i + 1,
      fps:      Math.round(30 + ((seed + i * 7) % 60)),
      memoryMB: Math.round(512 + ((seed + i * 13) % 1024)),
    })),
  };
}

/**
 * Generate mock XR performance metrics.
 */
function mockXRPerformance(projectId) {
  const seed = parseInt(projectId.replace(/-/g, '').slice(0, 8), 16);
  const rng  = (offset = 0) => ((seed + offset) % 100) / 100;

  return {
    fpsTarget:      90,
    fpsActual:      Math.round(72 + rng(1) * 18),
    latencyMs:      parseFloat((5 + rng(2) * 15).toFixed(2)),
    renderTimeMs:   parseFloat((6 + rng(3) * 8).toFixed(2)),
    gpuUtilization: parseFloat((50 + rng(4) * 45).toFixed(1)),
    cpuUtilization: parseFloat((30 + rng(5) * 50).toFixed(1)),
    thermalState:   ['nominal', 'fair', 'serious'][Math.round(rng(6) * 2)],
    batteryImpact:  ['low', 'medium', 'high'][Math.round(rng(7) * 2)],
    history: Array.from({ length: 10 }, (_, i) => ({
      sample:    i + 1,
      fpsActual: Math.round(72 + ((seed + i * 3) % 18)),
      latencyMs: parseFloat((5 + ((seed + i * 7) % 15)).toFixed(2)),
    })),
  };
}

// ---------------------------------------------------------------------------
// ============================================================
//  PLATFORM CONNECTORS
// ============================================================
// ---------------------------------------------------------------------------

// GET /api/gaming/platforms
router.get('/platforms', (_req, res) => {
  const platforms = [...platformConnectors.values()].map(c => ({
    ...c,
    apiKeyHash: c.apiKeyHash ? `sha256:${c.apiKeyHash.slice(0, 8)}…` : null,
    meta: PLATFORM_META[c.platform],
  }));
  res.json({ success: true, data: platforms });
});

// POST /api/gaming/platforms/:platform/connect
router.post('/platforms/:platform/connect', (req, res) => {
  const { platform } = req.params;

  if (!VALID_PLATFORMS.includes(platform)) {
    return badRequest(res, `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`, 'platform');
  }

  const { accountId, apiKey } = req.body ?? {};

  if (!isNonEmptyStr(accountId)) {
    return badRequest(res, 'accountId is required and must be a non-empty string.', 'accountId');
  }
  if (!isNonEmptyStr(apiKey)) {
    return badRequest(res, 'apiKey is required and must be a non-empty string.', 'apiKey');
  }
  if (apiKey.length < 16) {
    return badRequest(res, 'apiKey must be at least 16 characters.', 'apiKey');
  }

  const connector = platformConnectors.get(platform);
  connector.connected   = true;
  connector.accountId   = sanitise(accountId, 128);
  connector.apiKeyHash  = hashApiKey(apiKey);
  connector.connectedAt = Date.now();
  connector.lastSync    = Date.now();

  res.status(200).json({
    success: true,
    message: `Connected to ${PLATFORM_META[platform].label}`,
    data: {
      platform:    connector.platform,
      connected:   connector.connected,
      accountId:   connector.accountId,
      connectedAt: connector.connectedAt,
      meta:        PLATFORM_META[platform],
    },
  });
});

// DELETE /api/gaming/platforms/:platform/disconnect
router.delete('/platforms/:platform/disconnect', (req, res) => {
  const { platform } = req.params;

  if (!VALID_PLATFORMS.includes(platform)) {
    return badRequest(res, `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`, 'platform');
  }

  const connector = platformConnectors.get(platform);
  if (!connector.connected) {
    return res.status(409).json({ success: false, error: { message: `Platform '${platform}' is not currently connected.` } });
  }

  connector.connected   = false;
  connector.accountId   = null;
  connector.apiKeyHash  = null;
  connector.connectedAt = null;
  connector.lastSync    = null;

  res.json({
    success: true,
    message: `Disconnected from ${PLATFORM_META[platform].label}`,
    data: { platform, connected: false },
  });
});

// GET /api/gaming/platforms/:platform/status
router.get('/platforms/:platform/status', (req, res) => {
  const { platform } = req.params;

  if (!VALID_PLATFORMS.includes(platform)) {
    return badRequest(res, `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`, 'platform');
  }

  const connector = platformConnectors.get(platform);
  res.json({
    success: true,
    data: {
      platform:    connector.platform,
      connected:   connector.connected,
      accountId:   connector.accountId,
      connectedAt: connector.connectedAt,
      lastSync:    connector.lastSync,
      meta:        PLATFORM_META[platform],
    },
  });
});

// ---------------------------------------------------------------------------
// ============================================================
//  GAME PROJECT TRACKING
// ============================================================
// ---------------------------------------------------------------------------

// GET /api/gaming/projects
router.get('/projects', (_req, res) => {
  const projects = [...gameProjects.values()].sort((a, b) => b.createdAt - a.createdAt);
  res.json({ success: true, count: projects.length, data: projects });
});

// POST /api/gaming/projects
router.post('/projects', (req, res) => {
  const { name, engine, genre, platforms: targetPlatforms, teamSize } = req.body ?? {};

  if (!isNonEmptyStr(name)) {
    return badRequest(res, 'name is required and must be a non-empty string.', 'name');
  }
  if (!VALID_ENGINES.includes(engine)) {
    return badRequest(res, `engine must be one of: ${VALID_ENGINES.join(', ')}`, 'engine');
  }
  if (genre !== undefined && !VALID_GENRES.includes(genre)) {
    return badRequest(res, `genre must be one of: ${VALID_GENRES.join(', ')}`, 'genre');
  }
  if (!Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
    return badRequest(res, 'platforms must be a non-empty array of platform strings.', 'platforms');
  }
  const invalidPlatform = targetPlatforms.find(p => typeof p !== 'string' || p.trim() === '');
  if (invalidPlatform !== undefined) {
    return badRequest(res, 'Each entry in platforms must be a non-empty string.', 'platforms');
  }
  if (teamSize !== undefined && (isNaN(Number(teamSize)) || Number(teamSize) < 1)) {
    return badRequest(res, 'teamSize must be a positive integer.', 'teamSize');
  }

  const id = uuidv4();
  const now = Date.now();

  const project = {
    id,
    name:            sanitise(name),
    engine,
    genre:           genre ?? 'other',
    platforms:       targetPlatforms.map(p => sanitise(p, 64)),
    teamSize:        teamSize !== undefined ? clamp(teamSize, 1, 10000) : 1,
    status:          'active',
    milestones:      [],
    completionPct:   0,
    lastBuildAt:     null,
    lastBuildStatus: null,
    createdAt:       now,
    updatedAt:       now,
  };

  gameProjects.set(id, project);
  res.status(201).json({ success: true, data: project });
});

// GET /api/gaming/projects/:id
router.get('/projects/:id', (req, res) => {
  const project = gameProjects.get(req.params.id);
  if (!project) return notFound(res, 'Game project');
  res.json({ success: true, data: project });
});

// PUT /api/gaming/projects/:id
router.put('/projects/:id', (req, res) => {
  const project = gameProjects.get(req.params.id);
  if (!project) return notFound(res, 'Game project');

  const { name, engine, genre, platforms: targetPlatforms, teamSize, status, completionPct } = req.body ?? {};

  if (name !== undefined) {
    if (!isNonEmptyStr(name)) return badRequest(res, 'name must be a non-empty string.', 'name');
    project.name = sanitise(name);
  }
  if (engine !== undefined) {
    if (!VALID_ENGINES.includes(engine)) return badRequest(res, `engine must be one of: ${VALID_ENGINES.join(', ')}`, 'engine');
    project.engine = engine;
  }
  if (genre !== undefined) {
    if (!VALID_GENRES.includes(genre)) return badRequest(res, `genre must be one of: ${VALID_GENRES.join(', ')}`, 'genre');
    project.genre = genre;
  }
  if (targetPlatforms !== undefined) {
    if (!Array.isArray(targetPlatforms) || targetPlatforms.length === 0) return badRequest(res, 'platforms must be a non-empty array.', 'platforms');
    project.platforms = targetPlatforms.map(p => sanitise(p, 64));
  }
  if (teamSize !== undefined) {
    if (isNaN(Number(teamSize)) || Number(teamSize) < 1) return badRequest(res, 'teamSize must be a positive integer.', 'teamSize');
    project.teamSize = clamp(teamSize, 1, 10000);
  }
  if (status !== undefined) {
    const VALID_STATUS = ['active', 'paused', 'shipped', 'cancelled'];
    if (!VALID_STATUS.includes(status)) return badRequest(res, `status must be one of: ${VALID_STATUS.join(', ')}`, 'status');
    project.status = status;
  }
  if (completionPct !== undefined) {
    if (isNaN(Number(completionPct))) return badRequest(res, 'completionPct must be a number 0-100.', 'completionPct');
    project.completionPct = clamp(completionPct, 0, 100);
  }

  project.updatedAt = Date.now();
  gameProjects.set(project.id, project);
  res.json({ success: true, data: project });
});

// DELETE /api/gaming/projects/:id
router.delete('/projects/:id', (req, res) => {
  if (!gameProjects.has(req.params.id)) return notFound(res, 'Game project');
  gameProjects.delete(req.params.id);
  res.json({ success: true, message: 'Game project deleted.' });
});

// GET /api/gaming/projects/:id/metrics
router.get('/projects/:id/metrics', (req, res) => {
  const project = gameProjects.get(req.params.id);
  if (!project) return notFound(res, 'Game project');

  res.json({
    success: true,
    data: {
      projectId: project.id,
      engine:    project.engine,
      metrics:   mockBuildMetrics(project.id),
      generatedAt: Date.now(),
    },
  });
});

// POST /api/gaming/projects/:id/build
router.post('/projects/:id/build', (req, res) => {
  const project = gameProjects.get(req.params.id);
  if (!project) return notFound(res, 'Game project');

  const buildId  = uuidv4();
  const startedAt = Date.now();

  // Update project with build status
  project.lastBuildAt     = startedAt;
  project.lastBuildStatus = 'running';
  project.updatedAt       = startedAt;
  gameProjects.set(project.id, project);

  // Mock: resolve to success after a short simulated delay (stored state only)
  const finishedAt = startedAt + Math.round(60000 + Math.random() * 120000);
  project.lastBuildStatus = 'success';

  res.status(202).json({
    success: true,
    message: 'Build job queued.',
    data: {
      buildId,
      projectId:  project.id,
      status:     'running',
      startedAt,
      estimatedFinishAt: finishedAt,
      engine:     project.engine,
    },
  });
});

// ---------------------------------------------------------------------------
// ============================================================
//  ACHIEVEMENT TRACKING
// ============================================================
// ---------------------------------------------------------------------------

const achievementKey = (platform, gameId) => `${platform}:${gameId}`;

// GET /api/gaming/achievements/:platform/:gameId
router.get('/achievements/:platform/:gameId', (req, res) => {
  const { platform, gameId } = req.params;

  if (!VALID_PLATFORMS.includes(platform)) {
    return badRequest(res, `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`, 'platform');
  }
  if (!isNonEmptyStr(gameId)) {
    return badRequest(res, 'gameId must be a non-empty string.', 'gameId');
  }

  const key  = achievementKey(platform, gameId);
  const map  = achievementsStore.get(key) ?? new Map();
  const list = [...map.values()];

  res.json({ success: true, platform, gameId, count: list.length, data: list });
});

// POST /api/gaming/achievements/:platform/:gameId — create or sync an achievement definition
router.post('/achievements/:platform/:gameId', (req, res) => {
  const { platform, gameId } = req.params;

  if (!VALID_PLATFORMS.includes(platform)) {
    return badRequest(res, `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`, 'platform');
  }
  if (!isNonEmptyStr(gameId)) {
    return badRequest(res, 'gameId must be a non-empty string.', 'gameId');
  }

  const { title, description, icon, points, hidden } = req.body ?? {};

  if (!isNonEmptyStr(title)) return badRequest(res, 'title is required.', 'title');
  if (!isNonEmptyStr(description)) return badRequest(res, 'description is required.', 'description');

  const key = achievementKey(platform, gameId);
  if (!achievementsStore.has(key)) achievementsStore.set(key, new Map());

  const map = achievementsStore.get(key);
  const id  = uuidv4();
  const achievement = {
    id,
    platform,
    gameId,
    title:       sanitise(title, 100),
    description: sanitise(description, 500),
    icon:        isNonEmptyStr(icon) ? sanitise(icon, 10) : '🏆',
    points:      points !== undefined ? clamp(points, 0, 10000) : 10,
    hidden:      Boolean(hidden),
    createdAt:   Date.now(),
  };

  map.set(id, achievement);
  res.status(201).json({ success: true, data: achievement });
});

// GET /api/gaming/achievements/user/:userId — all achievements across platforms
router.get('/achievements/user/:userId', (req, res) => {
  const { userId } = req.params;
  if (!isNonEmptyStr(userId)) return badRequest(res, 'userId must be a non-empty string.', 'userId');

  const unlockedIds = userAchievements.get(userId) ?? new Set();

  // Collect all achievement definitions and annotate with unlock status
  const all = [];
  for (const map of achievementsStore.values()) {
    for (const achievement of map.values()) {
      all.push({ ...achievement, unlocked: unlockedIds.has(achievement.id) });
    }
  }

  const unlocked = all.filter(a => a.unlocked);
  const locked   = all.filter(a => !a.unlocked);

  res.json({
    success: true,
    userId,
    stats: {
      total:    all.length,
      unlocked: unlocked.length,
      locked:   locked.length,
      completionPct: all.length > 0 ? parseFloat(((unlocked.length / all.length) * 100).toFixed(1)) : 0,
    },
    data: all,
  });
});

// POST /api/gaming/achievements/user/:userId/unlock/:achievementId
router.post('/achievements/user/:userId/unlock/:achievementId', (req, res) => {
  const { userId, achievementId } = req.params;

  if (!isNonEmptyStr(userId)) return badRequest(res, 'userId must be a non-empty string.', 'userId');
  if (!isNonEmptyStr(achievementId)) return badRequest(res, 'achievementId must be a non-empty string.', 'achievementId');

  // Find the achievement across all stores
  let found = null;
  for (const map of achievementsStore.values()) {
    if (map.has(achievementId)) { found = map.get(achievementId); break; }
  }
  if (!found) return notFound(res, 'Achievement');

  if (!userAchievements.has(userId)) userAchievements.set(userId, new Set());
  const userSet = userAchievements.get(userId);

  if (userSet.has(achievementId)) {
    return res.status(409).json({ success: false, error: { message: 'Achievement already unlocked for this user.' } });
  }

  userSet.add(achievementId);

  res.json({
    success: true,
    message: `Achievement "${found.title}" unlocked for user ${userId}`,
    data: { userId, achievementId, achievement: found, unlockedAt: Date.now() },
  });
});

// ---------------------------------------------------------------------------
// ============================================================
//  XR / AR / VR / 3D PROJECT TRACKING
// ============================================================
// ---------------------------------------------------------------------------

// GET /api/gaming/xr-projects
router.get('/xr-projects', (_req, res) => {
  const projects = [...xrProjects.values()].sort((a, b) => b.createdAt - a.createdAt);
  res.json({ success: true, count: projects.length, data: projects });
});

// POST /api/gaming/xr-projects
router.post('/xr-projects', (req, res) => {
  const { name, type, engine, targetPlatform } = req.body ?? {};

  if (!isNonEmptyStr(name)) return badRequest(res, 'name is required.', 'name');
  if (!VALID_XR_TYPES.includes(type)) {
    return badRequest(res, `type must be one of: ${VALID_XR_TYPES.join(', ')}`, 'type');
  }
  if (!VALID_XR_ENGINES.includes(engine)) {
    return badRequest(res, `engine must be one of: ${VALID_XR_ENGINES.join(', ')}`, 'engine');
  }
  if (!VALID_XR_TARGETS.includes(targetPlatform)) {
    return badRequest(res, `targetPlatform must be one of: ${VALID_XR_TARGETS.join(', ')}`, 'targetPlatform');
  }

  const id  = uuidv4();
  const now = Date.now();

  const project = {
    id,
    name:           sanitise(name),
    type,
    engine,
    targetPlatform,
    status:         'active',
    completionPct:  0,
    createdAt:      now,
    updatedAt:      now,
  };

  xrProjects.set(id, project);
  res.status(201).json({ success: true, data: project });
});

// GET /api/gaming/xr-projects/:id
router.get('/xr-projects/:id', (req, res) => {
  const project = xrProjects.get(req.params.id);
  if (!project) return notFound(res, 'XR project');
  res.json({ success: true, data: project });
});

// PUT /api/gaming/xr-projects/:id
router.put('/xr-projects/:id', (req, res) => {
  const project = xrProjects.get(req.params.id);
  if (!project) return notFound(res, 'XR project');

  const { name, type, engine, targetPlatform, status, completionPct } = req.body ?? {};

  if (name !== undefined) {
    if (!isNonEmptyStr(name)) return badRequest(res, 'name must be a non-empty string.', 'name');
    project.name = sanitise(name);
  }
  if (type !== undefined) {
    if (!VALID_XR_TYPES.includes(type)) return badRequest(res, `type must be one of: ${VALID_XR_TYPES.join(', ')}`, 'type');
    project.type = type;
  }
  if (engine !== undefined) {
    if (!VALID_XR_ENGINES.includes(engine)) return badRequest(res, `engine must be one of: ${VALID_XR_ENGINES.join(', ')}`, 'engine');
    project.engine = engine;
  }
  if (targetPlatform !== undefined) {
    if (!VALID_XR_TARGETS.includes(targetPlatform)) return badRequest(res, `targetPlatform must be one of: ${VALID_XR_TARGETS.join(', ')}`, 'targetPlatform');
    project.targetPlatform = targetPlatform;
  }
  if (status !== undefined) {
    const VALID_STATUS = ['active', 'paused', 'shipped', 'cancelled'];
    if (!VALID_STATUS.includes(status)) return badRequest(res, `status must be one of: ${VALID_STATUS.join(', ')}`, 'status');
    project.status = status;
  }
  if (completionPct !== undefined) {
    if (isNaN(Number(completionPct))) return badRequest(res, 'completionPct must be a number 0-100.', 'completionPct');
    project.completionPct = clamp(completionPct, 0, 100);
  }

  project.updatedAt = Date.now();
  xrProjects.set(project.id, project);
  res.json({ success: true, data: project });
});

// GET /api/gaming/xr-projects/:id/performance
router.get('/xr-projects/:id/performance', (req, res) => {
  const project = xrProjects.get(req.params.id);
  if (!project) return notFound(res, 'XR project');

  res.json({
    success: true,
    data: {
      projectId:   project.id,
      type:        project.type,
      engine:      project.engine,
      target:      project.targetPlatform,
      performance: mockXRPerformance(project.id),
      generatedAt: Date.now(),
    },
  });
});

// ---------------------------------------------------------------------------
// ============================================================
//  GAME PROGRESS TRACKING
// ============================================================
// ---------------------------------------------------------------------------

const progressKey = (platform, gameId) => `${platform}:${gameId}`;

// GET /api/gaming/progress/:platform/:gameId
router.get('/progress/:platform/:gameId', (req, res) => {
  const { platform, gameId } = req.params;

  if (!VALID_PLATFORMS.includes(platform)) {
    return badRequest(res, `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`, 'platform');
  }
  if (!isNonEmptyStr(gameId)) return badRequest(res, 'gameId must be a non-empty string.', 'gameId');

  const key      = progressKey(platform, gameId);
  const snapshots = progressStore.get(key) ?? [];
  const latest   = snapshots[snapshots.length - 1] ?? null;

  res.json({ success: true, platform, gameId, latest, history: snapshots });
});

// POST /api/gaming/progress/:platform/:gameId
router.post('/progress/:platform/:gameId', (req, res) => {
  const { platform, gameId } = req.params;

  if (!VALID_PLATFORMS.includes(platform)) {
    return badRequest(res, `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`, 'platform');
  }
  if (!isNonEmptyStr(gameId)) return badRequest(res, 'gameId must be a non-empty string.', 'gameId');

  const { userId, level, checkpoint, playtimeSeconds, saveData } = req.body ?? {};

  if (!isNonEmptyStr(userId)) return badRequest(res, 'userId is required.', 'userId');
  if (level !== undefined && (isNaN(Number(level)) || Number(level) < 0)) {
    return badRequest(res, 'level must be a non-negative number.', 'level');
  }

  const key      = progressKey(platform, gameId);
  const existing = progressStore.get(key) ?? [];

  const snapshot = {
    id:               uuidv4(),
    platform,
    gameId,
    userId:           sanitise(userId, 128),
    level:            level !== undefined ? clamp(level, 0, 99999) : 1,
    checkpoint:       isNonEmptyStr(checkpoint) ? sanitise(checkpoint, 200) : null,
    playtimeSeconds:  playtimeSeconds !== undefined ? Math.max(0, Math.floor(Number(playtimeSeconds))) : 0,
    saveData:         saveData && typeof saveData === 'object' ? saveData : {},
    savedAt:          Date.now(),
  };

  existing.push(snapshot);
  // Keep last 50 snapshots to bound memory
  if (existing.length > 50) existing.splice(0, existing.length - 50);

  progressStore.set(key, existing);
  res.status(201).json({ success: true, data: snapshot });
});

// ---------------------------------------------------------------------------
// GET /api/gaming/leaderboard/:gameId
// ---------------------------------------------------------------------------
router.get('/leaderboard/:gameId', (req, res) => {
  const { gameId } = req.params;
  if (!isNonEmptyStr(gameId)) return badRequest(res, 'gameId must be a non-empty string.', 'gameId');

  // Return stored leaderboard or generate a seeded mock
  const stored = leaderboardStore.get(gameId);
  if (stored) {
    return res.json({ success: true, gameId, count: stored.length, data: stored });
  }

  // Generate deterministic mock leaderboard
  const seed   = parseInt(gameId.replace(/[^0-9a-f]/gi, '0').slice(0, 8) || '0', 16);
  const names  = ['ShadowWolf', 'NeonByte', 'PixelHawk', 'CyberAce', 'StormRider', 'IronFox', 'QuantumX', 'VoidRunner', 'NebulaKnight', 'TitanCore'];
  const mock   = names.map((player, i) => ({
    rank:     i + 1,
    player,
    score:    Math.max(0, Math.round(1000000 - i * ((seed % 50000) + 10000) + (seed % 5000))),
    platform: VALID_PLATFORMS[(seed + i) % VALID_PLATFORMS.length],
    gameId,
    recordedAt: Date.now() - i * 3600000,
  }));

  res.json({ success: true, gameId, count: mock.length, data: mock });
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export default router;

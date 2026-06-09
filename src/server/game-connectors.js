// src/server/game-connectors.js
// Nexus AI Pro — Game Platform Connectors & Achievement/Progress Tracking
// Supported: Epic Games/Unreal, PlayStation, Xbox, Ubisoft Connect
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './middleware.js';

const router = express.Router();
router.use(requireAuth);

// ── Supported platforms ────────────────────────────────────────────────────────

export const GAME_PLATFORMS = Object.freeze({
  EPIC:         'epic',
  PLAYSTATION:  'playstation',
  XBOX:         'xbox',
  UBISOFT:      'ubisoft',
  STEAM:        'steam',
  GOG:          'gog',
  NINTENDO:     'nintendo',
});

// ── In-memory store (replace with DB in production) ───────────────────────────

const platformConnections = new Map(); // userId:platform → connection
const achievements = new Map();        // userId:platform → achievement[]
const gameProgress = new Map();        // userId:platform:gameId → progress
const unrealProjects = new Map();      // projectId → UE project data

// ── Helpers ───────────────────────────────────────────────────────────────────

function connKey(userId, platform) { return `${userId}:${platform}`; }
function progressKey(userId, platform, gameId) { return `${userId}:${platform}:${gameId}`; }

function demoAchievements(platform) {
  const catalog = [
    { id: 'first_blood',   name: 'First Blood',       desc: 'Complete the first mission',     points: 10, rarity: 'common',   unlockedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: 'speedrunner',   name: 'Speedrunner',        desc: 'Complete a level under 5 min',   points: 25, rarity: 'uncommon', unlockedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'completionist', name: 'Completionist',      desc: 'Find all collectibles',           points: 50, rarity: 'rare',    unlockedAt: null },
    { id: 'pvp_master',    name: 'PvP Master',         desc: 'Win 100 PvP matches',             points: 75, rarity: 'epic',    unlockedAt: null },
    { id: 'legendary',     name: 'Legendary',          desc: 'Reach max player level',          points: 100,rarity: 'legendary',unlockedAt: null },
    { id: 'social_butterfly','name': 'Social Butterfly','desc': 'Play with 50 different players',points: 30,rarity: 'uncommon', unlockedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  ];
  return catalog.map(a => ({ ...a, platform }));
}

function demoGameProgress(platform, gameId) {
  return {
    gameId,
    platform,
    title:         `Game Title (${gameId})`,
    completionPct: Math.round(Math.random() * 80 + 10),
    playTimeHours: +(Math.random() * 200 + 5).toFixed(1),
    lastPlayed:    new Date(Date.now() - Math.random() * 86400000 * 14).toISOString(),
    currentLevel:  Math.round(Math.random() * 50 + 1),
    maxLevel:      100,
    trophies:      { bronze: 12, silver: 5, gold: 2, platinum: 0 },
    friendRank:    Math.round(Math.random() * 20 + 1),
    globalRank:    Math.round(Math.random() * 50000 + 1000),
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/games/platforms */
router.get('/platforms', (_req, res) => {
  res.json({
    platforms: Object.entries(GAME_PLATFORMS).map(([key, value]) => ({
      id:   value,
      name: {
        epic: 'Epic Games / Unreal Engine', playstation: 'PlayStation Network',
        xbox: 'Xbox / Microsoft',           ubisoft: 'Ubisoft Connect',
        steam: 'Steam',                     gog: 'GOG Galaxy',
        nintendo: 'Nintendo Switch Online',
      }[value] || key,
    })),
  });
});

/**
 * POST /api/games/connect/:platform
 * Body: { accountId, displayName }
 * In production: complete OAuth flow with platform credentials from env.
 */
router.post('/connect/:platform', (req, res) => {
  const { platform } = req.params;
  if (!Object.values(GAME_PLATFORMS).includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  const { accountId, displayName } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });

  const userId = req.user.sub;
  platformConnections.set(connKey(userId, platform), {
    platform, accountId, displayName: displayName || accountId,
    connectedAt: new Date().toISOString(),
  });

  // Seed demo achievements
  achievements.set(connKey(userId, platform), demoAchievements(platform));

  res.json({
    success: true, platform, accountId,
    message: platform === 'epic'
      ? 'Connected to Epic Games — Unreal Engine project sync available'
      : `Connected to ${platform}`,
  });
});

/** DELETE /api/games/connect/:platform */
router.delete('/connect/:platform', (req, res) => {
  const { platform } = req.params;
  const userId = req.user.sub;
  platformConnections.delete(connKey(userId, platform));
  achievements.delete(connKey(userId, platform));
  res.json({ success: true });
});

/** GET /api/games/status — connection status for all platforms */
router.get('/status', (req, res) => {
  const userId = req.user.sub;
  const status = Object.values(GAME_PLATFORMS).map(platform => ({
    platform,
    connected: platformConnections.has(connKey(userId, platform)),
    connection: platformConnections.get(connKey(userId, platform)) || null,
  }));
  res.json({ status });
});

/** GET /api/games/achievements/:platform */
router.get('/achievements/:platform', (req, res) => {
  const { platform } = req.params;
  if (!Object.values(GAME_PLATFORMS).includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  const userId = req.user.sub;
  const conn = platformConnections.get(connKey(userId, platform));
  const list = achievements.get(connKey(userId, platform)) || demoAchievements(platform);

  const unlocked   = list.filter(a => a.unlockedAt);
  const locked     = list.filter(a => !a.unlockedAt);
  const totalPoints = unlocked.reduce((s, a) => s + a.points, 0);

  res.json({
    platform,
    connected:    !!conn,
    totalPoints,
    completion:   +(unlocked.length / list.length * 100).toFixed(1),
    unlocked,
    locked,
    total:        list.length,
  });
});

/** GET /api/games/progress/:platform — all game progress for a platform */
router.get('/progress/:platform', (req, res) => {
  const { platform } = req.params;
  if (!Object.values(GAME_PLATFORMS).includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  const userId = req.user.sub;
  // Return demo game library
  const games = ['game_001', 'game_002', 'game_003'].map(id => {
    const key = progressKey(userId, platform, id);
    return gameProgress.get(key) || demoGameProgress(platform, id);
  });

  res.json({ platform, games, total: games.length });
});

/** GET /api/games/progress/:platform/:gameId — specific game progress */
router.get('/progress/:platform/:gameId', (req, res) => {
  const { platform, gameId } = req.params;
  const userId = req.user.sub;
  const key = progressKey(userId, platform, gameId);
  const progress = gameProgress.get(key) || demoGameProgress(platform, gameId);
  res.json({ progress });
});

/** POST /api/games/progress/:platform/:gameId — update progress */
router.post('/progress/:platform/:gameId', (req, res) => {
  const { platform, gameId } = req.params;
  if (!Object.values(GAME_PLATFORMS).includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  const userId = req.user.sub;
  const key    = progressKey(userId, platform, gameId);
  const existing = gameProgress.get(key) || demoGameProgress(platform, gameId);

  const updated = { ...existing, ...req.body, lastUpdated: new Date().toISOString() };
  gameProgress.set(key, updated);

  res.json({ progress: updated });
});

// ── Unreal Engine / Epic Games project sync ───────────────────────────────────

/**
 * POST /api/games/unreal/projects
 * Registers an Unreal Engine project for tracking.
 * Body: { name, engineVersion, platform, genre, buildTarget }
 */
router.post('/unreal/projects', (req, res) => {
  const { name, engineVersion = '5.4', platform = 'PC', genre, buildTarget = 'Development' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Project name required' });

  const project = {
    id:            uuidv4(),
    userId:        req.user.sub,
    name:          name.trim(),
    engineVersion,
    platform,
    genre:         genre || 'Unknown',
    buildTarget,
    buildStatus:   'idle',
    lastBuildAt:   null,
    buildErrors:   0,
    buildWarnings: 0,
    assetCount:    0,
    polyCount:     0,
    createdAt:     new Date().toISOString(),
    updatedAt:     new Date().toISOString(),
  };

  unrealProjects.set(project.id, project);
  res.status(201).json({ project });
});

/** GET /api/games/unreal/projects — list UE projects for user */
router.get('/unreal/projects', (req, res) => {
  const userId   = req.user.sub;
  const userProjects = Array.from(unrealProjects.values()).filter(p => p.userId === userId);
  res.json({ projects: userProjects });
});

/** POST /api/games/unreal/projects/:id/build — record build result */
router.post('/unreal/projects/:id/build', (req, res) => {
  const project = unrealProjects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { status = 'success', errors = 0, warnings = 0, durationSeconds = 0 } = req.body;
  project.buildStatus   = status;
  project.buildErrors   = errors;
  project.buildWarnings = warnings;
  project.lastBuildAt   = new Date().toISOString();
  project.lastBuildDuration = durationSeconds;
  project.updatedAt     = project.lastBuildAt;
  unrealProjects.set(project.id, project);

  res.json({ project });
});

/** GET /api/games/leaderboard/:platform — top players among connected friends */
router.get('/leaderboard/:platform', (req, res) => {
  const { platform } = req.params;
  const leaderboard = Array.from({ length: 10 }, (_, i) => ({
    rank:        i + 1,
    displayName: `Player${Math.round(Math.random() * 9000 + 1000)}`,
    score:       Math.round(50000 - i * 4000 + Math.random() * 1000),
    gamesPlayed: Math.round(200 - i * 15),
    platform,
  }));
  res.json({ platform, leaderboard });
});

export default router;

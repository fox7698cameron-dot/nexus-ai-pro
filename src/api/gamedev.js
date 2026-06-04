// ================================================
// NEXUS AI PRO — Game Dev & Achievement API Module
// Connectors: Unreal/Epic, Sony PlayStation,
//             Microsoft Xbox, Ubisoft Connect
// AR/VR/3D project support
// Created: 2026-06-04
// ================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = Router();

// In-memory stores (production: PostgreSQL/Redis)
const achievementStore = new Map(); // userId -> achievement[]
const gameProgressStore = new Map(); // userId:gameId -> progress
const connectorStore = new Map();   // userId:platform -> connector config
const arvrProjectStore = new Map(); // projectId -> AR/VR metadata

// ── Platform constants ────────────────────────────────────
const GAME_PLATFORMS = Object.freeze(['epic', 'playstation', 'xbox', 'ubisoft', 'steam', 'custom']);
const AR_VR_TYPES = Object.freeze(['ar', 'vr', 'mr', 'xr', '3d_scene', '3d_model', 'animation']);

// ── Connector credential manager ──────────────────────────
// All tokens come from env vars or user-provided config (never hardcoded)
function getConnectorBaseUrl(platform) {
  const urls = {
    epic:        'https://api.epicgames.com',
    playstation: 'https://m.np.playstation.com/api',
    xbox:        'https://xbl.io/api/v2',
    ubisoft:     'https://public-ubiservices.ubi.com',
    steam:       'https://api.steampowered.com'
  };
  return urls[platform] || null;
}

function buildConnectorKey(userId, platform) {
  return `${userId}:${platform}`;
}

// ── POST /api/gamedev/connectors/connect ──────────────────
router.post('/connectors/connect', requireAuth, (req, res) => {
  const { platform, accessToken, clientId, accountId, displayName } = req.body;

  if (!GAME_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Platform must be one of: ${GAME_PLATFORMS.join(', ')}` });
  }
  if (!accessToken && !clientId) {
    return res.status(400).json({ error: 'accessToken or clientId required.' });
  }

  const key = buildConnectorKey(req.user.id, platform);
  connectorStore.set(key, {
    platform,
    accountId: accountId || req.user.id,
    displayName: displayName || platform,
    connectedAt: new Date().toISOString(),
    active: true
  });

  res.json({ success: true, platform, displayName: displayName || platform });
});

// ── GET /api/gamedev/connectors ───────────────────────────
router.get('/connectors', requireAuth, (req, res) => {
  const platforms = GAME_PLATFORMS.map(p => {
    const key = buildConnectorKey(req.user.id, p);
    const conn = connectorStore.get(key);
    return { platform: p, connected: !!conn, displayName: conn?.displayName || null, connectedAt: conn?.connectedAt || null };
  });
  res.json({ platforms });
});

// ── DELETE /api/gamedev/connectors/:platform ──────────────
router.delete('/connectors/:platform', requireAuth, (req, res) => {
  const key = buildConnectorKey(req.user.id, req.params.platform);
  connectorStore.delete(key);
  res.json({ success: true });
});

// ── POST /api/gamedev/achievements ────────────────────────
router.post('/achievements', requireAuth, (req, res) => {
  const { gameId, achievementId, name, description, platform, xp = 0, rarity = 'common', unlockedAt } = req.body;

  if (!gameId || !achievementId || !name) {
    return res.status(400).json({ error: 'gameId, achievementId, and name required.' });
  }

  const achievement = {
    id: uuidv4(),
    userId: req.user.id,
    gameId,
    achievementId,
    name,
    description: description || '',
    platform: platform || 'custom',
    xp: Number(xp),
    rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(rarity) ? rarity : 'common',
    unlockedAt: unlockedAt || new Date().toISOString()
  };

  const existing = achievementStore.get(req.user.id) || [];
  existing.push(achievement);
  achievementStore.set(req.user.id, existing);

  res.status(201).json(achievement);
});

// ── GET /api/gamedev/achievements ─────────────────────────
router.get('/achievements', requireAuth, (req, res) => {
  const { gameId, platform, rarity } = req.query;
  let achievements = achievementStore.get(req.user.id) || [];

  if (gameId) achievements = achievements.filter(a => a.gameId === gameId);
  if (platform) achievements = achievements.filter(a => a.platform === platform);
  if (rarity) achievements = achievements.filter(a => a.rarity === rarity);

  const stats = {
    total: achievements.length,
    totalXp: achievements.reduce((sum, a) => sum + a.xp, 0),
    byRarity: achievements.reduce((acc, a) => { acc[a.rarity] = (acc[a.rarity] || 0) + 1; return acc; }, {})
  };

  res.json({ achievements, stats });
});

// ── POST /api/gamedev/progress ────────────────────────────
router.post('/progress', requireAuth, (req, res) => {
  const { gameId, level, percentage, playtime, checkpoint, platform, metadata = {} } = req.body;

  if (!gameId) return res.status(400).json({ error: 'gameId required.' });

  const key = `${req.user.id}:${gameId}`;
  const existing = gameProgressStore.get(key) || {};

  const progress = {
    ...existing,
    id: existing.id || uuidv4(),
    userId: req.user.id,
    gameId,
    level: level !== undefined ? Number(level) : existing.level || 1,
    percentage: percentage !== undefined ? Math.min(100, Math.max(0, Number(percentage))) : existing.percentage || 0,
    playtime: playtime !== undefined ? Number(playtime) : existing.playtime || 0,
    checkpoint: checkpoint || existing.checkpoint || null,
    platform: platform || existing.platform || 'custom',
    metadata: { ...existing.metadata, ...metadata },
    updatedAt: new Date().toISOString()
  };

  if (!existing.id) progress.createdAt = new Date().toISOString();

  gameProgressStore.set(key, progress);
  res.json(progress);
});

// ── GET /api/gamedev/progress ─────────────────────────────
router.get('/progress', requireAuth, (req, res) => {
  const { gameId } = req.query;
  const prefix = req.user.id + ':';

  const allProgress = [...gameProgressStore.entries()]
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v);

  const filtered = gameId ? allProgress.filter(p => p.gameId === gameId) : allProgress;
  res.json({ progress: filtered });
});

// ── GET /api/gamedev/progress/:gameId ─────────────────────
router.get('/progress/:gameId', requireAuth, (req, res) => {
  const key = `${req.user.id}:${req.params.gameId}`;
  const progress = gameProgressStore.get(key);
  if (!progress) return res.status(404).json({ error: 'No progress found for this game.' });
  res.json(progress);
});

// ── POST /api/gamedev/arvr-projects ───────────────────────
router.post('/arvr-projects', requireAuth, (req, res) => {
  const { name, type, engine, targetPlatforms = [], polyCount, sdkVersion, trackingType, description } = req.body;

  if (!name || !type) return res.status(400).json({ error: 'name and type required.' });
  if (!AR_VR_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${AR_VR_TYPES.join(', ')}` });
  }

  const project = {
    id: uuidv4(),
    ownerId: req.user.id,
    name,
    type,
    engine: engine || 'unreal',
    targetPlatforms,
    polyCount: polyCount ? Number(polyCount) : null,
    sdkVersion: sdkVersion || null,
    trackingType: trackingType || null,
    description: description || '',
    status: 'active',
    frameRate: null,
    renderResolution: null,
    physicsEngine: null,
    assets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  arvrProjectStore.set(project.id, project);
  res.status(201).json(project);
});

// ── GET /api/gamedev/arvr-projects ────────────────────────
router.get('/arvr-projects', requireAuth, (req, res) => {
  const projects = [...arvrProjectStore.values()].filter(p => p.ownerId === req.user.id);
  res.json({ projects });
});

// ── PUT /api/gamedev/arvr-projects/:id ────────────────────
router.put('/arvr-projects/:id', requireAuth, (req, res) => {
  const project = arvrProjectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Access denied.' });

  const allowed = ['name', 'description', 'status', 'frameRate', 'renderResolution', 'physicsEngine', 'targetPlatforms', 'sdkVersion', 'trackingType'];
  for (const key of allowed) {
    if (key in req.body) project[key] = req.body[key];
  }
  project.updatedAt = new Date().toISOString();
  res.json(project);
});

// ── GET /api/gamedev/leaderboard ──────────────────────────
router.get('/leaderboard', requireAuth, (req, res) => {
  const { gameId, platform, limit = 10 } = req.query;

  // Build leaderboard from progress store
  let entries = [...gameProgressStore.values()];
  if (gameId) entries = entries.filter(p => p.gameId === gameId);
  if (platform) entries = entries.filter(p => p.platform === platform);

  const board = entries
    .sort((a, b) => (b.percentage - a.percentage) || (b.level - a.level))
    .slice(0, Number(limit))
    .map((p, i) => ({ rank: i + 1, userId: p.userId, gameId: p.gameId, level: p.level, percentage: p.percentage, playtime: p.playtime }));

  res.json({ leaderboard: board, gameId: gameId || 'all' });
});

// ── GET /api/gamedev/stats ────────────────────────────────
router.get('/stats', requireAuth, (req, res) => {
  const achievements = achievementStore.get(req.user.id) || [];
  const prefix = req.user.id + ':';
  const progressEntries = [...gameProgressStore.entries()].filter(([k]) => k.startsWith(prefix)).map(([, v]) => v);

  res.json({
    totalAchievements: achievements.length,
    totalXP: achievements.reduce((sum, a) => sum + a.xp, 0),
    gamesTracked: progressEntries.length,
    totalPlaytime: progressEntries.reduce((sum, p) => sum + (p.playtime || 0), 0),
    averageCompletion: progressEntries.length > 0
      ? Math.round(progressEntries.reduce((sum, p) => sum + p.percentage, 0) / progressEntries.length)
      : 0,
    connectedPlatforms: GAME_PLATFORMS.filter(p => connectorStore.has(buildConnectorKey(req.user.id, p))).length
  });
});

export { router as gamedevRouter };

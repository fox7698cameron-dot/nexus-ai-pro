// ================================================
// NEXUS AI PRO - Game Dev Routes
// ================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// ------------------------------------------------
// In-memory stores
// ------------------------------------------------
const connectors = new Map();       // key: platform, value: ConnectorRecord
const achievements = new Map();     // key: id, value: Achievement
const progressStore = new Map();    // key: gameId, value: Progress
const leaderboards = new Map();     // key: gameId, value: LeaderboardEntry[]
const builds = new Map();           // key: id, value: Build

// ------------------------------------------------
// Platform definitions
// ------------------------------------------------
const PLATFORM_DEFS = {
  unreal: {
    id: 'unreal',
    name: 'Unreal Engine',
    icon: '🎮',
    description: 'Epic Games Unreal Engine 5 integration',
    requiredFields: ['apiKey', 'projectId', 'engineVersion'],
    category: 'engine'
  },
  epic: {
    id: 'epic',
    name: 'Epic Games Store',
    icon: '🏪',
    description: 'Epic Games Store distribution & analytics',
    requiredFields: ['accessToken', 'accountId'],
    category: 'store'
  },
  sony: {
    id: 'sony',
    name: 'Sony PlayStation',
    icon: '🎮',
    description: 'PlayStation Network – PS5/PS4 DevNet',
    requiredFields: ['devNetApiKey', 'titleId', 'env'],
    category: 'console'
  },
  microsoft: {
    id: 'microsoft',
    name: 'Microsoft Xbox',
    icon: '🟢',
    description: 'Xbox Game Development – Partner Center',
    requiredFields: ['sandboxId', 'clientId', 'clientSecret'],
    category: 'console'
  },
  ubisoft: {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    icon: '🔷',
    description: 'Ubisoft Connect SDK & achievement system',
    requiredFields: ['appId', 'environment'],
    category: 'platform'
  }
};

// ------------------------------------------------
// Simple symmetric encrypt/decrypt for credentials
// ------------------------------------------------
const CRED_KEY = crypto.scryptSync(
  process.env.ENCRYPTION_SECRET || 'nexus-ai-pro-gamedev-secret',
  'gamedev-salt-v1',
  32
);

function encryptCredential(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', CRED_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

function decryptCredential(encoded) {
  const [ivHex, encHex, tagHex] = encoded.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', CRED_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final()
  ]).toString('utf8');
}

// ------------------------------------------------
// Mock data generators
// ------------------------------------------------
function mockGameProgress(gameId) {
  const seed = Array.from(gameId).reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (n) => ((seed * 9301 + 49297) % 233280) / 233280 * n;
  return {
    gameId,
    level: Math.floor(rng(99)) + 1,
    xp: Math.floor(rng(100000)),
    xpToNextLevel: 5000,
    trophies: { bronze: Math.floor(rng(20)), silver: Math.floor(rng(10)), gold: Math.floor(rng(5)), platinum: Math.floor(rng(2)) },
    completionPercentage: Math.floor(rng(90)) + 5,
    hoursPlayed: Math.floor(rng(200)) + 1,
    lastPlayedAt: Date.now() - Math.floor(rng(604800000)),
    achievements: Math.floor(rng(40)) + 1,
    totalAchievements: 50
  };
}

function mockLeaderboard(gameId) {
  const names = ['ShadowFox', 'NeonBlade', 'PixelKnight', 'StarCrusher', 'VoidWalker', 'CyberPunk42', 'UltraMax', 'GhostReaper', 'DataRaven', 'NexusPro'];
  return names.map((name, i) => ({
    rank: i + 1,
    username: name,
    score: Math.max(0, 1000000 - i * Math.floor(Math.random() * 50000)),
    level: Math.floor(Math.random() * 50) + 50 - i * 3,
    country: ['US', 'JP', 'DE', 'GB', 'KR', 'CA', 'AU', 'FR', 'BR', 'MX'][i],
    updatedAt: Date.now() - i * 3600000
  }));
}

function mockAnalytics(gameId) {
  const now = Date.now();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now - (29 - i) * 86400000);
    return {
      date: d.toISOString().split('T')[0],
      dailyActiveUsers: Math.floor(Math.random() * 5000) + 1000,
      newUsers: Math.floor(Math.random() * 500) + 50,
      sessions: Math.floor(Math.random() * 8000) + 2000,
      avgSessionMinutes: Math.floor(Math.random() * 30) + 15,
      revenue: Math.floor(Math.random() * 2000) + 200
    };
  });

  return {
    gameId,
    period: '30d',
    totalPlayers: Math.floor(Math.random() * 100000) + 5000,
    monthlyActiveUsers: Math.floor(Math.random() * 50000) + 2000,
    retention: {
      day1: Math.floor(Math.random() * 20) + 35,  // 35-55%
      day7: Math.floor(Math.random() * 15) + 20,  // 20-35%
      day30: Math.floor(Math.random() * 10) + 10  // 10-20%
    },
    avgSessionMinutes: Math.floor(Math.random() * 20) + 20,
    totalRevenue: Math.floor(Math.random() * 50000) + 5000,
    avgRevenuePerUser: parseFloat((Math.random() * 5 + 1).toFixed(2)),
    dailyStats: days,
    topCountries: [
      { country: 'US', players: 12500 },
      { country: 'JP', players: 8700 },
      { country: 'DE', players: 5200 },
      { country: 'GB', players: 4800 },
      { country: 'KR', players: 4100 }
    ],
    generatedAt: now
  };
}

// ------------------------------------------------
// Seed demo data
// ------------------------------------------------
(function seedDemoData() {
  const demoAchievements = [
    { name: 'First Blood', description: 'Win your first match', points: 10, icon: '🩸', condition: 'wins >= 1', platform: 'all' },
    { name: 'Speed Demon', description: 'Complete a level in under 60 seconds', points: 25, icon: '⚡', condition: 'levelTime < 60', platform: 'all' },
    { name: 'Platinum Hunter', description: 'Earn all trophies in a game', points: 100, icon: '💎', condition: 'trophies.platinum >= 1', platform: 'sony' },
    { name: 'Gamerscore Legend', description: 'Reach 10,000 Gamerscore', points: 50, icon: '🟢', condition: 'gamerscore >= 10000', platform: 'microsoft' }
  ];

  for (const a of demoAchievements) {
    const id = uuidv4();
    achievements.set(id, { id, ...a, createdAt: Date.now(), updatedAt: Date.now() });
  }

  const demoBuilds = [
    { platform: 'windows', version: '1.2.0', status: 'success', buildTimeSeconds: 245, sizeBytes: 2500000000, notes: 'RC build' },
    { platform: 'ps5', version: '1.2.0', status: 'success', buildTimeSeconds: 310, sizeBytes: 3200000000, notes: 'Cert submission' },
    { platform: 'xbox', version: '1.1.5', status: 'failed', buildTimeSeconds: 180, sizeBytes: 0, notes: 'Shader compile error' },
    { platform: 'steam', version: '1.2.0', status: 'success', buildTimeSeconds: 260, sizeBytes: 2600000000, notes: 'Steam Deck verified' }
  ];

  for (const b of demoBuilds) {
    const id = uuidv4();
    builds.set(id, { id, ...b, createdAt: Date.now() - Math.floor(Math.random() * 604800000), updatedAt: Date.now() });
  }
})();

// ================================================
// ROUTES
// ================================================

// ------------------------------------------------
// GET /api/gamedev/connectors
// ------------------------------------------------
router.get('/connectors', (req, res) => {
  const result = Object.values(PLATFORM_DEFS).map(def => {
    const conn = connectors.get(def.id);
    return {
      ...def,
      connected: !!conn,
      connectedAt: conn?.connectedAt || null,
      lastSyncAt: conn?.lastSyncAt || null,
      accountLabel: conn?.accountLabel || null
    };
  });
  res.json({ connectors: result });
});

// ------------------------------------------------
// POST /api/gamedev/connectors/:platform/connect
// ------------------------------------------------
router.post('/connectors/:platform/connect', (req, res) => {
  const { platform } = req.params;
  const def = PLATFORM_DEFS[platform];
  if (!def) return res.status(404).json({ error: `Unknown platform: ${platform}` });

  const missing = def.requiredFields.filter(f => !req.body[f]);
  if (missing.length > 0) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

  // Encrypt all credential fields
  const encryptedCreds = {};
  for (const field of def.requiredFields) {
    encryptedCreds[field] = encryptCredential(String(req.body[field]));
  }

  const record = {
    platform,
    encryptedCreds,
    accountLabel: req.body.accountId || req.body.titleId || req.body.appId || req.body.projectId || platform,
    connectedAt: Date.now(),
    lastSyncAt: Date.now()
  };

  connectors.set(platform, record);
  res.json({ success: true, platform, connectedAt: record.connectedAt, accountLabel: record.accountLabel });
});

// ------------------------------------------------
// DELETE /api/gamedev/connectors/:platform/disconnect
// ------------------------------------------------
router.delete('/connectors/:platform/disconnect', (req, res) => {
  const { platform } = req.params;
  if (!PLATFORM_DEFS[platform]) return res.status(404).json({ error: `Unknown platform: ${platform}` });

  const was = connectors.has(platform);
  connectors.delete(platform);
  res.json({ success: true, platform, wasConnected: was });
});

// ------------------------------------------------
// GET /api/gamedev/achievements
// ------------------------------------------------
router.get('/achievements', (req, res) => {
  const { platform } = req.query;
  let list = Array.from(achievements.values());
  if (platform) list = list.filter(a => a.platform === platform || a.platform === 'all');
  res.json({ achievements: list, total: list.length });
});

// ------------------------------------------------
// POST /api/gamedev/achievements
// ------------------------------------------------
router.post('/achievements', (req, res) => {
  const { name, description, points, icon, condition, platform } = req.body;
  if (!name || !description) return res.status(400).json({ error: 'name and description are required' });

  const now = Date.now();
  const achievement = {
    id: uuidv4(),
    name: name.trim(),
    description: description.trim(),
    points: Number(points) || 10,
    icon: icon || '🏆',
    condition: condition || '',
    platform: platform || 'all',
    createdAt: now,
    updatedAt: now
  };

  achievements.set(achievement.id, achievement);
  res.status(201).json(achievement);
});

// ------------------------------------------------
// GET /api/gamedev/achievements/:id
// ------------------------------------------------
router.get('/achievements/:id', (req, res) => {
  const a = achievements.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Achievement not found' });
  res.json(a);
});

// ------------------------------------------------
// PUT /api/gamedev/achievements/:id
// ------------------------------------------------
router.put('/achievements/:id', (req, res) => {
  const existing = achievements.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Achievement not found' });

  const { name, description, points, icon, condition, platform } = req.body;
  const updated = {
    ...existing,
    ...(name !== undefined && { name: name.trim() }),
    ...(description !== undefined && { description: description.trim() }),
    ...(points !== undefined && { points: Number(points) }),
    ...(icon !== undefined && { icon }),
    ...(condition !== undefined && { condition }),
    ...(platform !== undefined && { platform }),
    updatedAt: Date.now()
  };

  achievements.set(req.params.id, updated);
  res.json(updated);
});

// ------------------------------------------------
// GET /api/gamedev/progress/:gameId
// ------------------------------------------------
router.get('/progress/:gameId', (req, res) => {
  const { gameId } = req.params;
  const stored = progressStore.get(gameId);
  res.json(stored || mockGameProgress(gameId));
});

// ------------------------------------------------
// POST /api/gamedev/progress/:gameId
// ------------------------------------------------
router.post('/progress/:gameId', (req, res) => {
  const { gameId } = req.params;
  const existing = progressStore.get(gameId) || mockGameProgress(gameId);
  const updated = { ...existing, ...req.body, gameId, updatedAt: Date.now() };
  progressStore.set(gameId, updated);
  res.json(updated);
});

// ------------------------------------------------
// GET /api/gamedev/leaderboard/:gameId
// ------------------------------------------------
router.get('/leaderboard/:gameId', (req, res) => {
  const { gameId } = req.params;
  const stored = leaderboards.get(gameId);
  const board = stored || mockLeaderboard(gameId);
  if (!stored) leaderboards.set(gameId, board);

  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  res.json({ gameId, leaderboard: board.slice(0, limit), total: board.length });
});

// ------------------------------------------------
// GET /api/gamedev/builds
// ------------------------------------------------
router.get('/builds', (req, res) => {
  const { platform, status } = req.query;
  let list = Array.from(builds.values());
  if (platform) list = list.filter(b => b.platform === platform);
  if (status) list = list.filter(b => b.status === status);
  list.sort((a, b) => b.createdAt - a.createdAt);
  res.json({ builds: list, total: list.length });
});

// ------------------------------------------------
// POST /api/gamedev/builds
// ------------------------------------------------
router.post('/builds', (req, res) => {
  const { platform, version, status, buildTimeSeconds, sizeBytes, notes } = req.body;
  if (!platform || !version) return res.status(400).json({ error: 'platform and version are required' });

  const validStatuses = ['pending', 'running', 'success', 'failed', 'cancelled'];
  const buildStatus = validStatuses.includes(status) ? status : 'pending';

  const now = Date.now();
  const build = {
    id: uuidv4(),
    platform,
    version,
    status: buildStatus,
    buildTimeSeconds: Number(buildTimeSeconds) || 0,
    sizeBytes: Number(sizeBytes) || 0,
    notes: notes || '',
    createdAt: now,
    updatedAt: now
  };

  builds.set(build.id, build);
  res.status(201).json(build);
});

// ------------------------------------------------
// GET /api/gamedev/analytics/:gameId
// ------------------------------------------------
router.get('/analytics/:gameId', (req, res) => {
  const { gameId } = req.params;
  res.json(mockAnalytics(gameId));
});

export default router;

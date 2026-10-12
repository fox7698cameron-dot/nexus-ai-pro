// Nexus AI Pro - Game Dev Connectors Routes | 2026-10-12
import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

const CONNECTORS = {
  unreal: { name: 'Unreal Engine / Epic Games', provider: 'epic', authUrl: 'https://www.epicgames.com/id/authorize' },
  playstation: { name: 'PlayStation Network', provider: 'sony', authUrl: 'https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorize' },
  xbox: { name: 'Xbox Live / Microsoft', provider: 'microsoft', authUrl: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize' },
  ubisoft: { name: 'Ubisoft Connect', provider: 'ubisoft', authUrl: 'https://connect.ubisoft.com/authorize' },
  steam: { name: 'Steam', provider: 'valve', authUrl: 'https://steamcommunity.com/openid/login' },
  nintendoswitch: { name: 'Nintendo Switch Online', provider: 'nintendo', authUrl: 'https://accounts.nintendo.com/connect/1.0.0/authorize' },
  itch: { name: 'itch.io', provider: 'itch', authUrl: 'https://itch.io/user/oauth' },
};

// In-memory connection store (production: encrypted DB)
const connectorStates = new Map();
const achievementCache = new Map();
const gameProgressCache = new Map();

// GET /api/gamedev/connectors
router.get('/connectors', (req, res) => {
  const result = {};
  for (const [key, info] of Object.entries(CONNECTORS)) {
    const state = connectorStates.get(key) || {};
    result[key] = {
      ...info,
      connected: !!state.connected,
      accountId: state.accountId || null,
      displayName: state.displayName || null,
      lastSync: state.lastSync || null,
      achievementCount: achievementCache.get(key)?.length || 0,
      activeGames: gameProgressCache.get(key)?.length || 0,
    };
  }
  res.json(result);
});

// GET /api/gamedev/connectors/:platform
router.get('/connectors/:platform', (req, res) => {
  const { platform } = req.params;
  if (!CONNECTORS[platform]) return res.status(404).json({ error: 'Unknown platform' });

  const state = connectorStates.get(platform) || {};
  const info = CONNECTORS[platform];
  res.json({
    ...info,
    platform,
    connected: !!state.connected,
    accountId: state.accountId,
    displayName: state.displayName,
    lastSync: state.lastSync,
    achievements: achievementCache.get(platform) || [],
    games: gameProgressCache.get(platform) || [],
  });
});

// POST /api/gamedev/connectors/:platform/connect
router.post('/connectors/:platform/connect', (req, res) => {
  const { platform } = req.params;
  if (!CONNECTORS[platform]) return res.status(404).json({ error: 'Unknown platform' });

  const { accountId, displayName, accessToken } = req.body;
  if (!accountId || !accessToken) return res.status(400).json({ error: 'Account ID and access token required' });

  // Never store raw tokens in state visible to client
  connectorStates.set(platform, {
    connected: true,
    accountId,
    displayName: displayName || accountId,
    connectedAt: new Date().toISOString(),
    lastSync: null,
    tokenRef: crypto.createHash('sha256').update(accessToken).digest('hex').slice(0, 8),
  });

  res.json({ platform, connected: true, accountId, displayName });
});

// DELETE /api/gamedev/connectors/:platform/disconnect
router.delete('/connectors/:platform/disconnect', (req, res) => {
  const { platform } = req.params;
  connectorStates.delete(platform);
  achievementCache.delete(platform);
  gameProgressCache.delete(platform);
  res.json({ platform, connected: false });
});

// POST /api/gamedev/connectors/:platform/sync
router.post('/connectors/:platform/sync', async (req, res) => {
  const { platform } = req.params;
  const state = connectorStates.get(platform);
  if (!state?.connected) return res.status(400).json({ error: `${platform} not connected` });

  // Production: call platform API with stored OAuth token
  // Update last sync timestamp
  connectorStates.set(platform, { ...state, lastSync: new Date().toISOString() });

  if (router.io) router.io.emit('gamedev:sync', { platform, status: 'complete' });
  res.json({ platform, synced: true, lastSync: new Date().toISOString() });
});

// GET /api/gamedev/achievements/:platform
router.get('/achievements/:platform', (req, res) => {
  const { platform } = req.params;
  if (!CONNECTORS[platform]) return res.status(404).json({ error: 'Unknown platform' });
  res.json({ platform, achievements: achievementCache.get(platform) || [] });
});

// POST /api/gamedev/achievements/:platform - ingest achievement data
router.post('/achievements/:platform', (req, res) => {
  const { platform } = req.params;
  if (!CONNECTORS[platform]) return res.status(404).json({ error: 'Unknown platform' });

  const { achievements } = req.body;
  if (!Array.isArray(achievements)) return res.status(400).json({ error: 'achievements array required' });

  achievementCache.set(platform, achievements.map(a => ({
    id: a.id || crypto.randomUUID(),
    title: a.title || 'Unknown',
    description: a.description || '',
    earned: !!a.earned,
    earnedAt: a.earnedAt || null,
    rarity: a.rarity || 'common',
    points: a.points || 0,
    imageUrl: a.imageUrl || null,
    gameId: a.gameId || null,
    gameName: a.gameName || null,
  })));

  if (router.io) router.io.emit('gamedev:achievements', { platform, count: achievements.length });
  res.json({ platform, count: achievements.length, synced: true });
});

// GET /api/gamedev/progress/:platform
router.get('/progress/:platform', (req, res) => {
  const { platform } = req.params;
  if (!CONNECTORS[platform]) return res.status(404).json({ error: 'Unknown platform' });
  res.json({ platform, games: gameProgressCache.get(platform) || [] });
});

// POST /api/gamedev/progress/:platform - ingest game progress
router.post('/progress/:platform', (req, res) => {
  const { platform } = req.params;
  if (!CONNECTORS[platform]) return res.status(404).json({ error: 'Unknown platform' });

  const { games } = req.body;
  if (!Array.isArray(games)) return res.status(400).json({ error: 'games array required' });

  gameProgressCache.set(platform, games.map(g => ({
    id: g.id || crypto.randomUUID(),
    title: g.title || 'Unknown',
    completionPercent: Math.min(100, Math.max(0, g.completionPercent || 0)),
    lastPlayed: g.lastPlayed || null,
    hoursPlayed: g.hoursPlayed || 0,
    currentLevel: g.currentLevel || null,
    achievementsEarned: g.achievementsEarned || 0,
    achievementsTotal: g.achievementsTotal || 0,
    platform,
  })));

  if (router.io) router.io.emit('gamedev:progress', { platform, count: games.length });
  res.json({ platform, count: games.length, synced: true });
});

// GET /api/gamedev/leaderboard/:gameId
router.get('/leaderboard/:gameId', (req, res) => {
  const { gameId } = req.params;
  const { platform } = req.query;
  // In production: aggregate from connected platform APIs
  res.json({ gameId, platform, leaderboard: [], generatedAt: new Date().toISOString() });
});

export { router as gamedevRouter };

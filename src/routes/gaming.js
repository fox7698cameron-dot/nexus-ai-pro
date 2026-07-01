// ================================================
// NEXUS AI PRO - Gaming Routes
// File: src/routes/gaming.js
// Updated: 2026-07-01
// Connectors: Unreal/Epic, Sony PSN, Xbox,
//             Ubisoft Connect, Steam
// Achievement + progress tracking
// ================================================

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getEpicAuthToken, getPSNProfile, getXboxProfile,
  getUbisoftAuthToken, getSteamPlayerSummary, getSteamAchievements,
  CONNECTORS,
} from '../services/connectorService.js';

const router = Router();

const GAMING_PLATFORMS = ['epic_games', 'playstation', 'xbox', 'ubisoft', 'steam', 'nintendo', 'other'];
const GAME_GENRES = ['action', 'rpg', 'fps', 'strategy', 'puzzle', 'sports', 'racing', 'simulation', 'platformer', 'mmo', 'br', 'vr', 'ar', 'indie', 'other'];
const PROJECT_STAGES = ['concept', 'pre_production', 'production', 'alpha', 'beta', 'release_candidate', 'released', 'post_launch'];

function ok(req, res) {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ error: 'Validation failed', details: e.array() }); return false; }
  return true;
}

// ── GET /api/gaming/platforms ─────────────────────────────────────────────

router.get('/platforms', requireAuth, (req, res) => {
  res.json({
    platforms: [
      { id: 'epic_games', name: 'Epic Games / Unreal Engine', icon: 'epic', connected: false },
      { id: 'playstation', name: 'PlayStation Network', icon: 'psn', connected: false },
      { id: 'xbox', name: 'Xbox / Microsoft', icon: 'xbox', connected: false },
      { id: 'ubisoft', name: 'Ubisoft Connect', icon: 'ubisoft', connected: false },
      { id: 'steam', name: 'Steam', icon: 'steam', connected: false },
    ],
  });
});

// ── POST /api/gaming/connect/:platform ────────────────────────────────────

router.post(
  '/connect/:platform',
  requireAuth,
  [param('platform').isIn(GAMING_PLATFORMS), body('accessToken').optional().isString(), body('config').optional().isObject()],
  async (req, res) => {
    if (!ok(req, res)) return;
    const { platform } = req.params;
    const { accessToken, config = {} } = req.body;
    const db = req.app.locals.db;
    try {
      await db.query(
        `INSERT INTO gaming_accounts (id, user_id, platform, access_token, config, is_active, connected_at)
         VALUES ($1,$2,$3,$4,$5,true,NOW())
         ON CONFLICT (user_id, platform)
         DO UPDATE SET access_token=$3, config=$4, is_active=true, connected_at=NOW()`,
        [uuidv4(), req.user.sub, platform, accessToken || null, JSON.stringify(config)]
      );
      return res.json({ success: true, platform, connected: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /api/gaming/profile/:platform ────────────────────────────────────

router.get('/profile/:platform', requireAuth, [param('platform').isIn(GAMING_PLATFORMS)], async (req, res) => {
  if (!ok(req, res)) return;
  const { platform } = req.params;
  const db = req.app.locals.db;
  const row = await db.query(
    'SELECT access_token, config FROM gaming_accounts WHERE user_id = $1 AND platform = $2 AND is_active = true',
    [req.user.sub, platform]
  );
  if (row.rows.length === 0) return res.status(404).json({ error: 'Platform not connected' });
  const { access_token: token, config } = row.rows[0];
  try {
    let profile;
    switch (platform) {
      case 'playstation': profile = await getPSNProfile(token); break;
      case 'xbox': profile = await getXboxProfile(token); break;
      case 'steam': profile = await getSteamPlayerSummary(config?.steamId); break;
      case 'epic_games': profile = await getEpicAuthToken(); break;
      case 'ubisoft': profile = await getUbisoftAuthToken(); break;
      default: profile = { platform };
    }
    return res.json(profile);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/gaming/achievements ─────────────────────────────────────────

router.get('/achievements', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const { platform, gameId, limit = 50 } = req.query;
  let query = 'SELECT * FROM game_achievements WHERE user_id = $1';
  const params = [req.user.sub];
  if (platform && GAMING_PLATFORMS.includes(platform)) { params.push(platform); query += ` AND platform = $${params.length}`; }
  if (gameId) { params.push(gameId); query += ` AND game_id = $${params.length}`; }
  query += ` ORDER BY unlocked_at DESC NULLS LAST LIMIT $${params.length + 1}`;
  params.push(Math.min(parseInt(limit) || 50, 200));
  const result = await db.query(query, params);
  return res.json(result.rows);
});

// ── POST /api/gaming/achievements/sync ───────────────────────────────────

router.post('/achievements/sync', requireAuth, async (req, res) => {
  const { platform, gameId, steamId } = req.body;
  if (!GAMING_PLATFORMS.includes(platform)) return res.status(400).json({ error: 'Invalid platform' });
  const db = req.app.locals.db;
  try {
    let achievements = [];
    if (platform === 'steam' && steamId && gameId) {
      achievements = await getSteamAchievements(steamId, gameId);
    }
    let synced = 0;
    for (const ach of achievements) {
      await db.query(
        `INSERT INTO game_achievements (id, user_id, platform, game_id, achievement_id, name, description, icon_url, unlocked, unlocked_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         ON CONFLICT (user_id, platform, game_id, achievement_id) DO UPDATE SET unlocked=$9, unlocked_at=$10`,
        [uuidv4(), req.user.sub, platform, gameId, ach.apiname, ach.name || ach.apiname, ach.description || '', ach.icon || '', ach.achieved === 1, ach.unlocktime ? new Date(ach.unlocktime * 1000) : null]
      );
      synced++;
    }
    return res.json({ success: true, synced });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/gaming/projects ──────────────────────────────────────────────
// Game development project list (AR/VR/3D aware)

router.get('/projects', requireAuth, async (req, res) => {
  const db = req.app.locals.db;
  const result = await db.query(
    "SELECT * FROM projects WHERE user_id = $1 AND type IN ('game_2d','game_3d','vr','ar','xr') ORDER BY updated_at DESC",
    [req.user.sub]
  );
  return res.json(result.rows);
});

// ── POST /api/gaming/projects ─────────────────────────────────────────────

router.post(
  '/projects',
  requireAuth,
  [
    body('name').trim().isLength({ min: 1, max: 255 }),
    body('genre').isIn(GAME_GENRES),
    body('stage').optional().isIn(PROJECT_STAGES),
    body('engine').optional().isString(),
    body('targetPlatforms').optional().isArray(),
    body('type').optional().isIn(['game_2d', 'game_3d', 'vr', 'ar', 'xr']),
  ],
  async (req, res) => {
    if (!ok(req, res)) return;
    const { name, genre, stage = 'concept', engine, targetPlatforms = [], type = 'game_3d', description = '' } = req.body;
    const db = req.app.locals.db;
    const id = uuidv4();
    const metadata = { genre, stage, engine, gameProject: true };
    await db.query(
      `INSERT INTO projects (id, user_id, name, type, status, description, target_platforms, metadata, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'active',$5,$6,$7,NOW(),NOW())`,
      [id, req.user.sub, name, type, description, JSON.stringify(targetPlatforms), JSON.stringify(metadata)]
    );
    return res.status(201).json({ id, name, type, genre, stage, engine, targetPlatforms });
  }
);

// ── GET /api/gaming/progress/:gameId ─────────────────────────────────────

router.get('/progress/:gameId', requireAuth, [param('gameId').isString()], async (req, res) => {
  const db = req.app.locals.db;
  const result = await db.query(
    'SELECT * FROM game_progress WHERE user_id = $1 AND game_id = $2',
    [req.user.sub, req.params.gameId]
  );
  return res.json(result.rows[0] || { gameId: req.params.gameId, progress: 0 });
});

// ── POST /api/gaming/progress ─────────────────────────────────────────────

router.post(
  '/progress',
  requireAuth,
  [
    body('gameId').notEmpty(),
    body('platform').isIn(GAMING_PLATFORMS),
    body('progressPercent').isFloat({ min: 0, max: 100 }),
  ],
  async (req, res) => {
    if (!ok(req, res)) return;
    const { gameId, platform, progressPercent, currentChapter, playtimeMinutes, metadata = {} } = req.body;
    const db = req.app.locals.db;
    await db.query(
      `INSERT INTO game_progress (id, user_id, game_id, platform, progress_percent, current_chapter, playtime_minutes, metadata, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (user_id, game_id, platform) DO UPDATE SET progress_percent=$5, current_chapter=$6, playtime_minutes=$7, metadata=$8, updated_at=NOW()`,
      [uuidv4(), req.user.sub, gameId, platform, progressPercent, currentChapter || null, playtimeMinutes || 0, JSON.stringify(metadata)]
    );
    const io = req.app.locals.io;
    if (io) io.to(`user:${req.user.sub}`).emit('game:progress', { gameId, platform, progressPercent });
    return res.json({ success: true, gameId, platform, progressPercent });
  }
);

// ── GET /api/gaming/engines ───────────────────────────────────────────────

router.get('/engines', requireAuth, (req, res) => {
  res.json({
    engines: [
      { id: 'unreal', name: 'Unreal Engine 5', vendor: 'Epic Games', languages: ['cpp', 'blueprint'], platforms: ['pc', 'console', 'mobile', 'vr'] },
      { id: 'unity', name: 'Unity', vendor: 'Unity Technologies', languages: ['csharp'], platforms: ['pc', 'console', 'mobile', 'vr', 'ar'] },
      { id: 'godot', name: 'Godot 4', vendor: 'Godot Foundation', languages: ['gdscript', 'cpp', 'csharp'], platforms: ['pc', 'mobile', 'web'] },
      { id: 'o3de', name: 'O3DE', vendor: 'Open 3D Foundation', languages: ['cpp', 'lua'], platforms: ['pc', 'console'] },
      { id: 'blender', name: 'Blender Game Engine', vendor: 'Blender Foundation', languages: ['python'], platforms: ['pc'] },
      { id: 'custom', name: 'Custom Engine', vendor: null, languages: ['cpp', 'rust', 'other'], platforms: ['all'] },
    ],
    arvrFrameworks: [
      { id: 'openxr', name: 'OpenXR', standards: ['xr'] },
      { id: 'steamvr', name: 'SteamVR', platforms: ['pcvr'] },
      { id: 'oculus', name: 'Meta XR SDK', platforms: ['quest', 'rift'] },
      { id: 'arcore', name: 'ARCore', platforms: ['android'] },
      { id: 'arkit', name: 'ARKit', platforms: ['ios'] },
      { id: 'vuforia', name: 'Vuforia', platforms: ['mobile', 'pc'] },
    ],
  });
});

export default router;

// File: src/routes/projects.js | Created: 2026-08-31 | Nexus AI Pro
// Project tracking API routes - coding, game dev, AR/VR/3D projects
// Real-time build status, achievement tracking, connector status

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ─────────────────────────────────────────
// In-memory store (swap for Redis/DB)
// ─────────────────────────────────────────
const projects = new Map();
const achievements = new Map();
const buildLogs = new Map();

// ─────────────────────────────────────────
// Game platform connector status
// ─────────────────────────────────────────

const GAME_PLATFORMS = ['epic', 'sony', 'microsoft', 'ubisoft', 'steam', 'gog'];

/** GET /api/projects - list user projects */
router.get('/', (req, res) => {
  const { type } = req.query; // coding | game | arvr
  const userProjects = Array.from(projects.values())
    .filter(p => p.userId === req.user.id && (!type || p.type === type));
  res.json({ projects: userProjects, total: userProjects.length });
});

/** POST /api/projects - create project */
router.post('/', (req, res) => {
  const { name, type, engine, language, description, deadline, teamSize } = req.body;

  if (!name || !type) return res.status(400).json({ error: 'name and type required' });

  const validTypes = ['coding', 'game', 'arvr'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
  }

  const project = {
    id:          uuidv4(),
    userId:      req.user.id,
    name:        String(name).slice(0, 200),
    type,
    engine:      engine || null,
    language:    language || null,
    description: description ? String(description).slice(0, 2000) : '',
    status:      'active',
    progress:    0,
    deadline:    deadline || null,
    teamSize:    parseInt(teamSize) || 1,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
    // Type-specific metadata
    meta: type === 'arvr'   ? { polygonCount: 0, sceneCount: 0, assetCount: 0 } :
          type === 'game'   ? { buildStatus: 'idle', platforms: [], sdkVersion: null } :
                              { language: language || 'JavaScript', ciStatus: 'unknown' }
  };

  projects.set(project.id, project);
  res.status(201).json(project);
});

/** GET /api/projects/:id */
router.get('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

/** PATCH /api/projects/:id */
router.patch('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const allowed = ['name', 'status', 'progress', 'description', 'deadline', 'teamSize', 'meta'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const updated = { ...project, ...updates, updatedAt: new Date().toISOString() };
  projects.set(project.id, updated);
  res.json(updated);
});

/** DELETE /api/projects/:id */
router.delete('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }
  projects.delete(req.params.id);
  res.json({ deleted: true });
});

// ─────────────────────────────────────────
// Build tracking
// ─────────────────────────────────────────

/** GET /api/projects/:id/builds */
router.get('/:id/builds', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const logs = buildLogs.get(req.params.id) || [];
  res.json({ builds: logs });
});

/** POST /api/projects/:id/builds */
router.post('/:id/builds', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const build = {
    id:         uuidv4(),
    projectId:  req.params.id,
    platform:   req.body.platform || 'web',
    status:     'running',
    startedAt:  new Date().toISOString(),
    logs:       []
  };

  const existingLogs = buildLogs.get(req.params.id) || [];
  existingLogs.push(build);
  buildLogs.set(req.params.id, existingLogs);

  res.status(201).json(build);
});

// ─────────────────────────────────────────
// Achievement tracking
// ─────────────────────────────────────────

/** GET /api/projects/achievements - user's global achievements */
router.get('/achievements/all', (req, res) => {
  const userAchievements = Array.from(achievements.values())
    .filter(a => a.userId === req.user.id);

  // Predefined achievement catalog
  const catalog = [
    { id: 'first_commit',    name: 'First Commit',     desc: 'Push your first commit',           xp: 50,   category: 'coding' },
    { id: 'hundred_commits', name: 'Century Club',     desc: 'Make 100 commits',                 xp: 500,  category: 'coding' },
    { id: 'first_game',      name: 'Game On!',         desc: 'Create your first game project',   xp: 100,  category: 'game' },
    { id: 'vr_pioneer',      name: 'VR Pioneer',       desc: 'Launch your first VR scene',       xp: 200,  category: 'arvr' },
    { id: 'multi_platform',  name: 'Cross-Platform',   desc: 'Build for 3+ platforms',           xp: 300,  category: 'game' },
    { id: 'team_player',     name: 'Team Player',      desc: 'Add 5+ team members',              xp: 150,  category: 'coding' },
    { id: 'speed_run',       name: 'Speed Run',        desc: 'Complete a project in under 7d',   xp: 400,  category: 'game' },
    { id: 'polyglot',        name: 'Polyglot',         desc: 'Create projects in 5+ languages',  xp: 350,  category: 'coding' },
    { id: 'epic_connect',    name: 'Epic Connect',     desc: 'Link your Epic Games account',     xp: 100,  category: 'game' },
    { id: 'sony_devkit',     name: 'Sony Developer',   desc: 'Connect Sony PlayStation SDK',     xp: 150,  category: 'game' },
    { id: 'xbox_certified',  name: 'Xbox Certified',   desc: 'Connect Microsoft Xbox SDK',       xp: 150,  category: 'game' }
  ];

  const unlockedIds = new Set(userAchievements.map(a => a.achievementId));
  const enriched = catalog.map(a => ({
    ...a,
    unlocked:   unlockedIds.has(a.id),
    unlockedAt: userAchievements.find(u => u.achievementId === a.id)?.unlockedAt || null
  }));

  const totalXp = userAchievements.reduce((sum, a) => {
    const cat = catalog.find(c => c.id === a.achievementId);
    return sum + (cat?.xp || 0);
  }, 0);

  res.json({
    achievements: enriched,
    unlocked: userAchievements.length,
    total:    catalog.length,
    totalXp
  });
});

/** POST /api/projects/achievements/unlock */
router.post('/achievements/unlock', (req, res) => {
  const { achievementId } = req.body;
  if (!achievementId) return res.status(400).json({ error: 'achievementId required' });

  const key = `${req.user.id}:${achievementId}`;
  if (achievements.has(key)) {
    return res.json({ alreadyUnlocked: true });
  }

  const achievement = {
    id:            uuidv4(),
    userId:        req.user.id,
    achievementId,
    unlockedAt:    new Date().toISOString()
  };
  achievements.set(key, achievement);
  res.status(201).json(achievement);
});

// ─────────────────────────────────────────
// Game platform connectors
// ─────────────────────────────────────────

/** GET /api/projects/connectors/game/:platform */
router.get('/connectors/game/:platform', (req, res) => {
  const { platform } = req.params;
  if (!GAME_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unknown platform. Supported: ${GAME_PLATFORMS.join(', ')}` });
  }

  // In production, check OAuth token stored in secret manager
  const envKey = `${platform.toUpperCase()}_OAUTH_TOKEN`;
  const connected = !!process.env[envKey];

  res.json({
    platform,
    connected,
    sdkVersion: connected ? '1.0.0' : null,
    lastSync:   connected ? new Date().toISOString() : null,
    message:    connected ? 'Connected' : `Set ${envKey} in environment to connect`
  });
});

/** POST /api/projects/connectors/game/:platform/connect */
router.post('/connectors/game/:platform/connect', (req, res) => {
  const { platform } = req.params;
  if (!GAME_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform' });
  }
  // Return OAuth redirect URL - actual token exchange happens server-side
  // Tokens stored in environment, never in response body
  res.json({
    platform,
    action:  'oauth_redirect',
    url:     `/api/oauth/${platform}/start`,
    message: 'Redirect user to url to begin OAuth flow'
  });
});

export default router;

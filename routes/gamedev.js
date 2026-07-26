// routes/gamedev.js — 2026-07-26
// Game development project tracking, engine connectors, achievements
import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = express.Router();

// ── Stores ─────────────────────────────────────────────────────────────────────
const gameProjects   = new Map();
const achievements   = new Map(); // userId → [achievement]
const connectorTokens= new Map(); // userId → { platform → token }

// ── Supported engines and platforms ───────────────────────────────────────────
const ENGINES = ['unreal', 'unity', 'godot', 'gamemaker', 'custom'];
const PUBLISHERS = ['epic', 'sony', 'microsoft', 'ubisoft', 'steam', 'gog', 'itch'];
// Supported project categories (exported for client-side use)
export const PROJECT_CATEGORIES = ['game', 'ar', 'vr', 'xr', '3d_modeling', 'animation', 'simulation'];

// ── Routes: Game Projects ──────────────────────────────────────────────────────

// POST /api/gamedev/projects
router.post('/projects', requireAuth, (req, res) => {
  const { name, engine, category = 'game', genre, platform: platforms = [], publishers = [], description, techStack = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  if (engine && !ENGINES.includes(engine)) {
    return res.status(400).json({ error: `engine must be one of: ${ENGINES.join(', ')}` });
  }
  const id = uuidv4();
  const project = {
    id, userId: req.user.sub, name, engine, category, genre, platforms, publishers, description, techStack,
    status: 'in_development',
    buildVersion: '0.0.1',
    progress: 0,
    totalLines: 0,
    openBugs: 0,
    closedBugs: 0,
    commits: 0,
    playtestSessions: 0,
    avgFPS: null,
    targetPlatforms: platforms,
    milestones: [],
    tasks: [],
    assets: { models: 0, textures: 0, sounds: 0, scripts: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  gameProjects.set(id, project);
  res.status(201).json(project);
});

// GET /api/gamedev/projects
router.get('/projects', requireAuth, (req, res) => {
  const { engine, category, status } = req.query;
  const list = [...gameProjects.values()]
    .filter(p =>
      p.userId === req.user.sub &&
      (!engine   || p.engine   === engine) &&
      (!category || p.category === category) &&
      (!status   || p.status   === status)
    );
  res.json(list);
});

// GET /api/gamedev/projects/:id
router.get('/projects/:id', requireAuth, (req, res) => {
  const p = gameProjects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// PATCH /api/gamedev/projects/:id
router.patch('/projects/:id', requireAuth, (req, res) => {
  const p = gameProjects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  const editable = ['name','status','progress','buildVersion','totalLines','openBugs','closedBugs','commits','playtestSessions','avgFPS','description','assets'];
  for (const k of editable) if (req.body[k] !== undefined) p[k] = req.body[k];
  p.updatedAt = new Date().toISOString();
  res.json(p);
});

// POST /api/gamedev/projects/:id/tasks
router.post('/projects/:id/tasks', requireAuth, (req, res) => {
  const p = gameProjects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  const { title, type = 'task', priority = 'medium', dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const task = { id: uuidv4(), title, type, priority, dueDate, status: 'open', createdAt: new Date().toISOString() };
  p.tasks.push(task);
  p.updatedAt = new Date().toISOString();
  res.json(task);
});

// ── Routes: Achievements ───────────────────────────────────────────────────────

// GET /api/gamedev/achievements
router.get('/achievements', requireAuth, (req, res) => {
  const list = achievements.get(req.user.sub) || [];
  res.json(list);
});

// POST /api/gamedev/achievements/unlock
router.post('/achievements/unlock', requireAuth, (req, res) => {
  const { gameId, achievementId, title, description, icon = '🏆', xp = 10 } = req.body;
  if (!achievementId || !title) return res.status(400).json({ error: 'achievementId and title required' });
  const list = achievements.get(req.user.sub) || [];
  const existing = list.find(a => a.achievementId === achievementId && a.gameId === gameId);
  if (existing) return res.status(409).json({ error: 'Achievement already unlocked', achievement: existing });
  const achievement = {
    id: uuidv4(), userId: req.user.sub, gameId, achievementId, title, description, icon, xp,
    unlockedAt: new Date().toISOString(),
  };
  list.push(achievement);
  achievements.set(req.user.sub, list);
  res.status(201).json(achievement);
});

// GET /api/gamedev/achievements/progress
router.get('/achievements/progress', requireAuth, (req, res) => {
  const list = achievements.get(req.user.sub) || [];
  const totalXP = list.reduce((s, a) => s + (a.xp || 0), 0);
  res.json({ total: list.length, totalXP, level: Math.floor(totalXP / 100) + 1, recentUnlocks: list.slice(-5).reverse() });
});

// ── Routes: Engine / Publisher Connectors ─────────────────────────────────────

// GET /api/gamedev/connectors — list available connectors
router.get('/connectors', (req, res) => {
  res.json({
    engines: [
      { id: 'unreal',   name: 'Unreal Engine (Epic Games)',  oauthSupported: true,  apiDocs: 'https://dev.epicgames.com/docs' },
      { id: 'unity',    name: 'Unity',                       oauthSupported: true,  apiDocs: 'https://docs.unity.com' },
      { id: 'godot',    name: 'Godot Engine',                oauthSupported: false, apiDocs: 'https://docs.godotengine.org' },
    ],
    publishers: [
      { id: 'epic',      name: 'Epic Games Store',    oauthSupported: true },
      { id: 'sony',      name: 'PlayStation Network',  oauthSupported: true },
      { id: 'microsoft', name: 'Xbox/Microsoft Store', oauthSupported: true },
      { id: 'ubisoft',   name: 'Ubisoft Connect',      oauthSupported: true },
      { id: 'steam',     name: 'Steam (Valve)',         oauthSupported: true },
      { id: 'gog',       name: 'GOG Galaxy',            oauthSupported: false },
      { id: 'itch',      name: 'itch.io',               oauthSupported: true },
    ],
    devTools: [
      { id: 'github',    name: 'GitHub',      type: 'vcs' },
      { id: 'bitbucket', name: 'Bitbucket',   type: 'vcs' },
      { id: 'azure',     name: 'Azure DevOps',type: 'ci_cd' },
      { id: 'jira',      name: 'Jira',        type: 'project_management' },
    ],
  });
});

// POST /api/gamedev/connectors/connect — link external account
router.post('/connectors/connect', requireAuth, (req, res) => {
  const { platform, token, accountId, metadata = {} } = req.body;
  const all = [...ENGINES, ...PUBLISHERS, 'github', 'bitbucket', 'azure', 'jira'];
  if (!all.includes(platform)) return res.status(400).json({ error: 'Unknown platform' });
  if (!token || !accountId) return res.status(400).json({ error: 'token and accountId required' });

  const map = connectorTokens.get(req.user.sub) || {};
  const tokenRef = crypto.createHmac('sha256', process.env.ENCRYPTION_SECRET || 'dev')
    .update(`${platform}:${token}:${req.user.sub}`)
    .digest('hex');
  map[platform] = { accountId, tokenRef, metadata, connectedAt: new Date().toISOString() };
  connectorTokens.set(req.user.sub, map);
  res.json({ connected: true, platform, accountId });
});

// GET /api/gamedev/connectors/status
router.get('/connectors/status', requireAuth, (req, res) => {
  const map = connectorTokens.get(req.user.sub) || {};
  res.json(Object.entries(map).map(([platform, v]) => ({
    platform, accountId: v.accountId, connectedAt: v.connectedAt, metadata: v.metadata,
  })));
});

// DELETE /api/gamedev/connectors/:platform
router.delete('/connectors/:platform', requireAuth, (req, res) => {
  const map = connectorTokens.get(req.user.sub) || {};
  if (!map[req.params.platform]) return res.status(404).json({ error: 'Not connected' });
  delete map[req.params.platform];
  connectorTokens.set(req.user.sub, map);
  res.json({ disconnected: true });
});

// GET /api/gamedev/stats — dev stats summary
router.get('/stats', requireAuth, (req, res) => {
  const userProjects = [...gameProjects.values()].filter(p => p.userId === req.user.sub);
  const achs = achievements.get(req.user.sub) || [];
  res.json({
    projects: {
      total: userProjects.length,
      active: userProjects.filter(p => p.status === 'in_development').length,
      shipped: userProjects.filter(p => p.status === 'released').length,
    },
    achievements: { total: achs.length, totalXP: achs.reduce((s, a) => s + (a.xp || 0), 0) },
    connectors: Object.keys(connectorTokens.get(req.user.sub) || {}).length,
  });
});

export default router;

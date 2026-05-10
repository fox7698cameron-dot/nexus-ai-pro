// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from './database.js';
import { authenticate } from './middleware.js';

const router = Router();
router.use(authenticate);

const PROJECT_TYPES = ['coding', 'game-dev', 'ar-vr', '3d', 'mobile', 'web', 'ai', 'blockchain'];
const ARVR_3D_TYPES = ['ar-vr', '3d'];

let io;
export function setIo(socketIo) { io = socketIo; }

function encryptData(data) {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted: encrypted.toString('hex'), iv: iv.toString('hex'), tag: tag.toString('hex'), key: key.toString('hex') };
}

function decryptData(payload) {
  const key = Buffer.from(payload.key, 'hex');
  const iv = Buffer.from(payload.iv, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.encrypted, 'hex')), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

async function getProject(userId, projectId) {
  const raw = await db.get(`project:${userId}:${projectId}`);
  return raw ? JSON.parse(raw) : null;
}

async function saveProject(userId, project) {
  await db.set(`project:${userId}:${project.id}`, JSON.stringify(project));
  if (io) io.to(userId).emit('project:update', project);
}

async function getUserProjects(userId) {
  const keys = await db.keys(`project:${userId}:*`);
  if (!keys.length) return [];
  const items = await Promise.all(keys.map(k => db.get(k)));
  return items.filter(Boolean).map(r => JSON.parse(r));
}

// ── Projects CRUD ──────────────────────────────────────────────

router.post('/projects', async (req, res) => {
  const { name, type, platform, engine, techStack, tags, description, targetDate } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  if (!PROJECT_TYPES.includes(type)) return res.status(400).json({ error: 'invalid project type' });

  const project = {
    id: uuidv4(),
    userId: req.userId,
    name,
    type,
    status: 'planning',
    progress: 0,
    tags: tags || [],
    platform: platform || null,
    engine: engine || null,
    techStack: techStack || [],
    milestones: [],
    commits: 0,
    bugsOpen: 0,
    bugsFixed: 0,
    linesOfCode: 0,
    timeSpentHours: 0,
    startDate: new Date().toISOString(),
    targetDate: targetDate || null,
    description: description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveProject(req.userId, project);
  res.status(201).json(project);
});

router.get('/projects', async (req, res) => {
  const projects = await getUserProjects(req.userId);
  res.json(projects);
});

router.get('/projects/arvr', async (req, res) => {
  const projects = await getUserProjects(req.userId);
  res.json(projects.filter(p => ARVR_3D_TYPES.includes(p.type)));
});

router.get('/projects/:id', async (req, res) => {
  const project = await getProject(req.userId, req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });
  res.json(project);
});

router.put('/projects/:id', async (req, res) => {
  const project = await getProject(req.userId, req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const allowed = ['name', 'type', 'status', 'progress', 'tags', 'platform', 'engine',
    'techStack', 'bugsOpen', 'bugsFixed', 'linesOfCode', 'timeSpentHours', 'targetDate', 'description'];
  allowed.forEach(field => {
    if (req.body[field] !== undefined) project[field] = req.body[field];
  });
  project.updatedAt = new Date().toISOString();

  await saveProject(req.userId, project);
  res.json(project);
});

router.delete('/projects/:id', async (req, res) => {
  const project = await getProject(req.userId, req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });
  await db.del(`project:${req.userId}:${req.params.id}`);
  res.json({ success: true });
});

// ── Milestones ─────────────────────────────────────────────────

router.post('/projects/:id/milestones', async (req, res) => {
  const project = await getProject(req.userId, req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const milestone = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description || '',
    targetDate: req.body.targetDate || null,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString()
  };

  project.milestones.push(milestone);
  project.updatedAt = new Date().toISOString();
  await saveProject(req.userId, project);
  res.status(201).json(milestone);
});

router.get('/projects/:id/milestones', async (req, res) => {
  const project = await getProject(req.userId, req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });
  res.json(project.milestones);
});

router.put('/projects/:id/milestones/:mid', async (req, res) => {
  const project = await getProject(req.userId, req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const milestone = project.milestones.find(m => m.id === req.params.mid);
  if (!milestone) return res.status(404).json({ error: 'milestone not found' });

  milestone.completed = true;
  milestone.completedAt = new Date().toISOString();
  project.updatedAt = new Date().toISOString();
  await saveProject(req.userId, project);
  res.json(milestone);
});

// ── Time Tracking ──────────────────────────────────────────────

router.post('/projects/:id/time', async (req, res) => {
  const project = await getProject(req.userId, req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });

  const { hours, description, date } = req.body;
  if (!hours || hours <= 0) return res.status(400).json({ error: 'valid hours required' });

  const entry = { id: uuidv4(), hours: parseFloat(hours), description: description || '', date: date || new Date().toISOString() };
  const key = `project:${req.userId}:${req.params.id}:time`;
  const existing = await db.get(key);
  const entries = existing ? JSON.parse(existing) : [];
  entries.push(entry);
  await db.set(key, JSON.stringify(entries));

  project.timeSpentHours = (project.timeSpentHours || 0) + entry.hours;
  project.updatedAt = new Date().toISOString();
  await saveProject(req.userId, project);
  res.status(201).json(entry);
});

router.get('/projects/:id/time', async (req, res) => {
  const project = await getProject(req.userId, req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });
  const raw = await db.get(`project:${req.userId}:${req.params.id}:time`);
  res.json(raw ? JSON.parse(raw) : []);
});

// ── Git Integration ────────────────────────────────────────────

router.get('/projects/:id/commits', async (req, res) => {
  const project = await getProject(req.userId, req.params.id);
  if (!project) return res.status(404).json({ error: 'project not found' });
  if (!project.github_repo) return res.status(400).json({ error: 'no github_repo configured' });

  const tokenRaw = await db.get(`connectors:${req.userId}:github:token`);
  if (!tokenRaw) return res.status(400).json({ error: 'github token not stored' });

  const token = JSON.parse(tokenRaw).token;
  const response = await fetch(`https://api.github.com/repos/${project.github_repo}/commits?per_page=30`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
  });

  if (!response.ok) return res.status(response.status).json({ error: 'github api error' });
  const commits = await response.json();
  res.json(commits);
});

// ── AR/VR/3D Metrics ───────────────────────────────────────────

router.post('/projects/arvr/metrics', async (req, res) => {
  const { projectId, frameRate, polygonCount, textureMemory, buildSize } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId required' });

  const metric = {
    id: uuidv4(),
    projectId,
    frameRate: frameRate || 0,
    polygonCount: polygonCount || 0,
    textureMemory: textureMemory || 0,
    buildSize: buildSize || 0,
    timestamp: new Date().toISOString()
  };

  const key = `arvr:metrics:${req.userId}:${projectId}`;
  const existing = await db.get(key);
  const metrics = existing ? JSON.parse(existing) : [];
  metrics.push(metric);
  if (metrics.length > 100) metrics.shift();
  await db.set(key, JSON.stringify(metrics));
  res.status(201).json(metric);
});

// ── Game Connectors ────────────────────────────────────────────

router.post('/game/unreal/connect', async (req, res) => {
  const { projectPath, apiKey } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'projectPath required' });
  const data = { projectPath, apiKey: apiKey || null, clientId: process.env.EPIC_GAMES_CLIENT_ID, connectedAt: new Date().toISOString() };
  await db.set(`connectors:${req.userId}:unreal`, JSON.stringify(data));
  res.json({ success: true, connected: true });
});

router.get('/game/unreal/projects', async (req, res) => {
  const raw = await db.get(`connectors:${req.userId}:unreal`);
  if (!raw) return res.status(400).json({ error: 'unreal not connected' });
  const conn = JSON.parse(raw);
  res.json({ projects: [{ path: conn.projectPath, connectedAt: conn.connectedAt }] });
});

router.post('/game/epic/connect', async (req, res) => {
  const { publisherId, accessToken } = req.body;
  if (!publisherId) return res.status(400).json({ error: 'publisherId required' });
  const data = { publisherId, accessToken: accessToken || null, clientId: process.env.EPIC_GAMES_CLIENT_ID, connectedAt: new Date().toISOString() };
  await db.set(`connectors:${req.userId}:epic`, JSON.stringify(data));
  res.json({ success: true, connected: true });
});

router.get('/game/epic/products', async (req, res) => {
  const raw = await db.get(`connectors:${req.userId}:epic`);
  if (!raw) return res.status(400).json({ error: 'epic not connected' });
  const conn = JSON.parse(raw);
  res.json({ publisherId: conn.publisherId, products: [], connectedAt: conn.connectedAt });
});

router.post('/game/sony/connect', async (req, res) => {
  const { devAccountId, accessToken } = req.body;
  if (!devAccountId) return res.status(400).json({ error: 'devAccountId required' });
  const data = { devAccountId, accessToken: accessToken || null, clientId: process.env.SONY_CLIENT_ID, connectedAt: new Date().toISOString() };
  await db.set(`connectors:${req.userId}:sony`, JSON.stringify(data));
  res.json({ success: true, connected: true });
});

router.get('/game/sony/trophies', async (req, res) => {
  const raw = await db.get(`connectors:${req.userId}:sony`);
  if (!raw) return res.status(400).json({ error: 'sony not connected' });
  res.json({ trophySets: [] });
});

router.post('/game/microsoft/connect', async (req, res) => {
  const { publisherId, accessToken } = req.body;
  if (!publisherId) return res.status(400).json({ error: 'publisherId required' });
  const data = { publisherId, accessToken: accessToken || null, clientId: process.env.MICROSOFT_CLIENT_ID, connectedAt: new Date().toISOString() };
  await db.set(`connectors:${req.userId}:xbox`, JSON.stringify(data));
  res.json({ success: true, connected: true });
});

router.get('/game/microsoft/achievements', async (req, res) => {
  const raw = await db.get(`connectors:${req.userId}:xbox`);
  if (!raw) return res.status(400).json({ error: 'xbox not connected' });
  res.json({ achievements: [] });
});

router.post('/game/ubisoft/connect', async (req, res) => {
  const { accountId, accessToken } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });
  const data = { accountId, accessToken: accessToken || null, clientId: process.env.UBISOFT_CLIENT_ID, connectedAt: new Date().toISOString() };
  await db.set(`connectors:${req.userId}:ubisoft`, JSON.stringify(data));
  res.json({ success: true, connected: true });
});

router.get('/game/ubisoft/games', async (req, res) => {
  const raw = await db.get(`connectors:${req.userId}:ubisoft`);
  if (!raw) return res.status(400).json({ error: 'ubisoft not connected' });
  res.json({ games: [] });
});

// ── Achievements ───────────────────────────────────────────────

router.get('/achievements', async (req, res) => {
  const raw = await db.get(`achievements:${req.userId}`);
  res.json(raw ? JSON.parse(raw) : []);
});

router.post('/achievements', async (req, res) => {
  const { achievementId, gameId, platform, name, description, points, rarity } = req.body;
  if (!achievementId || !name) return res.status(400).json({ error: 'achievementId and name required' });

  const raw = await db.get(`achievements:${req.userId}`);
  const achievements = raw ? JSON.parse(raw) : [];
  if (achievements.find(a => a.achievementId === achievementId && a.gameId === gameId)) {
    return res.status(409).json({ error: 'achievement already unlocked' });
  }

  const achievement = {
    id: uuidv4(),
    achievementId,
    gameId: gameId || null,
    platform: platform || null,
    name,
    description: description || '',
    points: points || 0,
    rarity: rarity || 'common',
    unlockedAt: new Date().toISOString()
  };
  achievements.push(achievement);
  await db.set(`achievements:${req.userId}`, JSON.stringify(achievements));

  const score = achievements.reduce((sum, a) => sum + (a.points || 0), 0);
  await db.zadd('achievements:leaderboard', score, req.userId);

  res.status(201).json(achievement);
});

router.get('/achievements/progress', async (req, res) => {
  const raw = await db.get(`achievements:${req.userId}`);
  const achievements = raw ? JSON.parse(raw) : [];
  const totalPoints = achievements.reduce((sum, a) => sum + (a.points || 0), 0);
  const byRarity = achievements.reduce((acc, a) => {
    acc[a.rarity] = (acc[a.rarity] || 0) + 1;
    return acc;
  }, {});
  res.json({ total: achievements.length, totalPoints, byRarity });
});

router.get('/achievements/leaderboard', async (req, res) => {
  const entries = await db.zrevrangeWithScores('achievements:leaderboard', 0, 9);
  const leaderboard = entries.map((e, i) => ({ rank: i + 1, userId: e.member, score: e.score }));
  res.json(leaderboard);
});

// ── Game Progress ──────────────────────────────────────────────

router.post('/game/progress', async (req, res) => {
  const { gameId, platform, saveData, percentage, chapter } = req.body;
  if (!gameId) return res.status(400).json({ error: 'gameId required' });

  const encrypted = saveData ? encryptData(saveData) : null;
  const record = {
    gameId,
    platform: platform || null,
    saveData: encrypted,
    percentage: percentage || 0,
    chapter: chapter || null,
    updatedAt: new Date().toISOString()
  };

  await db.set(`gameprogress:${req.userId}:${gameId}`, JSON.stringify(record));
  res.json({ success: true, gameId, percentage: record.percentage });
});

router.get('/game/progress/:gameId', async (req, res) => {
  const raw = await db.get(`gameprogress:${req.userId}:${req.params.gameId}`);
  if (!raw) return res.status(404).json({ error: 'no progress found' });
  const record = JSON.parse(raw);
  if (record.saveData) {
    try { record.saveData = decryptData(record.saveData); } catch { record.saveData = null; }
  }
  res.json(record);
});

export default router;

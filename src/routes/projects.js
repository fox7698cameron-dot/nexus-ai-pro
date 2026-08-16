/**
 * nexus-ai-pro/src/routes/projects.js
 * Real-time project tracking: coding, game dev (Unreal/Epic/Sony/Microsoft/Ubisoft),
 * AR/VR/3D projects — with achievement & game progress tracking
 * Date: 2026-08-16
 */

import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeHtml, validateUrl } from '../utils/validation.js';

const router = express.Router();

// Project type registry
export const PROJECT_TYPES = {
  CODING:       { label: 'Coding / Software',  icon: '💻', color: '#3b82f6' },
  GAME_DEV:     { label: 'Game Development',    icon: '🎮', color: '#8b5cf6' },
  AR_VR:        { label: 'AR / VR',             icon: '🥽', color: '#ec4899' },
  THREE_D:      { label: '3D / Animation',      icon: '🧊', color: '#f59e0b' },
  MOBILE_APP:   { label: 'Mobile App',          icon: '📱', color: '#10b981' },
  WEB_APP:      { label: 'Web App',             icon: '🌐', color: '#06b6d4' },
  AI_ML:        { label: 'AI / ML',             icon: '🤖', color: '#f97316' },
  BLOCKCHAIN:   { label: 'Blockchain / Web3',   icon: '⛓️', color: '#84cc16' },
};

// Game platform connectors
export const GAME_PLATFORMS = {
  unreal:    { name: 'Unreal Engine',      icon: '🔵', publisher: 'Epic Games' },
  unity:     { name: 'Unity',              icon: '⚫', publisher: 'Unity Technologies' },
  epic:      { name: 'Epic Games Store',   icon: '🏪', publisher: 'Epic Games' },
  steam:     { name: 'Steam',              icon: '💨', publisher: 'Valve' },
  psn:       { name: 'PlayStation Network', icon: '🎮', publisher: 'Sony' },
  xbox:      { name: 'Xbox Live / Game Pass', icon: '🟢', publisher: 'Microsoft' },
  ubisoft:   { name: 'Ubisoft Connect',    icon: '🔷', publisher: 'Ubisoft' },
  nintendo:  { name: 'Nintendo Switch',    icon: '🔴', publisher: 'Nintendo' },
  gog:       { name: 'GOG',               icon: '🌌', publisher: 'CD Projekt' },
  itchio:    { name: 'itch.io',            icon: '🎲', publisher: 'itch.io' },
};

// Build status types
const BUILD_STATUSES = ['success', 'failed', 'building', 'pending', 'cancelled'];

// In-memory stores
const projectStore = new Map();        // projectId -> project
const userProjects = new Map();        // userId -> Set<projectId>
const achievementStore = new Map();    // userId -> [achievements]
const gameProgressStore = new Map();   // userId:gameId -> progress

// ─── Helpers ────────────────────────────────

function generateProjectId() { return `proj_${crypto.randomUUID()}`; }

function sanitizeProject(raw) {
  return {
    name: sanitizeHtml(String(raw.name || '').slice(0, 100)),
    description: sanitizeHtml(String(raw.description || '').slice(0, 1000)),
    type: PROJECT_TYPES[raw.type] ? raw.type : 'CODING',
    status: ['active', 'paused', 'completed', 'archived'].includes(raw.status) ? raw.status : 'active',
    gamePlatform: GAME_PLATFORMS[raw.gamePlatform] ? raw.gamePlatform : null,
    tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 10).map(t => sanitizeHtml(String(t).slice(0, 30))) : [],
    repoUrl: raw.repoUrl ? (validateUrl(raw.repoUrl).valid ? raw.repoUrl : null) : null,
    deadline: raw.deadline ? Number(raw.deadline) : null,
    teamSize: Math.min(Math.max(1, Number(raw.teamSize) || 1), 1000),
  };
}

function mockBuildStatus() {
  const weights = [70, 10, 10, 5, 5];
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) return BUILD_STATUSES[i];
  }
  return 'success';
}

// ─────────────────────────────────────────────
// POST /api/projects  — Create project
// ─────────────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  const userId = req.user.sub;
  if (!req.body?.name) return res.status(400).json({ error: 'Project name required' });

  const id = generateProjectId();
  const now = Date.now();
  const sanitized = sanitizeProject(req.body);

  const project = {
    id,
    ownerId: userId,
    ...sanitized,
    createdAt: now,
    updatedAt: now,
    metrics: {
      buildStatus: 'pending',
      testCoverage: 0,
      linesOfCode: 0,
      commits: 0,
      openIssues: 0,
      closedIssues: 0,
      pullRequests: 0,
      lastCommitAt: null,
    },
    milestones: [],
    tasks: [],
    team: [{ userId, role: 'owner', joinedAt: now }],
  };

  projectStore.set(id, project);
  const userSet = userProjects.get(userId) || new Set();
  userSet.add(id);
  userProjects.set(userId, userSet);

  res.status(201).json({ project });
});

// ─────────────────────────────────────────────
// GET /api/projects  — List user's projects
// ─────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const { type, status, platform, page = 1, limit = 20 } = req.query;

  let ids = [...(userProjects.get(userId) || [])];
  let projects = ids.map(id => projectStore.get(id)).filter(Boolean);

  if (type) projects = projects.filter(p => p.type === type);
  if (status) projects = projects.filter(p => p.status === status);
  if (platform) projects = projects.filter(p => p.gamePlatform === platform);

  projects.sort((a, b) => b.updatedAt - a.updatedAt);
  const total = projects.length;
  const start = (Number(page) - 1) * Number(limit);
  const paginated = projects.slice(start, start + Number(limit));

  // Attach live metrics
  const withMetrics = paginated.map(p => ({
    ...p,
    metrics: {
      ...p.metrics,
      buildStatus: mockBuildStatus(),
      testCoverage: Math.floor(Math.random() * 40 + 60),
      linesOfCode: Math.floor(Math.random() * 50000 + 1000),
      commits: Math.floor(Math.random() * 500 + 10),
      openIssues: Math.floor(Math.random() * 20),
      lastCommitAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 3600000),
    },
  }));

  res.json({ projects: withMetrics, total, page: Number(page), limit: Number(limit) });
});

// ─────────────────────────────────────────────
// GET /api/projects/:id
// ─────────────────────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub && !project.team.some(m => m.userId === req.user.sub)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({
    project: {
      ...project,
      metrics: {
        ...project.metrics,
        buildStatus: mockBuildStatus(),
        testCoverage: Math.floor(Math.random() * 40 + 60),
        linesOfCode: Math.floor(Math.random() * 50000 + 1000),
        commits: Math.floor(Math.random() * 500 + 10),
      },
      gamePlatformInfo: project.gamePlatform ? GAME_PLATFORMS[project.gamePlatform] : null,
      typeInfo: PROJECT_TYPES[project.type],
    },
  });
});

// ─────────────────────────────────────────────
// PATCH /api/projects/:id
// ─────────────────────────────────────────────
router.patch('/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub) return res.status(403).json({ error: 'Only owner can update project' });

  const updates = sanitizeProject({ ...project, ...req.body });
  Object.assign(project, updates, { updatedAt: Date.now() });

  res.json({ project });
});

// ─────────────────────────────────────────────
// DELETE /api/projects/:id
// ─────────────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub) return res.status(403).json({ error: 'Only owner can delete project' });

  projectStore.delete(req.params.id);
  const userSet = userProjects.get(req.user.sub);
  if (userSet) userSet.delete(req.params.id);

  res.json({ deleted: true });
});

// ─────────────────────────────────────────────
// POST /api/projects/:id/tasks
// ─────────────────────────────────────────────
router.post('/:id/tasks', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const task = {
    id: crypto.randomUUID(),
    title: sanitizeHtml(String(req.body.title || '').slice(0, 200)),
    description: sanitizeHtml(String(req.body.description || '').slice(0, 2000)),
    status: 'todo',
    priority: ['low', 'medium', 'high', 'critical'].includes(req.body.priority) ? req.body.priority : 'medium',
    assigneeId: req.body.assigneeId || null,
    dueDate: req.body.dueDate ? Number(req.body.dueDate) : null,
    createdAt: Date.now(),
    createdBy: req.user.sub,
  };

  project.tasks.push(task);
  project.updatedAt = Date.now();
  res.status(201).json({ task });
});

// ─────────────────────────────────────────────
// GET /api/projects/game-platforms
// ─────────────────────────────────────────────
router.get('/meta/game-platforms', (req, res) => {
  res.json({ platforms: GAME_PLATFORMS });
});

// ─────────────────────────────────────────────
// GET /api/projects/types
// ─────────────────────────────────────────────
router.get('/meta/types', (req, res) => {
  res.json({ types: PROJECT_TYPES });
});

// ─────────────────────────────────────────────
// GET /api/projects/achievements
// Game achievement & progress tracking
// ─────────────────────────────────────────────
router.get('/achievements/me', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const achievements = achievementStore.get(userId) || generateDefaultAchievements();
  res.json({ achievements, userId });
});

// POST /api/projects/achievements — unlock achievement
router.post('/achievements/unlock', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const { achievementId, gameId, platform } = req.body || {};
  if (!achievementId) return res.status(400).json({ error: 'achievementId required' });

  const existing = achievementStore.get(userId) || [];
  const alreadyUnlocked = existing.find(a => a.id === achievementId);
  if (alreadyUnlocked) return res.json({ achievement: alreadyUnlocked, alreadyUnlocked: true });

  const achievement = {
    id: achievementId,
    gameId: gameId || 'unknown',
    platform: GAME_PLATFORMS[platform] ? platform : 'unknown',
    unlockedAt: Date.now(),
    points: Math.floor(Math.random() * 50 + 10),
  };

  existing.push(achievement);
  achievementStore.set(userId, existing);

  res.status(201).json({ achievement, totalPoints: existing.reduce((s, a) => s + a.points, 0) });
});

// GET /api/projects/game-progress/:gameId
router.get('/game-progress/:gameId', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const key = `${userId}:${req.params.gameId}`;
  const progress = gameProgressStore.get(key) || { completion: 0, playtime: 0, achievements: [], level: 1 };
  res.json({ gameId: req.params.gameId, progress });
});

// POST /api/projects/game-progress/:gameId
router.post('/game-progress/:gameId', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const key = `${userId}:${req.params.gameId}`;
  const existing = gameProgressStore.get(key) || {};
  const updated = {
    ...existing,
    completion: Math.min(100, Math.max(0, Number(req.body.completion) || existing.completion || 0)),
    playtime: Math.max(0, Number(req.body.playtime) || existing.playtime || 0),
    level: Math.max(1, Number(req.body.level) || existing.level || 1),
    lastPlayed: Date.now(),
    platform: req.body.platform || existing.platform,
  };
  gameProgressStore.set(key, updated);
  res.json({ gameId: req.params.gameId, progress: updated });
});

function generateDefaultAchievements() {
  return [
    { id: 'first_project', title: 'First Project', description: 'Created your first project', points: 10, unlockedAt: Date.now() },
    { id: 'code_warrior', title: 'Code Warrior', description: 'Wrote 10,000 lines of code', points: 50, unlockedAt: null },
    { id: 'bug_hunter', title: 'Bug Hunter', description: 'Closed 100 issues', points: 30, unlockedAt: null },
    { id: 'team_player', title: 'Team Player', description: 'Collaborated on 5 projects', points: 20, unlockedAt: null },
    { id: 'shipped', title: 'Shipped It!', description: 'Published your first game/app', points: 100, unlockedAt: null },
    { id: 'xr_pioneer', title: 'XR Pioneer', description: 'Created an AR/VR project', points: 75, unlockedAt: null },
  ];
}

export default router;

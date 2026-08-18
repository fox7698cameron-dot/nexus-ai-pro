// server/routes/projects.js
// Nexus AI Pro — Project Tracking API Routes
// Game Dev · AR/VR/3D · Coding · Platform connectors
// Date: 2026-08-18

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, requireRole, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// ─── In-memory project store ──────────────────────────────────────────────────
const projectStore = new Map();
const achievementStore = new Map();
const platformConnections = new Map();

// ─── Audit Log ────────────────────────────────────────────────────────────────
function audit(event, details = {}) {
  console.info(`[PROJECTS:${event}]`, JSON.stringify({ ts: new Date().toISOString(), event, ...details }));
}

// ─── Validate Project Type ────────────────────────────────────────────────────
const VALID_TYPES = new Set(['coding', 'game', 'ar_vr', '3d']);
const VALID_STATUSES = new Set(['planning', 'active', 'review', 'testing', 'shipped', 'paused', 'archived']);

// ─── GET /api/projects ────────────────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  const { type, status } = req.query;

  let projects = [...projectStore.values()].filter(p => p.userId === req.user.id);

  if (type && VALID_TYPES.has(type)) {
    projects = projects.filter(p => p.type === type);
  }
  if (status && VALID_STATUSES.has(status)) {
    projects = projects.filter(p => p.status === status);
  }

  projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return res.json({ projects, total: projects.length });
});

// ─── POST /api/projects ───────────────────────────────────────────────────────
router.post('/', authenticate, (req, res) => {
  const { name, type, status, description, deadline, teamSize, platforms } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  if (!VALID_TYPES.has(type)) {
    return res.status(400).json({ error: 'Invalid project type' });
  }

  const project = {
    id: uuidv4(),
    userId: req.user.id,
    name: name.trim().slice(0, 100),
    type,
    status: VALID_STATUSES.has(status) ? status : 'planning',
    description: typeof description === 'string' ? description.slice(0, 1000) : '',
    deadline: deadline || null,
    teamSize: Number.isInteger(teamSize) && teamSize > 0 ? teamSize : 1,
    platforms: Array.isArray(platforms) ? platforms.slice(0, 10) : [],
    progress: 0,
    hoursLogged: 0,
    completedTasks: 0,
    totalTasks: 0,
    milestones: [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  projectStore.set(project.id, project);
  audit('PROJECT_CREATED', { userId: req.user.id, projectId: project.id, type, status: project.status });

  return res.status(201).json(project);
});

// ─── GET /api/projects/:id ────────────────────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Only owner or admin can access
  if (project.userId !== req.user.id && !['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const achievements = achievementStore.get(project.id) || [];
  return res.json({ ...project, achievements });
});

// ─── PATCH /api/projects/:id ──────────────────────────────────────────────────
router.patch('/:id', authenticate, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const allowedUpdates = ['name', 'type', 'status', 'description', 'deadline',
    'teamSize', 'platforms', 'progress', 'hoursLogged', 'completedTasks', 'totalTasks', 'milestones', 'tags'];

  const updates = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  if (updates.status && !VALID_STATUSES.has(updates.status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updated = { ...project, ...updates, updatedAt: new Date().toISOString() };
  projectStore.set(project.id, updated);

  // Check for automatic achievements
  checkAchievements(updated);

  audit('PROJECT_UPDATED', { userId: req.user.id, projectId: project.id, updates: Object.keys(updates) });
  return res.json(updated);
});

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────
router.delete('/:id', authenticate, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  projectStore.delete(project.id);
  achievementStore.delete(project.id);

  audit('PROJECT_DELETED', { userId: req.user.id, projectId: project.id });
  return res.json({ deleted: true, id: project.id });
});

// ─── POST /api/projects/:id/log-hours ────────────────────────────────────────
router.post('/:id/log-hours', authenticate, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const { hours, note } = req.body;
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return res.status(400).json({ error: 'Hours must be between 0 and 24' });
  }

  const updated = {
    ...project,
    hoursLogged: project.hoursLogged + hours,
    updatedAt: new Date().toISOString(),
  };
  projectStore.set(project.id, updated);
  audit('HOURS_LOGGED', { userId: req.user.id, projectId: project.id, hours });

  return res.json({ hoursLogged: updated.hoursLogged });
});

// ─── GET /api/projects/:id/achievements ───────────────────────────────────────
router.get('/:id/achievements', authenticate, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

  const achievements = achievementStore.get(project.id) || [];
  return res.json({ achievements, total: achievements.length, unlocked: achievements.filter(a => a.unlocked).length });
});

// ─── POST /api/projects/platform-connect ─────────────────────────────────────
router.post('/platform-connect', authenticate, (req, res) => {
  const { platform, accessToken, refreshToken, projectId } = req.body;

  if (!platform || !accessToken) {
    return res.status(400).json({ error: 'Platform and access token required' });
  }

  const connKey = `${req.user.id}:${platform}`;
  platformConnections.set(connKey, {
    userId: req.user.id,
    platform,
    projectId: projectId || null,
    connectedAt: new Date().toISOString(),
    // NOTE: encrypt tokens before storing in production
    hasToken: true,
  });

  audit('PLATFORM_CONNECTED', { userId: req.user.id, platform, projectId });
  return res.json({ connected: true, platform, connectedAt: new Date().toISOString() });
});

// ─── GET /api/projects/platforms/status ──────────────────────────────────────
router.get('/platforms/status', authenticate, (req, res) => {
  const PLATFORMS = ['epic_games', 'sony_playstation', 'microsoft_xbox', 'ubisoft_connect', 'steam', 'nintendo'];
  const statuses = {};

  for (const platform of PLATFORMS) {
    const connKey = `${req.user.id}:${platform}`;
    const conn = platformConnections.get(connKey);
    statuses[platform] = { connected: !!conn, connectedAt: conn?.connectedAt || null };
  }

  return res.json(statuses);
});

// ─── Helper: Check Achievements ───────────────────────────────────────────────
function checkAchievements(project) {
  const existing = achievementStore.get(project.id) || buildDefaultAchievements(project.id);
  const updated = existing.map(achievement => ({
    ...achievement,
    unlocked: achievement.unlocked || checkAchievementCondition(achievement.id, project),
    unlockedAt: !achievement.unlocked && checkAchievementCondition(achievement.id, project)
      ? new Date().toISOString()
      : achievement.unlockedAt,
  }));
  achievementStore.set(project.id, updated);
}

function checkAchievementCondition(achievementId, project) {
  switch (achievementId) {
    case 'first_commit': return project.hoursLogged > 0;
    case 'milestone_25': return project.progress >= 25;
    case 'milestone_50': return project.progress >= 50;
    case 'milestone_75': return project.progress >= 75;
    case 'ship_it': return project.status === 'shipped';
    case 'team_player': return (project.teamSize || 1) >= 3;
    case 'multi_platform': return (project.platforms || []).length >= 2;
    case 'century': return project.hoursLogged >= 100;
    default: return false;
  }
}

function buildDefaultAchievements(projectId) {
  return [
    { id: 'first_commit', projectId, name: 'First Commit', description: 'Started the project', icon: '🚀', unlocked: false, unlockedAt: null },
    { id: 'milestone_25', projectId, name: '25% Done', description: 'Reached 25% completion', icon: '🎯', unlocked: false, unlockedAt: null },
    { id: 'milestone_50', projectId, name: 'Halfway', description: 'Reached 50% completion', icon: '⭐', unlocked: false, unlockedAt: null },
    { id: 'milestone_75', projectId, name: 'Almost There', description: 'Reached 75% completion', icon: '🔥', unlocked: false, unlockedAt: null },
    { id: 'ship_it', projectId, name: 'Ship It!', description: 'Project shipped to production', icon: '🏆', unlocked: false, unlockedAt: null },
    { id: 'team_player', projectId, name: 'Team Player', description: '3+ team members', icon: '👥', unlocked: false, unlockedAt: null },
    { id: 'multi_platform', projectId, name: 'Multi-Platform', description: 'Connected 2+ platforms', icon: '🌐', unlocked: false, unlockedAt: null },
    { id: 'century', projectId, name: 'Century', description: '100+ hours logged', icon: '💯', unlocked: false, unlockedAt: null },
  ];
}

export default router;

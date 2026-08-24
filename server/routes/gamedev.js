/**
 * server/routes/gamedev.js
 * Game Development Tracking API Routes
 * Updated: 2026-08-24
 *
 * Connectors: Unreal/Epic, Sony PSN, Microsoft Xbox, Ubisoft Connect, Unity
 * Features: project tracking, achievements, build status, AR/VR/3D projects
 * All platform tokens from process.env — never hard-coded
 */

import express from 'express';
import { requireAuth } from './auth.js';

const router = express.Router();
router.use(requireAuth);

// In-memory stores (replace with DB)
const projects = new Map();
const achievements = new Map();
let projectIdCounter = 1;

// Seed default achievements
const DEFAULT_ACHIEVEMENTS = [
  { id: 'ach1', icon: '🏆', title: 'First Launch', description: 'Successfully shipped first build', rarity: 'common', unlocked: false, xp: 100, progress: 0, maxProgress: 1 },
  { id: 'ach2', icon: '🔥', title: 'Commit Streak', description: 'Commit code 30 days in a row', rarity: 'rare', unlocked: false, xp: 500, progress: 0, maxProgress: 30 },
  { id: 'ach3', icon: '💎', title: 'Platform Master', description: 'Release on 5 platforms', rarity: 'epic', unlocked: false, xp: 2000, progress: 0, maxProgress: 5 },
  { id: 'ach4', icon: '👑', title: 'Million Players', description: 'Reach 1M concurrent players', rarity: 'legendary', unlocked: false, xp: 10000, progress: 0, maxProgress: 1000000 },
  { id: 'ach5', icon: '🎯', title: '100% Test Coverage', description: 'Achieve full test coverage', rarity: 'epic', unlocked: false, xp: 1500, progress: 0, maxProgress: 100 },
  { id: 'ach6', icon: '🌍', title: 'Global Release', description: 'Release in 10+ regions', rarity: 'rare', unlocked: false, xp: 750, progress: 0, maxProgress: 10 },
  { id: 'ach7', icon: '🥽', title: 'VR Pioneer', description: 'Ship an AR/VR title', rarity: 'rare', unlocked: false, xp: 800, progress: 0, maxProgress: 1 },
  { id: 'ach8', icon: '🤖', title: 'AI Integration', description: 'Add AI features to your game', rarity: 'epic', unlocked: false, xp: 1200, progress: 0, maxProgress: 1 },
];

// Platform connector status (from env)
const CONNECTOR_STATUS = () => ({
  unreal: {
    connected: !!process.env.UNREAL_API_KEY,
    version: process.env.UNREAL_ENGINE_VERSION || '5.4',
    envKey: 'UNREAL_API_KEY',
  },
  epic: {
    connected: !!process.env.EPIC_CLIENT_ID,
    envKey: 'EPIC_CLIENT_ID',
  },
  sony: {
    connected: !!process.env.SONY_PSN_ACCESS_TOKEN,
    envKey: 'SONY_PSN_ACCESS_TOKEN',
  },
  microsoft: {
    connected: !!process.env.XBOX_ACCESS_TOKEN,
    envKey: 'XBOX_ACCESS_TOKEN',
  },
  ubisoft: {
    connected: !!process.env.UBISOFT_ACCESS_TOKEN,
    envKey: 'UBISOFT_ACCESS_TOKEN',
  },
  unity: {
    connected: !!process.env.UNITY_ACCESS_TOKEN,
    envKey: 'UNITY_ACCESS_TOKEN',
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/gamedev/projects
router.get('/projects', (req, res) => {
  const userProjects = [...projects.values()].filter(p => p.ownerId === req.user.sub);
  res.json(userProjects);
});

// POST /api/gamedev/projects
router.post('/projects', (req, res) => {
  const { name, type, engine, targetPlatforms = [], description = '' } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });

  const validTypes = ['game', 'arvr', '3d', 'coding'];
  if (!validTypes.includes(type)) return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });

  const id = `proj_${projectIdCounter++}`;
  const project = {
    id,
    name,
    type,
    engine,
    targetPlatforms,
    description,
    ownerId: req.user.sub,
    completion: 0,
    commits: 0,
    issues: 0,
    buildNumber: 0,
    buildStatus: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.set(id, project);
  res.status(201).json(project);
});

// PUT /api/gamedev/projects/:id
router.put('/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });

  const allowedFields = ['name', 'completion', 'commits', 'issues', 'buildStatus', 'targetPlatforms', 'description'];
  allowedFields.forEach(f => {
    if (req.body[f] !== undefined) project[f] = req.body[f];
  });
  project.updatedAt = new Date().toISOString();
  projects.set(project.id, project);
  res.json(project);
});

// DELETE /api/gamedev/projects/:id
router.delete('/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
  projects.delete(req.params.id);
  res.json({ message: 'Project deleted' });
});

// GET /api/gamedev/achievements
router.get('/achievements', (req, res) => {
  const userAchs = achievements.get(req.user.sub) || DEFAULT_ACHIEVEMENTS.map(a => ({ ...a }));
  if (!achievements.has(req.user.sub)) achievements.set(req.user.sub, userAchs);
  res.json(userAchs);
});

// POST /api/gamedev/achievements/:id/progress
router.post('/achievements/:id/progress', (req, res) => {
  const { progress } = req.body;
  const userAchs = achievements.get(req.user.sub) || DEFAULT_ACHIEVEMENTS.map(a => ({ ...a }));

  const ach = userAchs.find(a => a.id === req.params.id);
  if (!ach) return res.status(404).json({ error: 'Achievement not found' });

  ach.progress = Math.max(0, Math.min(progress, ach.maxProgress));
  if (ach.progress >= ach.maxProgress) ach.unlocked = true;

  achievements.set(req.user.sub, userAchs);
  res.json(ach);
});

// GET /api/gamedev/connectors
router.get('/connectors', (req, res) => {
  const status = CONNECTOR_STATUS();
  res.json(status);
});

// POST /api/connectors/:platform/connect - OAuth connector initiation
router.post('/connectors/:platform/connect', (req, res) => {
  const { platform } = req.params;
  const status = CONNECTOR_STATUS();

  if (!status[platform]) return res.status(404).json({ error: `Unknown platform: ${platform}` });

  const oauthUrls = {
    unreal: 'https://www.epicgames.com/id/api/redirect',
    epic: 'https://www.epicgames.com/id/api/redirect',
    sony: 'https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorize',
    microsoft: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize',
    ubisoft: 'https://connect.ubisoft.com/oauth/authorize',
    unity: 'https://id.unity.com/en/conversations/authorize',
  };

  const url = oauthUrls[platform];
  if (!url) return res.status(400).json({ error: 'Platform OAuth not configured' });

  res.json({
    platform,
    authUrl: url,
    configured: status[platform].connected,
    envKey: status[platform].envKey,
    message: status[platform].connected
      ? `${platform} is already connected`
      : `Configure ${status[platform].envKey} in .env to enable ${platform} integration`,
  });
});

// GET /api/gamedev/builds/status
router.get('/builds/status', (req, res) => {
  const userProjects = [...projects.values()].filter(p => p.ownerId === req.user.sub);
  const buildStatus = userProjects.map(p => ({
    projectId: p.id,
    name: p.name,
    buildNumber: p.buildNumber,
    status: p.buildStatus,
    platforms: p.targetPlatforms,
    lastUpdated: p.updatedAt,
  }));
  res.json(buildStatus);
});

// GET /api/gamedev/analytics
router.get('/analytics', (req, res) => {
  const userProjects = [...projects.values()].filter(p => p.ownerId === req.user.sub);
  res.json({
    totalProjects: userProjects.length,
    byType: {
      game: userProjects.filter(p => p.type === 'game').length,
      arvr: userProjects.filter(p => p.type === 'arvr').length,
      '3d': userProjects.filter(p => p.type === '3d').length,
      coding: userProjects.filter(p => p.type === 'coding').length,
    },
    avgCompletion: userProjects.length
      ? Math.round(userProjects.reduce((s, p) => s + p.completion, 0) / userProjects.length)
      : 0,
    passingBuilds: userProjects.filter(p => p.buildStatus === 'passing').length,
    totalCommits: userProjects.reduce((s, p) => s + p.commits, 0),
  });
});

export default router;

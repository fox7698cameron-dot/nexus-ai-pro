// gamedev.js | Nexus AI Pro | Created: 2026-10-15 | Game Development Tracking Routes
// Project tracking for game dev, AR/VR/3D with Unreal, Epic, Sony, Microsoft, Ubisoft connectors

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Platform/connector registry
const GAME_PLATFORMS = Object.freeze({
  UNREAL: 'unreal_engine',
  EPIC: 'epic_games',
  SONY: 'sony_playstation',
  MICROSOFT: 'microsoft_xbox',
  UBISOFT: 'ubisoft_connect',
  UNITY: 'unity',
  GODOT: 'godot',
  STEAM: 'steam',
});

const PROJECT_TYPES = Object.freeze({
  GAME_2D: 'game_2d',
  GAME_3D: 'game_3d',
  VR: 'vr',
  AR: 'ar',
  MOBILE: 'mobile_game',
  MULTIPLAYER: 'multiplayer',
  MODEL_3D: '3d_modeling',
  SIMULATION: 'simulation',
});

const PROJECT_STATUS = Object.freeze({
  PLANNING: 'planning',
  ACTIVE: 'active',
  PAUSED: 'paused',
  TESTING: 'testing',
  RELEASE: 'release',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
});

// In-memory stores (replace with DB in production)
const projects = new Map();
const achievements = new Map();
const connectors = new Map();

// Seed demo project
const demoId = 'demo-proj-1';
projects.set(demoId, {
  id: demoId,
  name: 'Nexus VR World',
  type: PROJECT_TYPES.VR,
  platform: GAME_PLATFORMS.UNREAL,
  status: PROJECT_STATUS.ACTIVE,
  progress: 42,
  milestones: [
    { id: 'm1', name: 'Concept Art', completed: true, completedAt: Date.now() - 86400000 * 30 },
    { id: 'm2', name: 'Prototype Level', completed: true, completedAt: Date.now() - 86400000 * 15 },
    { id: 'm3', name: 'Core Mechanics', completed: false, dueAt: Date.now() + 86400000 * 14 },
    { id: 'm4', name: 'Beta Release', completed: false, dueAt: Date.now() + 86400000 * 60 },
  ],
  buildStatus: 'passing',
  deployTargets: ['PC', 'Meta Quest', 'PSVR2'],
  teamSize: 4,
  createdAt: Date.now() - 86400000 * 60,
  updatedAt: Date.now(),
});

// GET /api/gamedev/projects
router.get('/projects', (req, res) => {
  const { type, status, platform } = req.query;
  let list = Array.from(projects.values());
  if (type) list = list.filter(p => p.type === type);
  if (status) list = list.filter(p => p.status === status);
  if (platform) list = list.filter(p => p.platform === platform);
  res.json({ projects: list, total: list.length });
});

// GET /api/gamedev/projects/:id
router.get('/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// POST /api/gamedev/projects
router.post('/projects', (req, res) => {
  const { name, type, platform, deployTargets = [], teamSize = 1 } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  if (type && !Object.values(PROJECT_TYPES).includes(type)) {
    return res.status(400).json({ error: `Invalid type. Valid: ${Object.values(PROJECT_TYPES).join(', ')}` });
  }
  const id = uuidv4();
  const project = {
    id, name,
    type: type || PROJECT_TYPES.GAME_3D,
    platform: platform || GAME_PLATFORMS.UNITY,
    status: PROJECT_STATUS.PLANNING,
    progress: 0,
    milestones: [],
    buildStatus: 'unknown',
    deployTargets,
    teamSize,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  projects.set(id, project);
  res.status(201).json(project);
});

// PUT /api/gamedev/projects/:id
router.put('/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const updated = { ...project, ...req.body, id: project.id, updatedAt: Date.now() };
  projects.set(req.params.id, updated);
  res.json(updated);
});

// DELETE /api/gamedev/projects/:id
router.delete('/projects/:id', (req, res) => {
  if (!projects.has(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  projects.delete(req.params.id);
  res.json({ success: true });
});

// POST /api/gamedev/projects/:id/milestones
router.post('/projects/:id/milestones', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const { name, dueAt } = req.body;
  if (!name) return res.status(400).json({ error: 'Milestone name required' });
  const milestone = { id: uuidv4(), name, completed: false, dueAt };
  project.milestones.push(milestone);
  project.updatedAt = Date.now();
  projects.set(req.params.id, project);
  res.status(201).json(milestone);
});

// PUT /api/gamedev/projects/:id/milestones/:milestoneId
router.put('/projects/:id/milestones/:milestoneId', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const idx = project.milestones.findIndex(m => m.id === req.params.milestoneId);
  if (idx === -1) return res.status(404).json({ error: 'Milestone not found' });
  project.milestones[idx] = { ...project.milestones[idx], ...req.body, id: project.milestones[idx].id };
  if (req.body.completed) project.milestones[idx].completedAt = Date.now();
  const completedCount = project.milestones.filter(m => m.completed).length;
  project.progress = Math.round((completedCount / project.milestones.length) * 100);
  project.updatedAt = Date.now();
  projects.set(req.params.id, project);
  res.json(project.milestones[idx]);
});

// GET /api/gamedev/achievements
router.get('/achievements', (req, res) => {
  const { projectId } = req.query;
  let list = Array.from(achievements.values());
  if (projectId) list = list.filter(a => a.projectId === projectId);
  res.json({ achievements: list, total: list.length });
});

// POST /api/gamedev/achievements
router.post('/achievements', (req, res) => {
  const { projectId, name, description, xp = 10, unlocked = false } = req.body;
  if (!projectId || !name) return res.status(400).json({ error: 'projectId and name required' });
  const id = uuidv4();
  const achievement = { id, projectId, name, description, xp, unlocked, unlockedAt: unlocked ? Date.now() : null, createdAt: Date.now() };
  achievements.set(id, achievement);
  res.status(201).json(achievement);
});

// PUT /api/gamedev/achievements/:id/unlock
router.put('/achievements/:id/unlock', (req, res) => {
  const achievement = achievements.get(req.params.id);
  if (!achievement) return res.status(404).json({ error: 'Achievement not found' });
  achievement.unlocked = true;
  achievement.unlockedAt = Date.now();
  achievements.set(req.params.id, achievement);
  res.json(achievement);
});

// GET /api/gamedev/connectors - List available platform connectors
router.get('/connectors', (req, res) => {
  const available = [
    { id: GAME_PLATFORMS.UNREAL, name: 'Unreal Engine', status: connectors.has(GAME_PLATFORMS.UNREAL) ? 'connected' : 'available', icon: '🎮' },
    { id: GAME_PLATFORMS.EPIC, name: 'Epic Games', status: connectors.has(GAME_PLATFORMS.EPIC) ? 'connected' : 'available', icon: '🕹️' },
    { id: GAME_PLATFORMS.SONY, name: 'Sony PlayStation', status: connectors.has(GAME_PLATFORMS.SONY) ? 'connected' : 'available', icon: '🎯' },
    { id: GAME_PLATFORMS.MICROSOFT, name: 'Microsoft Xbox', status: connectors.has(GAME_PLATFORMS.MICROSOFT) ? 'connected' : 'available', icon: '🟢' },
    { id: GAME_PLATFORMS.UBISOFT, name: 'Ubisoft Connect', status: connectors.has(GAME_PLATFORMS.UBISOFT) ? 'connected' : 'available', icon: '🔷' },
    { id: GAME_PLATFORMS.UNITY, name: 'Unity', status: connectors.has(GAME_PLATFORMS.UNITY) ? 'connected' : 'available', icon: '⚙️' },
    { id: GAME_PLATFORMS.GODOT, name: 'Godot', status: connectors.has(GAME_PLATFORMS.GODOT) ? 'connected' : 'available', icon: '🤖' },
    { id: GAME_PLATFORMS.STEAM, name: 'Steam', status: connectors.has(GAME_PLATFORMS.STEAM) ? 'connected' : 'available', icon: '🌊' },
  ];
  res.json({ connectors: available });
});

// POST /api/gamedev/connectors/:platform/connect
router.post('/connectors/:platform/connect', (req, res) => {
  const { platform } = req.params;
  if (!Object.values(GAME_PLATFORMS).includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform' });
  }
  const { apiKey, projectId } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'apiKey required' });
  connectors.set(platform, { platform, projectId, connectedAt: Date.now(), keyPrefix: apiKey.slice(0, 4) + '****' });
  res.json({ success: true, platform, connected: true });
});

// DELETE /api/gamedev/connectors/:platform
router.delete('/connectors/:platform', (req, res) => {
  connectors.delete(req.params.platform);
  res.json({ success: true, platform: req.params.platform, connected: false });
});

export { router as gamedevRouter };

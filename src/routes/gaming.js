// src/routes/gaming.js
// 2026-07-27 | Nexus AI Pro — Game Development & AR/VR/3D Project Tracking
// Connectors: Unreal Engine, Epic Games, Sony, Microsoft, Ubisoft Connect
// Achievement & game progress tracking; real-time milestones via WebSocket

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, ROLES } from './auth.js';

const router = Router();

// In-memory stores
const projects = new Map();
const achievements = new Map();
const buildHistory = new Map();
const sdkSessions = new Map();

const PROJECT_TYPES = ['game_2d', 'game_3d', 'vr', 'ar', 'mixed_reality', 'game_engine_plugin', 'mod', 'code', 'app'];
const ENGINES = ['unreal', 'unity', 'godot', 'custom', 'other'];
const PLATFORMS = ['pc', 'ps5', 'ps4', 'xbox_series', 'xbox_one', 'nintendo_switch', 'ios', 'android', 'web', 'vr_meta', 'vr_psvr2', 'vr_valve', 'vr_apple'];
const PROGRAMMING_LANGUAGES = ['cpp', 'csharp', 'blueprint', 'gdscript', 'swift', 'kotlin', 'python', 'rust', 'js', 'ts', 'glsl', 'hlsl'];

const CONNECTORS = {
  epic_games:      { name: 'Epic Games / Unreal Engine', envKey: 'EPIC_GAMES_API_KEY' },
  sony_psn:        { name: 'Sony PlayStation Network', envKey: 'SONY_PSN_API_KEY' },
  microsoft_xbox:  { name: 'Microsoft Xbox / Game Pass', envKey: 'MICROSOFT_XBOX_API_KEY' },
  ubisoft_connect: { name: 'Ubisoft Connect', envKey: 'UBISOFT_CONNECT_API_KEY' },
  steam:           { name: 'Steam / Valve', envKey: 'STEAM_API_KEY' },
  nintendo:        { name: 'Nintendo Developer', envKey: 'NINTENDO_DEV_API_KEY' },
  unity_cloud:     { name: 'Unity Cloud Build', envKey: 'UNITY_CLOUD_API_KEY' },
};

// ─── Connector status ─────────────────────────────────────────────────────────
router.get('/connectors', requireAuth(), (req, res) => {
  const status = Object.entries(CONNECTORS).map(([id, c]) => ({
    id,
    name: c.name,
    connected: !!process.env[c.envKey],
    envVar: c.envKey,
  }));
  res.json({ connectors: status });
});

// ─── Project CRUD ─────────────────────────────────────────────────────────────
router.post('/projects', requireAuth(), (req, res) => {
  const { name, type, engine, platforms: targetPlatforms = [], languages = [], description, tags = [] } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Project name required (min 2 chars)' });
  }
  if (!PROJECT_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${PROJECT_TYPES.join(', ')}` });
  }

  const id = uuidv4();
  const project = {
    id,
    userId: req.user.sub,
    name: name.trim(),
    type,
    engine: ENGINES.includes(engine) ? engine : 'other',
    platforms: targetPlatforms.filter(p => PLATFORMS.includes(p)),
    languages: languages.filter(l => PROGRAMMING_LANGUAGES.includes(l)),
    description: description || '',
    tags,
    status: 'active',
    progress: 0,
    milestones: [],
    builds: [],
    achievements: [],
    metrics: { commits: 0, builds: 0, testsRun: 0, bugsFixed: 0, linesOfCode: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.set(id, project);
  res.status(201).json(project);
});

router.get('/projects', requireAuth(), (req, res) => {
  const userId = req.user.sub;
  const userProjects = Array.from(projects.values()).filter(p => p.userId === userId);
  res.json({ projects: userProjects, total: userProjects.length });
});

router.get('/projects/:id', requireAuth(), (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

router.put('/projects/:id', requireAuth(), (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const allowed = ['name', 'description', 'status', 'progress', 'engine', 'platforms', 'languages', 'tags'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) project[key] = req.body[key];
  }
  project.updatedAt = new Date().toISOString();
  projects.set(req.params.id, project);
  res.json(project);
});

router.delete('/projects/:id', requireAuth(), (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });
  projects.delete(req.params.id);
  res.json({ deleted: true });
});

// ─── Milestones ───────────────────────────────────────────────────────────────
router.post('/projects/:id/milestones', requireAuth(), (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const { title, dueDate, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const milestone = { id: uuidv4(), title, dueDate, description, completed: false, createdAt: new Date().toISOString() };
  project.milestones.push(milestone);
  project.updatedAt = new Date().toISOString();
  projects.set(req.params.id, project);
  res.status(201).json(milestone);
});

router.patch('/projects/:id/milestones/:mId', requireAuth(), (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const milestone = project.milestones.find(m => m.id === req.params.mId);
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

  if (req.body.completed !== undefined) milestone.completed = !!req.body.completed;
  if (req.body.title) milestone.title = req.body.title;
  project.progress = Math.round((project.milestones.filter(m => m.completed).length / project.milestones.length) * 100);
  project.updatedAt = new Date().toISOString();
  projects.set(req.params.id, project);
  res.json(milestone);
});

// ─── Build tracking ───────────────────────────────────────────────────────────
router.post('/projects/:id/builds', requireAuth(), (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const { version, platform, status = 'success', notes, metrics = {} } = req.body;
  const build = {
    id: uuidv4(),
    version: version || `0.0.${project.builds.length + 1}`,
    platform,
    status,
    notes,
    metrics,
    timestamp: new Date().toISOString(),
  };
  project.builds.push(build);
  project.metrics.builds += 1;
  project.updatedAt = new Date().toISOString();
  projects.set(req.params.id, project);
  res.status(201).json(build);
});

// ─── Achievement / Progress tracking ─────────────────────────────────────────
router.post('/projects/:id/achievements', requireAuth(), (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const { name, description, xp = 0, icon, platform, connector } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const achievement = {
    id: uuidv4(),
    name,
    description,
    xp,
    icon,
    platform,
    connector: connector && CONNECTORS[connector] ? connector : null,
    unlocked: false,
    unlockedAt: null,
    createdAt: new Date().toISOString(),
  };
  project.achievements.push(achievement);
  project.updatedAt = new Date().toISOString();
  projects.set(req.params.id, project);
  res.status(201).json(achievement);
});

router.patch('/projects/:id/achievements/:aId/unlock', requireAuth(), (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const achievement = project.achievements.find(a => a.id === req.params.aId);
  if (!achievement) return res.status(404).json({ error: 'Achievement not found' });

  achievement.unlocked = true;
  achievement.unlockedAt = new Date().toISOString();
  project.updatedAt = new Date().toISOString();
  projects.set(req.params.id, project);
  res.json(achievement);
});

// ─── Metrics update ───────────────────────────────────────────────────────────
router.patch('/projects/:id/metrics', requireAuth(), (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Project not found' });

  const allowed = ['commits', 'testsRun', 'bugsFixed', 'linesOfCode'];
  for (const key of allowed) {
    if (typeof req.body[key] === 'number') project.metrics[key] = req.body[key];
  }
  project.updatedAt = new Date().toISOString();
  projects.set(req.params.id, project);
  res.json(project.metrics);
});

// ─── Dashboard summary ────────────────────────────────────────────────────────
router.get('/dashboard', requireAuth(), (req, res) => {
  const userId = req.user.sub;
  const userProjects = Array.from(projects.values()).filter(p => p.userId === userId);

  const summary = {
    totalProjects: userProjects.length,
    activeProjects: userProjects.filter(p => p.status === 'active').length,
    byType: PROJECT_TYPES.reduce((acc, t) => {
      acc[t] = userProjects.filter(p => p.type === t).length;
      return acc;
    }, {}),
    totalAchievements: userProjects.reduce((s, p) => s + p.achievements.length, 0),
    unlockedAchievements: userProjects.reduce((s, p) => s + p.achievements.filter(a => a.unlocked).length, 0),
    totalBuilds: userProjects.reduce((s, p) => s + p.builds.length, 0),
    totalCommits: userProjects.reduce((s, p) => s + p.metrics.commits, 0),
    totalLinesOfCode: userProjects.reduce((s, p) => s + p.metrics.linesOfCode, 0),
    connectorStatus: Object.entries(CONNECTORS).map(([id, c]) => ({
      id, name: c.name, connected: !!process.env[c.envKey],
    })),
    recentProjects: userProjects
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map(p => ({ id: p.id, name: p.name, type: p.type, progress: p.progress, status: p.status })),
  };

  res.json(summary);
});

// ─── Template library ────────────────────────────────────────────────────────
router.get('/templates', requireAuth(), (req, res) => {
  res.json({
    templates: [
      { id: 'ue5-shooter', name: 'Unreal Engine 5 Shooter', engine: 'unreal', type: 'game_3d', languages: ['cpp', 'blueprint'] },
      { id: 'unity-platformer', name: 'Unity 2D Platformer', engine: 'unity', type: 'game_2d', languages: ['csharp'] },
      { id: 'godot-rpg', name: 'Godot RPG', engine: 'godot', type: 'game_2d', languages: ['gdscript'] },
      { id: 'vr-meta', name: 'Meta Quest VR', engine: 'unity', type: 'vr', languages: ['csharp'] },
      { id: 'ar-ios', name: 'iOS ARKit App', engine: 'custom', type: 'ar', languages: ['swift'] },
      { id: 'unreal-vr', name: 'Unreal VR Experience', engine: 'unreal', type: 'vr', languages: ['cpp', 'blueprint'] },
      { id: 'ps5-exclusive', name: 'PS5 Native', engine: 'custom', type: 'game_3d', languages: ['cpp'] },
      { id: 'xbox-gamepass', name: 'Xbox / Game Pass', engine: 'unreal', type: 'game_3d', languages: ['cpp', 'blueprint'] },
    ],
  });
});

export { router as gamingRouter };

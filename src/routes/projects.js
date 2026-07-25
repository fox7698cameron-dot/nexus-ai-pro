// src/routes/projects.js — Updated: 2026-07-25
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const projects = new Map();
const connectorCredentials = new Map(); // userId -> Map<connectorId, encryptedConfig>
const achievements = new Map();
const buildLogs = new Map();

const PROJECT_TYPES = ['coding', 'game', 'ar_vr_3d', 'mobile', 'web', 'console'];
const GAME_ENGINES = ['unreal', 'unity', 'godot', 'gamemaker', 'rpgmaker', 'custom'];
const PLATFORMS = ['pc', 'playstation', 'xbox', 'nintendo_switch', 'ios', 'android', 'web', 'vr'];
const CONNECTOR_TYPES = ['github', 'bitbucket', 'gitlab', 'unreal_epic', 'sony_dev', 'microsoft_gdp', 'ubisoft_connect', 'steam', 'google_play', 'app_store', 'azure_devops', 'aws_codecommit'];

// ===== Projects CRUD =====

router.post('/', requireAuth, (req, res) => {
  const {
    name, description, type, engine, platforms: projectPlatforms = [],
    teamSize = 1, startDate, targetLaunchDate, status = 'active'
  } = req.body;

  if (!name) return res.status(400).json({ error: 'Project name required' });
  if (!PROJECT_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${PROJECT_TYPES.join(', ')}` });

  const project = {
    id: uuidv4(),
    userId: req.user.userId,
    name,
    description,
    type,
    engine: type === 'game' || type === 'ar_vr_3d' ? (engine || 'custom') : null,
    platforms: projectPlatforms,
    teamSize,
    startDate: startDate || new Date().toISOString(),
    targetLaunchDate,
    status,
    progress: 0,
    milestones: [],
    tasks: [],
    assets: { models3d: 0, textures: 0, audio: 0, scripts: 0 },
    builds: [],
    connectors: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  projects.set(project.id, project);
  res.status(201).json({ project });
});

router.get('/', requireAuth, (req, res) => {
  const { type, status } = req.query;
  let userProjects = [...projects.values()].filter(p => p.userId === req.user.userId);
  if (type) userProjects = userProjects.filter(p => p.type === type);
  if (status) userProjects = userProjects.filter(p => p.status === status);
  res.json({ projects: userProjects.sort((a, b) => b.updatedAt - a.updatedAt), total: userProjects.length });
});

router.get('/:projectId', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  res.json({ project });
});

router.patch('/:projectId', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  const allowed = ['name', 'description', 'status', 'progress', 'targetLaunchDate', 'teamSize', 'assets'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  Object.assign(project, updates, { updatedAt: Date.now() });
  res.json({ project });
});

router.delete('/:projectId', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  projects.delete(req.params.projectId);
  res.json({ message: 'Project deleted' });
});

// ===== Milestones =====

router.post('/:projectId/milestones', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  const { title, description, dueDate, priority = 'medium' } = req.body;
  if (!title) return res.status(400).json({ error: 'Milestone title required' });
  const milestone = { id: uuidv4(), title, description, dueDate, priority, status: 'pending', createdAt: Date.now() };
  project.milestones.push(milestone);
  project.updatedAt = Date.now();
  res.status(201).json({ milestone });
});

router.patch('/:projectId/milestones/:milestoneId', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  const milestone = project.milestones.find(m => m.id === req.params.milestoneId);
  if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
  Object.assign(milestone, req.body, { updatedAt: Date.now() });
  project.updatedAt = Date.now();
  res.json({ milestone });
});

// ===== Tasks (Kanban) =====

router.post('/:projectId/tasks', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  const { title, description, assignee, column = 'backlog', priority = 'medium', labels = [], dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title required' });
  const task = { id: uuidv4(), title, description, assignee, column, priority, labels, dueDate, createdAt: Date.now() };
  project.tasks.push(task);
  project.updatedAt = Date.now();
  res.status(201).json({ task });
});

router.patch('/:projectId/tasks/:taskId', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  const task = project.tasks.find(t => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  Object.assign(task, req.body, { updatedAt: Date.now() });
  project.updatedAt = Date.now();
  res.json({ task });
});

// ===== Builds =====

router.post('/:projectId/builds', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  const { version, platform, status: buildStatus = 'pending', notes } = req.body;
  if (!version) return res.status(400).json({ error: 'Build version required' });
  const build = { id: uuidv4(), version, platform, status: buildStatus, notes, startedAt: Date.now(), completedAt: null };
  project.builds.unshift(build);
  project.updatedAt = Date.now();
  res.status(201).json({ build });
});

router.patch('/:projectId/builds/:buildId', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  const build = project.builds.find(b => b.id === req.params.buildId);
  if (!build) return res.status(404).json({ error: 'Build not found' });
  Object.assign(build, req.body);
  if (req.body.status === 'success' || req.body.status === 'failed') build.completedAt = Date.now();
  project.updatedAt = Date.now();
  res.json({ build });
});

// ===== Platform Connectors =====

router.post('/connectors', requireAuth, (req, res) => {
  const { type, name, projectId, config } = req.body;
  if (!CONNECTOR_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${CONNECTOR_TYPES.join(', ')}` });
  if (!config) return res.status(400).json({ error: 'Connector config required' });

  const userConnectors = connectorCredentials.get(req.user.userId) || new Map();
  const connectorId = uuidv4();
  // In production: encrypt config using server-side key before storing
  userConnectors.set(connectorId, { id: connectorId, type, name, projectId, createdAt: Date.now() });
  connectorCredentials.set(req.user.userId, userConnectors);

  if (projectId) {
    const project = projects.get(projectId);
    if (project && project.userId === req.user.userId) {
      project.connectors.push({ id: connectorId, type, name });
    }
  }

  res.status(201).json({ connector: { id: connectorId, type, name, projectId } });
});

router.get('/connectors', requireAuth, (req, res) => {
  const userConnectors = connectorCredentials.get(req.user.userId) || new Map();
  res.json({ connectors: [...userConnectors.values()].map(c => ({ id: c.id, type: c.type, name: c.name, projectId: c.projectId, createdAt: c.createdAt })) });
});

router.delete('/connectors/:connectorId', requireAuth, (req, res) => {
  const userConnectors = connectorCredentials.get(req.user.userId);
  if (!userConnectors?.has(req.params.connectorId)) return res.status(404).json({ error: 'Connector not found' });
  userConnectors.delete(req.params.connectorId);
  res.json({ message: 'Connector removed' });
});

// ===== Achievements & Game Progress =====

router.get('/:projectId/achievements', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  const projectAchievements = achievements.get(req.params.projectId) || [];
  res.json({ achievements: projectAchievements });
});

router.post('/:projectId/achievements', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  const { title, description, rarity = 'common', progress = 0, target = 100, platform, icon } = req.body;
  if (!title) return res.status(400).json({ error: 'Achievement title required' });
  const rarities = ['common', 'rare', 'epic', 'legendary'];
  const achievement = {
    id: uuidv4(),
    title,
    description,
    rarity: rarities.includes(rarity) ? rarity : 'common',
    progress: Math.max(0, Math.min(100, progress)),
    target,
    unlocked: progress >= target,
    platform,
    icon,
    createdAt: Date.now()
  };
  const projectAchievements = achievements.get(req.params.projectId) || [];
  projectAchievements.push(achievement);
  achievements.set(req.params.projectId, projectAchievements);
  res.status(201).json({ achievement });
});

router.patch('/:projectId/achievements/:achievementId', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  const projectAchievements = achievements.get(req.params.projectId) || [];
  const achievement = projectAchievements.find(a => a.id === req.params.achievementId);
  if (!achievement) return res.status(404).json({ error: 'Achievement not found' });
  if (req.body.progress !== undefined) {
    achievement.progress = Math.max(0, Math.min(100, req.body.progress));
    achievement.unlocked = achievement.progress >= achievement.target;
    if (achievement.unlocked && !achievement.unlockedAt) achievement.unlockedAt = Date.now();
  }
  Object.assign(achievement, { ...req.body, updatedAt: Date.now() });
  res.json({ achievement });
});

// ===== Summary / Dashboard for a project =====

router.get('/:projectId/summary', requireAuth, (req, res) => {
  const project = projects.get(req.params.projectId);
  if (!project || project.userId !== req.user.userId) return res.status(404).json({ error: 'Project not found' });
  const projectAchievements = achievements.get(req.params.projectId) || [];
  const completedTasks = project.tasks.filter(t => t.column === 'done').length;
  const completedMilestones = project.milestones.filter(m => m.status === 'completed').length;
  const lastBuild = project.builds[0] || null;
  const successfulBuilds = project.builds.filter(b => b.status === 'success').length;

  res.json({
    project: {
      id: project.id,
      name: project.name,
      type: project.type,
      status: project.status,
      progress: project.progress
    },
    stats: {
      tasks: { total: project.tasks.length, completed: completedTasks },
      milestones: { total: project.milestones.length, completed: completedMilestones },
      builds: { total: project.builds.length, successful: successfulBuilds },
      achievements: {
        total: projectAchievements.length,
        unlocked: projectAchievements.filter(a => a.unlocked).length,
        byRarity: {
          common: projectAchievements.filter(a => a.rarity === 'common').length,
          rare: projectAchievements.filter(a => a.rarity === 'rare').length,
          epic: projectAchievements.filter(a => a.rarity === 'epic').length,
          legendary: projectAchievements.filter(a => a.rarity === 'legendary').length
        }
      }
    },
    lastBuild,
    connectors: project.connectors
  });
});

export { router as projectsRouter };

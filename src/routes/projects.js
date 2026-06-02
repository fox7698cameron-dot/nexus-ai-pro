// src/routes/projects.js
// Date: 2026-06-02
// Project tracking: coding, game development, AR/VR/3D
// Connectors: Unreal/Epic, Sony, Microsoft, Ubisoft, Unity
// Achievement and game progress tracking

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const PROJECT_TYPES = ['coding', 'game', 'ar_vr', '3d', 'mobile', 'web', 'tool', 'plugin'];
const PLATFORMS = ['unreal', 'unity', 'godot', 'epic_games', 'sony_psn', 'microsoft_xbox', 'ubisoft', 'steam'];
const MILESTONE_STATUSES = ['pending', 'in_progress', 'completed', 'blocked'];

const ProjectSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(PROJECT_TYPES),
  description: z.string().max(1000).optional().default(''),
  platform: z.enum(PLATFORMS).optional(),
  technologies: z.array(z.string()).optional().default([]),
  targetPlatforms: z.array(z.string()).optional().default([]),
  isPublic: z.boolean().optional().default(false),
});

const MilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(''),
  dueDate: z.string().optional(),
  status: z.enum(MILESTONE_STATUSES).optional().default('pending'),
  weight: z.number().min(0).max(100).optional().default(0),
});

const AchievementSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional().default(''),
  icon: z.string().max(10).optional().default('🏆'),
  category: z.string().max(50).optional().default('general'),
  points: z.number().min(0).optional().default(10),
  unlockedBy: z.string().optional(),
});

// In-memory store (production: use PostgreSQL)
const projects = new Map();
const achievements = new Map();

// GET /api/projects
router.get('/', requireAuth, (req, res) => {
  const userProjects = [...projects.values()].filter(p => p.userId === req.user.sub);
  res.json({ projects: userProjects, total: userProjects.length });
});

// POST /api/projects
router.post('/', requireAuth, (req, res) => {
  const parsed = ProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const project = {
    id: uuidv4(),
    userId: req.user.sub,
    ...parsed.data,
    milestones: [],
    achievements: [],
    progress: 0,
    linesOfCode: 0,
    commits: 0,
    bugsFixed: 0,
    hoursLogged: 0,
    connectors: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  projects.set(project.id, project);
  res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

// PUT /api/projects/:id
router.put('/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const parsed = ProjectSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  Object.assign(project, parsed.data, { updatedAt: Date.now() });
  projects.set(project.id, project);
  res.json(project);
});

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Project not found' });
  }
  projects.delete(req.params.id);
  res.json({ success: true });
});

// POST /api/projects/:id/milestones
router.post('/:id/milestones', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const parsed = MilestoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const milestone = { id: uuidv4(), ...parsed.data, createdAt: Date.now() };
  project.milestones.push(milestone);
  project.updatedAt = Date.now();
  project.progress = calcProgress(project);
  res.status(201).json(milestone);
});

// PUT /api/projects/:id/milestones/:mid
router.put('/:id/milestones/:mid', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const idx = project.milestones.findIndex(m => m.id === req.params.mid);
  if (idx === -1) return res.status(404).json({ error: 'Milestone not found' });

  Object.assign(project.milestones[idx], req.body, { updatedAt: Date.now() });
  project.progress = calcProgress(project);
  project.updatedAt = Date.now();
  res.json(project.milestones[idx]);
});

// POST /api/projects/:id/stats — log coding stats
router.post('/:id/stats', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const { linesAdded = 0, commits = 0, bugsFixed = 0, hoursLogged = 0 } = req.body;
  project.linesOfCode = (project.linesOfCode || 0) + Number(linesAdded);
  project.commits = (project.commits || 0) + Number(commits);
  project.bugsFixed = (project.bugsFixed || 0) + Number(bugsFixed);
  project.hoursLogged = (project.hoursLogged || 0) + Number(hoursLogged);
  project.updatedAt = Date.now();
  res.json({ stats: { linesOfCode: project.linesOfCode, commits: project.commits, bugsFixed: project.bugsFixed, hoursLogged: project.hoursLogged } });
});

// POST /api/projects/:id/connectors — link platform connector
router.post('/:id/connectors', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const { platform, projectId: extProjectId, accessToken } = req.body;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }
  if (!accessToken) return res.status(400).json({ error: 'Access token required' });

  const existing = project.connectors.findIndex(c => c.platform === platform);
  const connector = { platform, projectId: extProjectId, connectedAt: Date.now() };
  if (existing !== -1) {
    project.connectors[existing] = connector;
  } else {
    project.connectors.push(connector);
  }
  project.updatedAt = Date.now();
  res.json({ connector });
});

// GET /api/projects/achievements/all — user achievement summary
router.get('/achievements/all', requireAuth, (req, res) => {
  const userId = req.user.sub;
  const userAchievements = [...achievements.values()].filter(a => a.userId === userId);
  const totalPoints = userAchievements.reduce((sum, a) => sum + (a.points || 0), 0);
  res.json({ achievements: userAchievements, totalPoints });
});

// POST /api/projects/:id/achievements
router.post('/:id/achievements', requireAuth, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.sub) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const parsed = AchievementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const achievement = {
    id: uuidv4(),
    userId: req.user.sub,
    projectId: req.params.id,
    ...parsed.data,
    unlockedAt: Date.now(),
  };
  achievements.set(achievement.id, achievement);
  project.achievements.push(achievement.id);
  res.status(201).json(achievement);
});

function calcProgress(project) {
  const total = project.milestones.length;
  if (!total) return 0;
  const done = project.milestones.filter(m => m.status === 'completed').length;
  return Math.round((done / total) * 100);
}

export default router;

// src/projects/routes.js
// 2026-06-12 | Project tracking: coding, game dev, AR/VR/3D + game platform connectors
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authMiddleware } from '../auth/middleware.js';

const PROJECT_TYPES = Object.freeze(['coding', 'game', 'ar_vr', '3d', 'mobile', 'desktop', 'web', 'other']);
const GAME_ENGINES = Object.freeze(['unreal', 'unity', 'godot', 'custom', 'other']);
const GAME_PLATFORMS = Object.freeze(['epic', 'sony_psn', 'microsoft_xbox', 'ubisoft_connect', 'steam', 'nintendo', 'android', 'ios']);

const ProjectSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(PROJECT_TYPES),
  description: z.string().max(2000).optional(),
  engine: z.enum(GAME_ENGINES).optional(),
  platforms: z.array(z.enum(GAME_PLATFORMS)).optional(),
  targetDate: z.number().optional(),
  tags: z.array(z.string().max(32)).max(20).optional()
});

const MilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.number().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo')
});

const AchievementSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  unlocked: z.boolean().default(false),
  platform: z.enum(GAME_PLATFORMS).optional(),
  platformAchievementId: z.string().optional(),
  points: z.number().int().min(0).max(1000).default(0),
  unlockedAt: z.number().optional()
});

export function createProjectsRouter(projectStore) {
  const router = Router();

  // GET /api/projects
  router.get('/', authMiddleware, (req, res) => {
    const projects = projectStore.listByUser(req.user.sub);
    res.json({ projects });
  });

  // POST /api/projects
  router.post('/', authMiddleware, (req, res) => {
    const parsed = ProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const project = {
      id: uuidv4(),
      userId: req.user.sub,
      ...parsed.data,
      milestones: [],
      achievements: [],
      progress: 0,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    projectStore.save(project);
    res.status(201).json(project);
  });

  // GET /api/projects/:id
  router.get('/:id', authMiddleware, (req, res) => {
    const project = projectStore.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(project);
  });

  // PUT /api/projects/:id
  router.put('/:id', authMiddleware, (req, res) => {
    const project = projectStore.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });

    const parsed = ProjectSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const updated = { ...project, ...parsed.data, updatedAt: Date.now() };
    projectStore.save(updated);
    res.json(updated);
  });

  // DELETE /api/projects/:id
  router.delete('/:id', authMiddleware, (req, res) => {
    const project = projectStore.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    projectStore.delete(req.params.id);
    res.json({ success: true });
  });

  // PUT /api/projects/:id/progress
  router.put('/:id/progress', authMiddleware, (req, res) => {
    const { progress } = req.body;
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'progress must be 0-100' });
    }
    const project = projectStore.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });

    project.progress = Math.round(progress);
    if (project.progress === 100) project.status = 'completed';
    project.updatedAt = Date.now();
    projectStore.save(project);
    res.json({ progress: project.progress, status: project.status });
  });

  // POST /api/projects/:id/milestones
  router.post('/:id/milestones', authMiddleware, (req, res) => {
    const project = projectStore.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });

    const parsed = MilestoneSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const milestone = { id: uuidv4(), ...parsed.data, createdAt: Date.now() };
    project.milestones = project.milestones || [];
    project.milestones.push(milestone);
    project.updatedAt = Date.now();
    projectStore.save(project);
    res.status(201).json(milestone);
  });

  // PUT /api/projects/:id/milestones/:milestoneId
  router.put('/:id/milestones/:milestoneId', authMiddleware, (req, res) => {
    const project = projectStore.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });

    const idx = project.milestones?.findIndex(m => m.id === req.params.milestoneId);
    if (idx === -1 || idx === undefined) return res.status(404).json({ error: 'Milestone not found' });

    const parsed = MilestoneSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    project.milestones[idx] = { ...project.milestones[idx], ...parsed.data };
    project.updatedAt = Date.now();
    projectStore.save(project);
    res.json(project.milestones[idx]);
  });

  // POST /api/projects/:id/achievements
  router.post('/:id/achievements', authMiddleware, (req, res) => {
    const project = projectStore.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });

    const parsed = AchievementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const achievement = {
      id: uuidv4(),
      ...parsed.data,
      unlockedAt: parsed.data.unlocked ? Date.now() : null
    };

    project.achievements = project.achievements || [];
    project.achievements.push(achievement);
    project.updatedAt = Date.now();
    projectStore.save(project);
    res.status(201).json(achievement);
  });

  // PUT /api/projects/:id/achievements/:achievementId/unlock
  router.put('/:id/achievements/:achievementId/unlock', authMiddleware, (req, res) => {
    const project = projectStore.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });

    const achievement = project.achievements?.find(a => a.id === req.params.achievementId);
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });

    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();
    project.updatedAt = Date.now();
    projectStore.save(project);
    res.json(achievement);
  });

  // GET /api/projects/platforms/supported
  router.get('/platforms/supported', (_req, res) => {
    res.json({
      engines: GAME_ENGINES,
      platforms: GAME_PLATFORMS,
      projectTypes: PROJECT_TYPES
    });
  });

  return router;
}

export class InMemoryProjectStore {
  constructor() {
    this._projects = new Map();
  }

  save(project) { this._projects.set(project.id, { ...project }); }
  get(id) { const p = this._projects.get(id); return p ? { ...p } : null; }
  delete(id) { this._projects.delete(id); }
  listByUser(userId) {
    return Array.from(this._projects.values()).filter(p => p.userId === userId);
  }
}

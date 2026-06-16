// File: projects.js | Date: 2026-06-16
import { Router } from 'express';
import { z } from 'zod';
import projectService from '../services/projectService.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// --- Zod schemas ---
const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['webapp', 'mobile', 'desktop', 'api', 'gamedev', 'arvr', '3d', 'library']),
  description: z.string().max(2000).optional(),
  stack: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  platform: z.array(z.string()).optional(),
  language: z.array(z.string()).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  stack: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  platform: z.array(z.string()).optional(),
  language: z.array(z.string()).optional(),
  status: z.enum(['active', 'paused', 'archived', 'completed']).optional(),
});

const milestoneSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const taskSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  assignee: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'blocked']).optional(),
  dueDate: z.string().optional(),
  codeFile: z.string().optional(),
  lineNumber: z.number().int().positive().optional(),
});

const buildSchema = z.object({
  status: z.enum(['pending', 'running', 'success', 'failed', 'cancelled']),
  duration: z.number().optional(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  platform: z.string().optional(),
  version: z.string().optional(),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.validated = result.data;
    next();
  };
}

function ownerOrAdmin(req, res, next) {
  try {
    const project = projectService.getProject(req.params.id);
    if (project.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    req.project = project;
    next();
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

// GET / — list user's projects
router.get('/', (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.tag) filter.tag = req.query.tag;

    const projects = projectService.getUserProjects(req.user.id, filter);
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST / — create project
router.post('/', validate(createProjectSchema), (req, res) => {
  try {
    const project = projectService.createProject(req.user.id, req.validated);
    res.status(201).json({ project });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /:id
router.get('/:id', ownerOrAdmin, (req, res) => {
  res.json({ project: req.project });
});

// PUT /:id
router.put('/:id', ownerOrAdmin, validate(updateProjectSchema), (req, res) => {
  try {
    const project = projectService.updateProject(req.params.id, req.validated);
    res.json({ project });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /:id
router.delete('/:id', ownerOrAdmin, (req, res) => {
  try {
    projectService.deleteProject(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /:id/milestones
router.post('/:id/milestones', ownerOrAdmin, validate(milestoneSchema), (req, res) => {
  try {
    const milestone = projectService.addMilestone(req.params.id, req.validated);
    res.status(201).json({ milestone });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /:id/milestones/:milestoneId
router.put('/:id/milestones/:milestoneId', ownerOrAdmin, (req, res) => {
  try {
    const milestone = projectService.updateMilestone(req.params.id, req.params.milestoneId, req.body);
    res.json({ milestone });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /:id/tasks
router.post('/:id/tasks', ownerOrAdmin, validate(taskSchema), (req, res) => {
  try {
    const task = projectService.addTask(req.params.id, req.validated);
    res.status(201).json({ task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /:id/tasks/:taskId
router.put('/:id/tasks/:taskId', ownerOrAdmin, (req, res) => {
  try {
    const task = projectService.updateTask(req.params.id, req.params.taskId, req.body);
    res.json({ task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /:id/activity
router.get('/:id/activity', ownerOrAdmin, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const activity = projectService.getActivity(req.params.id, limit);
    res.json({ activity });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /:id/stats
router.get('/:id/stats', ownerOrAdmin, (req, res) => {
  try {
    const stats = projectService.getProjectStats(req.params.id);
    res.json({ stats });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /:id/builds
router.post('/:id/builds', ownerOrAdmin, validate(buildSchema), (req, res) => {
  try {
    const build = projectService.trackBuild(req.params.id, req.validated);
    res.status(201).json({ build });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /:id/realtime
router.get('/:id/realtime', ownerOrAdmin, (req, res) => {
  try {
    const metrics = projectService.getRealTimeMetrics(req.params.id);
    res.json({ metrics });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

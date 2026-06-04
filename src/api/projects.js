// ================================================
// NEXUS AI PRO — Project Tracking API Module
// Types: coding | game_dev | ar_vr | 3d | app
// Real-time updates via Socket.io
// Created: 2026-06-04
// ================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireRole, ROLES } from './auth.js';

const router = Router();

const projectStore = new Map();   // projectId -> project
const taskStore = new Map();      // taskId -> task
const milestoneStore = new Map(); // milestoneId -> milestone
const commitStore = new Map();    // projectId -> commit[]

// ── Types & statuses ──────────────────────────────────────
const PROJECT_TYPES = Object.freeze(['coding', 'game_dev', 'ar_vr', '3d', 'app', 'research', 'design']);
const STATUSES = Object.freeze(['planning', 'active', 'paused', 'review', 'completed', 'archived']);
const PRIORITIES = Object.freeze(['low', 'medium', 'high', 'critical']);
const ENGINES = Object.freeze(['unreal', 'unity', 'godot', 'custom', 'none']);

// ── Socket.io real-time binding ───────────────────────────
export function bindProjectSocket(io) {
  io.on('connection', (socket) => {
    socket.on('project:join', (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('project:leave', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('project:activity', (data) => {
      socket.to(`project:${data.projectId}`).emit('project:activity', {
        ...data,
        from: socket.userId,
        timestamp: Date.now()
      });
    });
  });
}

// ── POST /api/projects ─────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  const { name, description, type, engine, tags = [], platform = [] } = req.body;

  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Project name required.' });
  if (!PROJECT_TYPES.includes(type)) {
    return res.status(400).json({ error: `Type must be one of: ${PROJECT_TYPES.join(', ')}` });
  }

  const project = {
    id: uuidv4(),
    name: name.trim(),
    description: description || '',
    type,
    engine: engine && ENGINES.includes(engine) ? engine : 'none',
    status: STATUSES[1],
    priority: PRIORITIES[1],
    ownerId: req.user.id,
    collaborators: [req.user.id],
    tags,
    platform,
    progress: 0,
    linesOfCode: 0,
    commits: 0,
    openTasks: 0,
    completedTasks: 0,
    techStack: [],
    repository: null,
    startDate: new Date().toISOString(),
    dueDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  projectStore.set(project.id, project);
  res.status(201).json(project);
});

// ── GET /api/projects ──────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const { type, status } = req.query;
  let projects = [...projectStore.values()].filter(p => p.collaborators.includes(req.user.id));

  if (type) projects = projects.filter(p => p.type === type);
  if (status) projects = projects.filter(p => p.status === status);

  projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ projects, total: projects.length });
});

// ── GET /api/projects/:id ─────────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!project.collaborators.includes(req.user.id)) return res.status(403).json({ error: 'Access denied.' });
  res.json(project);
});

// ── PUT /api/projects/:id ─────────────────────────────────
router.put('/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Only project owner can update.' });

  const allowed = ['name', 'description', 'type', 'status', 'priority', 'tags', 'platform', 'dueDate', 'techStack', 'repository', 'engine'];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  if (updates.status && !STATUSES.includes(updates.status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });
  }

  Object.assign(project, updates, { updatedAt: new Date().toISOString() });
  res.json(project);
});

// ── DELETE /api/projects/:id ──────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.ownerId !== req.user.id && req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Only owner or admin can delete.' });
  }
  projectStore.delete(req.params.id);
  res.json({ success: true });
});

// ── POST /api/projects/:id/tasks ──────────────────────────
router.post('/:id/tasks', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!project.collaborators.includes(req.user.id)) return res.status(403).json({ error: 'Access denied.' });

  const { title, description, priority = 'medium', assignee, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title required.' });

  const task = {
    id: uuidv4(),
    projectId: req.params.id,
    title,
    description: description || '',
    priority: PRIORITIES.includes(priority) ? priority : 'medium',
    status: 'open',
    assignee: assignee || req.user.id,
    createdBy: req.user.id,
    dueDate: dueDate || null,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  taskStore.set(task.id, task);
  project.openTasks += 1;
  project.updatedAt = new Date().toISOString();

  res.status(201).json(task);
});

// ── GET /api/projects/:id/tasks ───────────────────────────
router.get('/:id/tasks', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!project.collaborators.includes(req.user.id)) return res.status(403).json({ error: 'Access denied.' });

  const tasks = [...taskStore.values()].filter(t => t.projectId === req.params.id);
  res.json({ tasks });
});

// ── PUT /api/projects/:id/tasks/:taskId ───────────────────
router.put('/:id/tasks/:taskId', requireAuth, (req, res) => {
  const task = taskStore.get(req.params.taskId);
  if (!task || task.projectId !== req.params.id) return res.status(404).json({ error: 'Task not found.' });

  const { status, priority, assignee, dueDate, title, description } = req.body;
  const prevStatus = task.status;

  if (status) task.status = status;
  if (priority && PRIORITIES.includes(priority)) task.priority = priority;
  if (assignee) task.assignee = assignee;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (title) task.title = title;
  if (description !== undefined) task.description = description;

  if (prevStatus !== 'completed' && status === 'completed') {
    task.completedAt = new Date().toISOString();
    const project = projectStore.get(req.params.id);
    if (project) {
      project.openTasks = Math.max(0, project.openTasks - 1);
      project.completedTasks += 1;
      const total = project.openTasks + project.completedTasks;
      project.progress = total > 0 ? Math.round((project.completedTasks / total) * 100) : 0;
      project.updatedAt = new Date().toISOString();
    }
  }

  res.json(task);
});

// ── POST /api/projects/:id/commits ────────────────────────
router.post('/:id/commits', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!project.collaborators.includes(req.user.id)) return res.status(403).json({ error: 'Access denied.' });

  const { message, branch = 'main', filesChanged = 0, linesAdded = 0, linesRemoved = 0, hash } = req.body;
  if (!message) return res.status(400).json({ error: 'Commit message required.' });

  const commit = {
    id: uuidv4(),
    projectId: project.id,
    hash: hash || uuidv4().replace(/-/g, '').slice(0, 8),
    message,
    branch,
    author: req.user.id,
    filesChanged: Number(filesChanged),
    linesAdded: Number(linesAdded),
    linesRemoved: Number(linesRemoved),
    timestamp: new Date().toISOString()
  };

  const existing = commitStore.get(project.id) || [];
  existing.unshift(commit);
  if (existing.length > 200) existing.length = 200;
  commitStore.set(project.id, existing);

  project.commits += 1;
  project.linesOfCode = Math.max(0, project.linesOfCode + linesAdded - linesRemoved);
  project.updatedAt = new Date().toISOString();

  res.status(201).json(commit);
});

// ── GET /api/projects/:id/commits ─────────────────────────
router.get('/:id/commits', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!project.collaborators.includes(req.user.id)) return res.status(403).json({ error: 'Access denied.' });

  const commits = commitStore.get(req.params.id) || [];
  const { limit = 20, offset = 0 } = req.query;
  res.json({ commits: commits.slice(Number(offset), Number(offset) + Number(limit)), total: commits.length });
});

// ── POST /api/projects/:id/milestones ─────────────────────
router.post('/:id/milestones', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  const { title, description, dueDate, deliverables = [] } = req.body;
  if (!title) return res.status(400).json({ error: 'Milestone title required.' });

  const milestone = {
    id: uuidv4(),
    projectId: project.id,
    title,
    description: description || '',
    dueDate: dueDate || null,
    deliverables,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  milestoneStore.set(milestone.id, milestone);
  res.status(201).json(milestone);
});

// ── GET /api/projects/:id/milestones ──────────────────────
router.get('/:id/milestones', requireAuth, (req, res) => {
  const milestones = [...milestoneStore.values()].filter(m => m.projectId === req.params.id);
  res.json({ milestones });
});

// ── GET /api/projects/stats/overview ──────────────────────
router.get('/stats/overview', requireAuth, (req, res) => {
  const userProjects = [...projectStore.values()].filter(p => p.collaborators.includes(req.user.id));
  const byType = {};
  const byStatus = {};

  for (const p of userProjects) {
    byType[p.type] = (byType[p.type] || 0) + 1;
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  }

  res.json({
    total: userProjects.length,
    active: byStatus.active || 0,
    completed: byStatus.completed || 0,
    byType,
    byStatus,
    totalCommits: userProjects.reduce((sum, p) => sum + p.commits, 0),
    totalLinesOfCode: userProjects.reduce((sum, p) => sum + p.linesOfCode, 0)
  });
});

export { router as projectsRouter };

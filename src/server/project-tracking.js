// src/server/project-tracking.js
// Nexus AI Pro — Project Tracking (Coding, Game Dev, AR/VR/3D)
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './middleware.js';

const router = express.Router();
router.use(requireAuth);

// ── Enumerations ──────────────────────────────────────────────────────────────

export const PROJECT_TYPES = Object.freeze({
  CODING:   'coding',
  GAME:     'game',
  AR:       'ar',
  VR:       'vr',
  XR:       'xr',
  THREEDS:  '3d',
  MOBILE:   'mobile',
  WEB:      'web',
  DESKTOP:  'desktop',
  API:      'api',
});

export const PROJECT_STATUS = Object.freeze({
  PLANNING:    'planning',
  IN_PROGRESS: 'in_progress',
  REVIEW:      'review',
  ON_HOLD:     'on_hold',
  COMPLETED:   'completed',
  CANCELLED:   'cancelled',
});

export const MILESTONE_STATUS = Object.freeze({
  TODO:        'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
  BLOCKED:     'blocked',
});

// ── In-memory store (replace with PostgreSQL in production) ───────────────────

const projects   = new Map(); // projectId → project
const milestones = new Map(); // milestoneId → milestone
const tasks      = new Map(); // taskId → task
const commits    = new Map(); // projectId → commit[]

// ── Helpers ───────────────────────────────────────────────────────────────────

function assertOwner(project, userId) {
  return project.userId === userId || (project.collaborators || []).includes(userId);
}

function computeProgress(projectId) {
  const projectTasks = Array.from(tasks.values()).filter(t => t.projectId === projectId);
  if (!projectTasks.length) return 0;
  const done = projectTasks.filter(t => t.status === 'completed').length;
  return Math.round((done / projectTasks.length) * 100);
}

// ── Project CRUD ──────────────────────────────────────────────────────────────

/** GET /api/projects */
router.get('/', (req, res) => {
  const userId = req.user.sub;
  const { type, status, limit = 50, offset = 0 } = req.query;

  let list = Array.from(projects.values()).filter(p => assertOwner(p, userId));
  if (type)   list = list.filter(p => p.type === type);
  if (status) list = list.filter(p => p.status === status);

  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.json({
    projects: list.slice(Number(offset), Number(offset) + Number(limit)).map(p => ({
      ...p,
      progress: computeProgress(p.id),
    })),
    total:  list.length,
    offset: Number(offset),
    limit:  Number(limit),
  });
});

/** POST /api/projects */
router.post('/', (req, res) => {
  const { name, description, type, techStack, repoUrl, targetPlatforms, tags } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Project name is required' });
  if (!Object.values(PROJECT_TYPES).includes(type)) {
    return res.status(400).json({ error: 'Invalid project type', valid: Object.values(PROJECT_TYPES) });
  }

  const project = {
    id:              uuidv4(),
    userId:          req.user.sub,
    name:            name.trim(),
    description:     description?.trim() || '',
    type,
    status:          PROJECT_STATUS.PLANNING,
    techStack:       Array.isArray(techStack) ? techStack : [],
    repoUrl:         repoUrl || null,
    targetPlatforms: Array.isArray(targetPlatforms) ? targetPlatforms : [],
    tags:            Array.isArray(tags) ? tags : [],
    collaborators:   [],
    createdAt:       new Date().toISOString(),
    updatedAt:       new Date().toISOString(),
  };

  projects.set(project.id, project);
  res.status(201).json({ project });
});

/** GET /api/projects/:id */
router.get('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!assertOwner(project, req.user.sub)) return res.status(403).json({ error: 'Access denied' });

  const projectMilestones = Array.from(milestones.values()).filter(m => m.projectId === project.id);
  const projectTasks      = Array.from(tasks.values()).filter(t => t.projectId === project.id);
  const projectCommits    = (commits.get(project.id) || []).slice(-20);

  res.json({
    project: { ...project, progress: computeProgress(project.id) },
    milestones: projectMilestones,
    tasks:      projectTasks,
    commits:    projectCommits,
  });
});

/** PUT /api/projects/:id */
router.put('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Only the owner can update the project' });

  const allowed = ['name', 'description', 'type', 'status', 'techStack', 'repoUrl', 'targetPlatforms', 'tags'];
  allowed.forEach(key => {
    if (req.body[key] !== undefined) project[key] = req.body[key];
  });

  if (req.body.status && !Object.values(PROJECT_STATUS).includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  project.updatedAt = new Date().toISOString();
  projects.set(project.id, project);

  res.json({ project: { ...project, progress: computeProgress(project.id) } });
});

/** DELETE /api/projects/:id */
router.delete('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Only the owner can delete the project' });

  projects.delete(project.id);
  // Remove associated milestones/tasks
  for (const [mid, m] of milestones.entries()) {
    if (m.projectId === project.id) milestones.delete(mid);
  }
  for (const [tid, t] of tasks.entries()) {
    if (t.projectId === project.id) tasks.delete(tid);
  }

  res.json({ success: true });
});

// ── Milestone routes ──────────────────────────────────────────────────────────

/** POST /api/projects/:id/milestones */
router.post('/:id/milestones', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!assertOwner(project, req.user.sub)) return res.status(403).json({ error: 'Access denied' });

  const { name, description, dueDate } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Milestone name is required' });

  const milestone = {
    id:          uuidv4(),
    projectId:   project.id,
    name:        name.trim(),
    description: description?.trim() || '',
    status:      MILESTONE_STATUS.TODO,
    dueDate:     dueDate || null,
    completedAt: null,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  milestones.set(milestone.id, milestone);
  res.status(201).json({ milestone });
});

/** PUT /api/projects/:projectId/milestones/:milestoneId */
router.put('/:projectId/milestones/:milestoneId', (req, res) => {
  const milestone = milestones.get(req.params.milestoneId);
  if (!milestone || milestone.projectId !== req.params.projectId) {
    return res.status(404).json({ error: 'Milestone not found' });
  }

  const { name, description, status, dueDate } = req.body;
  if (name !== undefined)        milestone.name        = name;
  if (description !== undefined) milestone.description = description;
  if (dueDate !== undefined)     milestone.dueDate     = dueDate;
  if (status !== undefined) {
    if (!Object.values(MILESTONE_STATUS).includes(status)) {
      return res.status(400).json({ error: 'Invalid milestone status' });
    }
    milestone.status = status;
    if (status === MILESTONE_STATUS.COMPLETED) milestone.completedAt = new Date().toISOString();
  }
  milestone.updatedAt = new Date().toISOString();
  milestones.set(milestone.id, milestone);

  res.json({ milestone });
});

// ── Task routes ───────────────────────────────────────────────────────────────

/** POST /api/projects/:id/tasks */
router.post('/:id/tasks', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!assertOwner(project, req.user.sub)) return res.status(403).json({ error: 'Access denied' });

  const { title, description, priority = 'medium', milestoneId, assigneeId, estimatedHours } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Task title is required' });

  const task = {
    id:             uuidv4(),
    projectId:      project.id,
    milestoneId:    milestoneId || null,
    title:          title.trim(),
    description:    description?.trim() || '',
    status:         'todo',
    priority,
    assigneeId:     assigneeId || req.user.sub,
    estimatedHours: estimatedHours || null,
    loggedHours:    0,
    createdAt:      new Date().toISOString(),
    updatedAt:      new Date().toISOString(),
  };

  tasks.set(task.id, task);
  res.status(201).json({ task });
});

/** PUT /api/projects/:projectId/tasks/:taskId */
router.put('/:projectId/tasks/:taskId', (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task || task.projectId !== req.params.projectId) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const allowed = ['title', 'description', 'status', 'priority', 'estimatedHours', 'loggedHours'];
  allowed.forEach(k => { if (req.body[k] !== undefined) task[k] = req.body[k]; });
  task.updatedAt = new Date().toISOString();
  tasks.set(task.id, task);

  // Update project updatedAt
  const project = projects.get(task.projectId);
  if (project) { project.updatedAt = task.updatedAt; projects.set(project.id, project); }

  res.json({ task });
});

// ── Metrics ───────────────────────────────────────────────────────────────────

/** GET /api/projects/:id/metrics */
router.get('/:id/metrics', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!assertOwner(project, req.user.sub)) return res.status(403).json({ error: 'Access denied' });

  const projectTasks      = Array.from(tasks.values()).filter(t => t.projectId === project.id);
  const projectMilestones = Array.from(milestones.values()).filter(m => m.projectId === project.id);

  const tasksByStatus = projectTasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const totalHours = projectTasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);
  const estHours   = projectTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

  res.json({
    projectId:       project.id,
    progress:        computeProgress(project.id),
    taskSummary:     tasksByStatus,
    totalTasks:      projectTasks.length,
    completedTasks:  tasksByStatus.completed || 0,
    milestonesTotal: projectMilestones.length,
    milestonesDone:  projectMilestones.filter(m => m.status === 'completed').length,
    loggedHours:     totalHours,
    estimatedHours:  estHours,
    efficiency:      estHours > 0 ? +(totalHours / estHours * 100).toFixed(1) : null,
    lastActivity:    project.updatedAt,
  });
});

/** POST /api/projects/:id/commits — log a commit reference */
router.post('/:id/commits', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!assertOwner(project, req.user.sub)) return res.status(403).json({ error: 'Access denied' });

  const { sha, message, author, branch = 'main', filesChanged = 0 } = req.body;
  if (!sha || !message) return res.status(400).json({ error: 'sha and message are required' });

  const log = commits.get(project.id) || [];
  const entry = {
    sha: sha.slice(0, 40),
    message,
    author,
    branch,
    filesChanged,
    timestamp: new Date().toISOString(),
  };
  log.unshift(entry);
  commits.set(project.id, log.slice(0, 200)); // keep last 200

  project.updatedAt = entry.timestamp;
  projects.set(project.id, project);

  res.status(201).json({ commit: entry });
});

/** GET /api/projects/:id/timeline — activity timeline */
router.get('/:id/timeline', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!assertOwner(project, req.user.sub)) return res.status(403).json({ error: 'Access denied' });

  const projectCommits = (commits.get(project.id) || []).slice(0, 30);
  const recentTasks    = Array.from(tasks.values())
    .filter(t => t.projectId === project.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 20)
    .map(t => ({ type: 'task', action: `Task "${t.title}" → ${t.status}`, date: t.updatedAt }));

  const timeline = [
    ...projectCommits.map(c => ({ type: 'commit', action: c.message, date: c.timestamp, meta: { sha: c.sha, branch: c.branch } })),
    ...recentTasks,
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);

  res.json({ timeline });
});

export default router;

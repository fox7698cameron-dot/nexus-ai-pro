// nexus-ai-pro/src/routes/projects.routes.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Project tracking: CRUD, tasks, milestones, connectors, achievements

import { Router } from 'express';
import { authenticate } from '../services/auth.service.js';
import {
  encryptConnectorCreds, decryptConnectorCreds,
  calcProjectProgress, getConnectorList, AR_VR_ENGINES, GAME_PLATFORMS,
  syncGitHubProject, fetchSteamAchievements,
} from '../services/project.service.js';
import { audit } from '../services/audit.service.js';
import crypto from 'crypto';

const router = Router();

const projects    = new Map();
const tasks       = new Map();
const milestones  = new Map();
const connectors  = new Map();
const achievements = new Map();

// ── GET /api/projects ─────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  const owned = [...projects.values()].filter(p => p.ownerId === req.user.id);
  const withProgress = owned.map(p => {
    const projectTasks = [...tasks.values()].filter(t => t.projectId === p.id);
    const projectMilestones = [...milestones.values()].filter(m => m.projectId === p.id);
    const progress_pct = calcProjectProgress({
      totalTasks: projectTasks.length,
      completedTasks: projectTasks.filter(t => t.status === 'done').length,
      totalMilestones: projectMilestones.length,
      completedMilestones: projectMilestones.filter(m => m.completed_at).length,
    });
    return { ...p, progress_pct };
  });
  res.json({ projects: withProgress });
});

// ── POST /api/projects ────────────────────────────────────────
router.post('/', authenticate, (req, res) => {
  const { name, type = 'web', description, status = 'planning', platform, engines, tags } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Project name required' });

  const id = crypto.randomUUID();
  const project = {
    id,
    ownerId: req.user.id,
    name: name.trim(),
    type,
    description,
    status,
    platform: platform ?? [],
    engines: engines ?? [],
    tags: tags ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.set(id, project);
  audit({ label: 'PROJECT_CREATE', actorId: req.user.id, targetType: 'project', targetId: id, result: 'ok' });
  res.status(201).json(project);
});

// ── GET /api/projects/:id ─────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  res.json(project);
});

// ── PATCH /api/projects/:id ───────────────────────────────────
router.patch('/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (project.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const allowed = ['name', 'description', 'status', 'platform', 'engines', 'tags', 'target_date', 'repo_url'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const updated = { ...project, ...updates, updatedAt: new Date().toISOString() };
  projects.set(project.id, updated);
  res.json(updated);
});

// ── DELETE /api/projects/:id ──────────────────────────────────
router.delete('/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.ownerId !== req.user.id) return res.status(404).json({ error: 'Not found' });
  projects.delete(req.params.id);
  audit({ label: 'PROJECT_DELETE', actorId: req.user.id, targetType: 'project', targetId: req.params.id, result: 'ok' });
  res.json({ ok: true });
});

// ── Tasks ─────────────────────────────────────────────────────
router.get('/:id/tasks', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const projectTasks = [...tasks.values()].filter(t => t.projectId === req.params.id);
  res.json(projectTasks);
});

router.post('/:id/tasks', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { title, description, priority = 'medium', status = 'todo', due_date, milestone_id } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Task title required' });

  const id = crypto.randomUUID();
  const task = { id, projectId: project.id, title: title.trim(), description, priority, status, due_date, milestone_id, createdAt: new Date().toISOString() };
  tasks.set(id, task);
  res.status(201).json(task);
});

router.patch('/:projectId/tasks/:taskId', authenticate, (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task || task.projectId !== req.params.projectId) return res.status(404).json({ error: 'Task not found' });
  const updated = { ...task, ...req.body, updatedAt: new Date().toISOString() };
  tasks.set(task.id, updated);
  res.json(updated);
});

// ── Milestones ────────────────────────────────────────────────
router.get('/:id/milestones', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  res.json([...milestones.values()].filter(m => m.projectId === req.params.id));
});

router.post('/:id/milestones', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { title, description, due_date } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Milestone title required' });
  const id = crypto.randomUUID();
  const milestone = { id, projectId: project.id, title: title.trim(), description, due_date, createdAt: new Date().toISOString() };
  milestones.set(id, milestone);
  res.status(201).json(milestone);
});

// ── Connectors ────────────────────────────────────────────────
router.get('/:id/connectors', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const projectConnectors = [...connectors.values()].filter(c => c.projectId === req.params.id);
  res.json(projectConnectors.map(c => ({ ...c, credentials: undefined }))); // never return raw creds
});

router.post('/:id/connectors', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { platform, credentials, config } = req.body;
  if (!platform) return res.status(400).json({ error: 'platform required' });

  let encryptedCreds;
  if (credentials) {
    try {
      encryptedCreds = encryptConnectorCreds(credentials);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  const id = crypto.randomUUID();
  const connector = { id, projectId: project.id, platform, credentials: encryptedCreds, config, is_active: true, createdAt: new Date().toISOString() };
  connectors.set(id, connector);
  audit({ label: 'CONNECTOR_ADD', actorId: req.user.id, detail: { platform }, result: 'ok' });
  res.status(201).json({ ...connector, credentials: undefined });
});

// ── Achievements ──────────────────────────────────────────────
router.get('/:id/achievements', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  res.json([...achievements.values()].filter(a => a.projectId === req.params.id));
});

// ── Sync GitHub ────────────────────────────────────────────────
router.post('/:id/sync/github', authenticate, async (req, res) => {
  const { owner, repo } = req.body;
  if (!owner || !repo) return res.status(400).json({ error: 'owner and repo required' });
  try {
    const data = await syncGitHubProject(process.env.GITHUB_TOKEN, owner, repo);
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ── Metadata ──────────────────────────────────────────────────
router.get('/meta/connectors', authenticate, (req, res) => {
  res.json({ connectors: getConnectorList(), arVrEngines: AR_VR_ENGINES, gamePlatforms: GAME_PLATFORMS });
});

export default router;

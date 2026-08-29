/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * server/routes/projects.js
 * Real-time project tracking: coding, game dev, AR/VR/3D.
 * Integrates with GitHub, Bitbucket, Unreal, Azure DevOps connectors.
 * Date: 2026-08-29
 */

import { Router } from 'express';
import { z }      from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireMinLevel } from '../middleware/auth.js';

const router = Router();

// ── Project type catalogue ─────────────────────────────────────────────────
export const PROJECT_TYPES = {
  coding:  { label: 'Software',      emoji: '💻', color: '#3B82F6' },
  game:    { label: 'Game Dev',      emoji: '🎮', color: '#8B5CF6' },
  arvr:    { label: 'AR / VR',       emoji: '🥽', color: '#10B981' },
  '3d':    { label: '3D / Graphics', emoji: '🧊', color: '#F59E0B' },
  mobile:  { label: 'Mobile App',    emoji: '📱', color: '#EC4899' },
  web:     { label: 'Web App',       emoji: '🌐', color: '#06B6D4' },
  engine:  { label: 'Game Engine',   emoji: '⚙️', color: '#6B7280' },
};

// ── SCM connector config ───────────────────────────────────────────────────
const SCM_CONNECTORS = {
  github:    { label: 'GitHub',       apiBase: 'https://api.github.com',               tokenEnv: 'GITHUB_TOKEN' },
  bitbucket: { label: 'Bitbucket',    apiBase: 'https://api.bitbucket.org/2.0',        tokenEnv: 'BITBUCKET_TOKEN' },
  azure:     { label: 'Azure DevOps', apiBase: 'https://dev.azure.com',                tokenEnv: 'AZURE_DEVOPS_TOKEN' },
};

// ── In-memory project store ────────────────────────────────────────────────
const projectStore = new Map();

// ── Validation schemas ─────────────────────────────────────────────────────
const projectSchema = z.object({
  name:        z.string().min(1).max(120),
  type:        z.enum(Object.keys(PROJECT_TYPES)),
  description: z.string().max(2000).optional(),
  status:      z.enum(['planning', 'active', 'review', 'beta', 'released', 'archived']).default('planning'),
  progress:    z.number().int().min(0).max(100).default(0),
  tags:        z.array(z.string().max(30)).max(20).optional(),
  scm: z.object({
    provider: z.enum(Object.keys(SCM_CONNECTORS)),
    repoUrl:  z.string().url(),
    branch:   z.string().default('main'),
  }).optional(),
  milestones: z.array(z.object({
    id:          z.string().default(() => uuidv4()),
    title:       z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    dueDate:     z.string().datetime().optional(),
    complete:    z.boolean().default(false),
    priority:    z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  })).optional(),
  techStack:   z.array(z.string()).optional(),
  teamSize:    z.number().int().min(1).optional(),
  budget:      z.number().nonnegative().optional(),
});

const taskSchema = z.object({
  projectId:   z.string().uuid(),
  title:       z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status:      z.enum(['todo', 'in_progress', 'review', 'done', 'blocked']).default('todo'),
  priority:    z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignee:    z.string().optional(),
  dueDate:     z.string().datetime().optional(),
  tags:        z.array(z.string()).optional(),
  type:        z.enum(['feature', 'bug', 'chore', 'docs', 'test', 'perf', 'refactor', 'milestone']).default('feature'),
});

// ── Helper: fetch GitHub commit stats ─────────────────────────────────────
async function fetchGitHubStats(repoUrl, branch) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  // Extract owner/repo from URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, '');

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}/commits?sha=${branch}&per_page=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept':        'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const commits = await res.json();
    return {
      recentCommits: commits.slice(0, 5).map(c => ({
        sha:     c.sha.slice(0, 7),
        message: c.commit.message.split('\n')[0].slice(0, 80),
        author:  c.commit.author.name,
        date:    c.commit.author.date,
      })),
      totalCommits: commits.length,
    };
  } catch {
    return null;
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────

// GET /api/projects/types — list project types
router.get('/types', requireAuth, (req, res) => {
  return res.json({ types: PROJECT_TYPES });
});

// GET /api/projects — list user's projects
router.get('/', requireAuth, (req, res) => {
  let projects = [...projectStore.values()].filter(p => p.ownerId === req.user.sub);

  // Filter
  if (req.query.type)   projects = projects.filter(p => p.type   === req.query.type);
  if (req.query.status) projects = projects.filter(p => p.status === req.query.status);

  // Sort by updatedAt desc
  projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  // Pagination
  const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10));
  const limit = Math.min(50, parseInt(req.query.limit ?? '20', 10));
  const total = projects.length;
  const items = projects.slice((page - 1) * limit, page * limit);

  return res.json({ projects: items, total, page, limit });
});

// POST /api/projects — create project
router.post('/', requireAuth, (req, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  const now     = new Date().toISOString();
  const project = {
    id:        uuidv4(),
    ownerId:   req.user.sub,
    createdAt: now,
    updatedAt: now,
    tasks:     [],
    activity:  [],
    ...parsed.data,
  };

  projectStore.set(project.id, project);
  return res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', requireAuth, async (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  if (project.ownerId !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  // Enrich with SCM stats
  let scmStats = null;
  if (project.scm?.provider === 'github') {
    scmStats = await fetchGitHubStats(project.scm.repoUrl, project.scm.branch);
  }

  return res.json({ ...project, scmStats });
});

// PATCH /api/projects/:id
router.patch('/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  if (project.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  const partial = projectSchema.partial().safeParse(req.body);
  if (!partial.success) {
    return res.status(400).json({ error: 'Validation failed', details: partial.error.issues });
  }

  const updated = {
    ...project,
    ...partial.data,
    updatedAt: new Date().toISOString(),
    activity:  [
      { event: 'updated', at: new Date().toISOString(), by: req.user.sub },
      ...(project.activity ?? []).slice(0, 99),
    ],
  };

  projectStore.set(project.id, updated);
  return res.json(updated);
});

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  if (project.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }
  projectStore.delete(req.params.id);
  return res.json({ success: true });
});

// ── Task routes ────────────────────────────────────────────────────────────

// GET /api/projects/:id/tasks
router.get('/:id/tasks', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  if (project.ownerId !== req.user.sub && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  let tasks = project.tasks ?? [];
  if (req.query.status) tasks = tasks.filter(t => t.status === req.query.status);
  if (req.query.type)   tasks = tasks.filter(t => t.type   === req.query.type);

  return res.json({ tasks, total: tasks.length });
});

// POST /api/projects/:id/tasks
router.post('/:id/tasks', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  if (project.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  const parsed = taskSchema.safeParse({ ...req.body, projectId: req.params.id });
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  }

  const now  = new Date().toISOString();
  const task = { id: uuidv4(), createdAt: now, updatedAt: now, ...parsed.data };

  project.tasks = [task, ...(project.tasks ?? [])];
  project.updatedAt = now;
  projectStore.set(project.id, project);

  return res.status(201).json(task);
});

// PATCH /api/projects/:projectId/tasks/:taskId
router.patch('/:projectId/tasks/:taskId', requireAuth, (req, res) => {
  const project = projectStore.get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found', code: 'NOT_FOUND' });
  if (project.ownerId !== req.user.sub) {
    return res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
  }

  const idx = (project.tasks ?? []).findIndex(t => t.id === req.params.taskId);
  if (idx === -1) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });

  const partial = taskSchema.partial().safeParse(req.body);
  if (!partial.success) {
    return res.status(400).json({ error: 'Validation failed', details: partial.error.issues });
  }

  project.tasks[idx] = { ...project.tasks[idx], ...partial.data, updatedAt: new Date().toISOString() };
  project.updatedAt  = new Date().toISOString();
  projectStore.set(project.id, project);

  return res.json(project.tasks[idx]);
});

// GET /api/projects/stats/overview — aggregate stats (admin / dev)
router.get('/stats/overview', requireAuth, requireMinLevel(3), (req, res) => {
  const all      = [...projectStore.values()];
  const byType   = {};
  const byStatus = {};

  for (const p of all) {
    byType[p.type]     = (byType[p.type]     ?? 0) + 1;
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  const avgProgress = all.length
    ? Math.round(all.reduce((s, p) => s + (p.progress ?? 0), 0) / all.length)
    : 0;

  return res.json({
    total:      all.length,
    byType,
    byStatus,
    avgProgress,
    fetchedAt:  new Date().toISOString(),
  });
});

export default router;

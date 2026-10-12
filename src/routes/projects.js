// Nexus AI Pro - Project Tracking Routes | 2026-10-12
import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

const PROJECT_TYPES = ['coding', 'game', 'ar-vr', '3d', 'mobile', 'web', 'blockchain'];
const GAME_ENGINES = ['unreal', 'unity', 'godot', 'cryengine', 'custom'];
const BUILD_STATUSES = ['idle', 'building', 'success', 'failed', 'queued'];

// In-memory store (production: PostgreSQL/MongoDB)
const projects = new Map();
const buildLogs = new Map();

// GET /api/projects
router.get('/', (req, res) => {
  const { type, userId, status } = req.query;
  let list = Array.from(projects.values());
  if (type) list = list.filter(p => p.type === type);
  if (userId) list = list.filter(p => p.ownerId === userId);
  if (status) list = list.filter(p => p.buildStatus === status);
  res.json({ projects: list, total: list.length });
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// POST /api/projects
router.post('/', (req, res) => {
  const {
    name, description, type, ownerId, engine, platform,
    repository, targetPlatforms = [], teamMembers = [],
  } = req.body;

  if (!name || !type) return res.status(400).json({ error: 'Name and type required' });
  if (!PROJECT_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid project type' });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const project = {
    id,
    name,
    description: description || '',
    type,
    ownerId,
    engine: engine || null,
    platform: platform || null,
    repository: repository || null,
    targetPlatforms,
    teamMembers,
    buildStatus: 'idle',
    buildVersion: '0.0.1',
    progress: 0,
    milestones: [],
    sprints: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
    metrics: initProjectMetrics(type),
  };

  projects.set(id, project);
  res.status(201).json(project);
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const allowed = ['name', 'description', 'progress', 'buildStatus', 'buildVersion',
    'milestones', 'sprints', 'tags', 'teamMembers', 'metrics', 'targetPlatforms'];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }

  const updated = { ...project, ...updates, updatedAt: new Date().toISOString() };
  projects.set(project.id, updated);

  if (router.io) router.io.emit('project:update', { projectId: project.id, updates });
  res.json(updated);
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  if (!projects.has(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  projects.delete(req.params.id);
  buildLogs.delete(req.params.id);
  res.json({ deleted: true });
});

// POST /api/projects/:id/build - trigger build
router.post('/:id/build', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const buildId = crypto.randomUUID();
  const now = new Date().toISOString();

  const build = {
    id: buildId,
    projectId: project.id,
    status: 'queued',
    startedAt: now,
    logs: [],
    triggeredBy: req.body.userId || 'system',
  };

  const logs = buildLogs.get(project.id) || [];
  logs.push(build);
  buildLogs.set(project.id, logs);

  const updated = { ...project, buildStatus: 'queued', updatedAt: now };
  projects.set(project.id, updated);

  if (router.io) router.io.emit('project:build', { projectId: project.id, buildId, status: 'queued' });
  res.json({ buildId, status: 'queued', startedAt: now });
});

// GET /api/projects/:id/builds
router.get('/:id/builds', (req, res) => {
  const logs = buildLogs.get(req.params.id) || [];
  res.json({ builds: logs.slice(-20) });
});

// POST /api/projects/:id/milestone
router.post('/:id/milestone', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { title, description, dueDate, tasks = [] } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const milestone = {
    id: crypto.randomUUID(),
    title,
    description: description || '',
    dueDate: dueDate || null,
    tasks,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  const updated = { ...project, milestones: [...project.milestones, milestone], updatedAt: new Date().toISOString() };
  projects.set(project.id, updated);
  res.status(201).json(milestone);
});

// POST /api/projects/:id/ingest - receive CI/CD webhook
router.post('/:id/ingest', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { event, status, branch, commit, coverage, testsPassed, testsFailed } = req.body;
  const metrics = {
    ...project.metrics,
    lastCommit: commit || null,
    branch: branch || null,
    testCoverage: coverage ?? project.metrics?.testCoverage,
    testsPassed: testsPassed ?? project.metrics?.testsPassed,
    testsFailed: testsFailed ?? project.metrics?.testsFailed,
  };

  const updated = {
    ...project,
    buildStatus: status || project.buildStatus,
    metrics,
    updatedAt: new Date().toISOString(),
  };
  projects.set(project.id, updated);

  if (router.io) router.io.emit('project:update', { projectId: project.id, event, status });
  res.json({ received: true });
});

function initProjectMetrics(type) {
  const base = { testCoverage: 0, testsPassed: 0, testsFailed: 0, lastCommit: null, branch: null };
  if (type === 'game') return { ...base, polygonCount: 0, fps: 0, memoryUsage: 0, assetCount: 0, buildSize: 0 };
  if (type === 'ar-vr') return { ...base, fps: 90, latency: 0, polygonCount: 0, textureMemory: 0 };
  if (type === '3d') return { ...base, polygonCount: 0, renderTime: 0, textureMemory: 0 };
  return { ...base, linesOfCode: 0, languages: {}, dependencies: 0 };
}

export { router as projectsRouter };

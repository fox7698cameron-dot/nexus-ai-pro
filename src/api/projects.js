// src/api/projects.js
// Project tracking API — coding, game dev, AR/VR, 3D — with achievements and real-time metrics
// Created: 2026-10-19

import { v4 as uuidv4 } from 'uuid';

// ─── In-memory stores ──────────────────────────────────────────────────────────

const projects = new Map();
const achievements = new Map(); // key: projectId, value: Achievement[]

// ─── Schema validation ─────────────────────────────────────────────────────────

const PROJECT_TYPES = new Set(['coding', 'game', 'arvr', '3d']);
const PROJECT_STATUSES = new Set(['active', 'paused', 'complete', 'archived']);
const ENGINES = new Set(['unreal', 'unity', 'godot', 'blender', 'maya', 'custom']);
const CONNECTORS_ALLOWED = new Set(['epic', 'sony', 'microsoft', 'ubisoft']);
const PLATFORMS = new Set(['web', 'ios', 'android', 'windows', 'macos', 'linux', 'ps5', 'xbox', 'switch', 'vr', 'ar']);

function validateProject(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) errors.push('name is required');
  if (!PROJECT_TYPES.has(data.type)) errors.push(`type must be one of: ${[...PROJECT_TYPES].join(', ')}`);
  if (data.status && !PROJECT_STATUSES.has(data.status)) errors.push(`status must be one of: ${[...PROJECT_STATUSES].join(', ')}`);
  if (data.engine && !ENGINES.has(data.engine)) errors.push(`engine must be one of: ${[...ENGINES].join(', ')}`);
  if (data.connectors) {
    const bad = (data.connectors || []).filter(c => !CONNECTORS_ALLOWED.has(c));
    if (bad.length) errors.push(`unknown connectors: ${bad.join(', ')}`);
  }
  if (data.targetPlatforms) {
    const bad = (data.targetPlatforms || []).filter(p => !PLATFORMS.has(p));
    if (bad.length) errors.push(`unknown platforms: ${bad.join(', ')}`);
  }
  if (data.progress !== undefined && (data.progress < 0 || data.progress > 100)) errors.push('progress must be 0–100');
  if (data.testCoverage !== undefined && (data.testCoverage < 0 || data.testCoverage > 100)) errors.push('testCoverage must be 0–100');
  return errors;
}

function safeProject(raw) {
  return {
    id: raw.id,
    userId: raw.userId,
    name: String(raw.name).slice(0, 200),
    type: raw.type,
    status: raw.status || 'active',
    description: String(raw.description || '').slice(0, 2000),
    tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 20).map(t => String(t).slice(0, 50)) : [],
    language: raw.language ? String(raw.language).slice(0, 50) : undefined,
    framework: raw.framework ? String(raw.framework).slice(0, 100) : undefined,
    engine: raw.engine || undefined,
    targetPlatforms: Array.isArray(raw.targetPlatforms) ? raw.targetPlatforms : [],
    connectors: Array.isArray(raw.connectors) ? raw.connectors : [],
    buildStatus: raw.buildStatus || 'unknown',
    testCoverage: Number(raw.testCoverage) || 0,
    progress: Number(raw.progress) || 0,
    version: raw.version ? String(raw.version).slice(0, 20) : '0.1.0',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    metrics: raw.metrics || { commits: 0, builds: 0, lastDeployment: null },
  };
}

// ─── Routes factory ────────────────────────────────────────────────────────────

export function createProjectRoutes(app, io, authenticateToken) {

  // GET /api/projects/stats/overview — must be before /:id routes
  app.get('/api/projects/stats/overview', authenticateToken, (req, res) => {
    const userId = req.user?.id;
    const all = Array.from(projects.values()).filter(p => p.userId === userId);
    const byType = {};
    for (const t of PROJECT_TYPES) byType[t] = all.filter(p => p.type === t).length;
    const activeCount = all.filter(p => p.status === 'active').length;
    const avgCoverage = all.length ? Math.round(all.reduce((s, p) => s + p.testCoverage, 0) / all.length) : 0;
    const byStatus = {};
    for (const s of PROJECT_STATUSES) byStatus[s] = all.filter(p => p.status === s).length;
    res.json({
      total: all.length,
      active: activeCount,
      byType,
      byStatus,
      avgTestCoverage: avgCoverage,
    });
  });

  // GET /api/projects
  app.get('/api/projects', authenticateToken, (req, res) => {
    const userId = req.user?.id;
    const { type, status, page = 1, limit = 20 } = req.query;
    let list = Array.from(projects.values()).filter(p => p.userId === userId);
    if (type && PROJECT_TYPES.has(type)) list = list.filter(p => p.type === type);
    if (status && PROJECT_STATUSES.has(status)) list = list.filter(p => p.status === status);
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    const offset = (Number(page) - 1) * Number(limit);
    res.json({
      projects: list.slice(offset, offset + Number(limit)),
      total: list.length,
      page: Number(page),
      limit: Number(limit),
    });
  });

  // POST /api/projects
  app.post('/api/projects', authenticateToken, (req, res) => {
    const userId = req.user?.id;
    const errors = validateProject(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const now = Date.now();
    const project = safeProject({
      ...req.body,
      id: uuidv4(),
      userId,
      createdAt: now,
      updatedAt: now,
      metrics: { commits: 0, builds: 0, lastDeployment: null },
    });
    projects.set(project.id, project);
    achievements.set(project.id, []);
    io.emit('project:update', { event: 'created', project });
    res.status(201).json(project);
  });

  // GET /api/projects/:id
  app.get('/api/projects/:id', authenticateToken, (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });
    res.json(project);
  });

  // PUT /api/projects/:id
  app.put('/api/projects/:id', authenticateToken, (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });
    const merged = { ...project, ...req.body, id: project.id, userId: project.userId, createdAt: project.createdAt };
    const errors = validateProject(merged);
    if (errors.length) return res.status(400).json({ errors });
    const updated = safeProject({ ...merged, updatedAt: Date.now() });
    projects.set(updated.id, updated);
    io.emit('project:update', { event: 'updated', project: updated });
    res.json(updated);
  });

  // DELETE /api/projects/:id
  app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });
    projects.delete(req.params.id);
    achievements.delete(req.params.id);
    io.emit('project:update', { event: 'deleted', projectId: req.params.id });
    res.json({ success: true });
  });

  // GET /api/projects/:id/metrics
  app.get('/api/projects/:id/metrics', authenticateToken, (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });
    // Simulate live metrics with minor drift
    const base = project.metrics || {};
    const metrics = {
      commits: (base.commits || 0) + Math.floor(Math.random() * 3),
      builds: (base.builds || 0),
      lastDeployment: base.lastDeployment,
      testCoverage: Math.max(0, Math.min(100, project.testCoverage + (Math.random() - 0.5) * 2)),
      buildStatus: project.buildStatus,
      progress: project.progress,
      linesOfCode: 1200 + Math.floor(Math.random() * 500),
      openIssues: Math.floor(Math.random() * 10),
      connectors: project.connectors,
      targetPlatforms: project.targetPlatforms,
      achievementCount: (achievements.get(req.params.id) || []).length,
    };
    // Emit real-time metric update
    io.emit('project:metric-update', { projectId: req.params.id, metrics });
    res.json(metrics);
  });

  // POST /api/projects/:id/achievements
  app.post('/api/projects/:id/achievements', authenticateToken, (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });
    const { name, description, icon, platform, unlockedAt } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const achievement = {
      id: uuidv4(),
      projectId: req.params.id,
      name: String(name).slice(0, 100),
      description: String(description || '').slice(0, 500),
      icon: String(icon || '🏆').slice(0, 10),
      platform: platform ? String(platform).slice(0, 50) : null,
      unlockedAt: unlockedAt || new Date().toISOString(),
      createdAt: Date.now(),
    };
    const list = achievements.get(req.params.id) || [];
    list.push(achievement);
    achievements.set(req.params.id, list);
    io.emit('project:achievement-unlocked', { projectId: req.params.id, achievement });
    res.status(201).json(achievement);
  });

  // GET /api/projects/:id/achievements
  app.get('/api/projects/:id/achievements', authenticateToken, (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });
    const list = achievements.get(req.params.id) || [];
    res.json({ achievements: list, total: list.length });
  });

  console.log('[projects] Routes registered');
}

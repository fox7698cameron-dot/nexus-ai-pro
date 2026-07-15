/**
 * src/routes/projects.js
 * Nexus AI Pro — Project Tracking Routes
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * GET    /api/projects          — list user projects
 * POST   /api/projects          — create project
 * GET    /api/projects/:id      — project detail + metrics
 * PUT    /api/projects/:id      — update project
 * DELETE /api/projects/:id      — delete project
 * POST   /api/projects/:id/milestone — toggle milestone
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = Router();

const VALID_TYPES = ['coding', 'gamedev', 'ar', 'vr', '3d'];

// ─── In-memory project store ──────────────────────────────────────────────────

const projectStore = new Map(); // userId -> [project]

function getUserProjects(userId) {
  if (!projectStore.has(userId)) projectStore.set(userId, []);
  return projectStore.get(userId);
}

function seedMetrics(type) {
  const base = {
    coding:  { commits: 412, builds: 38, passedTests: 294, failedTests: 12, coverage: 76, openIssues: 8,  teamSize: 4,  stars: 124, progress: 62 },
    gamedev: { commits: 184, builds: 21, passedTests: 88,  failedTests: 3,  coverage: 51, openIssues: 14, teamSize: 6,  stars: 38,  progress: 44 },
    ar:      { commits: 97,  builds: 12, passedTests: 54,  failedTests: 6,  coverage: 48, openIssues: 5,  teamSize: 3,  stars: 17,  progress: 29 },
    vr:      { commits: 211, builds: 18, passedTests: 142, failedTests: 8,  coverage: 63, openIssues: 11, teamSize: 5,  stars: 61,  progress: 55 },
    '3d':    { commits: 143, builds: 9,  passedTests: 71,  failedTests: 4,  coverage: 58, openIssues: 6,  teamSize: 2,  stars: 29,  progress: 38 },
  };
  return base[type] ?? base.coding;
}

function defaultMilestones(type) {
  const map = {
    coding:  ['Project setup & CI',   'Core API layer',        'Frontend scaffolding', 'Auth & sessions',     'Testing suite',       'Beta release',    'Production deploy'],
    gamedev: ['Concept & GDD',        'Engine setup',           'Core mechanics',       'Level design',        'Art & audio pass',    'QA & polishing',  'Launch'],
    ar:      ['SDK integration',      'Marker detection',       'Scene anchoring',      '3D asset pipeline',   'UI/UX overlay',       'Device testing',  'App store release'],
    vr:      ['Headset SDK setup',    'Scene & locomotion',     'Hand tracking',        'Spatial audio',       'Performance pass',    'Comfort review',  'Distribution'],
    '3d':    ['Concept & references', 'Base mesh modelling',   'UV unwrapping',        'Texturing & shading', 'Rigging & animation', 'Render passes',   'Final export'],
  };
  return (map[type] ?? map.coding).map((name, i) => ({ id: uuidv4(), name, done: false, order: i }));
}

// ─── GET /api/projects ────────────────────────────────────────────────────────

router.get('/', requireAuth, (req, res) => {
  const projects = getUserProjects(req.user.sub);
  res.json({ projects });
});

// ─── POST /api/projects ───────────────────────────────────────────────────────

router.post('/', requireAuth, (req, res) => {
  const { name, description = '', type = 'coding', language = 'JavaScript' } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: 'Project name required' });
  const t = VALID_TYPES.includes(type) ? type : 'coding';

  const project = {
    id: uuidv4(),
    userId: req.user.sub,
    name: name.trim(),
    description: description.trim(),
    type: t,
    language,
    metrics: seedMetrics(t),
    milestones: defaultMilestones(t),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  getUserProjects(req.user.sub).unshift(project);
  res.status(201).json({ project });
});

// ─── GET /api/projects/:id ────────────────────────────────────────────────────

router.get('/:id', requireAuth, (req, res) => {
  const project = getUserProjects(req.user.sub).find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// ─── PUT /api/projects/:id ────────────────────────────────────────────────────

router.put('/:id', requireAuth, (req, res) => {
  const list = getUserProjects(req.user.sub);
  const idx = list.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });

  const { name, description, language } = req.body ?? {};
  const updated = { ...list[idx], updatedAt: Date.now() };
  if (name?.trim())        updated.name        = name.trim();
  if (description != null) updated.description = description;
  if (language)            updated.language    = language;
  list[idx] = updated;
  res.json({ project: updated });
});

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────

router.delete('/:id', requireAuth, (req, res) => {
  const list = getUserProjects(req.user.sub);
  const idx = list.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });
  list.splice(idx, 1);
  res.json({ success: true });
});

// ─── POST /api/projects/:id/milestone ─────────────────────────────────────────

router.post('/:id/milestone', requireAuth, (req, res) => {
  const list = getUserProjects(req.user.sub);
  const project = list.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { milestoneId, done } = req.body ?? {};
  const ms = project.milestones?.find(m => m.id === milestoneId);
  if (!ms) return res.status(404).json({ error: 'Milestone not found' });

  ms.done = Boolean(done);
  const completed = project.milestones.filter(m => m.done).length;
  project.metrics.progress = Math.round((completed / project.milestones.length) * 100);
  project.updatedAt = Date.now();

  res.json({ milestone: ms, progress: project.metrics.progress });
});

export default router;

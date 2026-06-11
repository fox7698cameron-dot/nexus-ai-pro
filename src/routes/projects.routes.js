// src/routes/projects.routes.js
// Project tracking endpoints — coding, game dev, AR/VR/3D
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validateBody, Schemas } from '../middleware/validate.middleware.js';
import { PERMISSIONS, PROJECT_TYPES } from '../config/constants.js';
import {
  createProject, getProject, getUserProjects, updateProjectMetrics,
  updateProgress, addMilestone, completeMilestone, deleteProject,
  ingestEngineEvent, updateAssetMetrics,
} from '../services/project-tracker.service.js';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

// GET /api/projects — list user's projects
router.get('/', requirePermission(PERMISSIONS.PROJECT_READ), (req, res) => {
  const { type } = req.query;
  const projects = getUserProjects(req.user.sub, type || null);
  return res.json({ projects, count: projects.length });
});

// POST /api/projects — create project
router.post('/', requirePermission(PERMISSIONS.PROJECT_WRITE), validateBody(Schemas.projectCreate), (req, res) => {
  const project = createProject(req.user.sub, req.body);
  return res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', requirePermission(PERMISSIONS.PROJECT_READ), (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Access denied' });
  return res.json(project);
});

// PATCH /api/projects/:id/progress
router.patch('/:id/progress', requirePermission(PERMISSIONS.PROJECT_WRITE), (req, res) => {
  const { progress, buildStatus } = req.body;
  if (progress === undefined) return res.status(400).json({ error: 'progress required' });
  const project = getProject(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  return res.json(updateProgress(req.params.id, progress, buildStatus));
});

// PATCH /api/projects/:id/metrics
router.patch('/:id/metrics', requirePermission(PERMISSIONS.PROJECT_WRITE), (req, res) => {
  const project = getProject(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  return res.json(updateProjectMetrics(req.params.id, req.body));
});

// PATCH /api/projects/:id/assets — AR/VR/3D asset metrics
router.patch('/:id/assets', requirePermission(PERMISSIONS.PROJECT_WRITE), (req, res) => {
  const project = getProject(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  return res.json(updateAssetMetrics(req.params.id, req.body));
});

// POST /api/projects/:id/milestones
router.post('/:id/milestones', requirePermission(PERMISSIONS.PROJECT_WRITE), (req, res) => {
  const { title, description, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const project = getProject(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  const milestone = addMilestone(req.params.id, { title, description, dueDate });
  return res.status(201).json(milestone);
});

// PATCH /api/projects/:id/milestones/:mid/complete
router.patch('/:id/milestones/:mid/complete', requirePermission(PERMISSIONS.PROJECT_WRITE), (req, res) => {
  const project = getProject(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  const m = completeMilestone(req.params.id, req.params.mid);
  if (!m) return res.status(404).json({ error: 'Milestone not found' });
  return res.json(m);
});

// POST /api/projects/:id/engine-event — game engine webhook
router.post('/:id/engine-event', (req, res) => {
  const { engine, eventType, payload } = req.body;
  if (!engine || !eventType) return res.status(400).json({ error: 'engine and eventType required' });
  const event = ingestEngineEvent(req.params.id, engine, eventType, payload ?? {});
  if (!event) return res.status(404).json({ error: 'Project not found' });
  return res.status(201).json(event);
});

// DELETE /api/projects/:id
router.delete('/:id', requirePermission(PERMISSIONS.PROJECT_DELETE), (req, res) => {
  const deleted = deleteProject(req.params.id, req.user.sub);
  if (!deleted) return res.status(404).json({ error: 'Project not found or access denied' });
  return res.json({ message: 'Project deleted' });
});

// GET /api/projects/types/list
router.get('/types/list', (req, res) => {
  return res.json({ types: Object.values(PROJECT_TYPES) });
});

export default router;

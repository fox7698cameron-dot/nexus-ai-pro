// src/routes/game-routes.js
// Date: 2026-07-08
// Game development, AR/VR/3D project tracking, achievements, platform connectors

import express from 'express';
import { createAuthMiddleware } from '../middleware/auth-middleware.js';
import { ENGINES, PROJECT_TYPES, PLATFORMS_GAME } from '../services/game-tracking-service.js';

export function createGameRouter(gameService, authService) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(authService);

  // GET /api/game/meta - returns supported engines, types, platforms
  router.get('/meta', (req, res) => {
    res.json({ engines: Object.values(ENGINES), projectTypes: Object.values(PROJECT_TYPES), platforms: Object.values(PLATFORMS_GAME) });
  });

  // ---- Projects ----

  // POST /api/game/projects
  router.post('/projects', authenticate, (req, res) => {
    const project = gameService.createProject(req.user.id, req.body);
    res.status(201).json(project);
  });

  // GET /api/game/projects
  router.get('/projects', authenticate, (req, res) => {
    const projects = gameService.getUserProjects(req.user.id);
    res.json({ projects });
  });

  // GET /api/game/projects/:id
  router.get('/projects/:id', authenticate, (req, res) => {
    const project = gameService.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json(project);
  });

  // PUT /api/game/projects/:id
  router.put('/projects/:id', authenticate, (req, res) => {
    const project = gameService.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const updated = gameService.updateProject(req.params.id, req.body);
    res.json(updated);
  });

  // ---- Milestones ----

  // POST /api/game/projects/:id/milestones
  router.post('/projects/:id/milestones', authenticate, (req, res) => {
    const milestone = gameService.addMilestone(req.params.id, req.body);
    if (!milestone) return res.status(404).json({ error: 'Project not found' });
    res.status(201).json(milestone);
  });

  // POST /api/game/projects/:id/milestones/:milestoneId/complete
  router.post('/projects/:id/milestones/:milestoneId/complete', authenticate, (req, res) => {
    const milestone = gameService.completeMilestone(req.params.id, req.params.milestoneId);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });
    res.json(milestone);
  });

  // ---- Builds ----

  // POST /api/game/projects/:id/builds
  router.post('/projects/:id/builds', authenticate, (req, res) => {
    const build = gameService.recordBuild(req.params.id, req.body);
    if (!build) return res.status(404).json({ error: 'Project not found' });
    res.status(201).json(build);
  });

  // ---- Achievements ----

  // POST /api/game/projects/:id/achievements
  router.post('/projects/:id/achievements', authenticate, (req, res) => {
    const achievement = gameService.defineAchievement(req.params.id, req.body);
    res.status(201).json(achievement);
  });

  // GET /api/game/projects/:id/achievements
  router.get('/projects/:id/achievements', authenticate, (req, res) => {
    const achievements = gameService.getProjectAchievements(req.params.id);
    res.json({ achievements });
  });

  // POST /api/game/achievements/:id/unlock
  router.post('/achievements/:id/unlock', authenticate, (req, res) => {
    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });
    const achievement = gameService.unlockAchievement(req.params.id, playerId);
    if (!achievement) return res.status(404).json({ error: 'Achievement not found' });
    res.json(achievement);
  });

  // GET /api/game/projects/:id/players/:playerId/progress
  router.get('/projects/:id/players/:playerId/progress', authenticate, (req, res) => {
    const progress = gameService.getPlayerProgress(req.params.id, req.params.playerId);
    res.json(progress);
  });

  // ---- Platform Connectors ----

  // POST /api/game/projects/:id/connect/:platform
  router.post('/projects/:id/connect/:platform', authenticate, (req, res) => {
    const { credentials } = req.body;
    if (!credentials) return res.status(400).json({ error: 'credentials required' });
    const result = gameService.connectPlatform(req.user.id, req.params.id, req.params.platform, credentials);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  });

  // GET /api/game/projects/:id/connectors
  router.get('/projects/:id/connectors', authenticate, (req, res) => {
    const connectors = gameService.getConnectors(req.user.id, req.params.id);
    res.json({ connectors });
  });

  // GET /api/game/projects/:id/stats/:platform
  router.get('/projects/:id/stats/:platform', authenticate, (req, res) => {
    const stats = gameService.getGameStats(req.params.id, req.params.platform);
    res.json(stats);
  });

  // GET /api/game/projects/:id/arvr-metrics
  router.get('/projects/:id/arvr-metrics', authenticate, (req, res) => {
    const metrics = gameService.getARVRMetrics(req.params.id);
    if (!metrics) return res.status(404).json({ error: 'Project not found' });
    res.json(metrics);
  });

  // GET /api/game/dashboard
  router.get('/dashboard', authenticate, (req, res) => {
    const dashboard = gameService.getDashboard(req.user.id);
    res.json(dashboard);
  });

  return router;
}

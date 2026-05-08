// src/routes/projects.routes.js
// Nexus AI Pro - Project Tracking & Game Engine API Routes
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

const PROJECT_TYPES = ['code', 'game', 'ar_vr', 'mobile', 'web'];
const GAME_PLATFORMS = ['epic', 'sony_psn', 'microsoft_xbox', 'ubisoft', 'steam', 'itch'];
const ACHIEVEMENT_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export function createProjectsRouter(kvStore, gameRegistry, authService) {
  const router = Router();
  const auth = authService.requireAuth();

  // ─── List projects ────────────────────────────────────────────────────────────
  router.get('/:userId', auth, async (req, res) => {
    const projects = (await kvStore.get(`projects:${req.params.userId}`)) || [];
    res.json({ projects });
  });

  // ─── Create project ───────────────────────────────────────────────────────────
  router.post('/', auth, [
    body('name').isString().trim().isLength({ min: 1, max: 100 }),
    body('type').isIn(PROJECT_TYPES),
    body('description').optional().isString().trim(),
    body('engine').optional().isString(),
    body('platform').optional().isIn(GAME_PLATFORMS),
    body('language').optional().isString(),
  ], async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array().map(e => e.msg) });
    const userId = req.user.sub;
    const projects = (await kvStore.get(`projects:${userId}`)) || [];
    const project = {
      id: uuidv4(),
      userId,
      ...req.body,
      status: 'active',
      progress: 0,
      commits: 0,
      openIssues: 0,
      closedIssues: 0,
      buildStatus: 'unknown',
      weeklyCommits: [0, 0, 0, 0, 0, 0, 0],
      milestones: [],
      achievements: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    projects.push(project);
    await kvStore.set(`projects:${userId}`, projects);
    res.status(201).json(project);
  });

  // ─── Update project ───────────────────────────────────────────────────────────
  router.put('/:projectId', auth, async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user.sub;
    const projects = (await kvStore.get(`projects:${userId}`)) || [];
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });
    // Prevent overriding protected fields
    const { id, userId: _, createdAt, ...updates } = req.body;
    projects[idx] = { ...projects[idx], ...updates, updatedAt: Date.now() };
    await kvStore.set(`projects:${userId}`, projects);
    res.json(projects[idx]);
  });

  // ─── Delete project ───────────────────────────────────────────────────────────
  router.delete('/:projectId', auth, async (req, res) => {
    const userId = req.user.sub;
    const projects = ((await kvStore.get(`projects:${userId}`)) || []).filter(p => p.id !== req.params.projectId);
    await kvStore.set(`projects:${userId}`, projects);
    res.json({ success: true });
  });

  // ─── Add milestone ────────────────────────────────────────────────────────────
  router.post('/:projectId/milestones', auth, [
    body('name').isString().trim().notEmpty(),
    body('dueDate').optional().isString(),
  ], async (req, res) => {
    const userId = req.user.sub;
    const projects = (await kvStore.get(`projects:${userId}`)) || [];
    const project = projects.find(p => p.id === req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const milestone = { id: uuidv4(), name: req.body.name, progress: 0, done: false, dueDate: req.body.dueDate || null };
    project.milestones = [...(project.milestones || []), milestone];
    project.updatedAt = Date.now();
    await kvStore.set(`projects:${userId}`, projects);
    res.status(201).json(milestone);
  });

  // ─── Track progress ───────────────────────────────────────────────────────────
  router.post('/:projectId/progress', auth, [
    body('percentage').isInt({ min: 0, max: 100 }),
  ], async (req, res) => {
    const { percentage } = req.body;
    const userId = req.user.sub;
    const result = await gameRegistry.achievements.trackProgress(userId, req.params.projectId, { percentage });
    const projects = (await kvStore.get(`projects:${userId}`)) || [];
    const project = projects.find(p => p.id === req.params.projectId);
    if (project) {
      project.progress = percentage;
      project.updatedAt = Date.now();
      await kvStore.set(`projects:${userId}`, projects);
    }
    res.json({ progress: result });
  });

  // ─── Unlock achievement ───────────────────────────────────────────────────────
  router.post('/:projectId/achievements', auth, [
    body('name').isString().trim().notEmpty(),
    body('description').optional().isString().trim(),
    body('rarity').optional().isIn(ACHIEVEMENT_RARITIES),
    body('icon').optional().isString(),
  ], async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array().map(e => e.msg) });
    const userId = req.user.sub;
    const achievement = { id: uuidv4(), ...req.body, projectId: req.params.projectId };
    const result = await gameRegistry.achievements.unlockAchievement(userId, achievement);
    // Also attach to project
    const projects = (await kvStore.get(`projects:${userId}`)) || [];
    const project = projects.find(p => p.id === req.params.projectId);
    if (project && !result.alreadyUnlocked) {
      project.achievements = [...(project.achievements || []), achievement];
      project.updatedAt = Date.now();
      await kvStore.set(`projects:${userId}`, projects);
    }
    res.json(result);
  });

  // ─── Game platform integration ────────────────────────────────────────────────
  router.get('/platform/:platform/:accountId/achievements', auth,
    [param('platform').isIn(GAME_PLATFORMS)],
    async (req, res) => {
      const { platform, accountId } = req.params;
      try {
        const connector = gameRegistry.getConnector(platform);
        let achievements;
        if (platform === 'epic') achievements = await connector.getAchievements(accountId);
        else if (platform === 'sony_psn') achievements = await connector.getTrophies(accountId);
        else if (platform === 'microsoft_xbox') achievements = await connector.getAchievements(accountId);
        else if (platform === 'ubisoft') achievements = await connector.getAchievements(accountId);
        else achievements = [];
        res.json({ platform, accountId, achievements });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );

  // ─── User achievements (all projects) ────────────────────────────────────────
  router.get('/achievements/:userId', auth, async (req, res) => {
    const all = await gameRegistry.achievements.getAchievements(req.params.userId);
    res.json({ achievements: all });
  });

  return router;
}

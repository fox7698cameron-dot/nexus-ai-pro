/**
 * src/gaming/routes.js
 * Nexus AI Pro — Gaming & Project Routes
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Mount at: /api/gaming
 */

import { Router } from 'express';
import { requireAuth } from '../auth/auth.js';
import {
  getOAuthUrl, exchangeOAuthCode, saveConnection,
  getConnection, disconnectPlatform, listConnections,
  unlockAchievement, getAchievements, getAchievementStats,
  updateGameProgress, getGameProgress, listGameProgress,
  createProject, updateProject, getProject, listProjects, deleteProject,
  PROJECT_TYPES,
} from './connectors.js';

const router = Router();
router.use(requireAuth());

// ─── OAuth connect ────────────────────────────────────────────────────────────

router.get('/connect/:platform/url', (req, res) => {
  try {
    const { platform } = req.params;
    const redirectUri  = `${process.env.APP_URL || 'http://localhost:3001'}/api/gaming/connect/${platform}/callback`;
    const state        = `${req.user.sub}:${Date.now()}`;
    const url          = getOAuthUrl(platform, redirectUri, state);
    res.json({ url, state });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.get('/connect/:platform/callback', async (req, res) => {
  try {
    const { platform } = req.params;
    const { code, state } = req.query;
    const [userId] = (state || '').split(':');

    if (!code) return res.status(400).json({ error: 'Authorization code missing' });

    const redirectUri = `${process.env.APP_URL || 'http://localhost:3001'}/api/gaming/connect/${platform}/callback`;
    const tokens      = await exchangeOAuthCode(platform, code, redirectUri);
    saveConnection(userId, platform, tokens);

    res.redirect(`${process.env.APP_URL || 'http://localhost:3001'}/dashboard?connected=${platform}`);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

router.get('/connections', (req, res) => {
  res.json({ connections: listConnections(req.user.sub) });
});

router.delete('/connections/:platform', (req, res) => {
  disconnectPlatform(req.user.sub, req.params.platform);
  res.json({ success: true });
});

// ─── Achievements ─────────────────────────────────────────────────────────────

router.post('/achievements/unlock', (req, res) => {
  try {
    const result = unlockAchievement(req.user.sub, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/achievements', (req, res) => {
  res.json({
    achievements: getAchievements(req.user.sub),
    stats:        getAchievementStats(req.user.sub),
  });
});

// ─── Game progress ────────────────────────────────────────────────────────────

router.put('/progress/:gameId', (req, res) => {
  const progress = updateGameProgress(req.user.sub, req.params.gameId, req.body);
  res.json(progress);
});

router.get('/progress/:gameId', (req, res) => {
  const progress = getGameProgress(req.user.sub, req.params.gameId);
  if (!progress) return res.status(404).json({ error: 'Not found' });
  res.json(progress);
});

router.get('/progress', (req, res) => {
  res.json({ progress: listGameProgress(req.user.sub) });
});

// ─── Projects ─────────────────────────────────────────────────────────────────

router.post('/projects', (req, res) => {
  try {
    const project = createProject(req.user.sub, req.body);
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/projects', (req, res) => {
  const { type } = req.query;
  const allowed  = Object.values(PROJECT_TYPES);
  const safeType = allowed.includes(type) ? type : null;
  res.json({ projects: listProjects(req.user.sub, safeType) });
});

router.get('/projects/:id', (req, res) => {
  const project = getProject(req.params.id);
  if (!project || project.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

router.patch('/projects/:id', (req, res) => {
  try {
    const project = updateProject(req.params.id, req.user.sub, req.body);
    res.json(project);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.delete('/projects/:id', (req, res) => {
  try {
    const result = deleteProject(req.params.id, req.user.sub);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

export default router;

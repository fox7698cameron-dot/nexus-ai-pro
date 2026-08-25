/**
 * server/routes/gamedev.js
 * Nexus AI Pro — Game Development API Routes
 * Labeled: 2026-08-25
 *
 * POST /api/gamedev/projects                 — create project
 * GET  /api/gamedev/projects                 — list user projects
 * GET  /api/gamedev/projects/:id             — get project detail
 * PATCH /api/gamedev/projects/:id            — update project
 * POST /api/gamedev/projects/:id/milestones  — add milestone
 * POST /api/gamedev/projects/:id/tasks       — add task
 * POST /api/gamedev/projects/:id/builds      — record build
 * GET  /api/gamedev/projects/:id/builds      — build history
 * POST /api/gamedev/projects/:id/link        — link platform account
 * GET  /api/gamedev/projects/:id/metrics     — project summary metrics
 * GET  /api/gamedev/platforms/:platform/:accountId — platform metrics
 * GET  /api/gamedev/achievements             — user achievements
 * POST /api/gamedev/achievements             — grant achievement
 * GET  /api/gamedev/progress                 — all game progress for user
 * POST /api/gamedev/progress/:gameId         — update game progress
 */

import express from 'express';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.js';
import {
  createProject,
  getProject,
  getUserProjects,
  updateProject,
  addMilestone,
  addTask,
  recordBuild,
  getBuildHistory,
  linkPlatformAccount,
  fetchPlatformMetrics,
  grantAchievement,
  getUserAchievements,
  updateGameProgress,
  getGameProgress,
  getAllGameProgress,
  getProjectMetricsSummary,
  GAME_PLATFORMS,
  PROJECT_TYPES
} from '../services/gameDevService.js';

const router = express.Router();

// ── Projects ──────────────────────────────────────────────────────────────────
router.post('/projects', requireAuth, (req, res) => {
  const project = createProject(req.user.sub, req.body);
  return res.status(201).json(project);
});

router.get('/projects', requireAuth, (req, res) => {
  const projects = getUserProjects(req.user.sub);
  return res.json({ projects });
});

router.get('/projects/:id', requireAuth, (req, res) => {
  const project = getProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const isMember = project.userId === req.user.sub ||
    project.teamMembers.some(m => m.userId === req.user.sub);
  if (!isMember) return res.status(403).json({ error: 'Access denied' });

  return res.json(project);
});

router.patch('/projects/:id', requireAuth, (req, res) => {
  const result = updateProject(req.params.id, req.user.sub, req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.json(result.project);
});

// ── Milestones ────────────────────────────────────────────────────────────────
router.post('/projects/:id/milestones', requireAuth, (req, res) => {
  const result = addMilestone(req.params.id, req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.status(201).json(result.milestone);
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
router.post('/projects/:id/tasks', requireAuth, (req, res) => {
  const { milestoneId, ...taskData } = req.body;
  const result = addTask(req.params.id, milestoneId || null, taskData);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.status(201).json(result.task);
});

// ── Builds ────────────────────────────────────────────────────────────────────
router.post('/projects/:id/builds', requireAuth, (req, res) => {
  const result = recordBuild(req.params.id, req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.status(201).json(result.build);
});

router.get('/projects/:id/builds', requireAuth, (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const builds = getBuildHistory(req.params.id, limit);
  return res.json({ builds });
});

// ── Platform linking ──────────────────────────────────────────────────────────
router.post('/projects/:id/link', requireAuth, (req, res) => {
  const { platform, accountId, displayName } = req.body;
  const result = linkPlatformAccount(req.params.id, platform, { accountId, displayName });
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.status(201).json(result.link);
});

// ── Project metrics ───────────────────────────────────────────────────────────
router.get('/projects/:id/metrics', requireAuth, (req, res) => {
  const summary = getProjectMetricsSummary(req.params.id);
  if (!summary) return res.status(404).json({ error: 'Project not found' });
  return res.json(summary);
});

// ── Platform metrics (external) ───────────────────────────────────────────────
router.get('/platforms/:platform/:accountId', requireAuth, async (req, res) => {
  try {
    const { platform, accountId } = req.params;
    const validPlatforms = Object.values(GAME_PLATFORMS);
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }
    const data = await fetchPlatformMetrics(platform, accountId);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Achievements ──────────────────────────────────────────────────────────────
router.get('/achievements', requireAuth, (req, res) => {
  const list = getUserAchievements(req.user.sub);
  return res.json({ achievements: list, total: list.length });
});

router.post('/achievements', requireAuth, (req, res) => {
  const result = grantAchievement(req.user.sub, req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.status(201).json(result.achievement);
});

// ── Game progress ─────────────────────────────────────────────────────────────
router.get('/progress', requireAuth, (req, res) => {
  const all = getAllGameProgress(req.user.sub);
  return res.json({ progress: all });
});

router.get('/progress/:gameId', requireAuth, (req, res) => {
  const p = getGameProgress(req.user.sub, req.params.gameId);
  if (!p) return res.status(404).json({ error: 'No progress found' });
  return res.json(p);
});

router.post('/progress/:gameId', requireAuth, (req, res) => {
  const result = updateGameProgress(req.user.sub, req.params.gameId, req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });
  return res.status(200).json(result.progress);
});

// ── Metadata ──────────────────────────────────────────────────────────────────
router.get('/platforms', requireAuth, (req, res) => {
  return res.json({ platforms: Object.values(GAME_PLATFORMS) });
});

router.get('/project-types', requireAuth, (req, res) => {
  return res.json({ types: Object.values(PROJECT_TYPES) });
});

export default router;

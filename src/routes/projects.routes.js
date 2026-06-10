// /home/user/nexus-ai-pro/src/routes/projects.routes.js | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

/**
 * Express router for project tracking and game platform integration endpoints.
 * @module projects.routes
 */

import { Router } from 'express';

import {
  createProject,
  updateProject,
  getProject,
  listProjects,
  deleteProject,
  updateMilestone,
  addMilestone,
  getProjectSummary,
  ProjectNotFoundError,
  MilestoneNotFoundError,
  ValidationError
} from '../lib/projectTracking.js';

import {
  getConnector,
  GameIntegrationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError
} from '../lib/gameIntegrations.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map a typed error to an appropriate HTTP status code.
 * @param {Error} err
 * @returns {number}
 */
function statusFor(err) {
  if (err instanceof ValidationError)       return 400;
  if (err instanceof AuthenticationError)   return 401;
  if (err instanceof ProjectNotFoundError)  return 404;
  if (err instanceof MilestoneNotFoundError) return 404;
  if (err instanceof NotFoundError)         return 404;
  if (err instanceof RateLimitError)        return 429;
  if (err instanceof GameIntegrationError)  return err.statusCode ?? 502;
  return 500;
}

/**
 * Wraps an async route handler and forwards errors to Express next().
 * @param {import('express').RequestHandler} fn
 * @returns {import('express').RequestHandler}
 */
function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ─── Project Routes ───────────────────────────────────────────────────────────

/**
 * GET /api/projects
 * List all projects. Optional query filters: ?type=&status=
 */
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const { type, status } = req.query;
    const projects  = listProjects({ type, status });
    const summary   = getProjectSummary();
    res.json({ projects, summary, total: projects.length });
  })
);

/**
 * POST /api/projects
 * Create a new project.
 * Body: { name, description?, type, status?, metrics? }
 */
router.post(
  '/',
  asyncRoute(async (req, res) => {
    const project = createProject(req.body);
    res.status(201).json({ project });
  })
);

/**
 * GET /api/projects/:id
 * Get a single project with its real-time metrics.
 */
router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const project = getProject(req.params.id);
    res.json({ project });
  })
);

/**
 * PUT /api/projects/:id
 * Update a project's fields or metrics.
 * Body: { name?, description?, status?, metrics? }
 */
router.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const project = updateProject(req.params.id, req.body);
    res.json({ project });
  })
);

/**
 * DELETE /api/projects/:id
 * Remove a project from the store.
 */
router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const result = deleteProject(req.params.id);
    res.json(result);
  })
);

/**
 * PUT /api/projects/:id/milestone/:milestoneId
 * Update an existing milestone.
 * Body: { title?, completion?, dueDate?, done? }
 */
router.put(
  '/:id/milestone/:milestoneId',
  asyncRoute(async (req, res) => {
    const project = updateMilestone(req.params.id, req.params.milestoneId, req.body);
    res.json({ project });
  })
);

/**
 * POST /api/projects/:id/milestone
 * Add a new milestone to a game-dev project.
 * Body: { title, dueDate? }
 */
router.post(
  '/:id/milestone',
  asyncRoute(async (req, res) => {
    const project = addMilestone(req.params.id, req.body);
    res.status(201).json({ project });
  })
);

// ─── Game Platform Routes ─────────────────────────────────────────────────────

/**
 * GET /api/achievements/:platform/:userId
 * Fetch achievements for a user from the specified platform connector.
 * Requires the connector to already be authenticated (connect() called server-side).
 */
router.get(
  '/achievements/:platform/:userId',
  asyncRoute(async (req, res) => {
    const { platform, userId } = req.params;
    const connector    = getConnector(platform);
    const achievements = await connector.getAchievements(userId);
    res.json({ platform, userId, achievements, total: achievements.length });
  })
);

/**
 * GET /api/game-progress/:platform/:userId
 * Fetch all game progress entries for a user from the specified platform.
 * Query param: ?gameId= (optional, returns single game progress if provided)
 */
router.get(
  '/game-progress/:platform/:userId',
  asyncRoute(async (req, res) => {
    const { platform, userId } = req.params;
    const { gameId } = req.query;
    const connector  = getConnector(platform);

    if (gameId) {
      const progress = await connector.getGameProgress(userId, gameId);
      return res.json({ platform, userId, progress });
    }

    // Without gameId, attempt getGameProgress with a wildcard if supported,
    // otherwise return a descriptive message guiding callers to supply gameId.
    res.status(400).json({
      error:  'Query parameter "gameId" is required for game progress lookups.',
      hint:   `GET /api/game-progress/${platform}/${userId}?gameId=<titleId>`
    });
  })
);

/**
 * POST /api/sync-stats/:platform/:userId
 * Trigger a stat sync for a user on the specified platform.
 */
router.post(
  '/sync-stats/:platform/:userId',
  asyncRoute(async (req, res) => {
    const { platform, userId } = req.params;
    const connector = getConnector(platform);
    const result    = await connector.syncStats(userId);
    res.json({ platform, userId, ...result });
  })
);

// ─── Error Handler ────────────────────────────────────────────────────────────

/**
 * Route-scoped error handler — maps typed errors to structured JSON responses.
 * @type {import('express').ErrorRequestHandler}
 */
router.use((err, req, res, _next) => {
  const status  = statusFor(err);
  const payload = {
    error:   err.name ?? 'Error',
    message: err.message
  };

  if (err.field)         payload.field       = err.field;
  if (err.platform)      payload.platform    = err.platform;
  if (err.milestoneId)   payload.milestoneId = err.milestoneId;
  if (err.id)            payload.projectId   = err.id;
  if (status === 500)    payload.stack       = process.env.NODE_ENV !== 'production' ? err.stack : undefined;

  res.status(status).json(payload);
});

export default router;

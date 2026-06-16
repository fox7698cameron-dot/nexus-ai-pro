// File: gaming.js | Date: 2026-06-16
import { Router } from 'express';
import { z } from 'zod';
import gamingService from '../services/gamingService.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All gaming routes require authentication
router.use(authenticate);

// --- Schemas ---
const createGameProjectSchema = z.object({
  name: z.string().min(1).max(200),
  engine: z.string().min(1).max(50),
  genre: z.string().optional(),
  platform: z.array(z.string()).optional(),
  targetPlatforms: z.array(z.string()).optional(),
  teamSize: z.number().int().min(1).optional(),
});

const progressSchema = z.object({
  phase: z.enum(['concept', 'pre_production', 'production', 'alpha', 'beta', 'gold', 'released', 'post_launch']).optional(),
  completion: z.number().min(0).max(100).optional(),
  milestone: z.string().optional(),
});

const achievementSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
  points: z.number().int().min(0).optional(),
  unlockedAt: z.string().optional(),
});

const gameStatsSchema = z.object({
  playtime: z.number().min(0).optional(),
  level: z.number().int().min(1).optional(),
  score: z.number().min(0).optional(),
  completionPercent: z.number().min(0).max(100).optional(),
});

const connectPlatformSchema = z.object({
  accessToken: z.string().optional(),
  apiKey: z.string().optional(),
  username: z.string().optional(),
}).passthrough();

const arvrSchema = z.object({
  type: z.enum(['ar', 'vr', 'mr']),
  headset: z.string().optional(),
  framework: z.string().optional(),
  targetFPS: z.number().int().min(24).max(120).optional(),
  polyCount: z.number().int().min(0).optional(),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten().fieldErrors });
    }
    req.validated = result.data;
    next();
  };
}

// GET /projects
router.get('/projects', (req, res) => {
  try {
    const projects = gamingService.getUserGameProjects(req.user.id);
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /projects
router.post('/projects', validate(createGameProjectSchema), (req, res) => {
  try {
    const project = gamingService.createGameProject(req.user.id, req.validated);
    res.status(201).json({ project });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /projects/:id
router.get('/projects/:id', (req, res) => {
  try {
    const project = gamingService.getGameProject(req.params.id);
    res.json({ project });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// PUT /projects/:id/progress
router.put('/projects/:id/progress', validate(progressSchema), (req, res) => {
  try {
    const project = gamingService.updateProgress(req.params.id, req.validated);
    res.json({ project });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /achievements
router.get('/achievements', (req, res) => {
  try {
    const result = gamingService.getUserAchievements(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /achievements
router.post('/achievements', validate(achievementSchema), (req, res) => {
  try {
    const achievement = gamingService.trackAchievement(req.user.id, req.validated);
    res.status(201).json({ achievement });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /stats/:gameId
router.get('/stats/:gameId', (req, res) => {
  try {
    const stats = gamingService.getUserGameStats(req.user.id, req.params.gameId);
    if (!stats) return res.status(404).json({ error: 'No stats found for this game' });
    res.json({ stats });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /stats/:gameId — update stats
router.put('/stats/:gameId', validate(gameStatsSchema), (req, res) => {
  try {
    const stats = gamingService.updateGameStats(req.user.id, req.params.gameId, req.validated);
    res.json({ stats });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /leaderboard/:gameId
router.get('/leaderboard/:gameId', (req, res) => {
  try {
    const metric = req.query.metric || 'score';
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
    const leaderboard = gamingService.getLeaderboard(req.params.gameId, metric, limit);
    res.json({ leaderboard });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /platforms/:platform/connect
router.post('/platforms/:platform/connect', validate(connectPlatformSchema), async (req, res) => {
  try {
    const result = await gamingService.connectGamePlatform(req.user.id, req.params.platform, req.validated);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /library
router.get('/library', async (req, res) => {
  try {
    const library = await gamingService.getGameLibrary(req.user.id);
    res.json({ library });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /platforms/:platform/sync
router.post('/platforms/:platform/sync', async (req, res) => {
  try {
    const result = await gamingService.syncAchievements(req.user.id, req.params.platform);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /projects/:id/arvr
router.get('/projects/:id/arvr', (req, res) => {
  try {
    const stats = gamingService.getARVRStats(req.params.id);
    res.json({ stats });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /projects/:id/arvr — track AR/VR data
router.post('/projects/:id/arvr', validate(arvrSchema), (req, res) => {
  try {
    const info = gamingService.trackARVRProject(req.params.id, req.validated);
    res.json({ info });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /projects/:id/3d
router.get('/projects/:id/3d', (req, res) => {
  try {
    const stats = gamingService.get3DProjectStats(req.params.id);
    res.json({ stats });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

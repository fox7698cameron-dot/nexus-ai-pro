// File: analytics.js | Date: 2026-06-16
import { Router } from 'express';
import { z } from 'zod';
import analyticsService from '../services/analyticsService.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

const VALID_PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];
const VALID_TIME_RANGES = ['24h', '7d', '30d', '90d', '1y'];

const connectSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  clientId: z.string().optional(),
  scope: z.string().optional(),
}).passthrough();

function validatePlatform(req, res, next) {
  if (!VALID_PLATFORMS.includes(req.params.platform)) {
    return res.status(400).json({
      error: `Invalid platform. Valid: ${VALID_PLATFORMS.join(', ')}`,
    });
  }
  next();
}

// GET /platforms — list connected platforms
router.get('/platforms', (req, res) => {
  try {
    const platforms = analyticsService.getConnectedPlatforms(req.user.id);
    res.json({ platforms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /platforms/:platform/connect
router.post('/platforms/:platform/connect', validatePlatform, async (req, res) => {
  try {
    const parsed = connectSchema.safeParse(req.body);
    const credentials = parsed.success ? parsed.data : req.body;
    const result = await analyticsService.connectPlatform(req.user.id, req.params.platform, credentials);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /platforms/:platform
router.delete('/platforms/:platform', validatePlatform, async (req, res) => {
  try {
    const result = await analyticsService.disconnectPlatform(req.user.id, req.params.platform);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /metrics — all platforms
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await analyticsService.getAllMetrics(req.user.id);
    res.json({ metrics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /metrics/:platform — specific platform
router.get('/metrics/:platform', validatePlatform, async (req, res) => {
  try {
    const timeRange = VALID_TIME_RANGES.includes(req.query.timeRange) ? req.query.timeRange : '30d';
    const metrics = await analyticsService.getMetrics(req.user.id, req.params.platform, timeRange);
    res.json({ metrics });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /metrics/:platform/realtime — Server-Sent Events or JSON snapshot
router.get('/metrics/:platform/realtime', validatePlatform, async (req, res) => {
  try {
    // SSE if client accepts it
    if (req.headers.accept === 'text/event-stream') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const send = async () => {
        const data = await analyticsService.getRealTimeMetrics(req.user.id, req.params.platform);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      await send();
      const interval = setInterval(send, 5000);
      req.on('close', () => clearInterval(interval));
    } else {
      const metrics = await analyticsService.getRealTimeMetrics(req.user.id, req.params.platform);
      res.json({ metrics });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /metrics/:platform/content — top content
router.get('/metrics/:platform/content', validatePlatform, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const content = await analyticsService.getTopContent(req.user.id, req.params.platform, limit);
    res.json({ content });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /metrics/:platform/audience — audience insights
router.get('/metrics/:platform/audience', validatePlatform, async (req, res) => {
  try {
    const insights = await analyticsService.getAudienceInsights(req.user.id, req.params.platform);
    res.json({ insights });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /metrics/:platform/retention — retention data
router.get('/metrics/:platform/retention', validatePlatform, async (req, res) => {
  try {
    const videoId = req.query.videoId;
    const retention = await analyticsService.getRetentionData(req.user.id, req.params.platform, videoId);
    res.json({ retention });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /reports/schedule
router.post('/reports/schedule', async (req, res) => {
  try {
    const schema = z.object({
      platforms: z.array(z.enum(VALID_PLATFORMS)).min(1),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const { platforms, frequency } = parsed.data;
    const report = await analyticsService.scheduleReport(req.user.id, platforms, frequency);
    res.status(201).json({ report });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /reports/export
router.get('/reports/export', async (req, res) => {
  try {
    const format = ['json', 'csv'].includes(req.query.format) ? req.query.format : 'json';
    const platforms = req.query.platforms
      ? req.query.platforms.split(',').filter(p => VALID_PLATFORMS.includes(p))
      : VALID_PLATFORMS;

    const result = await analyticsService.exportReport(req.user.id, platforms, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
      return res.send(result.content);
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

// routes/analytics.js — 2026-07-26
// Social media analytics, project tracking, real-time metrics
import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = express.Router();

// ── In-memory stores ──────────────────────────────────────────────────────────
const projects     = new Map();  // id → project
const socialTokens = new Map();  // userId → { platform → token }
const metricsCache = new Map();  // cacheKey → { data, expires }

// ── Supported platforms ───────────────────────────────────────────────────────
const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];
const PROJECT_TYPES = ['coding', 'game_dev', 'ar_vr', '3d', 'mobile', 'web', 'other'];

// ── Cache helper ──────────────────────────────────────────────────────────────
function cached(key, ttlMs, fn) {
  const now = Date.now();
  const hit = metricsCache.get(key);
  if (hit && hit.expires > now) return Promise.resolve(hit.data);
  return fn().then(data => {
    metricsCache.set(key, { data, expires: now + ttlMs });
    return data;
  });
}

// ── Demo data generators (replace with real API calls) ────────────────────────
function genMetrics(platform, seed) {
  const h = parseInt(crypto.createHash('sha256').update(`${platform}:${seed}`).digest('hex').slice(0, 8), 16);
  return {
    platform,
    followers:  (h % 50_000) + 1_000,
    views:      (h % 500_000) + 10_000,
    likes:      (h % 50_000) + 500,
    shares:     (h % 5_000) + 100,
    comments:   (h % 3_000) + 50,
    reach:      (h % 200_000) + 5_000,
    retention:  parseFloat(((h % 60) + 20).toFixed(1)),   // %
    engagement: parseFloat(((h % 15) + 1).toFixed(2)),    // %
    impressions:(h % 1_000_000) + 50_000,
    timestamp:  new Date().toISOString(),
  };
}

function genTimeSeries(platform, days = 30) {
  const series = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const seed = `${platform}:${d.toISOString().slice(0, 10)}`;
    const h = parseInt(crypto.createHash('sha256').update(seed).digest('hex').slice(0, 8), 16);
    series.push({
      date: d.toISOString().slice(0, 10),
      views:    (h % 50_000) + 1_000,
      likes:    (h % 5_000) + 100,
      followers:(h % 500) + 10,
    });
  }
  return series;
}

// ── Social analytics routes ───────────────────────────────────────────────────

// GET /api/analytics/social — aggregate metrics for all connected platforms
router.get('/social', requireAuth, async (req, res) => {
  try {
    const { platforms } = req.query;
    const selected = platforms ? platforms.split(',').filter(p => PLATFORMS.includes(p)) : PLATFORMS;
    const metrics = await cached(
      `social:${req.user.sub}:${selected.join(',')}`,
      60_000,
      async () => {
        return selected.map(p => genMetrics(p, req.user.sub));
      }
    );
    res.json({ metrics, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/social/:platform — single-platform deep metrics
router.get('/social/:platform', requireAuth, async (req, res) => {
  const { platform } = req.params;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unknown platform. Supported: ${PLATFORMS.join(', ')}` });
  }
  const { days = 30 } = req.query;
  const daysN = Math.min(Math.max(parseInt(days, 10) || 30, 1), 365);

  const current  = genMetrics(platform, req.user.sub);
  const previous = genMetrics(platform, `${req.user.sub}:prev`);
  const series   = genTimeSeries(platform, daysN);

  const pctChange = field => previous[field]
    ? parseFloat((((current[field] - previous[field]) / previous[field]) * 100).toFixed(1))
    : 0;

  res.json({
    platform,
    current,
    trends: {
      views:    pctChange('views'),
      likes:    pctChange('likes'),
      followers:pctChange('followers'),
      reach:    pctChange('reach'),
    },
    timeSeries: series,
    topContent: [
      { title: 'Best post this period', views: current.views, likes: current.likes },
    ],
  });
});

// POST /api/analytics/social/connect — link a platform OAuth token
router.post('/social/connect', requireAuth, (req, res) => {
  const { platform, token, accountId } = req.body;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unknown platform' });
  }
  if (!token || !accountId) return res.status(400).json({ error: 'token and accountId required' });

  const map = socialTokens.get(req.user.sub) || {};
  // Store token encrypted (hash used as reference — real impl stores in KMS/vault)
  const ref = crypto.createHmac('sha256', process.env.ENCRYPTION_SECRET || 'dev')
    .update(`${platform}:${token}`)
    .digest('hex');
  map[platform] = { accountId, tokenRef: ref, connectedAt: new Date().toISOString() };
  socialTokens.set(req.user.sub, map);
  res.json({ connected: true, platform, accountId });
});

// GET /api/analytics/social/connections
router.get('/social/connections', requireAuth, (req, res) => {
  const map = socialTokens.get(req.user.sub) || {};
  res.json(Object.entries(map).map(([platform, v]) => ({ platform, accountId: v.accountId, connectedAt: v.connectedAt })));
});

// ── Project tracking routes ───────────────────────────────────────────────────

// POST /api/analytics/projects
router.post('/projects', requireAuth, (req, res) => {
  const { name, type, description, techStack = [], gameEngine, platform: tgt, tags = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  if (!PROJECT_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${PROJECT_TYPES.join(', ')}` });
  }
  const id = uuidv4();
  const project = {
    id, userId: req.user.sub, name, type, description, techStack, gameEngine, platform: tgt, tags,
    status: 'active',
    progress: 0,
    milestones: [],
    commits: 0,
    linesOfCode: 0,
    openIssues: 0,
    closedIssues: 0,
    buildStatus: 'passing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.set(id, project);
  res.status(201).json(project);
});

// GET /api/analytics/projects
router.get('/projects', requireAuth, (req, res) => {
  const { type } = req.query;
  const list = [...projects.values()]
    .filter(p => p.userId === req.user.sub && (!type || p.type === type));
  res.json(list);
});

// GET /api/analytics/projects/:id
router.get('/projects/:id', requireAuth, (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// PATCH /api/analytics/projects/:id
router.patch('/projects/:id', requireAuth, (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  const allowed = ['name', 'description', 'status', 'progress', 'commits', 'linesOfCode', 'openIssues', 'closedIssues', 'buildStatus', 'techStack', 'tags'];
  for (const k of allowed) if (req.body[k] !== undefined) p[k] = req.body[k];
  p.updatedAt = new Date().toISOString();
  res.json(p);
});

// POST /api/analytics/projects/:id/milestones
router.post('/projects/:id/milestones', requireAuth, (req, res) => {
  const p = projects.get(req.params.id);
  if (!p || p.userId !== req.user.sub) return res.status(404).json({ error: 'Not found' });
  const { title, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const milestone = { id: uuidv4(), title, dueDate, completed: false, createdAt: new Date().toISOString() };
  p.milestones.push(milestone);
  p.updatedAt = new Date().toISOString();
  res.json(milestone);
});

// GET /api/analytics/realtime — real-time aggregated dashboard data
router.get('/realtime', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Send initial snapshot
  send({ type: 'snapshot', platforms: PLATFORMS.map(p => genMetrics(p, req.user.sub)), ts: Date.now() });

  // Stream updates every 5 seconds
  const interval = setInterval(() => {
    const platform = PLATFORMS[Math.floor(Date.now() / 5000) % PLATFORMS.length];
    send({ type: 'update', platform, metrics: genMetrics(platform, `${req.user.sub}:${Date.now()}`), ts: Date.now() });
  }, 5000);

  req.on('close', () => clearInterval(interval));
});

// GET /api/analytics/summary — cross-platform totals
router.get('/summary', requireAuth, (req, res) => {
  const all = PLATFORMS.map(p => genMetrics(p, req.user.sub));
  const total = all.reduce((acc, m) => ({
    totalFollowers:  (acc.totalFollowers || 0) + m.followers,
    totalViews:      (acc.totalViews || 0) + m.views,
    totalLikes:      (acc.totalLikes || 0) + m.likes,
    totalReach:      (acc.totalReach || 0) + m.reach,
    totalImpressions:(acc.totalImpressions || 0) + m.impressions,
    avgEngagement:   ((acc.avgEngagement || 0) + m.engagement),
    avgRetention:    ((acc.avgRetention || 0) + m.retention),
  }), {});
  total.avgEngagement = parseFloat((total.avgEngagement / PLATFORMS.length).toFixed(2));
  total.avgRetention  = parseFloat((total.avgRetention  / PLATFORMS.length).toFixed(1));
  total.connectedPlatforms = PLATFORMS.length;
  res.json({ summary: total, byPlatform: all, generatedAt: new Date().toISOString() });
});

export default router;

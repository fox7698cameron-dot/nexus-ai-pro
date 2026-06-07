// src/routes/analytics.js | Nexus AI Pro | Date: 2026-06-07

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ============================================================
// CONSTANTS & CONFIGURATION
// ============================================================

const ALLOWED_PLATFORMS = [
  'tiktok',
  'instagram',
  'facebook',
  'twitch',
  'discord',
  'lemon8',
  'reddit',
  'redgifs',
];

const ENV = {
  TIKTOK_API_KEY: process.env.TIKTOK_API_KEY,
  INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN,
  FACEBOOK_PAGE_ACCESS_TOKEN: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  LEMON8_API_KEY: process.env.LEMON8_API_KEY,
  REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID,
  REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET,
  REDGIFS_API_KEY: process.env.REDGIFS_API_KEY,
};

const PROJECT_TYPES = ['coding', 'game-dev', 'ar-vr', '3d'];
const PROJECT_STATUSES = ['active', 'paused', 'completed'];

// ============================================================
// IN-MEMORY DATA STORES (MVP)
// ============================================================

/**
 * platformStore: Map<platformName, PlatformData>
 * PlatformData shape:
 * {
 *   platform: string,
 *   connectedAt: number,
 *   accountId: string,
 *   metrics: {
 *     views, likes, reach, retention, followers,
 *     comments, shares, engagementRate, impressions, clicks, watchTime
 *   },
 *   history: [{ timestamp, views, likes, followers }]  // up to 30 points
 * }
 */
const platformStore = new Map();

/**
 * projectStore: Map<id, ProjectData>
 * ProjectData shape:
 * {
 *   id, userId, name, type, platform, status,
 *   metrics: { commits, builds, deployments, bugs, coverage },
 *   milestones: [{ name, dueDate, completed }],
 *   createdAt, updatedAt
 * }
 */
const projectStore = new Map();

// Active SSE clients: Map<clientId, { res, intervalId }>
const sseClients = new Map();

// ============================================================
// HELPERS
// ============================================================

/**
 * Generate realistic-looking seed metrics for a platform.
 * These serve as the MVP baseline; real sync would replace these.
 */
function generateSeedMetrics(platform) {
  const base = {
    tiktok:    { views: 842000, likes: 67400,  reach: 510000, retention: 58, followers: 24800, comments: 3200, shares: 8900,  engagementRate: 8.0,  impressions: 960000, clicks: 12400, watchTime: 18 },
    instagram: { views: 320000, likes: 41200,  reach: 280000, retention: 44, followers: 18700, comments: 2100, shares: 3400,  engagementRate: 12.9, impressions: 430000, clicks: 9800,  watchTime: 12 },
    facebook:  { views: 215000, likes: 18600,  reach: 190000, retention: 31, followers: 31200, comments: 1450, shares: 5600,  engagementRate: 3.8,  impressions: 280000, clicks: 7200,  watchTime: 8  },
    twitch:    { views: 54000,  likes: 8900,   reach: 48000,  retention: 72, followers: 6700,  comments: 4200, shares: 980,   engagementRate: 15.6, impressions: 62000,  clicks: 4100,  watchTime: 42 },
    discord:   { views: 0,      likes: 0,      reach: 9800,   retention: 0,  followers: 9800,  comments: 8700, shares: 0,     engagementRate: 0,    impressions: 0,      clicks: 0,     watchTime: 0  },
    lemon8:    { views: 128000, likes: 22100,  reach: 104000, retention: 39, followers: 5400,  comments: 1100, shares: 2300,  engagementRate: 17.3, impressions: 145000, clicks: 3900,  watchTime: 9  },
    reddit:    { views: 680000, likes: 29400,  reach: 510000, retention: 0,  followers: 12300, comments: 5800, shares: 4200,  engagementRate: 4.3,  impressions: 720000, clicks: 18700, watchTime: 0  },
    redgifs:   { views: 1420000,likes: 54200,  reach: 890000, retention: 61, followers: 8900,  comments: 2700, shares: 6100,  engagementRate: 3.8,  impressions: 1600000,clicks: 7800,  watchTime: 22 },
  };
  return base[platform] || {
    views: 0, likes: 0, reach: 0, retention: 0, followers: 0,
    comments: 0, shares: 0, engagementRate: 0,
    impressions: 0, clicks: 0, watchTime: 0,
  };
}

/**
 * Build or retrieve platform data, seeding if not yet present.
 */
function getOrCreatePlatform(platform) {
  if (!platformStore.has(platform)) {
    const metrics = generateSeedMetrics(platform);
    const now = Date.now();
    const history = Array.from({ length: 30 }, (_, i) => ({
      timestamp: now - (29 - i) * 86400000,
      views:     Math.round(metrics.views * (0.7 + Math.random() * 0.6)),
      likes:     Math.round(metrics.likes * (0.7 + Math.random() * 0.6)),
      followers: Math.round(metrics.followers * (0.85 + i * 0.005)),
    }));
    platformStore.set(platform, {
      platform,
      connectedAt: now - 30 * 86400000,
      accountId:   `${platform}_account_${uuidv4().slice(0, 8)}`,
      metrics,
      history,
    });
  }
  return platformStore.get(platform);
}

/**
 * Apply small random incremental delta to metrics — used by SSE streams.
 */
function applyMetricDelta(metrics) {
  const nudge = (val, pct) => Math.max(0, Math.round(val + val * (Math.random() * pct * 2 - pct)));
  return {
    ...metrics,
    views:          nudge(metrics.views, 0.002),
    likes:          nudge(metrics.likes, 0.003),
    reach:          nudge(metrics.reach, 0.001),
    followers:      nudge(metrics.followers, 0.0005),
    comments:       nudge(metrics.comments, 0.004),
    shares:         nudge(metrics.shares, 0.003),
    impressions:    nudge(metrics.impressions, 0.002),
    clicks:         nudge(metrics.clicks, 0.003),
    retention:      Math.min(100, Math.max(0, +(metrics.retention + (Math.random() * 0.4 - 0.2)).toFixed(1))),
    engagementRate: Math.max(0, +(metrics.engagementRate + (Math.random() * 0.1 - 0.05)).toFixed(2)),
    watchTime:      nudge(metrics.watchTime, 0.002),
  };
}

/**
 * Apply small random delta to project metrics.
 */
function applyProjectDelta(metrics) {
  const maybe = (val, prob = 0.1) => val + (Math.random() < prob ? 1 : 0);
  return {
    commits:     maybe(metrics.commits, 0.15),
    builds:      maybe(metrics.builds, 0.08),
    deployments: maybe(metrics.deployments, 0.03),
    bugs:        Math.max(0, metrics.bugs + (Math.random() < 0.05 ? 1 : Math.random() < 0.08 ? -1 : 0)),
    coverage:    Math.min(100, Math.max(0, +(metrics.coverage + (Math.random() * 0.2 - 0.1)).toFixed(1))),
  };
}

/**
 * Set SSE response headers for a connection.
 */
function initSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

/**
 * Write a named SSE event to the response.
 */
function sendSSEEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Register a client for SSE cleanup tracking.
 */
function registerSSEClient(req, res, intervalId) {
  const clientId = uuidv4();
  sseClients.set(clientId, { res, intervalId });
  req.on('close', () => {
    clearInterval(intervalId);
    sseClients.delete(clientId);
  });
  return clientId;
}

/**
 * Validate that a platform name is in the allowed list.
 */
function validatePlatform(platform) {
  return ALLOWED_PLATFORMS.includes(platform?.toLowerCase());
}

/**
 * Standard JSON success envelope.
 */
function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, timestamp: new Date().toISOString() });
}

/**
 * Standard JSON error envelope.
 */
function fail(res, message, statusCode = 400, details = null) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  });
}

// ============================================================
// SOCIAL ANALYTICS ROUTES
// ============================================================

/**
 * GET /api/analytics/social/overview
 * Returns aggregated summary across all platforms.
 * NOTE: Must be declared before /:platform to avoid route shadowing.
 */
router.get('/social/overview', (req, res) => {
  const platforms = ALLOWED_PLATFORMS.map(p => getOrCreatePlatform(p));
  const totalViews     = platforms.reduce((sum, p) => sum + p.metrics.views, 0);
  const totalLikes     = platforms.reduce((sum, p) => sum + p.metrics.likes, 0);
  const totalFollowers = platforms.reduce((sum, p) => sum + p.metrics.followers, 0);
  const totalReach     = platforms.reduce((sum, p) => sum + p.metrics.reach, 0);
  const totalComments  = platforms.reduce((sum, p) => sum + p.metrics.comments, 0);
  const totalShares    = platforms.reduce((sum, p) => sum + p.metrics.shares, 0);
  const avgEngagement  = +(
    platforms.reduce((sum, p) => sum + p.metrics.engagementRate, 0) / platforms.length
  ).toFixed(2);
  const avgRetention   = +(
    platforms
      .filter(p => p.metrics.retention > 0)
      .reduce((sum, p, _, arr) => sum + p.metrics.retention / arr.length, 0)
  ).toFixed(1);

  ok(res, {
    totalPlatforms:   ALLOWED_PLATFORMS.length,
    connectedPlatforms: platforms.length,
    aggregates: {
      totalViews,
      totalLikes,
      totalFollowers,
      totalReach,
      totalComments,
      totalShares,
      avgEngagementRate: avgEngagement,
      avgRetention,
    },
    platforms: platforms.map(p => ({
      platform:       p.platform,
      accountId:      p.accountId,
      followers:      p.metrics.followers,
      views:          p.metrics.views,
      engagementRate: p.metrics.engagementRate,
      connectedAt:    p.connectedAt,
    })),
    generatedAt: new Date().toISOString(),
  });
});

/**
 * GET /api/analytics/social/:platform
 * Returns full metrics for a specific platform.
 */
router.get('/social/:platform', (req, res) => {
  const platform = req.params.platform.toLowerCase();
  if (!validatePlatform(platform)) {
    return fail(res, `Unsupported platform: "${platform}". Allowed: ${ALLOWED_PLATFORMS.join(', ')}`, 400);
  }
  const data = getOrCreatePlatform(platform);
  ok(res, data);
});

/**
 * POST /api/analytics/social/:platform/sync
 * Triggers a sync for the given platform.
 * For MVP, refreshes in-memory metrics with new sample data.
 */
router.post('/social/:platform/sync', (req, res) => {
  const platform = req.params.platform.toLowerCase();
  if (!validatePlatform(platform)) {
    return fail(res, `Unsupported platform: "${platform}". Allowed: ${ALLOWED_PLATFORMS.join(', ')}`, 400);
  }

  const existing = getOrCreatePlatform(platform);
  const newMetrics = applyMetricDelta(existing.metrics);

  // Append history point (keep last 30)
  const newPoint = {
    timestamp: Date.now(),
    views:     newMetrics.views,
    likes:     newMetrics.likes,
    followers: newMetrics.followers,
  };
  const updatedHistory = [...existing.history, newPoint].slice(-30);

  const updated = {
    ...existing,
    metrics: newMetrics,
    history: updatedHistory,
    lastSyncedAt: new Date().toISOString(),
  };
  platformStore.set(platform, updated);

  ok(res, {
    platform,
    syncStatus: 'completed',
    metrics:    newMetrics,
    syncedAt:   updated.lastSyncedAt,
    message:    'Metrics synchronized successfully (MVP sample data)',
    note: ENV[`${platform.toUpperCase()}_API_KEY`]
      ? 'Live API credentials detected — connect real adapter to use live data.'
      : 'No API credentials found in environment. Set the appropriate env var for live sync.',
  });
});

/**
 * GET /api/analytics/social/realtime/:platform
 * SSE stream — sends live metric increments every 5 seconds.
 */
router.get('/social/realtime/:platform', (req, res) => {
  const platform = req.params.platform.toLowerCase();
  if (!validatePlatform(platform)) {
    res.status(400).end(`Unsupported platform: ${platform}`);
    return;
  }

  initSSE(res);
  const data = getOrCreatePlatform(platform);
  sendSSEEvent(res, 'connected', { platform, message: 'Realtime stream started', connectedAt: new Date().toISOString() });
  sendSSEEvent(res, 'metrics', { platform, metrics: data.metrics, timestamp: new Date().toISOString() });

  const intervalId = setInterval(() => {
    const current = platformStore.get(platform) || getOrCreatePlatform(platform);
    const updatedMetrics = applyMetricDelta(current.metrics);
    platformStore.set(platform, { ...current, metrics: updatedMetrics });
    sendSSEEvent(res, 'metrics', {
      platform,
      metrics:   updatedMetrics,
      timestamp: new Date().toISOString(),
    });
  }, 5000);

  registerSSEClient(req, res, intervalId);
});

// ============================================================
// PROJECT TRACKER ROUTES
// ============================================================

/**
 * GET /api/analytics/projects
 * List all project trackers (optionally filter by userId query param).
 */
router.get('/projects', (req, res) => {
  const { userId, status, type } = req.query;
  let projects = Array.from(projectStore.values());

  if (userId)  projects = projects.filter(p => p.userId === userId);
  if (status)  projects = projects.filter(p => p.status === status);
  if (type)    projects = projects.filter(p => p.type === type);

  ok(res, {
    total: projects.length,
    projects: projects.sort((a, b) => b.updatedAt - a.updatedAt),
  });
});

/**
 * POST /api/analytics/projects
 * Create a new project tracker.
 */
router.post('/projects', (req, res) => {
  const { userId, name, type, platform, milestones = [] } = req.body;

  if (!userId) return fail(res, 'userId is required');
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return fail(res, 'name is required and must be a non-empty string');
  }
  if (!PROJECT_TYPES.includes(type)) {
    return fail(res, `type must be one of: ${PROJECT_TYPES.join(', ')}`);
  }
  if (!Array.isArray(milestones)) {
    return fail(res, 'milestones must be an array');
  }

  const validatedMilestones = milestones.map(m => ({
    name:      m.name || 'Unnamed Milestone',
    dueDate:   m.dueDate || null,
    completed: Boolean(m.completed),
  }));

  const now = Date.now();
  const project = {
    id:       uuidv4(),
    userId:   userId.trim(),
    name:     name.trim(),
    type,
    platform: platform || null,
    status:   'active',
    metrics: {
      commits:     0,
      builds:      0,
      deployments: 0,
      bugs:        0,
      coverage:    0,
    },
    milestones: validatedMilestones,
    createdAt:  now,
    updatedAt:  now,
  };

  projectStore.set(project.id, project);
  ok(res, project, 201);
});

/**
 * GET /api/analytics/projects/:id
 * Get a single project's full metrics.
 */
router.get('/projects/:id', (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return fail(res, `Project not found: ${req.params.id}`, 404);
  ok(res, project);
});

/**
 * PUT /api/analytics/projects/:id
 * Update project metadata and/or metrics.
 */
router.put('/projects/:id', (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) return fail(res, `Project not found: ${req.params.id}`, 404);

  const { name, type, platform, status, metrics, milestones } = req.body;

  if (type   && !PROJECT_TYPES.includes(type))   return fail(res, `type must be one of: ${PROJECT_TYPES.join(', ')}`);
  if (status && !PROJECT_STATUSES.includes(status)) return fail(res, `status must be one of: ${PROJECT_STATUSES.join(', ')}`);

  const updatedMetrics = metrics
    ? {
        commits:     typeof metrics.commits     === 'number' ? metrics.commits     : project.metrics.commits,
        builds:      typeof metrics.builds      === 'number' ? metrics.builds      : project.metrics.builds,
        deployments: typeof metrics.deployments === 'number' ? metrics.deployments : project.metrics.deployments,
        bugs:        typeof metrics.bugs        === 'number' ? metrics.bugs        : project.metrics.bugs,
        coverage:    typeof metrics.coverage    === 'number' ? Math.min(100, Math.max(0, metrics.coverage)) : project.metrics.coverage,
      }
    : project.metrics;

  const updatedMilestones = milestones
    ? milestones.map(m => ({
        name:      m.name || 'Unnamed Milestone',
        dueDate:   m.dueDate || null,
        completed: Boolean(m.completed),
      }))
    : project.milestones;

  const updated = {
    ...project,
    name:       name      ? name.trim()  : project.name,
    type:       type      || project.type,
    platform:   platform  !== undefined  ? platform : project.platform,
    status:     status    || project.status,
    metrics:    updatedMetrics,
    milestones: updatedMilestones,
    updatedAt:  Date.now(),
  };

  projectStore.set(project.id, updated);
  ok(res, updated);
});

/**
 * DELETE /api/analytics/projects/:id
 * Remove a project tracker.
 */
router.delete('/projects/:id', (req, res) => {
  if (!projectStore.has(req.params.id)) {
    return fail(res, `Project not found: ${req.params.id}`, 404);
  }
  projectStore.delete(req.params.id);
  ok(res, { deleted: true, id: req.params.id });
});

/**
 * GET /api/analytics/projects/:id/realtime
 * SSE stream — sends live project metric increments every 5 seconds.
 */
router.get('/projects/:id/realtime', (req, res) => {
  const project = projectStore.get(req.params.id);
  if (!project) {
    res.status(404).end(`Project not found: ${req.params.id}`);
    return;
  }

  initSSE(res);
  sendSSEEvent(res, 'connected', { projectId: project.id, message: 'Realtime project stream started', connectedAt: new Date().toISOString() });
  sendSSEEvent(res, 'metrics', { projectId: project.id, metrics: project.metrics, timestamp: new Date().toISOString() });

  const intervalId = setInterval(() => {
    const current = projectStore.get(req.params.id);
    if (!current) {
      clearInterval(intervalId);
      res.end();
      return;
    }
    const updatedMetrics = applyProjectDelta(current.metrics);
    const updatedProject = { ...current, metrics: updatedMetrics, updatedAt: Date.now() };
    projectStore.set(current.id, updatedProject);
    sendSSEEvent(res, 'metrics', {
      projectId: current.id,
      metrics:   updatedMetrics,
      timestamp: new Date().toISOString(),
    });
  }, 5000);

  registerSSEClient(req, res, intervalId);
});

// ============================================================
// GRACEFUL CLEANUP
// ============================================================

process.on('SIGTERM', () => {
  for (const [, client] of sseClients) {
    clearInterval(client.intervalId);
    client.res.end();
  }
  sseClients.clear();
});

export default router;

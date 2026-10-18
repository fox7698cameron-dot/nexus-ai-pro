// src/routes/analytics.js
// Created: 2026-10-18
// Social analytics, project tracking, real-time metrics API

import express from 'express';
import { validateAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ── In-memory metrics store (production: use Redis / TimescaleDB) ────────────
const socialMetrics = new Map();
const projectMetrics = new Map();

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];
const PROJECT_TYPES = ['code', 'game', 'ar', 'vr', '3d'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function now() { return Date.now(); }

function sanitizePlatform(p) {
  return PLATFORMS.includes(String(p).toLowerCase()) ? String(p).toLowerCase() : null;
}

// ── Social Analytics ─────────────────────────────────────────────────────────

// GET /api/analytics/social/platforms
router.get('/social/platforms', validateAuth, (req, res) => {
  return res.json(PLATFORMS.map(p => ({
    id: p,
    name: p.charAt(0).toUpperCase() + p.slice(1),
    connected: socialMetrics.has(`${req.user.sub}:${p}`),
  })));
});

// GET /api/analytics/social/:platform
router.get('/social/:platform', validateAuth, (req, res) => {
  const platform = sanitizePlatform(req.params.platform);
  if (!platform) return res.status(400).json({ error: 'Unknown platform' });

  const key = `${req.user.sub}:${platform}`;
  const data = socialMetrics.get(key) || generateMockMetrics(platform);
  return res.json(data);
});

// POST /api/analytics/social/:platform — upsert metrics snapshot
router.post('/social/:platform', validateAuth, (req, res) => {
  const platform = sanitizePlatform(req.params.platform);
  if (!platform) return res.status(400).json({ error: 'Unknown platform' });

  const key = `${req.user.sub}:${platform}`;
  const existing = socialMetrics.get(key) || { history: [] };
  const snapshot = {
    ...req.body,
    platform,
    userId: req.user.sub,
    recordedAt: now(),
  };

  existing.latest = snapshot;
  existing.history.push(snapshot);
  if (existing.history.length > 90) existing.history = existing.history.slice(-90);
  socialMetrics.set(key, existing);

  return res.status(201).json(existing.latest);
});

// GET /api/analytics/social/summary
router.get('/social/summary', validateAuth, (req, res) => {
  const summary = {};
  for (const platform of PLATFORMS) {
    const key = `${req.user.sub}:${platform}`;
    const data = socialMetrics.get(key);
    summary[platform] = data?.latest || null;
  }
  return res.json(summary);
});

// ── Project Tracking ─────────────────────────────────────────────────────────

// GET /api/analytics/projects
router.get('/projects', validateAuth, (req, res) => {
  const projects = [...projectMetrics.values()].filter(p => p.userId === req.user.sub);
  return res.json(projects);
});

// POST /api/analytics/projects
router.post('/projects', validateAuth, (req, res) => {
  const { name, type, platform, description } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  if (!PROJECT_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of ${PROJECT_TYPES.join(', ')}` });

  const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const project = {
    id,
    userId: req.user.sub,
    name,
    type,
    platform: platform || null,
    description: description || '',
    status: 'active',
    metrics: { commits: 0, issues: 0, builds: 0, deployments: 0 },
    createdAt: now(),
    updatedAt: now(),
  };
  projectMetrics.set(id, project);
  return res.status(201).json(project);
});

// GET /api/analytics/projects/:id
router.get('/projects/:id', validateAuth, (req, res) => {
  const project = projectMetrics.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
  return res.json(project);
});

// PATCH /api/analytics/projects/:id
router.patch('/projects/:id', validateAuth, (req, res) => {
  const project = projectMetrics.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });

  const { name, description, status, metrics, platform } = req.body;
  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (status !== undefined) project.status = status;
  if (metrics !== undefined) project.metrics = { ...project.metrics, ...metrics };
  if (platform !== undefined) project.platform = platform;
  project.updatedAt = now();

  return res.json(project);
});

// DELETE /api/analytics/projects/:id
router.delete('/projects/:id', validateAuth, (req, res) => {
  const project = projectMetrics.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.userId !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
  projectMetrics.delete(req.params.id);
  return res.json({ message: 'Project deleted' });
});

// ── Game Dev Connectors ───────────────────────────────────────────────────────
const GAME_CONNECTORS = Object.freeze({
  unreal_epic:  { name: 'Unreal / Epic Games',  env: 'EPIC_CLIENT_SECRET' },
  sony:         { name: 'Sony (PSN)',            env: 'SONY_CLIENT_SECRET' },
  microsoft:    { name: 'Microsoft (Xbox)',      env: 'MICROSOFT_TENANT_ID' },
  ubisoft:      { name: 'Ubisoft Connect',       env: 'UBISOFT_CLIENT_SECRET' },
  steam:        { name: 'Steam',                 env: 'STEAM_API_KEY' },
});

router.get('/game/connectors', validateAuth, (req, res) => {
  const status = Object.entries(GAME_CONNECTORS).map(([id, cfg]) => ({
    id,
    name: cfg.name,
    configured: !!process.env[cfg.env],
  }));
  return res.json(status);
});

router.get('/game/achievements/:connectorId', validateAuth, async (req, res) => {
  const cfg = GAME_CONNECTORS[req.params.connectorId];
  if (!cfg) return res.status(400).json({ error: 'Unknown connector' });
  if (!process.env[cfg.env]) {
    return res.json({ achievements: [], message: `Set ${cfg.env} to enable this connector` });
  }
  // Production: call the platform API using the configured credentials
  return res.json({ achievements: [], message: 'Connector stub — implement platform OAuth flow' });
});

// ── Mock data helper (dev/demo only) ─────────────────────────────────────────
function generateMockMetrics(platform) {
  const base = { platform, recordedAt: now() };
  const metricsByPlatform = {
    tiktok:    { followers: 12450, likes: 89320, views: 548900, shares: 4230, retention: 0.62, reach: 320000 },
    instagram: { followers: 8760, likes: 45670, views: 210000, saves: 3400, reach: 180000, impressions: 290000 },
    facebook:  { followers: 5430, likes: 23400, views: 98000, shares: 1200, reach: 85000 },
    twitch:    { followers: 3210, viewers: 145, peakViewers: 890, hoursStreamed: 42, avgViewDuration: 1800 },
    discord:   { members: 7890, onlineNow: 342, messagesPerDay: 2340, activeChannels: 18 },
    lemon8:    { followers: 2340, likes: 12100, views: 67000, shares: 890 },
    reddit:    { karma: 45600, postUpvotes: 8900, commentUpvotes: 34500, followers: 1230 },
    redgifs:   { views: 123000, likes: 8900, followers: 3400 },
  };
  return { latest: { ...base, ...(metricsByPlatform[platform] || {}) }, history: [] };
}

export { router as analyticsRouter };

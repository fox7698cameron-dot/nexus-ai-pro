/**
 * src/api/connectors/gaming.js
 * Gaming Platform Connector — Epic/Unreal, Sony, Microsoft, Ubisoft Connect
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Supports achievement tracking, game progress, and build pipeline integration
 * for major gaming platforms and engines.
 */

import { Router } from 'express';
import { requireAuth, requireRole, ROLES } from '../../middleware/auth.js';
import { encrypt, decrypt, deriveKey, generateSalt } from '../../utils/crypto.js';

const router = Router();

// ─── Platform Registry ────────────────────────────────────────────────────────

export const GAMING_PLATFORMS = Object.freeze({
  epic:       { id: 'epic',       name: 'Epic Games / Unreal Engine', icon: '🎮', engine: 'unreal' },
  sony:       { id: 'sony',       name: 'Sony PlayStation Network',   icon: '🎯', engine: null    },
  microsoft:  { id: 'microsoft',  name: 'Microsoft Xbox / PC',        icon: '🟢', engine: null    },
  ubisoft:    { id: 'ubisoft',    name: 'Ubisoft Connect',            icon: '🔵', engine: null    },
  steam:      { id: 'steam',      name: 'Valve Steam',                icon: '🎲', engine: null    },
  nintendo:   { id: 'nintendo',   name: 'Nintendo',                   icon: '🕹️', engine: null    },
});

// ─── In-Memory Store ──────────────────────────────────────────────────────────
const platformConnections = new Map(); // userId:platformId → encrypted creds
const achievementProgress = new Map(); // userId:platformId:gameId → progress record
const buildRecords        = new Map(); // buildId → build record

function saveConn(userId, platformId, data) {
  const salt = generateSalt();
  const key  = deriveKey(process.env.ENCRYPTION_SECRET || 'default-dev-key', salt);
  const enc  = encrypt(JSON.stringify(data), key);
  platformConnections.set(`${userId}:${platformId}`, { salt, enc, connectedAt: new Date().toISOString() });
}

function loadConn(userId, platformId) {
  const rec = platformConnections.get(`${userId}:${platformId}`);
  if (!rec) return null;
  const key = deriveKey(process.env.ENCRYPTION_SECRET || 'default-dev-key', rec.salt);
  try {
    return JSON.parse(decrypt(rec.enc, key));
  } catch {
    return null;
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/connectors/gaming/list */
router.get('/list', requireAuth, (_req, res) => {
  res.json({ platforms: Object.values(GAMING_PLATFORMS) });
});

/** GET /api/connectors/gaming/status */
router.get('/status', requireAuth, (req, res) => {
  const userId = req.user.id;
  const status = {};
  for (const id of Object.keys(GAMING_PLATFORMS)) {
    const rec = platformConnections.get(`${userId}:${id}`);
    status[id] = { connected: Boolean(rec), connectedAt: rec?.connectedAt ?? null };
  }
  res.json({ status });
});

/** POST /api/connectors/gaming/connect/:platformId */
router.post('/connect/:platformId', requireAuth, (req, res) => {
  const { platformId } = req.params;
  if (!GAMING_PLATFORMS[platformId]) {
    return res.status(400).json({ error: 'Unknown platform', available: Object.keys(GAMING_PLATFORMS) });
  }

  const { clientId, clientSecret, accessToken, apiKey, accountId } = req.body;
  if (!clientId && !accessToken && !apiKey) {
    return res.status(400).json({ error: 'clientId, accessToken, or apiKey required' });
  }

  saveConn(req.user.id, platformId, { clientId, clientSecret, accessToken, apiKey, accountId });
  return res.json({ message: `${GAMING_PLATFORMS[platformId].name} connected` });
});

/** DELETE /api/connectors/gaming/connect/:platformId */
router.delete('/connect/:platformId', requireAuth, (req, res) => {
  const key = `${req.user.id}:${req.params.platformId}`;
  if (!platformConnections.has(key)) {
    return res.status(404).json({ error: 'Platform not connected' });
  }
  platformConnections.delete(key);
  return res.json({ message: 'Platform disconnected' });
});

// ─── Achievement Tracking ─────────────────────────────────────────────────────

/**
 * Achievement schema:
 * { id, name, description, icon, points, unlocked, unlockedAt, platform, gameId }
 */

/** GET /api/connectors/gaming/achievements/:platformId */
router.get('/achievements/:platformId', requireAuth, async (req, res) => {
  const { platformId } = req.params;
  const { gameId = 'default' } = req.query;
  const userId  = req.user.id;
  const storeKey = `${userId}:${platformId}:${gameId}`;

  const record = achievementProgress.get(storeKey) || {
    achievements: [],
    totalPoints:   0,
    fetchedAt:    null,
  };

  // In production: fetch from platform API using stored credentials
  // const conn = loadConn(userId, platformId);
  // if (!conn) return res.status(400).json({ error: 'Platform not connected' });

  return res.json({ platform: platformId, gameId, ...record });
});

/** POST /api/connectors/gaming/achievements/:platformId/:gameId — sync progress */
router.post('/achievements/:platformId/:gameId', requireAuth, (req, res) => {
  const { platformId, gameId } = req.params;
  const { achievements } = req.body;

  if (!Array.isArray(achievements)) {
    return res.status(400).json({ error: 'achievements must be an array' });
  }

  const storeKey  = `${req.user.id}:${platformId}:${gameId}`;
  const unlocked  = achievements.filter(a => a.unlocked);
  const totalPoints = unlocked.reduce((sum, a) => sum + (a.points || 0), 0);

  achievementProgress.set(storeKey, {
    achievements,
    unlockedCount: unlocked.length,
    totalCount:    achievements.length,
    totalPoints,
    fetchedAt:     new Date().toISOString(),
  });

  return res.json({ synced: achievements.length, unlockedCount: unlocked.length, totalPoints });
});

// ─── Build Pipeline ───────────────────────────────────────────────────────────

/** POST /api/connectors/gaming/builds/:projectId — register a build event */
router.post('/builds/:projectId', requireAuth, (req, res) => {
  const { platform, version, status, engine, notes = '' } = req.body;

  if (!platform || !version || !status) {
    return res.status(400).json({ error: 'platform, version, and status required' });
  }

  const buildId = `build_${crypto.randomUUID?.() || Date.now()}`;
  const record  = {
    buildId,
    projectId: req.params.projectId,
    platform,
    version,
    status,   // 'queued' | 'building' | 'success' | 'failed' | 'cert_pending'
    engine:   engine || null,
    notes,
    submittedBy: req.user.id,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  buildRecords.set(buildId, record);
  return res.status(201).json(record);
});

/** GET /api/connectors/gaming/builds/:projectId */
router.get('/builds/:projectId', requireAuth, (req, res) => {
  const { projectId } = req.params;
  const builds = [...buildRecords.values()]
    .filter(b => b.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ builds, total: builds.length });
});

/** PUT /api/connectors/gaming/builds/:buildId/status */
router.put('/builds/:buildId/status', requireAuth, (req, res) => {
  const record = buildRecords.get(req.params.buildId);
  if (!record) return res.status(404).json({ error: 'Build not found' });

  const { status, notes } = req.body;
  if (status) record.status = status;
  if (notes)  record.notes  = notes;
  record.updatedAt = new Date().toISOString();
  buildRecords.set(req.params.buildId, record);

  return res.json(record);
});

// ─── Game Progress ────────────────────────────────────────────────────────────

/** POST /api/connectors/gaming/progress — sync in-game progress data */
router.post('/progress', requireAuth, (req, res) => {
  const { platform, gameId, progress } = req.body;
  if (!platform || !gameId || !progress) {
    return res.status(400).json({ error: 'platform, gameId, and progress required' });
  }

  const key = `progress:${req.user.id}:${platform}:${gameId}`;
  const record = {
    platform, gameId, progress,
    userId:    req.user.id,
    updatedAt: new Date().toISOString(),
  };
  achievementProgress.set(key, record);

  return res.json({ message: 'Progress synced', record });
});

export default router;

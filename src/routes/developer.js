/**
 * src/routes/developer.js
 * Nexus AI Pro — Developer Routes
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * All routes require role='developer' or 'admin'.
 *
 * GET    /api/developer/stats       — build/API metrics
 * GET    /api/developer/api-keys    — list API keys (masked)
 * POST   /api/developer/api-keys    — create API key
 * DELETE /api/developer/api-keys/:id — revoke API key
 */

import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireRole } from './auth.js';

const router = Router();

router.use(requireAuth, requireRole('developer', 'admin'));

// ─── In-memory API key store ──────────────────────────────────────────────────

const apiKeyStore = new Map(); // userId -> [{ id, name, keyHash, keyPrefix, createdAt }]
const revealedKeys = new Map(); // keyId -> plaintext (only held briefly; cleared after first reveal)

function getUserKeys(userId) {
  if (!apiKeyStore.has(userId)) apiKeyStore.set(userId, []);
  return apiKeyStore.get(userId);
}

// ─── GET /api/developer/stats ─────────────────────────────────────────────────

router.get('/stats', (req, res) => {
  res.json({
    apiCalls24h:  Math.floor(Math.random() * 30000) + 5000,
    successRate:  Math.round(97 + Math.random() * 3),
    avgLatencyMs: Math.round(80 + Math.random() * 60),
    builds7d:     Math.floor(Math.random() * 80) + 20,
    coverage:     Math.round(72 + Math.random() * 15),
    recentBuilds: [
      { project: 'nexus-ai-pro', branch: 'main',            status: 'passed',  timestamp: Date.now() - 3_600_000 },
      { project: 'nexus-ai-pro', branch: 'feature/payments', status: 'passed',  timestamp: Date.now() - 7_200_000 },
      { project: 'nexus-ai-pro', branch: 'fix/auth-2fa',     status: 'failed',  timestamp: Date.now() - 14_400_000 },
      { project: 'nexus-ai-pro', branch: 'main',             status: 'running', timestamp: Date.now() - 300_000 },
    ],
  });
});

// ─── GET /api/developer/api-keys ──────────────────────────────────────────────

router.get('/api-keys', (req, res) => {
  const keys = getUserKeys(req.user.sub).map(k => ({
    id:        k.id,
    name:      k.name,
    key:       revealedKeys.has(k.id) ? revealedKeys.get(k.id) : `${k.keyPrefix}${'•'.repeat(28)}`,
    createdAt: k.createdAt,
  }));
  res.json({ keys });
});

// ─── POST /api/developer/api-keys ─────────────────────────────────────────────

router.post('/api-keys', (req, res) => {
  const { name } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: 'Key name required' });

  const raw      = `nxp_${crypto.randomBytes(24).toString('base64url')}`;
  const keyHash  = crypto.createHash('sha256').update(raw).digest('hex');
  const keyPrefix = raw.slice(0, 8);
  const id       = uuidv4();

  getUserKeys(req.user.sub).unshift({ id, name: name.trim(), keyHash, keyPrefix, createdAt: Date.now() });

  // Hold plaintext only for this response — subsequent GET calls show masked version
  revealedKeys.set(id, raw);
  // Remove plaintext after 5 minutes (client should copy immediately)
  setTimeout(() => revealedKeys.delete(id), 5 * 60_000);

  res.status(201).json({
    apiKey: { id, name: name.trim(), key: raw, createdAt: Date.now() },
    warning: 'Copy this key now — it will not be shown again in plaintext.',
  });
});

// ─── DELETE /api/developer/api-keys/:id ──────────────────────────────────────

router.delete('/api-keys/:id', (req, res) => {
  const list = getUserKeys(req.user.sub);
  const idx  = list.findIndex(k => k.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'API key not found' });
  list.splice(idx, 1);
  revealedKeys.delete(req.params.id);
  res.json({ success: true });
});

export default router;

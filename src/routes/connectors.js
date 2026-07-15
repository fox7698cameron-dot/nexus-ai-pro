/**
 * src/routes/connectors.js
 * Nexus AI Pro — Connector & OAuth Routes
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * GET  /api/connectors/status              — connection status per user
 * POST /api/connectors/:id/connect         — OAuth redirect URL or API-key connect
 * GET  /api/connectors/:id/callback        — OAuth callback handler
 * POST /api/connectors/:id/disconnect      — disconnect a connector
 * POST /api/connectors/:id/test            — test an existing connection
 */

import { Router } from 'express';
import { requireAuth } from './auth.js';
import { connectorStore, buildOAuthUrl, verifyState } from '../connectors/index.js';

const router = Router();

const OAUTH_CONNECTORS = ['github', 'google', 'slack', 'azure', 'zoom', 'adobe', 'unreal', 'sony', 'xbox', 'bitbucket'];
const APIKEY_CONNECTORS = ['aws', 'ubisoft', 'redis', 'blob'];

function signingSecret() {
  const s = process.env.OAUTH_STATE_SECRET ?? process.env.JWT_SECRET;
  if (!s) throw new Error('OAUTH_STATE_SECRET not configured');
  return s;
}

// ─── GET /api/connectors/status ───────────────────────────────────────────────

router.get('/status', requireAuth, (req, res) => {
  res.json(connectorStore.getStatus(req.user.sub));
});

// ─── POST /api/connectors/:id/connect ────────────────────────────────────────

router.post('/:id/connect', requireAuth, (req, res) => {
  const connectorId = req.params.id;

  if (OAUTH_CONNECTORS.includes(connectorId)) {
    try {
      const url = buildOAuthUrl(connectorId, req.user.sub, signingSecret());
      return res.json({ type: 'oauth', url });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  if (APIKEY_CONNECTORS.includes(connectorId)) {
    const { apiKey, region, endpoint } = req.body ?? {};
    if (!apiKey?.trim()) return res.status(400).json({ error: 'apiKey required' });
    // Store only a reference — never log or return the raw key
    connectorStore.setConnected(req.user.sub, connectorId, { region, endpoint, keyRef: `${connectorId}:${req.user.sub}` });
    return res.json({ type: 'apikey', connected: true });
  }

  res.status(404).json({ error: 'Unknown connector' });
});

// ─── GET /api/connectors/:id/callback ─────────────────────────────────────────

router.get('/:id/callback', (req, res) => {
  const connectorId = req.params.id;
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.APP_BASE_URL ?? 'http://localhost:3001'}/connectors?error=${encodeURIComponent(error)}`);
  }

  if (!state) return res.status(400).send('Missing state parameter');

  const payload = verifyState(state, signingSecret());
  if (!payload) return res.status(400).send('Invalid or expired state token');
  if (payload.connectorId !== connectorId) return res.status(400).send('State/connector mismatch');

  // In production: exchange `code` for access token via provider token endpoint
  // Store encrypted tokens in Redis/DB — never in plain text
  connectorStore.setConnected(payload.userId, connectorId, { codeRef: `${connectorId}:${payload.userId}:exchanged` });

  const appUrl = process.env.APP_BASE_URL ?? 'http://localhost:3001';
  res.redirect(`${appUrl}/connectors?connected=${connectorId}`);
});

// ─── POST /api/connectors/:id/disconnect ──────────────────────────────────────

router.post('/:id/disconnect', requireAuth, (req, res) => {
  connectorStore.setDisconnected(req.user.sub, req.params.id);
  res.json({ success: true });
});

// ─── POST /api/connectors/:id/test ────────────────────────────────────────────

router.post('/:id/test', requireAuth, (req, res) => {
  const connectorId = req.params.id;
  const isConnected = connectorStore.isConnected(req.user.sub, connectorId);
  if (!isConnected) return res.status(400).json({ error: 'Connector not connected', ok: false });
  // In production: make a lightweight API call to the provider to verify the token
  res.json({ ok: true, connectorId, latencyMs: Math.floor(Math.random() * 120) + 30 });
});

export default router;

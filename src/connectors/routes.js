/**
 * src/connectors/routes.js
 * Nexus AI Pro — Connector API Routes
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Mount at: /api/connectors
 */

import { Router } from 'express';
import { requireAuth } from '../auth/auth.js';
import {
  listConnectors, getConnectorAuthUrl, exchangeConnectorCode,
  saveConnectorToken, disconnectConnector, listUserConnections,
  sendSlackMessage, getGitHubRepos,
} from './index.js';

const router = Router();
router.use(requireAuth());

router.get('/', (req, res) => {
  res.json({ connectors: listConnectors() });
});

router.get('/:id/auth-url', (req, res) => {
  try {
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3001'}/api/connectors/${req.params.id}/callback`;
    const state       = `${req.user.sub}:${Date.now()}`;
    const url         = getConnectorAuthUrl(req.params.id, redirectUri, state);
    res.json({ url, state });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.get('/:id/callback', async (req, res) => {
  try {
    const { id }           = req.params;
    const { code, state }  = req.query;
    const [userId]         = (state || '').split(':');

    if (!code) return res.status(400).json({ error: 'Authorization code missing' });

    const redirectUri = `${process.env.APP_URL || 'http://localhost:3001'}/api/connectors/${id}/callback`;
    const tokens      = await exchangeConnectorCode(id, code, redirectUri);
    saveConnectorToken(userId, id, tokens);
    res.redirect(`${process.env.APP_URL || 'http://localhost:3001'}/dashboard?connected=${id}`);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

router.get('/connections', (req, res) => {
  res.json({ connections: listUserConnections(req.user.sub) });
});

router.delete('/:id/connection', (req, res) => {
  disconnectConnector(req.user.sub, req.params.id);
  res.json({ success: true });
});

// Slack
router.post('/slack/send', async (req, res) => {
  try {
    const { channel, text } = req.body;
    if (!channel || !text) return res.status(400).json({ error: 'channel and text required' });
    const result = await sendSlackMessage(req.user.sub, channel, text);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GitHub
router.get('/github/repos', async (req, res) => {
  try {
    const repos = await getGitHubRepos(req.user.sub);
    res.json({ repos });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;

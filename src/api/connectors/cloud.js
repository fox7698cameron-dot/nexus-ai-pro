/**
 * src/api/connectors/cloud.js
 * Cloud & DevOps Connector APIs — AWS, Azure, Adobe, Google, Slack, Zoom, GitHub, Bitbucket
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * All credentials are loaded from environment variables only.
 * Connector state (OAuth tokens, connection status) is stored encrypted.
 */

import { Router } from 'express';
import { requireAuth, requireRole, ROLES } from '../../middleware/auth.js';
import { encrypt, decrypt, deriveKey, generateSalt } from '../../utils/crypto.js';

const router = Router();

// ─── Connector Registry ───────────────────────────────────────────────────────

export const CLOUD_CONNECTORS = Object.freeze({
  aws:       { id: 'aws',       name: 'Amazon Web Services', icon: '☁️',  category: 'cloud'   },
  azure:     { id: 'azure',     name: 'Microsoft Azure',     icon: '🔷',  category: 'cloud'   },
  gcp:       { id: 'gcp',       name: 'Google Cloud',        icon: '🌐',  category: 'cloud'   },
  adobe:     { id: 'adobe',     name: 'Adobe Creative Cloud',icon: '🎨',  category: 'creative'},
  slack:     { id: 'slack',     name: 'Slack',               icon: '💬',  category: 'comms'   },
  zoom:      { id: 'zoom',      name: 'Zoom',                icon: '📹',  category: 'comms'   },
  github:    { id: 'github',    name: 'GitHub',              icon: '🐙',  category: 'devops'  },
  bitbucket: { id: 'bitbucket', name: 'Bitbucket',           icon: '🪣',  category: 'devops'  },
  redis:     { id: 'redis',     name: 'Redis',               icon: '🔴',  category: 'data'    },
  blob:      { id: 'blob',      name: 'Blob Storage',        icon: '📦',  category: 'data'    },
});

// ─── In-Memory Connection Store ───────────────────────────────────────────────
const connections = new Map(); // userId:connectorId → encrypted record

function saveConnection(userId, connectorId, data) {
  const salt = generateSalt();
  const key  = deriveKey(process.env.ENCRYPTION_SECRET || 'default-dev-key', salt);
  const enc  = encrypt(JSON.stringify(data), key);
  connections.set(`${userId}:${connectorId}`, { salt, enc, connectedAt: new Date().toISOString() });
}

function loadConnection(userId, connectorId) {
  const record = connections.get(`${userId}:${connectorId}`);
  if (!record) return null;
  const key = deriveKey(process.env.ENCRYPTION_SECRET || 'default-dev-key', record.salt);
  try {
    return { ...JSON.parse(decrypt(record.enc, key)), connectedAt: record.connectedAt };
  } catch {
    return null;
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/connectors/cloud/list */
router.get('/list', requireAuth, (_req, res) => {
  res.json({ connectors: Object.values(CLOUD_CONNECTORS) });
});

/** GET /api/connectors/cloud/status */
router.get('/status', requireAuth, (req, res) => {
  const userId = req.user.id;
  const status = {};

  for (const id of Object.keys(CLOUD_CONNECTORS)) {
    const conn = connections.get(`${userId}:${id}`);
    status[id] = {
      connected:   Boolean(conn),
      connectedAt: conn?.connectedAt ?? null,
    };
  }

  res.json({ status });
});

/** POST /api/connectors/cloud/connect/:connectorId */
router.post('/connect/:connectorId', requireAuth, (req, res) => {
  const { connectorId } = req.params;
  if (!CLOUD_CONNECTORS[connectorId]) {
    return res.status(400).json({ error: 'Unknown connector', available: Object.keys(CLOUD_CONNECTORS) });
  }

  const { accessToken, apiKey, endpoint, region, workspace, projectKey, ...extra } = req.body;

  // Require at least one credential
  if (!accessToken && !apiKey) {
    return res.status(400).json({ error: 'accessToken or apiKey required' });
  }

  saveConnection(req.user.id, connectorId, {
    accessToken: accessToken || null,
    apiKey:      apiKey      || null,
    endpoint:    endpoint    || null,
    region:      region      || null,
    workspace:   workspace   || null,
    projectKey:  projectKey  || null,
    extra,
  });

  return res.json({ message: `${CLOUD_CONNECTORS[connectorId].name} connected successfully` });
});

/** DELETE /api/connectors/cloud/connect/:connectorId */
router.delete('/connect/:connectorId', requireAuth, (req, res) => {
  const key = `${req.user.id}:${req.params.connectorId}`;
  if (!connections.has(key)) {
    return res.status(404).json({ error: 'Connector not connected' });
  }
  connections.delete(key);
  return res.json({ message: 'Connector disconnected' });
});

// ─── GitHub Integration ───────────────────────────────────────────────────────

/** GET /api/connectors/cloud/github/repos — list repos via connected GitHub token */
router.get('/github/repos', requireAuth, async (req, res) => {
  const conn = loadConnection(req.user.id, 'github');
  if (!conn?.accessToken) {
    return res.status(400).json({ error: 'GitHub not connected. POST /api/connectors/cloud/connect/github first.' });
  }

  try {
    const response = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        Accept:        'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent':  'NexusAIPro/2.0',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'GitHub API error', status: response.status });
    }

    const repos = await response.json();
    return res.json({ repos: repos.map(r => ({
      id:          r.id,
      name:        r.name,
      fullName:    r.full_name,
      private:     r.private,
      url:         r.html_url,
      description: r.description,
      updatedAt:   r.updated_at,
      language:    r.language,
      stars:       r.stargazers_count,
      forks:       r.forks_count,
    })) });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach GitHub API' });
  }
});

// ─── Bitbucket Integration ────────────────────────────────────────────────────

/** GET /api/connectors/cloud/bitbucket/repos */
router.get('/bitbucket/repos', requireAuth, async (req, res) => {
  const conn = loadConnection(req.user.id, 'bitbucket');
  if (!conn?.accessToken) {
    return res.status(400).json({ error: 'Bitbucket not connected.' });
  }

  try {
    const response = await fetch('https://api.bitbucket.org/2.0/repositories?pagelen=50', {
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Bitbucket API error' });
    }

    const data = await response.json();
    return res.json({ repos: (data.values || []).map(r => ({
      uuid:        r.uuid,
      name:        r.name,
      fullName:    r.full_name,
      private:     r.is_private,
      url:         r.links?.html?.href,
      updatedAt:   r.updated_on,
      language:    r.language,
    })) });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach Bitbucket API' });
  }
});

// ─── Slack Integration ────────────────────────────────────────────────────────

/** POST /api/connectors/cloud/slack/notify — send a Slack message */
router.post('/slack/notify', requireAuth, async (req, res) => {
  const conn = loadConnection(req.user.id, 'slack');
  if (!conn?.accessToken) {
    return res.status(400).json({ error: 'Slack not connected.' });
  }

  const { channel, text, blocks } = req.body;
  if (!channel || !text) {
    return res.status(400).json({ error: 'channel and text are required' });
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${conn.accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ channel, text, blocks }),
    });

    const result = await response.json();
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    return res.json({ message: 'Slack notification sent', ts: result.ts });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach Slack API' });
  }
});

// ─── Redis Health Check ───────────────────────────────────────────────────────

/** GET /api/connectors/cloud/redis/health */
router.get('/redis/health', requireAuth, requireRole(ROLES.ADMIN, ROLES.DEV), async (req, res) => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return res.json({ connected: false, message: 'REDIS_URL not configured in .env' });
  }

  // Dynamic import to avoid hard dependency when Redis is not configured
  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 3000 });
    await client.connect();
    await client.ping();
    await client.disconnect();
    return res.json({ connected: true, url: redisUrl.replace(/:[^@]+@/, ':***@') });
  } catch (err) {
    return res.json({ connected: false, error: err.message });
  }
});

export default router;

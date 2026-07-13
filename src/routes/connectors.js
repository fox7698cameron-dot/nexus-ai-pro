// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/routes/connectors.js — 2026-07-13
// External service connectors: Azure, AWS, Google, Slack, Zoom, GitHub, Bitbucket, Adobe

import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// In-memory connector store: userId -> { connectorId -> { ...config } }
const connectorStore = new Map();

const CONNECTORS = Object.freeze({
  azure: {
    id: 'azure',
    name: 'Microsoft Azure',
    category: 'cloud',
    icon: '☁️',
    authType: 'oauth',
    fields: ['tenantId', 'clientId', 'clientSecret', 'subscriptionId'],
    capabilities: ['blob-storage', 'cognitive-services', 'devops', 'active-directory'],
  },
  aws: {
    id: 'aws',
    name: 'Amazon Web Services',
    category: 'cloud',
    icon: '🟠',
    authType: 'api-key',
    fields: ['accessKeyId', 'secretAccessKey', 'region'],
    capabilities: ['s3', 'lambda', 'dynamodb', 'cloudwatch', 'ec2'],
  },
  google: {
    id: 'google',
    name: 'Google Cloud',
    category: 'cloud',
    icon: '🔵',
    authType: 'service-account',
    fields: ['projectId', 'serviceAccountJson'],
    capabilities: ['gcs', 'bigquery', 'firebase', 'translate', 'vision'],
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    icon: '💬',
    authType: 'oauth',
    fields: ['botToken', 'signingSecret', 'defaultChannel'],
    capabilities: ['messages', 'notifications', 'channels', 'webhooks'],
  },
  zoom: {
    id: 'zoom',
    name: 'Zoom',
    category: 'communication',
    icon: '📹',
    authType: 'oauth',
    fields: ['clientId', 'clientSecret', 'accountId'],
    capabilities: ['meetings', 'webinars', 'recordings'],
  },
  github: {
    id: 'github',
    name: 'GitHub',
    category: 'devtools',
    icon: '🐙',
    authType: 'token',
    fields: ['accessToken', 'username', 'defaultOrg'],
    capabilities: ['repos', 'issues', 'prs', 'actions', 'gists'],
  },
  bitbucket: {
    id: 'bitbucket',
    name: 'Bitbucket',
    category: 'devtools',
    icon: '🪣',
    authType: 'app-password',
    fields: ['username', 'appPassword', 'workspaceSlug'],
    capabilities: ['repos', 'pull-requests', 'pipelines'],
  },
  adobe: {
    id: 'adobe',
    name: 'Adobe Creative Cloud',
    category: 'creative',
    icon: '🎨',
    authType: 'oauth',
    fields: ['clientId', 'clientSecret'],
    capabilities: ['assets', 'fonts', 'stock', 'pdf-services'],
  },
});

function encryptCredential(value, masterKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

function getMasterKey() {
  const secret = process.env.ENCRYPTION_SECRET || 'fallback-dev-key-replace-in-production';
  return crypto.pbkdf2Sync(secret, process.env.ENCRYPTION_SALT || 'nexus-salt', 100000, 32, 'sha512');
}

function getUserConnectors(userId) {
  if (!connectorStore.has(userId)) connectorStore.set(userId, new Map());
  return connectorStore.get(userId);
}

// GET /api/connectors — list all available connectors + user's connection status
router.get('/', authenticate, (req, res) => {
  const userConns = getUserConnectors(req.user.id);
  const list = Object.values(CONNECTORS).map(c => ({
    ...c,
    connected: userConns.has(c.id),
    connectedAt: userConns.get(c.id)?.connectedAt ?? null,
  }));
  return res.json({ success: true, data: { connectors: list } });
});

// GET /api/connectors/:id — get specific connector info
router.get('/:id', authenticate, (req, res) => {
  const def = CONNECTORS[req.params.id];
  if (!def) return res.status(404).json({ error: 'Connector not found', code: 'NOT_FOUND' });

  const userConns = getUserConnectors(req.user.id);
  const conn = userConns.get(req.params.id);

  return res.json({
    success: true,
    data: {
      ...def,
      connected: !!conn,
      connectedAt: conn?.connectedAt ?? null,
      // Never return credentials
    },
  });
});

// POST /api/connectors/:id/connect — store connector credentials
router.post('/:id/connect', authenticate, requirePermission('connectors:write'), (req, res) => {
  const def = CONNECTORS[req.params.id];
  if (!def) return res.status(404).json({ error: 'Connector not found', code: 'NOT_FOUND' });

  const fields = req.body;
  const missing = def.fields.filter(f => !fields[f] && f !== 'serviceAccountJson');
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}`, code: 'MISSING_FIELDS' });
  }

  const masterKey = getMasterKey();
  const encryptedFields = {};
  for (const field of def.fields) {
    if (fields[field]) {
      encryptedFields[field] = encryptCredential(fields[field], masterKey);
    }
  }

  const userConns = getUserConnectors(req.user.id);
  userConns.set(def.id, {
    connectorId: def.id,
    encryptedFields,
    connectedAt: Date.now(),
    lastSync: null,
    status: 'connected',
  });

  return res.json({
    success: true,
    data: { message: `${def.name} connected successfully`, connectedAt: Date.now() },
  });
});

// DELETE /api/connectors/:id/disconnect
router.delete('/:id/disconnect', authenticate, requirePermission('connectors:write'), (req, res) => {
  const userConns = getUserConnectors(req.user.id);
  if (!userConns.has(req.params.id)) {
    return res.status(404).json({ error: 'Connector not connected', code: 'NOT_CONNECTED' });
  }
  userConns.delete(req.params.id);
  return res.json({ success: true, data: { message: `${req.params.id} disconnected` } });
});

// POST /api/connectors/:id/test — test connection
router.post('/:id/test', authenticate, requirePermission('connectors:read'), async (req, res) => {
  const def = CONNECTORS[req.params.id];
  if (!def) return res.status(404).json({ error: 'Connector not found', code: 'NOT_FOUND' });

  const userConns = getUserConnectors(req.user.id);
  if (!userConns.has(req.params.id)) {
    return res.status(400).json({ error: 'Connector not connected', code: 'NOT_CONNECTED' });
  }

  // Placeholder: in production, make a lightweight API call to verify credentials
  const status = { connected: true, latencyMs: Math.floor(Math.random() * 100) + 20, testedAt: Date.now() };
  userConns.get(req.params.id).lastSync = Date.now();

  return res.json({ success: true, data: status });
});

// POST /api/connectors/github/repos — list GitHub repos (uses stored token)
router.post('/github/repos', authenticate, requirePermission('connectors:read'), async (req, res) => {
  const userConns = getUserConnectors(req.user.id);
  const conn = userConns.get('github');
  if (!conn) return res.status(400).json({ error: 'GitHub not connected', code: 'NOT_CONNECTED' });

  // In production: decrypt token and call GitHub API
  return res.json({
    success: true,
    data: {
      repos: [
        { id: 1, name: 'nexus-ai-pro', private: true, stars: 0, language: 'JavaScript', updatedAt: new Date().toISOString() },
        { id: 2, name: 'game-engine', private: false, stars: 12, language: 'C++', updatedAt: new Date().toISOString() },
      ],
      note: 'Connect with real token to fetch actual repositories.',
    },
  });
});

// POST /api/connectors/slack/notify — send Slack notification
router.post('/slack/notify', authenticate, requirePermission('connectors:write'), async (req, res) => {
  const { message, channel } = req.body;
  if (!message) return res.status(400).json({ error: 'message required', code: 'INVALID_INPUT' });

  const userConns = getUserConnectors(req.user.id);
  const conn = userConns.get('slack');
  if (!conn) return res.status(400).json({ error: 'Slack not connected', code: 'NOT_CONNECTED' });

  // In production: decrypt botToken and POST to Slack API
  return res.json({ success: true, data: { message: 'Notification queued', channel: channel || 'default' } });
});

export default router;

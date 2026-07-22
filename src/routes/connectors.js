// src/routes/connectors.js
// 2026-07-22 | Cloud & platform connectors — Azure, AWS, Google, Slack, Zoom, GitHub, Bitbucket, Adobe

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// ─── Connector registry ───────────────────────────────────────────────────────

export const CONNECTORS = {
  github: {
    name: 'GitHub',
    category: 'devops',
    authType: 'oauth2',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:user', 'read:org'],
    envKey: 'GITHUB_CLIENT_ID',
  },
  bitbucket: {
    name: 'Bitbucket',
    category: 'devops',
    authType: 'oauth2',
    authUrl: 'https://bitbucket.org/site/oauth2/authorize',
    scopes: ['repository', 'account'],
    envKey: 'BITBUCKET_CLIENT_ID',
  },
  slack: {
    name: 'Slack',
    category: 'communication',
    authType: 'oauth2',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    scopes: ['channels:read', 'chat:write', 'users:read'],
    envKey: 'SLACK_CLIENT_ID',
  },
  zoom: {
    name: 'Zoom',
    category: 'communication',
    authType: 'oauth2',
    authUrl: 'https://zoom.us/oauth/authorize',
    scopes: ['meeting:read', 'user:read'],
    envKey: 'ZOOM_CLIENT_ID',
  },
  aws: {
    name: 'Amazon Web Services',
    category: 'cloud',
    authType: 'api_key',
    requiredFields: ['accessKeyId', 'secretAccessKey', 'region'],
  },
  azure: {
    name: 'Microsoft Azure',
    category: 'cloud',
    authType: 'oauth2',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    scopes: ['openid', 'profile', 'https://management.azure.com/.default'],
    envKey: 'AZURE_CLIENT_ID',
  },
  google: {
    name: 'Google Cloud / Workspace',
    category: 'cloud',
    authType: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/cloud-platform'],
    envKey: 'GOOGLE_CLIENT_ID',
  },
  adobe: {
    name: 'Adobe Creative Cloud',
    category: 'creative',
    authType: 'oauth2',
    authUrl: 'https://ims-na1.adobelogin.com/ims/authorize/v2',
    scopes: ['openid', 'creative_sdk', 'AdobeID'],
    envKey: 'ADOBE_CLIENT_ID',
  },
  redis: {
    name: 'Redis Cloud',
    category: 'database',
    authType: 'connection_string',
    requiredFields: ['url'],
  },
  azure_blob: {
    name: 'Azure Blob Storage',
    category: 'storage',
    authType: 'connection_string',
    requiredFields: ['connectionString', 'containerName'],
  },
  s3: {
    name: 'Amazon S3',
    category: 'storage',
    authType: 'api_key',
    requiredFields: ['accessKeyId', 'secretAccessKey', 'bucket', 'region'],
  },
};

// Connector state per user (token presence only — never expose credentials)
const connectedMap = new Map(); // `${userId}:${connectorId}` → { connected, connectedAt }

// ─── GET /api/connectors ───────────────────────────────────────────────────────

router.get('/', authenticate, (req, res) => {
  const status = {};
  for (const id of Object.keys(CONNECTORS)) {
    status[id] = {
      ...CONNECTORS[id],
      connected: connectedMap.has(`${req.user.sub}:${id}`),
    };
  }
  return res.json({ connectors: status });
});

// ─── POST /api/connectors/:id/connect ─────────────────────────────────────────

router.post('/:id/connect', authenticate, (req, res) => {
  const connector = CONNECTORS[req.params.id];
  if (!connector) return res.status(404).json({ error: 'Unknown connector' });

  if (connector.authType === 'api_key' || connector.authType === 'connection_string') {
    const missing = (connector.requiredFields || []).filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }
    // Mark as connected — never store credentials here (use encrypted vault or env)
    connectedMap.set(`${req.user.sub}:${req.params.id}`, {
      connected: true,
      connectedAt: new Date().toISOString(),
    });
    return res.json({ connected: true, connectorId: req.params.id });
  }

  // OAuth2: return authorization URL
  const clientId = process.env[connector.envKey] || 'CONFIGURE_ME';
  const origin = process.env.APP_URL || 'https://nexusai.pro';
  const redirectUri = `${origin}/api/connectors/${req.params.id}/callback`;
  const state = `${req.user.sub}:${req.params.id}`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: connector.scopes.join(' '),
    state,
  });
  return res.json({
    authUrl: `${connector.authUrl}?${params}`,
    connectorId: req.params.id,
  });
});

router.get('/:id/callback', (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).json({ error: 'Missing OAuth params' });
  const [userId, connectorId] = state.split(':');
  connectedMap.set(`${userId}:${connectorId}`, {
    connected: true,
    connectedAt: new Date().toISOString(),
  });
  return res.redirect(`/?connected=${connectorId}`);
});

// ─── DELETE /api/connectors/:id ───────────────────────────────────────────────

router.delete('/:id', authenticate, (req, res) => {
  connectedMap.delete(`${req.user.sub}:${req.params.id}`);
  return res.json({ success: true });
});

export default router;

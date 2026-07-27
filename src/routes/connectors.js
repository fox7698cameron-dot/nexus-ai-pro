// src/routes/connectors.js
// 2026-07-27 | Nexus AI Pro — Enterprise Connectors
// Azure, Adobe, AWS, Google, Slack, Zoom, GitHub, Bitbucket, Redis
// All tokens loaded from env vars only — never hardcoded

import { Router } from 'express';
import { requireAuth, ROLES } from './auth.js';

const router = Router();

// Connector registry — envKey = environment variable holding the API credential
const CONNECTOR_REGISTRY = {
  azure:      { name: 'Microsoft Azure',    envKey: 'AZURE_CLIENT_SECRET',       authType: 'oauth2' },
  adobe:      { name: 'Adobe Creative SDK', envKey: 'ADOBE_CLIENT_SECRET',       authType: 'oauth2' },
  aws:        { name: 'Amazon Web Services', envKey: 'AWS_SECRET_ACCESS_KEY',    authType: 'aws_sig4' },
  google:     { name: 'Google Cloud / Workspace', envKey: 'GOOGLE_CLIENT_SECRET', authType: 'oauth2' },
  slack:      { name: 'Slack',              envKey: 'SLACK_BOT_TOKEN',            authType: 'bearer' },
  zoom:       { name: 'Zoom',               envKey: 'ZOOM_CLIENT_SECRET',         authType: 'oauth2' },
  github:     { name: 'GitHub',             envKey: 'GITHUB_TOKEN',               authType: 'pat' },
  bitbucket:  { name: 'Bitbucket',          envKey: 'BITBUCKET_APP_PASSWORD',     authType: 'basic' },
  redis:      { name: 'Redis / Upstash',    envKey: 'REDIS_URL',                  authType: 'url' },
  blob:       { name: 'Blob Storage (Azure/S3/GCS)', envKey: 'BLOB_STORAGE_KEY', authType: 'key' },
};

const connectionState = new Map(); // connectorId -> { enabled, testedAt, status }

// ─── List all connectors with connection status ───────────────────────────────
router.get('/', requireAuth(), (req, res) => {
  const list = Object.entries(CONNECTOR_REGISTRY).map(([id, c]) => {
    const state = connectionState.get(id) || {};
    return {
      id,
      name: c.name,
      authType: c.authType,
      configured: !!process.env[c.envKey],
      enabled: state.enabled || false,
      status: state.status || (process.env[c.envKey] ? 'configured' : 'unconfigured'),
      testedAt: state.testedAt || null,
    };
  });
  res.json({ connectors: list });
});

// ─── Enable / disable a connector ────────────────────────────────────────────
router.patch('/:id/toggle', requireAuth(ROLES.admin), (req, res) => {
  const { id } = req.params;
  if (!CONNECTOR_REGISTRY[id]) return res.status(404).json({ error: 'Connector not found' });

  const configured = !!process.env[CONNECTOR_REGISTRY[id].envKey];
  if (!configured && req.body.enabled) {
    return res.status(400).json({ error: `Set ${CONNECTOR_REGISTRY[id].envKey} before enabling` });
  }

  const state = connectionState.get(id) || {};
  state.enabled = req.body.enabled !== false;
  state.updatedAt = new Date().toISOString();
  connectionState.set(id, state);
  res.json({ id, enabled: state.enabled });
});

// ─── Test connector connection ────────────────────────────────────────────────
router.post('/:id/test', requireAuth(ROLES.developer), async (req, res) => {
  const { id } = req.params;
  const connector = CONNECTOR_REGISTRY[id];
  if (!connector) return res.status(404).json({ error: 'Connector not found' });

  const configured = !!process.env[connector.envKey];
  if (!configured) {
    return res.status(400).json({ success: false, message: `Environment variable ${connector.envKey} not set` });
  }

  // Minimal connectivity test per connector type
  try {
    let result = { success: true, latencyMs: null };

    if (id === 'slack') {
      const token = process.env.SLACK_BOT_TOKEN;
      const t0 = Date.now();
      const r = await fetch('https://slack.com/api/auth.test', { headers: { Authorization: `Bearer ${token}` } });
      result.latencyMs = Date.now() - t0;
      const body = await r.json();
      result.success = body.ok;
      result.detail = body.ok ? `Connected as ${body.user}` : body.error;
    } else if (id === 'github') {
      const token = process.env.GITHUB_TOKEN;
      const t0 = Date.now();
      const r = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'NexusAIPro/2.0' } });
      result.latencyMs = Date.now() - t0;
      result.success = r.ok;
      result.detail = r.ok ? `GitHub connected` : `HTTP ${r.status}`;
    } else {
      result.detail = `${connector.name} credential present — full test requires SDK`;
    }

    const state = connectionState.get(id) || {};
    state.status = result.success ? 'connected' : 'error';
    state.testedAt = new Date().toISOString();
    connectionState.set(id, state);

    res.json(result);
  } catch (err) {
    const state = connectionState.get(id) || {};
    state.status = 'error';
    connectionState.set(id, state);
    res.status(502).json({ success: false, message: err.message });
  }
});

// ─── Slack: post message ──────────────────────────────────────────────────────
router.post('/slack/message', requireAuth(), async (req, res) => {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return res.status(503).json({ error: 'Slack not configured. Set SLACK_BOT_TOKEN.' });

  const { channel, text, blocks } = req.body;
  if (!channel || !text) return res.status(400).json({ error: 'channel and text required' });

  const r = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, text, blocks }),
  });
  const body = await r.json();
  if (!body.ok) return res.status(502).json({ error: body.error });
  res.json({ ts: body.ts, channel: body.channel });
});

// ─── GitHub: list repos ───────────────────────────────────────────────────────
router.get('/github/repos', requireAuth(), async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(503).json({ error: 'GitHub not configured. Set GITHUB_TOKEN.' });

  const r = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'NexusAIPro/2.0' },
  });
  if (!r.ok) return res.status(r.status).json({ error: `GitHub API error: ${r.status}` });
  const repos = await r.json();
  res.json({ repos: repos.map(r => ({ id: r.id, name: r.full_name, url: r.html_url, private: r.private, updatedAt: r.updated_at })) });
});

// ─── Bitbucket: list repos ────────────────────────────────────────────────────
router.get('/bitbucket/repos', requireAuth(), async (req, res) => {
  const credentials = process.env.BITBUCKET_APP_PASSWORD;
  const username = process.env.BITBUCKET_USERNAME;
  if (!credentials || !username) return res.status(503).json({ error: 'Bitbucket not configured. Set BITBUCKET_APP_PASSWORD and BITBUCKET_USERNAME.' });

  const auth = Buffer.from(`${username}:${credentials}`).toString('base64');
  const r = await fetch(`https://api.bitbucket.org/2.0/repositories/${username}?pagelen=50`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!r.ok) return res.status(r.status).json({ error: `Bitbucket API error: ${r.status}` });
  const data = await r.json();
  res.json({ repos: (data.values || []).map(r => ({ id: r.uuid, name: r.full_name, url: r.links?.html?.href, private: r.is_private })) });
});

// ─── AWS: S3 bucket list (STS-based, credentials from env) ───────────────────
router.get('/aws/buckets', requireAuth(ROLES.developer), async (req, res) => {
  const keyId = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';
  if (!keyId || !secret) return res.status(503).json({ error: 'AWS not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.' });

  res.json({ message: 'AWS connector configured. Use the AWS SDK in your backend service to call S3 ListBuckets.', region });
});

// ─── Azure: storage status ────────────────────────────────────────────────────
router.get('/azure/status', requireAuth(ROLES.developer), (req, res) => {
  const configured = !!process.env.AZURE_CLIENT_SECRET && !!process.env.AZURE_CLIENT_ID && !!process.env.AZURE_TENANT_ID;
  res.json({ configured, message: configured ? 'Azure credentials detected' : 'Set AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET' });
});

// ─── Zoom: OAuth start ────────────────────────────────────────────────────────
router.get('/zoom/oauth/start', requireAuth(), (req, res) => {
  const clientId = process.env.ZOOM_CLIENT_ID;
  if (!clientId) return res.status(503).json({ error: 'Zoom not configured. Set ZOOM_CLIENT_ID.' });
  const redirectUri = encodeURIComponent(`${process.env.APP_URL || 'http://localhost:3001'}/api/connectors/zoom/oauth/callback`);
  res.json({ url: `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}` });
});

export { router as connectorsRouter };

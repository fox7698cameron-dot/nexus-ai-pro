// src/server/connectors.js
// Nexus AI Pro — External Service Connectors
// Azure, Adobe, AWS, Google Cloud, Slack, Zoom, GitHub, Bitbucket, Redis, Blob
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import express from 'express';
import crypto from 'crypto';
import { requireAuth } from './middleware.js';

const router = express.Router();
router.use(requireAuth);

// ── Supported services ─────────────────────────────────────────────────────────

export const SERVICES = Object.freeze({
  AZURE:     'azure',
  ADOBE:     'adobe',
  AWS:       'aws',
  GOOGLE:    'google',
  SLACK:     'slack',
  ZOOM:      'zoom',
  GITHUB:    'github',
  BITBUCKET: 'bitbucket',
  REDIS:     'redis',
  BLOB:      'blob',
});

// ── In-memory connection registry ─────────────────────────────────────────────

const serviceConnections = new Map(); // userId:service → connection metadata (no raw secrets)

// ── Helpers ───────────────────────────────────────────────────────────────────

function connKey(userId, service) { return `${userId}:${service}`; }

function maskToken(token) {
  if (!token || token.length < 8) return '***';
  return token.slice(0, 4) + '…' + token.slice(-4);
}

function getEnvConnection(service) {
  const envMap = {
    azure:     { tenantId: process.env.AZURE_TENANT_ID,     clientId: process.env.AZURE_CLIENT_ID },
    adobe:     { clientId: process.env.ADOBE_CLIENT_ID },
    aws:       { region: process.env.AWS_REGION,            accountId: process.env.AWS_ACCOUNT_ID },
    google:    { projectId: process.env.GOOGLE_CLOUD_PROJECT },
    slack:     { teamId: process.env.SLACK_TEAM_ID },
    zoom:      { accountId: process.env.ZOOM_ACCOUNT_ID },
    github:    { org: process.env.GITHUB_ORG },
    bitbucket: { workspace: process.env.BITBUCKET_WORKSPACE },
  };
  return envMap[service] || {};
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/connectors — list all service connection statuses */
router.get('/', (req, res) => {
  const userId = req.user.sub;
  const status = Object.values(SERVICES).map(service => ({
    service,
    connected:    serviceConnections.has(connKey(userId, service)),
    configuredInEnv: Object.keys(getEnvConnection(service)).some(k => getEnvConnection(service)[k]),
    metadata:     serviceConnections.get(connKey(userId, service)) || null,
  }));
  res.json({ connectors: status });
});

/**
 * POST /api/connectors/:service/connect
 * Body: { workspace?, orgName?, projectId?, region?, ... (service-specific) }
 * API tokens/keys are passed via env vars — never in request body.
 */
router.post('/:service/connect', (req, res) => {
  const { service } = req.params;
  if (!Object.values(SERVICES).includes(service)) {
    return res.status(400).json({ error: 'Unsupported service', valid: Object.values(SERVICES) });
  }

  const userId = req.user.sub;
  const envConf = getEnvConnection(service);
  const hasEnvConfig = Object.values(envConf).some(Boolean);

  const connection = {
    service,
    connectedAt: new Date().toISOString(),
    connectedBy:  userId,
    // Merge safe metadata from body (non-secret info like org name, workspace, region)
    ...Object.fromEntries(
      Object.entries(req.body || {}).filter(([k]) =>
        !['token', 'secret', 'key', 'password', 'apiKey', 'clientSecret'].includes(k.toLowerCase())
      )
    ),
    envConfigured: hasEnvConfig,
  };

  serviceConnections.set(connKey(userId, service), connection);

  res.json({
    success: true,
    service,
    envConfigured: hasEnvConfig,
    message: hasEnvConfig
      ? `${service} connected using environment configuration`
      : `${service} marked as connected — configure env vars for full API access`,
  });
});

/** DELETE /api/connectors/:service/disconnect */
router.delete('/:service/disconnect', (req, res) => {
  const { service } = req.params;
  serviceConnections.delete(connKey(req.user.sub, service));
  res.json({ success: true });
});

/** GET /api/connectors/:service/status */
router.get('/:service/status', (req, res) => {
  const { service } = req.params;
  if (!Object.values(SERVICES).includes(service)) {
    return res.status(400).json({ error: 'Unsupported service' });
  }

  const userId = req.user.sub;
  const conn   = serviceConnections.get(connKey(userId, service));
  const envConf = getEnvConnection(service);

  res.json({
    service,
    connected:      !!conn,
    envConfigured:  Object.values(envConf).some(Boolean),
    metadata:       conn || null,
  });
});

// ── Slack ──────────────────────────────────────────────────────────────────────

/**
 * POST /api/connectors/slack/message
 * Sends a message via configured Slack webhook.
 * Body: { channel?, text, blocks? }
 * Requires SLACK_WEBHOOK_URL in environment.
 */
router.post('/slack/message', async (req, res) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(503).json({ error: 'SLACK_WEBHOOK_URL not configured' });
  }

  const { text, channel, blocks } = req.body;
  if (!text && !blocks) return res.status(400).json({ error: 'text or blocks required' });

  try {
    const payload = { text, ...(channel && { channel }), ...(blocks && { blocks }) };
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`Slack responded ${resp.status}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send Slack message' });
  }
});

// ── GitHub ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/connectors/github/repos
 * Lists repositories using configured GitHub token from env.
 */
router.get('/github/repos', async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(503).json({ error: 'GITHUB_TOKEN not configured' });

  try {
    const resp = await fetch('https://api.github.com/user/repos?per_page=30&sort=updated', {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Nexus-AI-Pro' },
    });
    if (!resp.ok) throw new Error(`GitHub API responded ${resp.status}`);
    const repos = await resp.json();
    res.json({
      repos: repos.map(r => ({
        id: r.id, name: r.full_name, description: r.description,
        language: r.language, stars: r.stargazers_count, forks: r.forks_count,
        updatedAt: r.updated_at, url: r.html_url, private: r.private,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch GitHub repos' });
  }
});

/**
 * GET /api/connectors/github/repos/:owner/:repo/commits
 */
router.get('/github/repos/:owner/:repo/commits', async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(503).json({ error: 'GITHUB_TOKEN not configured' });

  const { owner, repo } = req.params;
  // Validate owner/repo to prevent path injection
  if (!/^[a-zA-Z0-9_.\-]+$/.test(owner) || !/^[a-zA-Z0-9_.\-]+$/.test(repo)) {
    return res.status(400).json({ error: 'Invalid owner or repo name' });
  }

  try {
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=20`, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Nexus-AI-Pro' },
    });
    if (!resp.ok) throw new Error(`GitHub API responded ${resp.status}`);
    const commits = await resp.json();
    res.json({ commits: commits.map(c => ({
      sha: c.sha.slice(0, 7), message: c.commit.message.split('\n')[0],
      author: c.commit.author?.name, date: c.commit.author?.date,
    }))});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch commits' });
  }
});

// ── Azure Blob / AWS S3 storage ───────────────────────────────────────────────

/**
 * GET /api/connectors/blob/presigned-url
 * Generates a pre-signed upload URL for Azure Blob or AWS S3.
 * Query: { filename, contentType }
 */
router.get('/blob/presigned-url', async (req, res) => {
  const { filename, contentType = 'application/octet-stream' } = req.query;
  if (!filename) return res.status(400).json({ error: 'filename is required' });

  const sanitized = crypto.randomBytes(8).toString('hex') + '_' + filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // AWS S3
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET) {
    // In production: use @aws-sdk/client-s3 getSignedUrl
    return res.json({
      provider:   'aws',
      key:        sanitized,
      uploadUrl:  `[configure @aws-sdk/client-s3 getSignedUrl in src/server/connectors.js]`,
      expiresIn:  3600,
    });
  }

  // Azure Blob
  if (process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_STORAGE_CONTAINER) {
    // In production: use @azure/storage-blob generateSasUrl
    return res.json({
      provider:  'azure',
      blobName:  sanitized,
      uploadUrl: `[configure @azure/storage-blob SAS in src/server/connectors.js]`,
      expiresIn: 3600,
    });
  }

  res.status(503).json({
    error: 'No blob storage configured. Set AWS_ACCESS_KEY_ID + AWS_S3_BUCKET or AZURE_STORAGE_CONNECTION_STRING.',
  });
});

// ── Zoom ───────────────────────────────────────────────────────────────────────

/**
 * POST /api/connectors/zoom/meeting
 * Creates a Zoom meeting. Requires ZOOM_ACCOUNT_ID + ZOOM_CLIENT_ID + ZOOM_CLIENT_SECRET.
 * Body: { topic, startTime, duration }
 */
router.post('/zoom/meeting', async (req, res) => {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    return res.status(503).json({ error: 'ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET not configured' });
  }

  const { topic, startTime, duration = 60 } = req.body;
  if (!topic || !startTime) return res.status(400).json({ error: 'topic and startTime required' });

  try {
    // Get server-to-server OAuth token
    const tokenResp = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64'),
      },
    });
    if (!tokenResp.ok) throw new Error('Zoom token fetch failed');
    const { access_token } = await tokenResp.json();

    const meetingResp = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, type: 2, start_time: startTime, duration, settings: { join_before_host: false } }),
    });
    if (!meetingResp.ok) throw new Error('Zoom meeting creation failed');
    const meeting = await meetingResp.json();

    res.json({ meetingId: meeting.id, joinUrl: meeting.join_url, startUrl: meeting.start_url, password: meeting.password });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create Zoom meeting' });
  }
});

export default router;

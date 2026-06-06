// server/routes/connectors.js
// 2026-06-06 | Cloud & platform connectors:
// Azure, Adobe, AWS, Google, Slack, Zoom, GitHub, Bitbucket — OAuth stubs + API proxies

import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Connector credentials store (in-memory; encrypt + persist to DB in production)
const connectorStore = new Map(); // userId → { [service]: { connected, accountId, scopes, connectedAt } }

const SUPPORTED_CONNECTORS = [
  'azure', 'adobe', 'aws', 'google_workspace', 'slack',
  'zoom', 'github', 'bitbucket', 'jira', 'notion', 'figma'
];

function getUserConnectors(userId) {
  if (!connectorStore.has(userId)) {
    const init = {};
    for (const s of SUPPORTED_CONNECTORS) {
      init[s] = { connected: false, accountId: null, scopes: [], connectedAt: null };
    }
    connectorStore.set(userId, init);
  }
  return connectorStore.get(userId);
}

// GET /api/connectors — list all connector statuses
router.get('/', authenticate, (req, res) => {
  const connectors = getUserConnectors(req.user.id);
  res.json({ connectors, supported: SUPPORTED_CONNECTORS });
});

// POST /api/connectors/:service/connect
router.post('/:service/connect', authenticate, (req, res) => {
  const { service } = req.params;
  if (!SUPPORTED_CONNECTORS.includes(service)) {
    return res.status(400).json({ error: `Unsupported connector: ${service}. Supported: ${SUPPORTED_CONNECTORS.join(', ')}` });
  }

  const { accountId, scopes, oauthCode } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });

  // In production: exchange oauthCode for access token via platform OAuth 2.0 flow,
  // then store encrypted token using security.encrypt()
  const connectors = getUserConnectors(req.user.id);
  connectors[service] = {
    connected: true,
    accountId,
    scopes: scopes || [],
    connectedAt: Date.now()
  };

  res.json({ message: `Connected to ${service}`, connector: connectors[service] });
});

// POST /api/connectors/:service/disconnect
router.post('/:service/disconnect', authenticate, (req, res) => {
  const { service } = req.params;
  if (!SUPPORTED_CONNECTORS.includes(service)) {
    return res.status(400).json({ error: `Unsupported connector: ${service}` });
  }

  const connectors = getUserConnectors(req.user.id);
  connectors[service] = { connected: false, accountId: null, scopes: [], connectedAt: null };

  res.json({ message: `Disconnected from ${service}` });
});

// ─── GitHub connector actions ─────────────────────────────────────────────────

// GET /api/connectors/github/repos
router.get('/github/repos', authenticate, async (req, res) => {
  const connectors = getUserConnectors(req.user.id);
  if (!connectors.github?.connected) {
    return res.status(403).json({ error: 'GitHub not connected' });
  }
  // In production: use stored OAuth token to call api.github.com/user/repos
  res.json({ repos: [], message: 'Connect GitHub OAuth to see your repositories' });
});

// ─── Slack connector actions ─────────────────────────────────────────────────

// POST /api/connectors/slack/message
router.post('/slack/message', authenticate, async (req, res) => {
  const connectors = getUserConnectors(req.user.id);
  if (!connectors.slack?.connected) {
    return res.status(403).json({ error: 'Slack not connected' });
  }

  const { channel, text } = req.body;
  if (!channel || !text) return res.status(400).json({ error: 'channel and text required' });

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return res.status(500).json({ error: 'SLACK_WEBHOOK_URL not configured' });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, channel })
    });

    if (!response.ok) throw new Error(`Slack error: ${response.status}`);
    res.json({ message: 'Message sent to Slack' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AWS connector actions ────────────────────────────────────────────────────

// GET /api/connectors/aws/status
router.get('/aws/status', authenticate, (req, res) => {
  const connectors = getUserConnectors(req.user.id);
  if (!connectors.aws?.connected) {
    return res.status(403).json({ error: 'AWS not connected' });
  }
  // In production: verify credentials via AWS STS GetCallerIdentity
  res.json({
    connected: true,
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    services: ['s3', 'lambda', 'cloudfront', 'rds', 'ec2']
  });
});

// ─── Azure connector actions ──────────────────────────────────────────────────

// GET /api/connectors/azure/status
router.get('/azure/status', authenticate, (req, res) => {
  const connectors = getUserConnectors(req.user.id);
  if (!connectors.azure?.connected) {
    return res.status(403).json({ error: 'Azure not connected' });
  }
  res.json({
    connected: true,
    tenantId: process.env.AZURE_TENANT_ID || null,
    services: ['blob_storage', 'cosmos_db', 'functions', 'cdn', 'ai_services']
  });
});

// ─── Zoom connector ───────────────────────────────────────────────────────────

// POST /api/connectors/zoom/meeting
router.post('/zoom/meeting', authenticate, async (req, res) => {
  const connectors = getUserConnectors(req.user.id);
  if (!connectors.zoom?.connected) {
    return res.status(403).json({ error: 'Zoom not connected' });
  }

  const { topic, duration, startTime } = req.body;
  // In production: call Zoom API with OAuth token to create meeting
  res.json({
    message: 'Meeting creation requires Zoom OAuth token',
    topic: topic || 'Nexus AI Meeting',
    duration: duration || 60,
    startTime: startTime || new Date().toISOString()
  });
});

export default router;

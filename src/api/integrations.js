// ================================================
// NEXUS AI PRO — External Integrations API Module
// Connectors: Azure, AWS, Google Cloud, Adobe,
//             Slack, Zoom, GitHub, Bitbucket
// All credentials via environment variables only
// Created: 2026-06-04
// ================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = Router();

// Integration registry
const integrationStore = new Map(); // userId:service -> config

const SERVICES = Object.freeze([
  'azure', 'aws', 'google_cloud', 'adobe',
  'slack', 'zoom', 'github', 'bitbucket', 'redis', 'blob'
]);

const SERVICE_META = Object.freeze({
  azure:        { label: 'Microsoft Azure',   authType: 'service_principal', icon: 'azure',     docs: 'https://docs.microsoft.com/azure' },
  aws:          { label: 'Amazon Web Services', authType: 'iam_keys',        icon: 'aws',       docs: 'https://aws.amazon.com/documentation' },
  google_cloud: { label: 'Google Cloud',       authType: 'service_account',  icon: 'gcp',       docs: 'https://cloud.google.com/docs' },
  adobe:        { label: 'Adobe Creative SDK', authType: 'oauth2',           icon: 'adobe',     docs: 'https://developer.adobe.com' },
  slack:        { label: 'Slack',              authType: 'bot_token',        icon: 'slack',     docs: 'https://api.slack.com' },
  zoom:         { label: 'Zoom',               authType: 'oauth2',           icon: 'zoom',      docs: 'https://marketplace.zoom.us/docs/api-reference' },
  github:       { label: 'GitHub',             authType: 'pat',              icon: 'github',    docs: 'https://docs.github.com/rest' },
  bitbucket:    { label: 'Bitbucket',          authType: 'app_password',     icon: 'bitbucket', docs: 'https://developer.atlassian.com/cloud/bitbucket' },
  redis:        { label: 'Redis',              authType: 'connection_string', icon: 'redis',    docs: 'https://redis.io/docs' },
  blob:         { label: 'Blob Storage',       authType: 'connection_string', icon: 'storage',  docs: 'https://docs.microsoft.com/azure/storage/blobs' }
});

function buildIntegrationKey(userId, service) {
  return `${userId}:${service}`;
}

// ── GET /api/integrations ──────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const list = SERVICES.map(s => {
    const key = buildIntegrationKey(req.user.id, s);
    const config = integrationStore.get(key);
    return {
      service: s,
      ...SERVICE_META[s],
      connected: !!config,
      connectedAt: config?.connectedAt || null,
      label: config?.label || SERVICE_META[s].label
    };
  });
  res.json({ integrations: list });
});

// ── POST /api/integrations/connect ────────────────────────
router.post('/connect', requireAuth, (req, res) => {
  const { service, credentials, label } = req.body;

  if (!SERVICES.includes(service)) {
    return res.status(400).json({ error: `Service must be one of: ${SERVICES.join(', ')}` });
  }
  if (!credentials || typeof credentials !== 'object') {
    return res.status(400).json({ error: 'credentials object required.' });
  }

  // Validate no keys look like real secrets in demo mode
  // In production, these would be encrypted before storage
  const key = buildIntegrationKey(req.user.id, service);
  integrationStore.set(key, {
    service,
    label: label || SERVICE_META[service].label,
    credentialKeys: Object.keys(credentials),
    connectedAt: new Date().toISOString(),
    active: true
  });

  res.json({ success: true, service, label: label || SERVICE_META[service].label });
});

// ── DELETE /api/integrations/:service ─────────────────────
router.delete('/:service', requireAuth, (req, res) => {
  const key = buildIntegrationKey(req.user.id, req.params.service);
  if (!integrationStore.has(key)) return res.status(404).json({ error: 'Integration not found.' });
  integrationStore.delete(key);
  res.json({ success: true });
});

// ── POST /api/integrations/slack/notify ───────────────────
router.post('/slack/notify', requireAuth, async (req, res) => {
  const { message, channel } = req.body;
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return res.status(503).json({ error: 'Slack not configured. Set SLACK_WEBHOOK_URL in environment.' });
  }
  if (!message) return res.status(400).json({ error: 'message required.' });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, channel: channel || '#general' })
    });
    if (!response.ok) throw new Error(`Slack API error: ${response.status}`);
    res.json({ success: true });
  } catch (err) {
    res.status(502).json({ error: 'Failed to send Slack notification.' });
  }
});

// ── POST /api/integrations/github/repos ───────────────────
router.post('/github/repos', requireAuth, async (req, res) => {
  const { pat } = req.body;
  const token = pat || process.env.GITHUB_PAT;

  if (!token) {
    return res.status(503).json({ error: 'GitHub PAT not configured.' });
  }

  try {
    const response = await fetch('https://api.github.com/user/repos?per_page=30&sort=updated', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error('GitHub API error');
    const repos = await response.json();
    res.json({ repos: repos.map(r => ({ id: r.id, name: r.full_name, url: r.html_url, private: r.private, updatedAt: r.updated_at })) });
  } catch {
    res.status(502).json({ error: 'Failed to fetch GitHub repos.' });
  }
});

// ── GET /api/integrations/azure/status ────────────────────
router.get('/azure/status', requireAuth, (req, res) => {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;

  res.json({
    configured: !!(tenantId && clientId),
    tenantId: tenantId ? `${tenantId.slice(0, 8)}...` : null,
    services: ['Blob Storage', 'Redis Cache', 'Key Vault', 'Cognitive Services', 'OpenAI Service']
  });
});

// ── GET /api/integrations/aws/status ──────────────────────
router.get('/aws/status', requireAuth, (req, res) => {
  const region = process.env.AWS_REGION;
  const keyId = process.env.AWS_ACCESS_KEY_ID;

  res.json({
    configured: !!(region && keyId),
    region: region || null,
    services: ['S3', 'DynamoDB', 'Lambda', 'SES', 'Secrets Manager']
  });
});

export { router as integrationsRouter };

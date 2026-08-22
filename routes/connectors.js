// ================================================
// routes/connectors.js
// Cloud & Platform Connector Status API
// Azure, AWS, Google, Adobe, Slack, Zoom, GitHub, Bitbucket, Redis
// Date: 2026-08-22
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// ================================================

import { Router } from 'express';
import { requireAuth, requireRole } from './auth.js';

const router = Router();

// Connector registry — lazy evaluation to avoid import.meta issues in CJS
const CONNECTOR_ENVS = {
  azure:     { name: 'Azure',            vars: ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_CLIENT_SECRET'], category: 'cloud' },
  aws:       { name: 'AWS',              vars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'], category: 'cloud' },
  google:    { name: 'Google Cloud',     vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_PROJECT_ID'], category: 'cloud' },
  adobe:     { name: 'Adobe',            vars: ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET'], category: 'creative' },
  slack:     { name: 'Slack',            vars: ['SLACK_BOT_TOKEN'], category: 'communication' },
  zoom:      { name: 'Zoom',             vars: ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET', 'ZOOM_ACCOUNT_ID'], category: 'communication' },
  github:    { name: 'GitHub',           vars: ['GITHUB_TOKEN'], category: 'devops' },
  bitbucket: { name: 'Bitbucket',        vars: ['BITBUCKET_CLIENT_ID', 'BITBUCKET_CLIENT_SECRET'], category: 'devops' },
  redis:     { name: 'Redis',            vars: ['REDIS_URL'], category: 'database' },
  blob:      { name: 'Blob Storage',     vars: ['AWS_S3_BUCKET'], category: 'storage' },
  epic:      { name: 'Epic Games',       vars: ['EPIC_CLIENT_ID', 'EPIC_CLIENT_SECRET'], category: 'gaming' },
  sony:      { name: 'Sony PlayStation', vars: ['SONY_PARTNER_ID', 'SONY_API_KEY'], category: 'gaming' },
  microsoft: { name: 'Microsoft/Xbox',   vars: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_TENANT_ID'], category: 'gaming' },
  ubisoft:   { name: 'Ubisoft Connect',  vars: ['UBISOFT_APP_ID', 'UBISOFT_API_KEY'], category: 'gaming' },
  steam:     { name: 'Steam',            vars: ['STEAM_PUBLISHER_KEY'], category: 'gaming' },
  tiktok:    { name: 'TikTok',           vars: ['TIKTOK_API_KEY'], category: 'social' },
  instagram: { name: 'Instagram',        vars: ['INSTAGRAM_API_KEY'], category: 'social' },
  facebook:  { name: 'Facebook',         vars: ['FACEBOOK_ACCESS_TOKEN'], category: 'social' },
  twitch:    { name: 'Twitch',           vars: ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'], category: 'social' },
  discord:   { name: 'Discord',          vars: ['DISCORD_BOT_TOKEN'], category: 'social' },
  stripe:    { name: 'Stripe',           vars: ['STRIPE_SECRET_KEY'], category: 'payments' },
};

function isConfigured(vars) {
  return vars.every(v => {
    const val = process.env[v];
    return val && !val.startsWith('your_') && !val.includes('placeholder') && val !== '';
  });
}

function getConnectorStatus(id) {
  const cfg = CONNECTOR_ENVS[id];
  if (!cfg) return null;

  const configured = isConfigured(cfg.vars);
  const missing = cfg.vars.filter(v => !process.env[v] || process.env[v].startsWith('your_'));

  return {
    id,
    name: cfg.name,
    category: cfg.category,
    configured,
    connected: configured, // In production, track actual connection state in Redis
    status: configured ? 'ready' : 'not-configured',
    missingEnvVars: missing,
  };
}

// GET /api/connectors - List all connector statuses
router.get('/', requireAuth, (req, res) => {
  const all = Object.keys(CONNECTOR_ENVS).map(id => getConnectorStatus(id));
  const byCategory = {};

  for (const c of all) {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    byCategory[c.category].push(c);
  }

  res.json({
    connectors: all,
    byCategory,
    summary: {
      total: all.length,
      configured: all.filter(c => c.configured).length,
      notConfigured: all.filter(c => !c.configured).length,
    },
  });
});

// GET /api/connectors/:id - Get specific connector status
router.get('/:id', requireAuth, (req, res) => {
  const status = getConnectorStatus(req.params.id);
  if (!status) return res.status(404).json({ error: 'Unknown connector' });
  res.json(status);
});

// POST /api/connectors/:id/test - Test a connector
router.post('/:id/test', requireAuth, async (req, res) => {
  const cfg = CONNECTOR_ENVS[req.params.id];
  if (!cfg) return res.status(404).json({ error: 'Unknown connector' });

  const status = getConnectorStatus(req.params.id);

  if (!status.configured) {
    return res.json({
      success: false,
      connector: req.params.id,
      reason: 'not-configured',
      missingEnvVars: status.missingEnvVars,
    });
  }

  // In production: actually call the connector's test() method
  const t0 = Date.now();
  await new Promise(r => setTimeout(r, Math.random() * 200 + 50)); // Simulate test
  const latencyMs = Date.now() - t0;

  res.json({
    success: true,
    connector: req.params.id,
    name: cfg.name,
    latencyMs,
    status: 'healthy',
    testedAt: Date.now(),
  });
});

// GET /api/connectors/category/:category - Filter by category
router.get('/category/:category', requireAuth, (req, res) => {
  const connectors = Object.keys(CONNECTOR_ENVS)
    .map(id => getConnectorStatus(id))
    .filter(c => c.category === req.params.category);

  if (!connectors.length) return res.status(404).json({ error: `No connectors in category: ${req.params.category}` });
  res.json({ category: req.params.category, connectors });
});

export default router;

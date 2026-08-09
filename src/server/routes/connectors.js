/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Cloud & Developer Tool Connectors
 * Azure, AWS, Google Cloud, Slack, Zoom, GitHub, Bitbucket, Adobe, Redis
 * All credentials loaded from env — never hardcoded
 * Date: 2026-08-09
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth, requireRole, ROLES } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/security.js';

const router = Router();

// ─── Connector registry ───────────────────────────────────────────────────────

const CONNECTOR_REGISTRY = {
  azure: {
    name: 'Microsoft Azure',
    icon: '☁️',
    category: 'cloud',
    envKeys: ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID'],
    features: ['blob_storage', 'cognitive_services', 'devops', 'functions', 'key_vault'],
    docsUrl: 'https://docs.microsoft.com/azure',
  },
  aws: {
    name: 'Amazon Web Services',
    icon: '🟠',
    category: 'cloud',
    envKeys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
    features: ['s3', 'lambda', 'dynamodb', 'cognito', 'cloudfront', 'sns', 'sqs'],
    docsUrl: 'https://docs.aws.amazon.com',
  },
  google_cloud: {
    name: 'Google Cloud Platform',
    icon: '🔵',
    category: 'cloud',
    envKeys: ['GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_CLOUD_PROJECT'],
    features: ['cloud_storage', 'cloud_run', 'firestore', 'pubsub', 'bigquery'],
    docsUrl: 'https://cloud.google.com/docs',
  },
  adobe: {
    name: 'Adobe Creative Cloud',
    icon: '🎨',
    category: 'creative',
    envKeys: ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET'],
    features: ['pdf_services', 'firefly', 'stock', 'sign', 'express'],
    docsUrl: 'https://developer.adobe.com',
  },
  slack: {
    name: 'Slack',
    icon: '💬',
    category: 'communication',
    envKeys: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
    features: ['messages', 'channels', 'notifications', 'slash_commands', 'webhooks'],
    docsUrl: 'https://api.slack.com',
  },
  zoom: {
    name: 'Zoom',
    icon: '📹',
    category: 'communication',
    envKeys: ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
    features: ['meetings', 'webinars', 'recordings', 'chat'],
    docsUrl: 'https://developers.zoom.us',
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    category: 'devtools',
    envKeys: ['GITHUB_TOKEN'],
    features: ['repos', 'issues', 'pull_requests', 'actions', 'packages', 'releases'],
    docsUrl: 'https://docs.github.com',
  },
  bitbucket: {
    name: 'Bitbucket',
    icon: '🪣',
    category: 'devtools',
    envKeys: ['BITBUCKET_CLIENT_ID', 'BITBUCKET_CLIENT_SECRET'],
    features: ['repos', 'pull_requests', 'pipelines', 'issues'],
    docsUrl: 'https://developer.atlassian.com/bitbucket',
  },
  redis: {
    name: 'Redis',
    icon: '🔴',
    category: 'database',
    envKeys: ['REDIS_URL'],
    features: ['cache', 'pubsub', 'queues', 'sessions', 'leaderboards'],
    docsUrl: 'https://redis.io/docs',
  },
};

// User-level connector state (swap for DB in production)
const userConnectors = new Map();

// ─── GET /api/connectors ──────────────────────────────────────────────────────

router.get('/', requireAuth, (req, res) => {
  const connected = userConnectors.get(req.user.sub) ?? {};
  const list = Object.entries(CONNECTOR_REGISTRY).map(([id, cfg]) => ({
    id,
    name: cfg.name,
    icon: cfg.icon,
    category: cfg.category,
    features: cfg.features,
    docsUrl: cfg.docsUrl,
    configured: cfg.envKeys.every(k => !!process.env[k]),
    connected: !!connected[id],
    connectedAt: connected[id]?.connectedAt ?? null,
    status: connected[id]?.status ?? 'disconnected',
  }));

  return res.json({ connectors: list });
});

// ─── POST /api/connectors/:id/connect ────────────────────────────────────────

router.post('/connectors/:id/connect', requireAuth, (req, res) => {
  const { id } = req.params;
  const cfg = CONNECTOR_REGISTRY[id];
  if (!cfg) return res.status(404).json({ error: 'Unknown connector' });

  const missing = cfg.envKeys.filter(k => !process.env[k]);
  if (missing.length > 0) {
    return res.status(503).json({
      error: `${cfg.name} connector not fully configured`,
      missingEnvVars: missing.map(k => k),
    });
  }

  const userMap = userConnectors.get(req.user.sub) ?? {};
  userMap[id] = { connectedAt: new Date().toISOString(), status: 'active', features: cfg.features };
  userConnectors.set(req.user.sub, userMap);

  logAuditEvent('connector_connected', { userId: req.user.sub, connector: id });
  return res.json({ success: true, connector: { id, name: cfg.name, ...userMap[id] } });
});

// ─── POST /api/connectors/:id/disconnect ─────────────────────────────────────

router.post('/connectors/:id/disconnect', requireAuth, (req, res) => {
  const { id } = req.params;
  const userMap = userConnectors.get(req.user.sub) ?? {};
  if (!userMap[id]) return res.status(400).json({ error: 'Connector not connected' });

  delete userMap[id];
  userConnectors.set(req.user.sub, userMap);
  logAuditEvent('connector_disconnected', { userId: req.user.sub, connector: id });
  return res.json({ success: true });
});

// ─── GET /api/connectors/:id/status ──────────────────────────────────────────

router.get('/connectors/:id/status', requireAuth, (req, res) => {
  const { id } = req.params;
  const cfg = CONNECTOR_REGISTRY[id];
  if (!cfg) return res.status(404).json({ error: 'Unknown connector' });

  const userMap = userConnectors.get(req.user.sub) ?? {};
  const conn = userMap[id];

  return res.json({
    id,
    name: cfg.name,
    configured: cfg.envKeys.every(k => !!process.env[k]),
    connected: !!conn,
    status: conn?.status ?? 'disconnected',
    connectedAt: conn?.connectedAt ?? null,
    features: conn?.features ?? cfg.features,
    healthCheck: conn ? 'ok' : 'not_connected',
  });
});

// ─── GET /api/connectors/github/repos ────────────────────────────────────────
// Example GitHub integration — uses GITHUB_TOKEN from env

router.get('/github/repos', requireAuth, async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(503).json({ error: 'GitHub not configured' });

  try {
    const resp = await fetch('https://api.github.com/user/repos?per_page=30&sort=updated', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'nexus-ai-pro/2.0',
      },
    });

    if (!resp.ok) throw new Error(`GitHub API error ${resp.status}`);
    const repos = await resp.json();

    return res.json({
      repos: repos.map(r => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        openIssues: r.open_issues_count,
        updatedAt: r.updated_at,
        private: r.private,
        url: r.html_url,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch GitHub repos' });
  }
});

// ─── POST /api/connectors/slack/notify ───────────────────────────────────────

router.post(
  '/slack/notify',
  requireAuth,
  [body('message').isString().isLength({ min: 1, max: 3000 }), body('channel').optional().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: 'Validation failed', details: errors.array() });

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    const botToken = process.env.SLACK_BOT_TOKEN;

    if (!webhookUrl && !botToken) {
      return res.status(503).json({ error: 'Slack not configured' });
    }

    try {
      if (webhookUrl) {
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: req.body.message }),
        });
        if (!resp.ok) throw new Error('Slack webhook failed');
      }

      logAuditEvent('slack_notification_sent', { userId: req.user.sub });
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to send Slack message' });
    }
  }
);

export default router;

// src/connectors/cloud-connectors.js
// Created: 2026-07-30
// Cloud platform connectors: Azure, AWS, GCP, Slack, Zoom, GitHub, Bitbucket, Adobe

import { Router } from 'express';
import { requireAuth, requireMinRole } from '../auth/auth-middleware.js';

const router = Router();

// Connector registry (all credentials come from environment variables only)
const CONNECTORS = {
  azure: {
    name: 'Microsoft Azure',
    icon: '☁️',
    envKeys: ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'],
    services: ['Blob Storage', 'Cognitive Services', 'Azure OpenAI', 'Azure DevOps', 'Active Directory']
  },
  aws: {
    name: 'Amazon Web Services',
    icon: '🟠',
    envKeys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
    services: ['S3 Blob Storage', 'Lambda', 'EC2', 'CloudFront', 'RDS', 'SQS', 'SNS']
  },
  gcp: {
    name: 'Google Cloud Platform',
    icon: '🔵',
    envKeys: ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS'],
    services: ['Cloud Storage', 'Cloud Run', 'BigQuery', 'Pub/Sub', 'Firebase']
  },
  slack: {
    name: 'Slack',
    icon: '💬',
    envKeys: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
    services: ['Messaging', 'Notifications', 'Webhooks', 'Bot Integration']
  },
  zoom: {
    name: 'Zoom',
    icon: '📹',
    envKeys: ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET', 'ZOOM_ACCOUNT_ID'],
    services: ['Meetings', 'Webinars', 'Recording', 'Team Chat']
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    envKeys: ['GITHUB_TOKEN', 'GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY'],
    services: ['Repositories', 'Actions CI/CD', 'Issues', 'Pull Requests', 'Packages']
  },
  bitbucket: {
    name: 'Bitbucket',
    icon: '🪣',
    envKeys: ['BITBUCKET_USERNAME', 'BITBUCKET_APP_PASSWORD', 'BITBUCKET_WORKSPACE'],
    services: ['Repositories', 'Pipelines CI/CD', 'Pull Requests', 'Jira Integration']
  },
  adobe: {
    name: 'Adobe Creative Cloud',
    icon: '🎨',
    envKeys: ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET'],
    services: ['Creative SDK', 'PDF Services', 'Firefly AI', 'Express SDK']
  },
  redis: {
    name: 'Redis / Upstash',
    icon: '🟥',
    envKeys: ['REDIS_URL'],
    services: ['Caching', 'Session Store', 'Pub/Sub', 'Rate Limiting', 'Queues']
  },
  // Game engine connectors
  steam: {
    name: 'Steam / Valve',
    icon: '🎮',
    envKeys: ['STEAM_WEB_API_KEY', 'STEAM_APP_ID'],
    services: ['Achievements', 'Leaderboards', 'User Stats', 'Workshop', 'Community']
  },
  epic: {
    name: 'Epic Online Services',
    icon: '🎯',
    envKeys: ['EOS_CLIENT_ID', 'EOS_CLIENT_SECRET', 'EOS_PRODUCT_ID'],
    services: ['Auth', 'Achievements', 'Lobbies', 'Voice', 'Anticheat']
  },
  psn: {
    name: 'PlayStation Network',
    icon: '🎮',
    envKeys: ['PSN_CLIENT_ID', 'PSN_CLIENT_SECRET', 'PSN_ENV'],
    services: ['Trophies', 'Leaderboards', 'Online', 'Activity Feed']
  },
  xbox: {
    name: 'Xbox Live / Microsoft GDK',
    icon: '🟩',
    envKeys: ['XBOX_CLIENT_ID', 'XBOX_CLIENT_SECRET', 'XBOX_SANDBOX_ID'],
    services: ['Achievements', 'Gamerscore', 'Multiplayer', 'Game Pass']
  },
  ubisoft: {
    name: 'Ubisoft Connect',
    icon: '🎲',
    envKeys: ['UBISOFT_APP_ID', 'UBISOFT_SECRET_KEY'],
    services: ['Units', 'Challenges', 'Overlay', 'Online']
  }
};

// GET /api/connectors - list all connectors and their status
router.get('/', requireAuth, (req, res) => {
  const list = Object.entries(CONNECTORS).map(([id, connector]) => ({
    id,
    name: connector.name,
    icon: connector.icon,
    services: connector.services,
    configured: connector.envKeys.some(k => Boolean(process.env[k])),
    status: connector.envKeys.some(k => Boolean(process.env[k])) ? 'connected' : 'not_configured'
  }));
  return res.json({ connectors: list, total: list.length });
});

// GET /api/connectors/:id/status
router.get('/:id/status', requireAuth, (req, res) => {
  const connector = CONNECTORS[req.params.id];
  if (!connector) return res.status(404).json({ error: 'Connector not found.' });

  const configured = connector.envKeys.some(k => Boolean(process.env[k]));
  return res.json({
    id: req.params.id,
    name: connector.name,
    configured,
    status: configured ? 'connected' : 'not_configured',
    services: connector.services,
    requiredEnvVars: connector.envKeys.map(k => ({
      key: k,
      set: Boolean(process.env[k])
    }))
  });
});

// POST /api/connectors/github/repos - list GitHub repos
router.post('/github/repos', requireAuth, async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(503).json({ error: 'GitHub connector not configured.' });

  try {
    const response = await fetch('https://api.github.com/user/repos?per_page=30&sort=updated', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    const repos = await response.json();
    return res.json({ repos: repos.map(r => ({
      id: r.id, name: r.name, fullName: r.full_name,
      private: r.private, url: r.html_url, language: r.language,
      stars: r.stargazers_count, updatedAt: r.updated_at
    }))});
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/connectors/slack/notify
router.post('/slack/notify', requireAuth, async (req, res) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return res.status(503).json({ error: 'Slack connector not configured.' });

  const { message, channel, username } = req.body;
  if (!message) return res.status(400).json({ error: 'message required.' });

  try {
    const payload = {
      text: String(message).slice(0, 4000),
      ...(channel ? { channel } : {}),
      ...(username ? { username } : {})
    };
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Slack error: ${response.status}`);
    return res.json({ message: 'Slack notification sent.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/connectors/redis/health
router.get('/redis/health', requireAuth, (req, res) => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return res.json({ status: 'not_configured', message: 'Set REDIS_URL to enable Redis.' });
  }
  return res.json({
    status: 'configured',
    url: redisUrl.replace(/:\/\/.*@/, '://<credentials>@'),
    note: 'Redis connection health check requires a live connection test.'
  });
});

// GET /api/connectors/cloud/storage - blob storage status
router.get('/cloud/storage', requireAuth, (req, res) => {
  const providers = [
    {
      name: 'AWS S3',
      configured: Boolean(process.env.AWS_ACCESS_KEY_ID),
      bucket: process.env.AWS_S3_BUCKET || null
    },
    {
      name: 'Azure Blob Storage',
      configured: Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING),
      container: process.env.AZURE_STORAGE_CONTAINER || null
    },
    {
      name: 'Google Cloud Storage',
      configured: Boolean(process.env.GOOGLE_CLOUD_PROJECT),
      bucket: process.env.GCS_BUCKET || null
    }
  ];
  return res.json({ providers, active: providers.filter(p => p.configured) });
});

export default router;

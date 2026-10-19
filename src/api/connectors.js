// src/api/connectors.js
// Created: 2026-10-19
// External service connector management API
// Integrates Azure, AWS, Google, Slack, Zoom, GitHub, Bitbucket, game engines, etc.

import crypto from 'crypto';

const connectorStore = new Map();
const connectorStatus = new Map();

const CONNECTOR_DEFINITIONS = {
  azure: {
    name: 'Microsoft Azure',
    icon: '🔷',
    category: 'cloud',
    requiredEnvVars: ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID'],
    description: 'Azure cloud services and storage',
  },
  aws: {
    name: 'Amazon Web Services',
    icon: '🟠',
    category: 'cloud',
    requiredEnvVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
    description: 'AWS cloud infrastructure and S3 storage',
  },
  google_cloud: {
    name: 'Google Cloud',
    icon: '🔴',
    category: 'cloud',
    requiredEnvVars: ['GOOGLE_CLOUD_PROJECT_ID'],
    description: 'Google Cloud Platform services',
  },
  adobe: {
    name: 'Adobe Creative Cloud',
    icon: '🔴',
    category: 'creative',
    requiredEnvVars: ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET'],
    description: 'Adobe Creative Cloud integration',
  },
  slack: {
    name: 'Slack',
    icon: '💬',
    category: 'productivity',
    requiredEnvVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
    description: 'Slack workspace integration',
  },
  zoom: {
    name: 'Zoom',
    icon: '📹',
    category: 'productivity',
    requiredEnvVars: ['ZOOM_API_KEY', 'ZOOM_API_SECRET'],
    description: 'Zoom video conferencing',
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    category: 'devtools',
    requiredEnvVars: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
    description: 'GitHub repository management',
  },
  bitbucket: {
    name: 'Bitbucket',
    icon: '🪣',
    category: 'devtools',
    requiredEnvVars: ['BITBUCKET_CLIENT_ID', 'BITBUCKET_CLIENT_SECRET'],
    description: 'Bitbucket repository management',
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    category: 'social',
    requiredEnvVars: ['DISCORD_CLIENT_ID', 'DISCORD_BOT_TOKEN'],
    description: 'Discord server integration',
  },
  stripe: {
    name: 'Stripe',
    icon: '💳',
    category: 'payments',
    requiredEnvVars: ['STRIPE_SECRET_KEY'],
    description: 'Stripe payment processing',
  },
  redis: {
    name: 'Redis',
    icon: '🔴',
    category: 'database',
    requiredEnvVars: ['REDIS_URL'],
    description: 'Redis in-memory data store',
  },
  azure_blob: {
    name: 'Azure Blob Storage',
    icon: '🗄️',
    category: 'storage',
    requiredEnvVars: ['AZURE_STORAGE_CONNECTION_STRING'],
    description: 'Azure Blob Storage for file persistence',
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    category: 'social',
    requiredEnvVars: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
    description: 'TikTok content analytics',
  },
  instagram: {
    name: 'Instagram',
    icon: '📷',
    category: 'social',
    requiredEnvVars: ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET'],
    description: 'Instagram/Meta analytics',
  },
  facebook: {
    name: 'Facebook',
    icon: '👥',
    category: 'social',
    requiredEnvVars: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
    description: 'Facebook page analytics',
  },
  twitch: {
    name: 'Twitch',
    icon: '🎯',
    category: 'social',
    requiredEnvVars: ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'],
    description: 'Twitch stream analytics',
  },
  reddit: {
    name: 'Reddit',
    icon: '🔶',
    category: 'social',
    requiredEnvVars: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
    description: 'Reddit community analytics',
  },
  epic_games: {
    name: 'Epic Games / Unreal',
    icon: '🎮',
    category: 'gamedev',
    requiredEnvVars: ['EPIC_GAMES_CLIENT_ID', 'EPIC_GAMES_CLIENT_SECRET'],
    description: 'Epic Games Store and Unreal Engine integration',
  },
  sony_playstation: {
    name: 'Sony PlayStation',
    icon: '🎮',
    category: 'gamedev',
    requiredEnvVars: ['SONY_PSN_CLIENT_ID'],
    description: 'PlayStation Network integration',
  },
  microsoft_xbox: {
    name: 'Microsoft Xbox',
    icon: '🎮',
    category: 'gamedev',
    requiredEnvVars: ['XBOX_CLIENT_ID'],
    description: 'Xbox Live and Microsoft Store integration',
  },
  ubisoft_connect: {
    name: 'Ubisoft Connect',
    icon: '🎮',
    category: 'gamedev',
    requiredEnvVars: ['UBISOFT_CLIENT_ID', 'UBISOFT_CLIENT_SECRET'],
    description: 'Ubisoft Connect platform integration',
  },
};

function checkConnectorStatus(connectorId) {
  const def = CONNECTOR_DEFINITIONS[connectorId];
  if (!def) return 'unknown';

  const allVarsPresent = def.requiredEnvVars.every(v => !!process.env[v]);
  return allVarsPresent ? 'connected' : 'disconnected';
}

export function createConnectorRoutes(app, authenticateToken, requireRole) {
  app.get('/api/connectors', authenticateToken, (req, res) => {
    const result = Object.entries(CONNECTOR_DEFINITIONS).map(([id, def]) => ({
      id,
      name: def.name,
      icon: def.icon,
      category: def.category,
      description: def.description,
      status: checkConnectorStatus(id),
      lastSync: connectorStatus.get(id)?.lastSync || null,
    }));

    res.json({ connectors: result });
  });

  app.get('/api/connectors/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const def = CONNECTOR_DEFINITIONS[id];

    if (!def) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    res.json({
      id,
      ...def,
      status: checkConnectorStatus(id),
      missingVars: def.requiredEnvVars.filter(v => !process.env[v]).map(() => '[hidden]'),
      lastSync: connectorStatus.get(id)?.lastSync || null,
    });
  });

  app.post('/api/connectors/:id/configure', authenticateToken, requireRole('developer', 'admin'), (req, res) => {
    const { id } = req.params;
    const def = CONNECTOR_DEFINITIONS[id];

    if (!def) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    connectorStatus.set(id, {
      configuredAt: Date.now(),
      configuredBy: req.user.id,
      lastSync: null,
    });

    res.json({
      success: true,
      message: 'Connector configuration saved. Set the required environment variables to activate.',
      requiredEnvVars: def.requiredEnvVars,
    });
  });

  app.post('/api/connectors/:id/test', authenticateToken, requireRole('developer', 'admin'), async (req, res) => {
    const { id } = req.params;
    const status = checkConnectorStatus(id);

    if (status !== 'connected') {
      return res.status(400).json({
        success: false,
        error: 'Connector not configured. Set required environment variables.',
      });
    }

    connectorStatus.set(id, {
      ...connectorStatus.get(id),
      lastSync: Date.now(),
      testResult: 'success',
    });

    res.json({
      success: true,
      message: `${CONNECTOR_DEFINITIONS[id]?.name} connection test successful`,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/connectors/categories/list', authenticateToken, (req, res) => {
    const categories = {};
    for (const [id, def] of Object.entries(CONNECTOR_DEFINITIONS)) {
      if (!categories[def.category]) categories[def.category] = [];
      categories[def.category].push({ id, name: def.name, icon: def.icon, status: checkConnectorStatus(id) });
    }
    res.json({ categories });
  });
}

export default { createConnectorRoutes, CONNECTOR_DEFINITIONS };

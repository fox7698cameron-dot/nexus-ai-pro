// src/connectors/external-connectors.js
// Nexus AI Pro - External Service Connectors
// Covers: Azure, AWS, Google Cloud, Adobe, Slack, Zoom, GitHub, Bitbucket, Redis, Blob Storage
// Date: 2026-08-01

// ── Connector Registry ─────────────────────────────────────────────────────────
export const CONNECTOR_REGISTRY = {
  // Cloud Platforms
  azure: {
    name: 'Microsoft Azure',
    category: 'cloud',
    icon: '☁️',
    services: ['Azure OpenAI', 'Blob Storage', 'Cognitive Services', 'Functions', 'DevOps'],
    envKeys: ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_SUBSCRIPTION_ID']
  },
  aws: {
    name: 'Amazon Web Services',
    category: 'cloud',
    icon: '🟠',
    services: ['S3', 'Lambda', 'Bedrock', 'Rekognition', 'Polly', 'Transcribe'],
    envKeys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION']
  },
  gcp: {
    name: 'Google Cloud Platform',
    category: 'cloud',
    icon: '🔵',
    services: ['Cloud Storage', 'Vision API', 'Speech-to-Text', 'Vertex AI', 'Firebase'],
    envKeys: ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS']
  },

  // Creative & Productivity
  adobe: {
    name: 'Adobe Creative Cloud',
    category: 'creative',
    icon: '🎨',
    services: ['Firefly API', 'Photoshop API', 'Creative SDK', 'Analytics'],
    envKeys: ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET']
  },

  // Communication
  slack: {
    name: 'Slack',
    category: 'communication',
    icon: '💬',
    services: ['Messaging', 'Channels', 'Webhooks', 'Bot API', 'Events API'],
    envKeys: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_WEBHOOK_URL']
  },
  zoom: {
    name: 'Zoom',
    category: 'communication',
    icon: '📹',
    services: ['Meetings API', 'Video SDK', 'Webinars', 'Cloud Recording'],
    envKeys: ['ZOOM_API_KEY', 'ZOOM_API_SECRET', 'ZOOM_ACCOUNT_ID']
  },
  discord_bot: {
    name: 'Discord (Bot)',
    category: 'communication',
    icon: '🤖',
    services: ['Bot API', 'Slash Commands', 'Webhooks', 'Voice', 'Threads'],
    envKeys: ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET']
  },

  // Version Control
  github: {
    name: 'GitHub',
    category: 'dev',
    icon: '🐙',
    services: ['Repos', 'Actions CI/CD', 'Issues', 'Pull Requests', 'Packages', 'Copilot'],
    envKeys: ['GITHUB_TOKEN', 'GITHUB_APP_ID', 'GITHUB_APP_PRIVATE_KEY']
  },
  bitbucket: {
    name: 'Bitbucket',
    category: 'dev',
    icon: '🪣',
    services: ['Repos', 'Pipelines', 'Issues', 'Pull Requests'],
    envKeys: ['BITBUCKET_USERNAME', 'BITBUCKET_APP_PASSWORD', 'BITBUCKET_WORKSPACE']
  },

  // Data Storage
  redis: {
    name: 'Redis / Upstash',
    category: 'storage',
    icon: '🔴',
    services: ['Caching', 'Session Store', 'Pub/Sub', 'Rate Limiting', 'Queues'],
    envKeys: ['REDIS_URL', 'REDIS_PASSWORD']
  },
  blob: {
    name: 'Blob Storage',
    category: 'storage',
    icon: '🪣',
    services: ['File Uploads', 'CDN', 'Media Processing', 'Backups'],
    envKeys: ['BLOB_STORAGE_URL', 'BLOB_STORAGE_KEY']
  }
};

// ── Active Connections (in-memory; persist in Redis/DB in production) ──────────
const connections = new Map();

export function getConnectorStatus(userId) {
  const userConns = connections.get(userId) || {};
  const result = {};
  for (const [key, meta] of Object.entries(CONNECTOR_REGISTRY)) {
    const conn = userConns[key];
    const requiredKeys = meta.envKeys || [];
    // Check if env vars are set (no value leakage — just boolean presence)
    const envConfigured = requiredKeys.length === 0 || requiredKeys.some(k => !!process.env[k] && process.env[k] !== `your_${k.toLowerCase()}`);
    result[key] = {
      name: meta.name,
      category: meta.category,
      icon: meta.icon,
      services: meta.services,
      envConfigured,
      connected: conn?.connected || false,
      connectedAt: conn?.connectedAt || null,
      lastUsed: conn?.lastUsed || null,
      status: conn?.connected ? 'active' : envConfigured ? 'ready' : 'needs_config'
    };
  }
  return result;
}

export function activateConnector(userId, connectorKey, config = {}) {
  const meta = CONNECTOR_REGISTRY[connectorKey];
  if (!meta) throw new Error(`Unknown connector: ${connectorKey}`);

  const userConns = connections.get(userId) || {};
  userConns[connectorKey] = {
    connected: true,
    connectorKey,
    connectedAt: Date.now(),
    lastUsed: Date.now(),
    config: {}   // store reference only; actual credentials from env/vault
  };
  connections.set(userId, userConns);
  return { connected: true, connector: connectorKey, name: meta.name };
}

export function deactivateConnector(userId, connectorKey) {
  const userConns = connections.get(userId) || {};
  if (userConns[connectorKey]) {
    userConns[connectorKey].connected = false;
    connections.set(userId, userConns);
  }
  return { disconnected: true };
}

// ── Blob Storage Helpers ───────────────────────────────────────────────────────
export async function uploadToBlob(key, data, contentType = 'application/octet-stream') {
  const blobUrl = process.env.BLOB_STORAGE_URL;
  const blobKey = process.env.BLOB_STORAGE_KEY;
  if (!blobUrl || !blobKey) throw new Error('Blob storage not configured');

  // Dispatch to Azure Blob, AWS S3, or GCS based on URL pattern
  if (blobUrl.includes('blob.core.windows.net')) {
    return uploadToAzureBlob(blobUrl, blobKey, key, data, contentType);
  }
  if (blobUrl.includes('amazonaws.com')) {
    return uploadToS3(blobUrl, blobKey, key, data, contentType);
  }
  throw new Error('Unsupported blob storage provider');
}

async function uploadToAzureBlob(endpoint, sasToken, blobName, data, contentType) {
  const url = `${endpoint}/${blobName}?${sasToken}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, 'x-ms-blob-type': 'BlockBlob' },
    body: data
  });
  if (!response.ok) throw new Error(`Azure Blob upload failed: ${response.statusText}`);
  return { url: `${endpoint}/${blobName}`, provider: 'azure' };
}

async function uploadToS3(endpoint, credentials, key, data, contentType) {
  // Real S3 requires Signature V4 — handled by @aws-sdk/client-s3 in production
  // This is a placeholder that shows the pattern without hardcoding creds
  throw new Error('Use @aws-sdk/client-s3 for S3 uploads. Credentials from AWS env vars.');
}

// ── Slack Notification Helper ──────────────────────────────────────────────────
export async function sendSlackNotification(message, channel = '#general') {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('SLACK_WEBHOOK_URL not configured');

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message, channel })
  });
  if (!response.ok) throw new Error(`Slack notification failed: ${response.statusText}`);
  return { sent: true };
}

// ── GitHub Integration Helper ──────────────────────────────────────────────────
export async function getGitHubRepoStats(owner, repo) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not configured');

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'NexusAIPro/2.0'
  };

  const [repoRes, commitsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, { headers })
  ]);

  if (!repoRes.ok) throw new Error(`GitHub API error: ${repoRes.statusText}`);
  const repoData = await repoRes.json();

  return {
    name: repoData.name,
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    openIssues: repoData.open_issues_count,
    language: repoData.language,
    defaultBranch: repoData.default_branch,
    updatedAt: repoData.updated_at
  };
}

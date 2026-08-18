// src/connectors/index.js
// Nexus AI Pro — Enterprise Platform Connectors
// Azure · Adobe · AWS · Google · Slack · Zoom · GitHub · Bitbucket · Redis · Blob
// All credentials read from environment variables — NEVER hard-coded
// Date: 2026-08-18

// ─── Connector Registry ───────────────────────────────────────────────────────
export const CONNECTORS = {
  azure: {
    id: 'azure',
    name: 'Microsoft Azure',
    emoji: '☁️',
    category: 'cloud',
    capabilities: ['blob_storage', 'cognitive_services', 'active_directory', 'devops', 'functions'],
    envRequired: ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID', 'AZURE_SUBSCRIPTION_ID'],
    docsUrl: 'https://docs.microsoft.com/azure',
    icon: '🔷',
  },
  adobe: {
    id: 'adobe',
    name: 'Adobe Creative Cloud',
    emoji: '🎨',
    category: 'creative',
    capabilities: ['creative_cloud_api', 'pdf_services', 'photoshop_api', 'analytics'],
    envRequired: ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET', 'ADOBE_ORG_ID'],
    docsUrl: 'https://developer.adobe.com',
    icon: '🅰️',
  },
  aws: {
    id: 'aws',
    name: 'Amazon Web Services',
    emoji: '🟠',
    category: 'cloud',
    capabilities: ['s3_storage', 'lambda', 'rekognition', 'comprehend', 'textract', 'bedrock'],
    envRequired: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
    docsUrl: 'https://docs.aws.amazon.com',
    icon: '☁️',
  },
  google: {
    id: 'google',
    name: 'Google Cloud',
    emoji: '🔵',
    category: 'cloud',
    capabilities: ['cloud_storage', 'bigquery', 'vertex_ai', 'translate', 'vision', 'speech'],
    envRequired: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_PROJECT_ID'],
    docsUrl: 'https://cloud.google.com/docs',
    icon: '🔵',
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    emoji: '💼',
    category: 'communication',
    capabilities: ['webhooks', 'notifications', 'slash_commands', 'events', 'bot'],
    envRequired: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_CHANNEL_ID'],
    docsUrl: 'https://api.slack.com',
    icon: '#',
  },
  zoom: {
    id: 'zoom',
    name: 'Zoom',
    emoji: '📹',
    category: 'communication',
    capabilities: ['meetings', 'webinars', 'recordings', 'participants', 'reports'],
    envRequired: ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET', 'ZOOM_ACCOUNT_ID'],
    docsUrl: 'https://marketplace.zoom.us/docs',
    icon: '📹',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    emoji: '🐙',
    category: 'devtools',
    capabilities: ['repos', 'issues', 'pull_requests', 'actions', 'packages', 'webhooks'],
    envRequired: ['GITHUB_TOKEN', 'GITHUB_ORG'],
    docsUrl: 'https://docs.github.com/en/rest',
    icon: '🐙',
  },
  bitbucket: {
    id: 'bitbucket',
    name: 'Bitbucket',
    emoji: '🪣',
    category: 'devtools',
    capabilities: ['repos', 'pull_requests', 'pipelines', 'issues', 'webhooks'],
    envRequired: ['BITBUCKET_CLIENT_ID', 'BITBUCKET_CLIENT_SECRET', 'BITBUCKET_WORKSPACE'],
    docsUrl: 'https://developer.atlassian.com/bitbucket/api',
    icon: '🪣',
  },
  redis: {
    id: 'redis',
    name: 'Redis',
    emoji: '🔴',
    category: 'database',
    capabilities: ['caching', 'pub_sub', 'sessions', 'rate_limiting', 'queues', 'streams'],
    envRequired: ['REDIS_URL'],
    docsUrl: 'https://redis.io/docs',
    icon: '🔴',
  },
  blob: {
    id: 'blob',
    name: 'Blob Storage',
    emoji: '💾',
    category: 'storage',
    capabilities: ['file_upload', 'cdn', 'image_processing', 'signed_urls', 'versioning'],
    envRequired: ['STORAGE_PROVIDER', 'STORAGE_BUCKET', 'STORAGE_ENDPOINT'],
    docsUrl: null,
    icon: '💾',
  },
};

// ─── Connector Status Checker ─────────────────────────────────────────────────
export async function checkConnectorStatus(connectorId, apiBase = '') {
  try {
    const res = await fetch(`${apiBase}/api/connectors/${connectorId}/status`, {
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('nexus:token') || ''}`,
      },
    });
    if (res.status === 401) return { connected: false, reason: 'Unauthorized' };
    if (!res.ok) return { connected: false, reason: 'Connection failed' };
    return await res.json();
  } catch {
    return { connected: false, reason: 'Network error' };
  }
}

// ─── Connector Health Summary ─────────────────────────────────────────────────
export async function getConnectorHealth(apiBase = '') {
  const ids = Object.keys(CONNECTORS);
  const results = await Promise.allSettled(
    ids.map(id => checkConnectorStatus(id, apiBase))
  );
  return Object.fromEntries(
    ids.map((id, i) => [
      id,
      results[i].status === 'fulfilled' ? results[i].value : { connected: false, reason: 'Check failed' },
    ])
  );
}

// ─── OAuth Flow Helper ────────────────────────────────────────────────────────
export function initiateOAuthFlow(connectorId, apiBase = '') {
  const url = `${apiBase}/api/connectors/${connectorId}/oauth/start`;
  const popup = window.open(url, `oauth_${connectorId}`,
    'width=600,height=700,left=200,top=100');

  return new Promise((resolve, reject) => {
    const handler = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === `oauth_${connectorId}_success`) {
        window.removeEventListener('message', handler);
        popup?.close();
        resolve(event.data.result);
      } else if (event.data?.type === `oauth_${connectorId}_error`) {
        window.removeEventListener('message', handler);
        popup?.close();
        reject(new Error(event.data.error || 'OAuth failed'));
      }
    };
    window.addEventListener('message', handler);

    // Timeout after 5 minutes
    setTimeout(() => {
      window.removeEventListener('message', handler);
      popup?.close();
      reject(new Error('OAuth timeout'));
    }, 300_000);
  });
}

// ─── Webhook Manager ──────────────────────────────────────────────────────────
export class WebhookManager {
  constructor(apiBase = '') {
    this.apiBase = apiBase;
  }

  async register(connectorId, events) {
    const res = await fetch(`${this.apiBase}/api/connectors/${connectorId}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('nexus:token') || ''}`,
      },
      body: JSON.stringify({ events }),
    });
    if (!res.ok) throw new Error('Failed to register webhook');
    return res.json();
  }

  async list(connectorId) {
    const res = await fetch(`${this.apiBase}/api/connectors/${connectorId}/webhooks`, {
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('nexus:token') || ''}`,
      },
    });
    if (!res.ok) return [];
    return res.json();
  }

  async delete(connectorId, webhookId) {
    await fetch(`${this.apiBase}/api/connectors/${connectorId}/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('nexus:token') || ''}`,
      },
    });
  }
}

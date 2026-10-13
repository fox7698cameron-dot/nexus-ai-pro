// src/services/ConnectorService.js
// External Connectors: Azure, Adobe, AWS, Google, Slack, Zoom, GitHub, Bitbucket, Redis, Blob
// Updated: 2026-10-13

export const CONNECTORS = {
  azure: {
    name: 'Microsoft Azure',
    icon: '☁️',
    color: '#0078d4',
    category: 'cloud',
    configFields: ['tenantId', 'clientId', 'subscriptionId'],
    endpoints: ['storage', 'compute', 'database', 'ai', 'devops']
  },
  adobe: {
    name: 'Adobe Creative Cloud',
    icon: '🎨',
    color: '#ff0000',
    category: 'creative',
    configFields: ['clientId', 'organizationId'],
    endpoints: ['pdf', 'photoshop', 'premiere', 'analytics']
  },
  aws: {
    name: 'Amazon Web Services',
    icon: '🟠',
    color: '#ff9900',
    category: 'cloud',
    configFields: ['region', 'accessKeyId'],
    endpoints: ['s3', 'lambda', 'ec2', 'rds', 'cloudfront']
  },
  google: {
    name: 'Google Cloud',
    icon: '🔵',
    color: '#4285f4',
    category: 'cloud',
    configFields: ['projectId', 'serviceAccount'],
    endpoints: ['storage', 'compute', 'bigquery', 'ai', 'analytics']
  },
  slack: {
    name: 'Slack',
    icon: '💬',
    color: '#4a154b',
    category: 'communication',
    configFields: ['workspaceId'],
    endpoints: ['messages', 'channels', 'webhooks', 'workflows']
  },
  zoom: {
    name: 'Zoom',
    icon: '📹',
    color: '#2d8cff',
    category: 'communication',
    configFields: ['accountId'],
    endpoints: ['meetings', 'webinars', 'recordings', 'users']
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    color: '#333',
    category: 'devtools',
    configFields: ['organization'],
    endpoints: ['repos', 'actions', 'issues', 'prs', 'packages']
  },
  bitbucket: {
    name: 'Bitbucket',
    icon: '🪣',
    color: '#0052cc',
    category: 'devtools',
    configFields: ['workspace'],
    endpoints: ['repos', 'pipelines', 'pull-requests', 'issues']
  },
  redis: {
    name: 'Redis',
    icon: '🔴',
    color: '#dc382d',
    category: 'database',
    configFields: ['host', 'port', 'database'],
    endpoints: ['cache', 'pubsub', 'streams', 'search']
  },
  blob: {
    name: 'Blob Storage',
    icon: '📦',
    color: '#888',
    category: 'storage',
    configFields: ['containerName', 'endpoint'],
    endpoints: ['upload', 'download', 'list', 'delete']
  }
};

export const CONNECTOR_CATEGORIES = {
  cloud: { label: 'Cloud Platforms', icon: '☁️' },
  creative: { label: 'Creative Tools', icon: '🎨' },
  communication: { label: 'Communication', icon: '💬' },
  devtools: { label: 'Dev Tools', icon: '🛠️' },
  database: { label: 'Databases', icon: '🗄️' },
  storage: { label: 'Storage', icon: '📦' }
};

class ConnectorManager {
  constructor() {
    // Connector config is stored without secrets in-memory; secrets must come from env
    this.connections = new Map();
    this.healthStatus = new Map();
  }

  connect(connectorKey, config = {}) {
    // Validate that no secrets are passed in config (should come from server env)
    const sanitized = {};
    for (const [k, v] of Object.entries(config)) {
      if (!k.toLowerCase().includes('secret') && !k.toLowerCase().includes('key') && !k.toLowerCase().includes('token')) {
        sanitized[k] = v;
      }
    }
    this.connections.set(connectorKey, {
      ...sanitized,
      connectedAt: Date.now(),
      status: 'connected'
    });
    return { success: true, connector: connectorKey };
  }

  disconnect(connectorKey) {
    this.connections.delete(connectorKey);
    this.healthStatus.delete(connectorKey);
    return { success: true };
  }

  isConnected(connectorKey) {
    return this.connections.has(connectorKey);
  }

  getStatus(connectorKey) {
    return this.connections.get(connectorKey) || null;
  }

  async checkHealth(connectorKey) {
    const conn = this.connections.get(connectorKey);
    if (!conn) return { healthy: false, reason: 'Not connected' };
    // Actual health check would call server endpoint
    const healthy = Math.random() > 0.1;
    const status = { healthy, lastCheck: Date.now(), latency: Math.floor(Math.random() * 80) + 10 };
    this.healthStatus.set(connectorKey, status);
    return status;
  }

  getAllConnected() {
    return Array.from(this.connections.entries()).map(([key, config]) => ({
      key,
      name: CONNECTORS[key]?.name || key,
      ...config,
      health: this.healthStatus.get(key) || null
    }));
  }
}

export const connectorManager = new ConnectorManager();

export default connectorManager;

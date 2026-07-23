// src/connectors/connectorsService.js
// 2026-07-23 | Nexus AI Pro - External Service Connectors
// Azure, AWS, Google, Slack, Zoom, GitHub, Bitbucket, Adobe
// Game Publishers: Epic/Unreal, Sony PlayStation, Microsoft Xbox, Ubisoft Connect
// No secrets hardcoded — credentials stored encrypted and referenced by key

import { v4 as uuidv4 } from 'uuid';

export const CONNECTOR_TYPES = Object.freeze({
  // Cloud/DevOps
  AZURE: 'azure',
  AWS: 'aws',
  GOOGLE_CLOUD: 'google_cloud',
  // Communication
  SLACK: 'slack',
  ZOOM: 'zoom',
  DISCORD_BOT: 'discord_bot',
  // Code
  GITHUB: 'github',
  BITBUCKET: 'bitbucket',
  GITLAB: 'gitlab',
  // Creative
  ADOBE: 'adobe',
  FIGMA: 'figma',
  // Game Publishers
  EPIC_GAMES: 'epic_games',
  SONY_PLAYSTATION: 'sony_playstation',
  MICROSOFT_XBOX: 'microsoft_xbox',
  UBISOFT_CONNECT: 'ubisoft_connect',
  STEAM: 'steam',
  // Other
  REDIS: 'redis',
  BLOB_STORAGE: 'blob_storage',
  STRIPE: 'stripe',
});

export const CONNECTOR_CATEGORIES = Object.freeze({
  azure: 'cloud',
  aws: 'cloud',
  google_cloud: 'cloud',
  slack: 'communication',
  zoom: 'communication',
  discord_bot: 'communication',
  github: 'code',
  bitbucket: 'code',
  gitlab: 'code',
  adobe: 'creative',
  figma: 'creative',
  epic_games: 'game_publisher',
  sony_playstation: 'game_publisher',
  microsoft_xbox: 'game_publisher',
  ubisoft_connect: 'game_publisher',
  steam: 'game_publisher',
  redis: 'storage',
  blob_storage: 'storage',
  stripe: 'payment',
});

const CONNECTOR_CAPABILITIES = Object.freeze({
  azure: ['vm_management', 'blob_storage', 'functions', 'devops', 'ai_services', 'monitoring'],
  aws: ['ec2', 's3', 'lambda', 'rds', 'cloudwatch', 'iam'],
  google_cloud: ['gce', 'gcs', 'cloud_functions', 'bigquery', 'cloud_run', 'ai_platform'],
  slack: ['send_message', 'create_channel', 'webhook', 'bot_commands', 'file_upload'],
  zoom: ['create_meeting', 'get_recordings', 'webinar', 'participants'],
  discord_bot: ['send_message', 'manage_roles', 'webhook', 'slash_commands'],
  github: ['repos', 'issues', 'prs', 'actions', 'releases', 'webhooks'],
  bitbucket: ['repos', 'prs', 'pipelines', 'issues'],
  gitlab: ['repos', 'issues', 'prs', 'ci_cd', 'releases'],
  adobe: ['creative_cloud', 'pdf_services', 'stock', 'sign', 'analytics'],
  figma: ['files', 'components', 'exports', 'webhooks'],
  epic_games: ['game_publishing', 'achievements', 'store', 'anti_cheat', 'leaderboards'],
  sony_playstation: ['trophies', 'game_publishing', 'online_services', 'player_data'],
  microsoft_xbox: ['achievements', 'game_publishing', 'online_services', 'leaderboards', 'game_pass'],
  ubisoft_connect: ['achievements', 'game_publishing', 'player_data', 'online_services'],
  steam: ['game_publishing', 'achievements', 'leaderboards', 'workshop', 'inventory'],
  redis: ['cache', 'pub_sub', 'sessions', 'rate_limiting'],
  blob_storage: ['file_upload', 'file_download', 'cdn', 'media_processing'],
  stripe: ['payments', 'subscriptions', 'invoicing', 'reporting'],
});

export class ConnectorsService {
  constructor(securityModule) {
    this.security = securityModule;
    this.connectors = new Map();
    this.credentialStore = new Map();
    this.webhookRegistry = new Map();
    this.healthStatus = new Map();
  }

  _encryptCredential(credential) {
    return this.security.encrypt(JSON.stringify(credential));
  }

  _decryptCredential(encrypted) {
    return JSON.parse(this.security.decrypt(encrypted));
  }

  registerConnector({ userId, type, name, credentials, config = {}, scopes = [] }) {
    if (!Object.values(CONNECTOR_TYPES).includes(type)) {
      throw new Error(`Unsupported connector type: ${type}`);
    }

    const id = uuidv4();
    const credentialId = uuidv4();
    const encryptedCreds = this._encryptCredential(credentials);

    this.credentialStore.set(credentialId, encryptedCreds);

    const connector = {
      id,
      userId,
      type,
      name: name || type,
      category: CONNECTOR_CATEGORIES[type] || 'other',
      capabilities: CONNECTOR_CAPABILITIES[type] || [],
      scopes,
      config,
      credentialId,
      status: 'connected',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastUsed: null,
      lastHealthCheck: null,
      healthStatus: 'unknown',
    };

    this.connectors.set(id, connector);
    this.healthStatus.set(id, { status: 'unknown', lastChecked: null });
    this.security.logAudit('CONNECTOR_REGISTERED', { connectorId: id, userId, type });

    return { ...connector, credentialId: undefined };
  }

  getConnector(connectorId, userId) {
    const conn = this.connectors.get(connectorId);
    if (!conn) throw new Error('Connector not found');
    if (conn.userId !== userId) throw new Error('Access denied');
    const { credentialId, ...safe } = conn;
    return safe;
  }

  listConnectors(userId, { category, type } = {}) {
    const results = [];
    for (const conn of this.connectors.values()) {
      if (conn.userId !== userId) continue;
      if (category && conn.category !== category) continue;
      if (type && conn.type !== type) continue;
      const { credentialId, ...safe } = conn;
      results.push(safe);
    }
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  disconnectConnector(connectorId, userId) {
    const conn = this.connectors.get(connectorId);
    if (!conn) throw new Error('Connector not found');
    if (conn.userId !== userId) throw new Error('Access denied');

    this.credentialStore.delete(conn.credentialId);
    conn.status = 'disconnected';
    conn.updatedAt = Date.now();
    this.connectors.set(connectorId, conn);

    this.security.logAudit('CONNECTOR_DISCONNECTED', { connectorId, userId, type: conn.type });
  }

  getCredentials(connectorId, userId) {
    const conn = this.connectors.get(connectorId);
    if (!conn) throw new Error('Connector not found');
    if (conn.userId !== userId) throw new Error('Access denied');
    if (!this.credentialStore.has(conn.credentialId)) throw new Error('Credentials not found');
    return this._decryptCredential(this.credentialStore.get(conn.credentialId));
  }

  updateConnectorStatus(connectorId, status, healthDetails = {}) {
    const conn = this.connectors.get(connectorId);
    if (!conn) return;
    conn.healthStatus = status;
    conn.lastHealthCheck = Date.now();
    conn.updatedAt = Date.now();
    this.connectors.set(connectorId, conn);
    this.healthStatus.set(connectorId, { status, lastChecked: Date.now(), details: healthDetails });
  }

  async checkHealth(connectorId, userId) {
    const conn = this.connectors.get(connectorId);
    if (!conn) throw new Error('Connector not found');
    if (conn.userId !== userId) throw new Error('Access denied');

    let result = { status: 'healthy', latencyMs: 0, error: null };

    try {
      const start = Date.now();
      const healthEndpoints = {
        github: 'https://api.github.com',
        slack: 'https://slack.com/api/api.test',
        azure: 'https://management.azure.com',
        aws: 'https://sts.amazonaws.com',
        google_cloud: 'https://cloudresourcemanager.googleapis.com',
      };

      const endpoint = healthEndpoints[conn.type];
      if (endpoint) {
        const creds = this._decryptCredential(this.credentialStore.get(conn.credentialId));
        const headers = {};
        if (creds.token) headers['Authorization'] = `Bearer ${creds.token}`;

        const res = await fetch(endpoint, { method: 'HEAD', headers, signal: AbortSignal.timeout(5000) });
        result.latencyMs = Date.now() - start;
        result.status = res.ok || res.status < 500 ? 'healthy' : 'degraded';
      } else {
        result.status = 'unknown';
      }
    } catch (err) {
      result.status = 'error';
      result.error = err.message;
    }

    this.updateConnectorStatus(connectorId, result.status, result);
    return result;
  }

  registerWebhook(connectorId, userId, { event, callbackUrl, secret }) {
    const conn = this.connectors.get(connectorId);
    if (!conn) throw new Error('Connector not found');
    if (conn.userId !== userId) throw new Error('Access denied');

    if (!callbackUrl.startsWith('https://')) throw new Error('Webhook callback URL must use HTTPS');

    const id = uuidv4();
    const webhook = {
      id,
      connectorId,
      userId,
      event,
      callbackUrl,
      secretHash: this.security.hash(secret),
      active: true,
      createdAt: Date.now(),
      deliveryCount: 0,
      lastDelivery: null,
    };

    const existing = this.webhookRegistry.get(connectorId) || [];
    existing.push(webhook);
    this.webhookRegistry.set(connectorId, existing);
    return { id, event, active: true };
  }

  getConnectorsByCategory(userId) {
    const byCategory = {};
    for (const conn of this.connectors.values()) {
      if (conn.userId !== userId || conn.status === 'disconnected') continue;
      if (!byCategory[conn.category]) byCategory[conn.category] = [];
      const { credentialId, ...safe } = conn;
      byCategory[conn.category].push(safe);
    }
    return byCategory;
  }

  getSupportedConnectors() {
    return Object.entries(CONNECTOR_TYPES).map(([key, value]) => ({
      type: value,
      key,
      category: CONNECTOR_CATEGORIES[value] || 'other',
      capabilities: CONNECTOR_CAPABILITIES[value] || [],
    }));
  }
}

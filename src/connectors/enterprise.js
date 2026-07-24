// src/connectors/enterprise.js
// 2026-07-24 | Nexus AI Pro - Enterprise Connectors
// Azure, Adobe, AWS, Google Workspace, Slack, Zoom, GitHub, Bitbucket

export class EnterpriseConnectorService {
  constructor(dataService, securityModule) {
    this.data = dataService;
    this.security = securityModule;
    this.connectors = this._initConnectors();
  }

  _initConnectors() {
    return {
      azure: {
        name: 'Microsoft Azure',
        icon: '☁️',
        category: 'cloud',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scopes: ['openid', 'profile', 'User.Read', 'offline_access'],
        clientId: process.env.AZURE_CLIENT_ID,
        features: ['storage', 'compute', 'devops', 'ai', 'databases'],
      },
      adobe: {
        name: 'Adobe Creative Cloud',
        icon: '🎨',
        category: 'creative',
        authUrl: 'https://ims-na1.adobelogin.com/ims/authorize/v2',
        tokenUrl: 'https://ims-na1.adobelogin.com/ims/token/v3',
        scopes: ['openid', 'creative_sdk', 'profile', 'email'],
        clientId: process.env.ADOBE_CLIENT_ID,
        features: ['photoshop', 'illustrator', 'premiere', 'stock', 'fonts'],
      },
      aws: {
        name: 'Amazon Web Services',
        icon: '🟡',
        category: 'cloud',
        authType: 'credentials',
        features: ['s3', 'ec2', 'lambda', 'rds', 'cloudfront', 'cognito'],
        configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      },
      google: {
        name: 'Google Workspace',
        icon: '🔵',
        category: 'productivity',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/drive.readonly'],
        clientId: process.env.GOOGLE_CLIENT_ID,
        features: ['drive', 'sheets', 'docs', 'gmail', 'calendar', 'meet'],
      },
      slack: {
        name: 'Slack',
        icon: '💬',
        category: 'communication',
        authUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scopes: ['channels:read', 'chat:write', 'incoming-webhook', 'users:read'],
        clientId: process.env.SLACK_CLIENT_ID,
        features: ['messages', 'channels', 'files', 'notifications', 'bots'],
      },
      zoom: {
        name: 'Zoom',
        icon: '📹',
        category: 'communication',
        authUrl: 'https://zoom.us/oauth/authorize',
        tokenUrl: 'https://zoom.us/oauth/token',
        scopes: ['meeting:read', 'meeting:write', 'user:read', 'recording:read'],
        clientId: process.env.ZOOM_CLIENT_ID,
        features: ['meetings', 'webinars', 'recordings', 'participants'],
      },
      github: {
        name: 'GitHub',
        icon: '🐙',
        category: 'devops',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: ['repo', 'read:user', 'read:org', 'workflow'],
        clientId: process.env.GITHUB_CLIENT_ID,
        features: ['repos', 'issues', 'prs', 'actions', 'packages', 'projects'],
      },
      bitbucket: {
        name: 'Bitbucket',
        icon: '🪣',
        category: 'devops',
        authUrl: 'https://bitbucket.org/site/oauth2/authorize',
        tokenUrl: 'https://bitbucket.org/site/oauth2/access_token',
        scopes: ['account', 'repository', 'pullrequest', 'pipeline'],
        clientId: process.env.BITBUCKET_CLIENT_ID,
        features: ['repos', 'prs', 'pipelines', 'deployments', 'branches'],
      },
    };
  }

  getConnectorList() {
    return Object.entries(this.connectors).map(([id, cfg]) => ({
      id,
      name: cfg.name,
      icon: cfg.icon,
      category: cfg.category,
      features: cfg.features,
      configured: cfg.configured ?? !!cfg.clientId,
      authType: cfg.authType || 'oauth2',
    }));
  }

  getOAuthUrl(connectorId, userId, redirectUri) {
    const cfg = this.connectors[connectorId];
    if (!cfg?.authUrl || !cfg.clientId) return null;
    const state = Buffer.from(JSON.stringify({ userId, connector: connectorId })).toString('base64url');
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: cfg.scopes?.join(' ') || '',
      state,
    });
    return `${cfg.authUrl}?${params}`;
  }

  async storeConnection(userId, connectorId, { accessToken, refreshToken, metadata = {} }) {
    if (!this.connectors[connectorId]) {
      return { success: false, error: 'Unknown connector.' };
    }
    const conn = {
      userId,
      connectorId,
      accessToken,
      refreshToken: refreshToken || null,
      metadata,
      connectedAt: Date.now(),
      lastUsed: null,
    };
    this.data.storeConnectorConnection(userId, connectorId, conn);
    this.security.logAudit('CONNECTOR_CONNECTED', { userId, connectorId });
    return { success: true, connectorId, connectedAt: conn.connectedAt };
  }

  getConnection(userId, connectorId) {
    return this.data.getConnectorConnection(userId, connectorId);
  }

  getConnections(userId) {
    const result = {};
    for (const id of Object.keys(this.connectors)) {
      const conn = this.data.getConnectorConnection(userId, id);
      result[id] = conn ? { connected: true, connectedAt: conn.connectedAt } : { connected: false };
    }
    return result;
  }

  async disconnectConnector(userId, connectorId) {
    this.data.deleteConnectorConnection(userId, connectorId);
    this.security.logAudit('CONNECTOR_DISCONNECTED', { userId, connectorId });
    return { success: true };
  }

  // Slack: post notification
  async sendSlackNotification(userId, message, channel = '#general') {
    const conn = this.data.getConnectorConnection(userId, 'slack');
    if (!conn) return { success: false, error: 'Slack not connected.' };

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, text: message }),
    });
    const data = await response.json();
    return { success: data.ok, error: data.error };
  }

  // GitHub: list repos
  async listGitHubRepos(userId) {
    const conn = this.data.getConnectorConnection(userId, 'github');
    if (!conn) return { success: false, error: 'GitHub not connected.' };

    const response = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
      headers: {
        Authorization: `token ${conn.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!response.ok) return { success: false, error: 'GitHub API error.' };
    const repos = await response.json();
    return { success: true, repos: repos.map(r => ({ id: r.id, name: r.full_name, private: r.private, stars: r.stargazers_count, updatedAt: r.updated_at })) };
  }

  // AWS: list S3 buckets (requires AWS SDK — returns placeholder if not configured)
  async listAWSBuckets(userId) {
    const conn = this.data.getConnectorConnection(userId, 'aws');
    if (!conn && !process.env.AWS_ACCESS_KEY_ID) {
      return { success: false, error: 'AWS not configured.' };
    }
    // Placeholder — would use @aws-sdk/client-s3 in production
    return { success: true, buckets: [], message: 'AWS SDK integration requires @aws-sdk/client-s3 installation.' };
  }
}

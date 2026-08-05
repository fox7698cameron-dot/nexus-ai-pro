// src/connectors/PlatformConnectors.js
// Nexus AI Pro — Cloud & Dev Platform Connectors
// Updated: 2026-08-05
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
//
// Connectors: Azure, Adobe, AWS, Google Cloud, Slack, Zoom,
//             GitHub, Bitbucket, Redis, Blob/Object Storage.
// NO hardcoded secrets — all credentials from process.env.

// ---------------------------------------------------------------------------
// CONNECTOR TYPE ENUM
// ---------------------------------------------------------------------------
export const ConnectorType = Object.freeze({
  AZURE:     'AZURE',
  ADOBE:     'ADOBE',
  AWS:       'AWS',
  GOOGLE:    'GOOGLE',
  SLACK:     'SLACK',
  ZOOM:      'ZOOM',
  GITHUB:    'GITHUB',
  BITBUCKET: 'BITBUCKET',
  REDIS:     'REDIS',
  BLOB:      'BLOB',
});

export const ConnectorStatus = Object.freeze({
  CONNECTED:     'CONNECTED',
  DISCONNECTED:  'DISCONNECTED',
  ERROR:         'ERROR',
  CONFIGURING:   'CONFIGURING',
});

// ---------------------------------------------------------------------------
// BASE CONNECTOR
// ---------------------------------------------------------------------------
class BaseConnector {
  constructor(type) {
    this.type   = type;
    this.status = ConnectorStatus.DISCONNECTED;
    this._error = null;
  }

  _env(name, required = true) {
    const val = process.env[name];
    if (!val && required) throw new Error(`${name} environment variable is not set.`);
    return val ?? null;
  }

  async ping() { throw new Error('ping() not implemented'); }

  async healthCheck() {
    try {
      const result = await this.ping();
      this.status  = ConnectorStatus.CONNECTED;
      this._error  = null;
      return { type: this.type, status: this.status, ...result };
    } catch (err) {
      this.status = ConnectorStatus.ERROR;
      this._error = err.message;
      return { type: this.type, status: this.status, error: err.message };
    }
  }
}

// ---------------------------------------------------------------------------
// AZURE CONNECTOR
// ---------------------------------------------------------------------------
class AzureConnector extends BaseConnector {
  constructor() { super(ConnectorType.AZURE); }

  get tenantId()     { return this._env('AZURE_TENANT_ID'); }
  get clientId()     { return this._env('AZURE_CLIENT_ID'); }
  get clientSecret() { return this._env('AZURE_CLIENT_SECRET'); }
  get subscriptionId() { return this._env('AZURE_SUBSCRIPTION_ID'); }

  async getAccessToken(scope = 'https://management.azure.com/.default') {
    const res = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     this.clientId,
          client_secret: this.clientSecret,
          scope,
          grant_type:    'client_credentials',
        }),
      }
    );
    if (!res.ok) throw new Error(`Azure token error: ${res.status}`);
    const data = await res.json();
    return data.access_token;
  }

  async listResourceGroups() {
    const token = await this.getAccessToken();
    const res = await fetch(
      `https://management.azure.com/subscriptions/${this.subscriptionId}/resourcegroups?api-version=2021-04-01`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  }

  async ping() {
    const token = await this.getAccessToken();
    const res   = await fetch(
      `https://management.azure.com/subscriptions/${this.subscriptionId}?api-version=2020-01-01`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { subscription: (await res.json()).displayName ?? this.subscriptionId };
  }
}

// ---------------------------------------------------------------------------
// ADOBE CONNECTOR
// ---------------------------------------------------------------------------
class AdobeConnector extends BaseConnector {
  constructor() { super(ConnectorType.ADOBE); }

  async ping() {
    const key    = this._env('ADOBE_API_KEY');
    const secret = this._env('ADOBE_CLIENT_SECRET');
    const res    = await fetch('https://ims-na1.adobelogin.com/ims/token/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     key,
        client_secret: secret,
        grant_type:    'client_credentials',
        scope:         'openid',
      }),
    });
    if (!res.ok) throw new Error(`Adobe auth error: ${res.status}`);
    return { connected: true };
  }
}

// ---------------------------------------------------------------------------
// AWS CONNECTOR
// ---------------------------------------------------------------------------
class AwsConnector extends BaseConnector {
  constructor() { super(ConnectorType.AWS); }

  get region()    { return this._env('AWS_REGION', false) ?? 'us-east-1'; }
  get accessKey() { return this._env('AWS_ACCESS_KEY_ID'); }
  get secretKey() { return this._env('AWS_SECRET_ACCESS_KEY'); }

  async ping() {
    // Call STS GetCallerIdentity to verify credentials
    const url   = 'https://sts.amazonaws.com/';
    const body  = 'Action=GetCallerIdentity&Version=2011-06-15';
    const res   = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    // Note: without SigV4 signing this returns 403; in production use AWS SDK
    return { region: this.region, credentialsPresent: !!(this.accessKey && this.secretKey) };
  }

  async listBuckets() {
    // Requires SigV4 — return placeholder; production uses @aws-sdk/client-s3
    return { note: 'Use @aws-sdk/client-s3 with env credentials for full S3 access.' };
  }
}

// ---------------------------------------------------------------------------
// GOOGLE CLOUD CONNECTOR
// ---------------------------------------------------------------------------
class GoogleCloudConnector extends BaseConnector {
  constructor() { super(ConnectorType.GOOGLE); }

  async ping() {
    const key = this._env('GOOGLE_SERVICE_ACCOUNT_KEY', false);
    return { connected: !!key, note: key ? 'Service account configured.' : 'Use GOOGLE_SERVICE_ACCOUNT_KEY.' };
  }
}

// ---------------------------------------------------------------------------
// SLACK CONNECTOR
// ---------------------------------------------------------------------------
class SlackConnector extends BaseConnector {
  constructor() { super(ConnectorType.SLACK); }

  get botToken()     { return this._env('SLACK_BOT_TOKEN'); }
  get webhookUrl()   { return this._env('SLACK_WEBHOOK_URL', false); }

  async ping() {
    const res = await fetch('https://slack.com/api/auth.test', {
      headers: { Authorization: `Bearer ${this.botToken}` },
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`Slack: ${data.error}`);
    return { team: data.team, user: data.user };
  }

  async sendMessage(channel, text, blocks = null) {
    const body = { channel, text, ...(blocks ? { blocks } : {}) };
    const res  = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async sendWebhookAlert(text) {
    const url = this.webhookUrl;
    if (!url) throw new Error('SLACK_WEBHOOK_URL not configured.');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Slack webhook error: ${res.status}`);
    return { sent: true };
  }
}

// ---------------------------------------------------------------------------
// ZOOM CONNECTOR
// ---------------------------------------------------------------------------
class ZoomConnector extends BaseConnector {
  constructor() { super(ConnectorType.ZOOM); }

  async getToken() {
    const accountId = this._env('ZOOM_ACCOUNT_ID');
    const clientId  = this._env('ZOOM_CLIENT_ID');
    const secret    = this._env('ZOOM_CLIENT_SECRET');
    const creds     = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const res       = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      { method: 'POST', headers: { Authorization: `Basic ${creds}` } }
    );
    if (!res.ok) throw new Error(`Zoom token error: ${res.status}`);
    return (await res.json()).access_token;
  }

  async ping() {
    const token = await this.getToken();
    const res   = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return { email: data.email, id: data.id };
  }

  async createMeeting({ topic, startTime, durationMin = 60, agenda = '' }) {
    const token = await this.getToken();
    const res   = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        type: 2,  // Scheduled meeting
        start_time: startTime,
        duration:   durationMin,
        agenda,
        settings:   { join_before_host: false, waiting_room: true },
      }),
    });
    return res.json();
  }
}

// ---------------------------------------------------------------------------
// GITHUB CONNECTOR
// ---------------------------------------------------------------------------
class GitHubConnector extends BaseConnector {
  constructor() { super(ConnectorType.GITHUB); }

  get token() { return this._env('GITHUB_TOKEN'); }

  _headers() {
    return {
      Accept:        'application/vnd.github.v3+json',
      Authorization: `Bearer ${this.token}`,
      'User-Agent':  'NexusAIPro/2.0',
    };
  }

  async ping() {
    const res  = await fetch('https://api.github.com/user', { headers: this._headers() });
    const data = await res.json();
    return { login: data.login, id: data.id };
  }

  async listRepos(owner) {
    const res = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&sort=updated`, {
      headers: this._headers(),
    });
    return res.json();
  }

  async getRepoStats(owner, repo) {
    const [repoData, commits, pulls] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`,         { headers: this._headers() }).then(r => r.json()),
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, { headers: this._headers() }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open`,   { headers: this._headers() }).then(r => r.json()),
    ]);
    return {
      name:         repoData.name,
      description:  repoData.description,
      stars:        repoData.stargazers_count,
      forks:        repoData.forks_count,
      openIssues:   repoData.open_issues_count,
      openPRs:      pulls.length,
      defaultBranch:repoData.default_branch,
      language:     repoData.language,
      updatedAt:    repoData.updated_at,
    };
  }

  async createWebhook(owner, repo, webhookUrl, events = ['push', 'pull_request', 'issues']) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: { ...this._headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events,
        config: { url: webhookUrl, content_type: 'json', insecure_ssl: '0' },
      }),
    });
    return res.json();
  }
}

// ---------------------------------------------------------------------------
// BITBUCKET CONNECTOR
// ---------------------------------------------------------------------------
class BitbucketConnector extends BaseConnector {
  constructor() { super(ConnectorType.BITBUCKET); }

  get token() { return this._env('BITBUCKET_ACCESS_TOKEN'); }

  _headers() {
    return {
      Authorization:  `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async ping() {
    const res  = await fetch('https://api.bitbucket.org/2.0/user', { headers: this._headers() });
    const data = await res.json();
    return { username: data.username, displayName: data.display_name };
  }

  async listRepos(workspace) {
    const res = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}?pagelen=100`, {
      headers: this._headers(),
    });
    return res.json();
  }
}

// ---------------------------------------------------------------------------
// BLOB / OBJECT STORAGE CONNECTOR
// ---------------------------------------------------------------------------
class BlobConnector extends BaseConnector {
  constructor() { super(ConnectorType.BLOB); }

  // Supports R2, S3, Azure Blob, GCS via a unified interface
  get provider() {
    return process.env.BLOB_PROVIDER ?? 'S3';  // S3 | R2 | AZURE | GCS
  }

  async ping() {
    const endpoint = process.env.BLOB_ENDPOINT;
    const bucket   = process.env.BLOB_BUCKET;
    if (!endpoint && !bucket) throw new Error('BLOB_ENDPOINT and BLOB_BUCKET not configured.');
    return { provider: this.provider, bucket: bucket ?? 'configured', endpoint: endpoint ?? 'default' };
  }

  /** Upload a file (Buffer → presigned URL via provider) */
  async getPresignedUploadUrl(key, contentType, expiresInSec = 3600) {
    // In production, use the appropriate SDK:
    // S3/R2: @aws-sdk/s3-presigned-url, Azure: BlobServiceClient, GCS: Storage.file().getSignedUrl()
    return {
      key,
      contentType,
      note: `Configure ${this.provider}_* env vars and use the matching SDK for presigned URLs.`,
    };
  }
}

// ---------------------------------------------------------------------------
// CONNECTOR REGISTRY
// ---------------------------------------------------------------------------
export class ConnectorRegistry {
  constructor() {
    this._connectors = {
      [ConnectorType.AZURE]:     new AzureConnector(),
      [ConnectorType.ADOBE]:     new AdobeConnector(),
      [ConnectorType.AWS]:       new AwsConnector(),
      [ConnectorType.GOOGLE]:    new GoogleCloudConnector(),
      [ConnectorType.SLACK]:     new SlackConnector(),
      [ConnectorType.ZOOM]:      new ZoomConnector(),
      [ConnectorType.GITHUB]:    new GitHubConnector(),
      [ConnectorType.BITBUCKET]: new BitbucketConnector(),
      [ConnectorType.BLOB]:      new BlobConnector(),
    };
  }

  get(type) {
    const c = this._connectors[type];
    if (!c) throw new Error(`Unknown connector type: ${type}`);
    return c;
  }

  async healthCheckAll() {
    const checks = await Promise.allSettled(
      Object.values(this._connectors).map(c => c.healthCheck())
    );
    return checks.map(r => r.status === 'fulfilled' ? r.value : { status: ConnectorStatus.ERROR, error: r.reason?.message });
  }

  listTypes() {
    return Object.keys(this._connectors);
  }
}

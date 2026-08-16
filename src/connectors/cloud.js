/**
 * nexus-ai-pro/src/connectors/cloud.js
 * Cloud & collaboration platform connectors
 * Azure · AWS · Google Cloud · Slack · Zoom · GitHub · Bitbucket · Adobe
 * All credentials are read from environment variables — never hardcoded
 * Date: 2026-08-16
 */

export class AzureConnector {
  constructor() {
    this.clientId = process.env.AZURE_CLIENT_ID;
    this.tenantId = process.env.AZURE_TENANT_ID;
    this.clientSecret = process.env.AZURE_CLIENT_SECRET;
    this.blobEndpoint = process.env.AZURE_BLOB_ENDPOINT;
  }

  isConfigured() {
    return !!(this.clientId && this.tenantId && this.clientSecret);
  }

  async getToken() {
    if (!this.isConfigured()) throw new Error('Azure not configured — set AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET');
    const resp = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'https://storage.azure.com/.default',
        }),
      }
    );
    if (!resp.ok) throw new Error(`Azure auth failed: ${resp.status}`);
    return (await resp.json()).access_token;
  }

  /** Upload file to Azure Blob Storage */
  async uploadBlob(containerName, blobName, data, contentType = 'application/octet-stream') {
    const token = await this.getToken();
    const url = `${this.blobEndpoint}/${containerName}/${encodeURIComponent(blobName)}`;
    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': contentType,
        'x-ms-version': '2020-10-02',
      },
      body: data,
    });
    if (!resp.ok) throw new Error(`Azure blob upload failed: ${resp.status}`);
    return { url, containerName, blobName };
  }

  async listBlobs(containerName) {
    const token = await this.getToken();
    const url = `${this.blobEndpoint}/${containerName}?restype=container&comp=list`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'x-ms-version': '2020-10-02' } });
    if (!resp.ok) throw new Error(`Azure list blobs failed: ${resp.status}`);
    return resp.text(); // Returns XML — parse with xml2js in production
  }
}

export class AwsS3Connector {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET;
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  }

  isConfigured() {
    return !!(this.accessKeyId && this.secretAccessKey && this.bucket);
  }

  /** Generate a pre-signed URL for upload (production: use @aws-sdk/client-s3) */
  async getUploadUrl(key, contentType = 'application/octet-stream', expiresIn = 3600) {
    if (!this.isConfigured()) throw new Error('AWS S3 not configured — set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET');
    return {
      uploadUrl: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}?expires=${expiresIn}`,
      key,
      bucket: this.bucket,
      note: 'Integrate @aws-sdk/client-s3 for real signed URLs',
    };
  }

  async listObjects(prefix = '') {
    if (!this.isConfigured()) throw new Error('AWS S3 not configured');
    return { prefix, objects: [], note: 'Connect @aws-sdk/client-s3 for real S3 listing' };
  }
}

export class SlackConnector {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.botToken = process.env.SLACK_BOT_TOKEN;
    this.signingSecret = process.env.SLACK_SIGNING_SECRET;
  }

  isConfigured() {
    return !!(this.webhookUrl || this.botToken);
  }

  async sendMessage(text, channel = null, options = {}) {
    if (!this.webhookUrl && !this.botToken) {
      throw new Error('Slack not configured — set SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN');
    }

    const payload = {
      text,
      ...(channel ? { channel } : {}),
      ...options,
    };

    const url = this.webhookUrl ||
      `https://slack.com/api/chat.postMessage`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.botToken && !this.webhookUrl) {
      headers.Authorization = `Bearer ${this.botToken}`;
    }

    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!resp.ok) throw new Error(`Slack message failed: ${resp.status}`);
    return resp.json();
  }

  /** Send a security alert to Slack */
  async sendAlert(severity, message, details = {}) {
    const colors = { critical: '#ff0000', high: '#ff6600', medium: '#ffcc00', low: '#00cc00' };
    return this.sendMessage('', null, {
      attachments: [{
        color: colors[severity] || '#cccccc',
        title: `🚨 ${severity.toUpperCase()} Alert`,
        text: message,
        fields: Object.entries(details).map(([k, v]) => ({ title: k, value: String(v), short: true })),
        ts: Math.floor(Date.now() / 1000),
      }],
    });
  }
}

export class ZoomConnector {
  constructor() {
    this.apiKey = process.env.ZOOM_API_KEY;
    this.apiSecret = process.env.ZOOM_API_SECRET;
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
  }

  isConfigured() {
    return !!(this.clientId && this.clientSecret && this.accountId);
  }

  async getToken() {
    if (!this.isConfigured()) throw new Error('Zoom not configured — set ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_ACCOUNT_ID');
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const resp = await fetch('https://zoom.us/oauth/token?grant_type=account_credentials&account_id=' + this.accountId, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}` },
    });
    if (!resp.ok) throw new Error(`Zoom auth failed: ${resp.status}`);
    return (await resp.json()).access_token;
  }

  async createMeeting(topic, duration = 60, startTime = null) {
    const token = await this.getToken();
    const resp = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        type: startTime ? 2 : 1,
        start_time: startTime,
        duration,
        settings: { host_video: true, participant_video: true, waiting_room: true },
      }),
    });
    if (!resp.ok) throw new Error(`Zoom meeting creation failed: ${resp.status}`);
    return resp.json();
  }
}

export class GitHubConnector {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.baseUrl = 'https://api.github.com';
  }

  isConfigured() { return !!this.token; }

  get headers() {
    if (!this.token) throw new Error('GitHub not configured — set GITHUB_TOKEN');
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async getUser() {
    const resp = await fetch(`${this.baseUrl}/user`, { headers: this.headers });
    if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
    return resp.json();
  }

  async listRepos(page = 1, perPage = 30) {
    const resp = await fetch(`${this.baseUrl}/user/repos?page=${page}&per_page=${perPage}&sort=updated`, { headers: this.headers });
    if (!resp.ok) throw new Error(`GitHub repos error: ${resp.status}`);
    return resp.json();
  }

  async getRepoStats(owner, repo) {
    const [repoData, commits, issues] = await Promise.all([
      fetch(`${this.baseUrl}/repos/${owner}/${repo}`, { headers: this.headers }).then(r => r.json()),
      fetch(`${this.baseUrl}/repos/${owner}/${repo}/commits?per_page=1`, { headers: this.headers }).then(r => r.json()),
      fetch(`${this.baseUrl}/repos/${owner}/${repo}/issues?state=open&per_page=1`, { headers: this.headers }).then(r => r.json()),
    ]);
    return {
      repo: repoData,
      latestCommit: commits[0] || null,
      openIssues: repoData.open_issues_count,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language,
    };
  }
}

export class BitbucketConnector {
  constructor() {
    this.token = process.env.BITBUCKET_TOKEN;
    this.workspace = process.env.BITBUCKET_WORKSPACE;
    this.baseUrl = 'https://api.bitbucket.org/2.0';
  }

  isConfigured() { return !!(this.token && this.workspace); }

  get headers() {
    if (!this.token) throw new Error('Bitbucket not configured — set BITBUCKET_TOKEN, BITBUCKET_WORKSPACE');
    return { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' };
  }

  async listRepos() {
    const resp = await fetch(`${this.baseUrl}/repositories/${this.workspace}`, { headers: this.headers });
    if (!resp.ok) throw new Error(`Bitbucket error: ${resp.status}`);
    return resp.json();
  }

  async getPipelineStatus(repo, pipelineUuid) {
    const resp = await fetch(
      `${this.baseUrl}/repositories/${this.workspace}/${repo}/pipelines/${pipelineUuid}`,
      { headers: this.headers }
    );
    if (!resp.ok) throw new Error(`Bitbucket pipeline error: ${resp.status}`);
    return resp.json();
  }
}

export class AdobeConnector {
  constructor() {
    this.clientId = process.env.ADOBE_CLIENT_ID;
    this.clientSecret = process.env.ADOBE_CLIENT_SECRET;
    this.orgId = process.env.ADOBE_ORG_ID;
  }

  isConfigured() { return !!(this.clientId && this.clientSecret); }

  async getToken() {
    if (!this.isConfigured()) throw new Error('Adobe not configured — set ADOBE_CLIENT_ID, ADOBE_CLIENT_SECRET, ADOBE_ORG_ID');
    const resp = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'openid,AdobeID,creative_cloud',
      }),
    });
    if (!resp.ok) throw new Error(`Adobe auth failed: ${resp.status}`);
    return (await resp.json()).access_token;
  }
}

// Connector registry — instantiate all connectors
export const connectors = {
  azure:     new AzureConnector(),
  aws:       new AwsS3Connector(),
  slack:     new SlackConnector(),
  zoom:      new ZoomConnector(),
  github:    new GitHubConnector(),
  bitbucket: new BitbucketConnector(),
  adobe:     new AdobeConnector(),
};

/** Get status of all connectors */
export function getConnectorStatuses() {
  return Object.entries(connectors).map(([id, c]) => ({
    id,
    configured: c.isConfigured(),
    status: c.isConfigured() ? 'ready' : 'not_configured',
  }));
}

export default connectors;

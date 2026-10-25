// src/connectors/CloudConnectors.js
// Updated: 2026-10-25
// Azure, Adobe, AWS, Google, Slack, Zoom, GitHub, Bitbucket integrations

export const CONNECTOR_TYPES = [
  'azure', 'adobe', 'aws', 'google', 'slack', 'zoom', 'github', 'bitbucket'
];

// ─── Base connector ───────────────────────────────────────────────────────────
class BaseConnector {
  constructor(name, envPrefix) {
    this.name = name;
    this.envPrefix = envPrefix;
    this._credentials = {};
  }

  get isConfigured() {
    return Object.keys(this._credentials).length > 0;
  }

  loadFromEnv() {
    // Connectors resolve all secrets from environment variables, never hardcoded
    return this;
  }
}

// ─── Azure ────────────────────────────────────────────────────────────────────
export class AzureConnector extends BaseConnector {
  constructor() {
    super('azure', 'AZURE');
    this._tenantId = process.env.AZURE_TENANT_ID;
    this._clientId = process.env.AZURE_CLIENT_ID;
    this._clientSecret = process.env.AZURE_CLIENT_SECRET;
    this._subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    this._storageAccountName = process.env.AZURE_STORAGE_ACCOUNT;
    this._storageKey = process.env.AZURE_STORAGE_KEY;
  }

  get isConfigured() {
    return !!(this._tenantId && this._clientId && this._clientSecret);
  }

  async getAccessToken() {
    if (!this.isConfigured) throw new Error('Azure not configured');
    const response = await fetch(
      `https://login.microsoftonline.com/${this._tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this._clientId,
          client_secret: this._clientSecret,
          scope: 'https://management.azure.com/.default'
        }).toString()
      }
    );
    if (!response.ok) throw new Error('Azure auth failed');
    return response.json();
  }

  async uploadBlob(containerName, blobName, data, contentType = 'application/octet-stream') {
    if (!this._storageAccountName || !this._storageKey) throw new Error('Azure Storage not configured');
    const url = `https://${this._storageAccountName}.blob.core.windows.net/${containerName}/${blobName}`;
    const date = new Date().toUTCString();
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-ms-date': date,
        'x-ms-version': '2021-06-08',
        'x-ms-blob-type': 'BlockBlob'
      },
      body: data
    });
    return response.ok;
  }
}

// ─── AWS ──────────────────────────────────────────────────────────────────────
export class AWSConnector extends BaseConnector {
  constructor() {
    super('aws', 'AWS');
    this._accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    this._secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this._region = process.env.AWS_REGION || 'us-east-1';
    this._s3Bucket = process.env.AWS_S3_BUCKET;
  }

  get isConfigured() {
    return !!(this._accessKeyId && this._secretAccessKey);
  }

  // AWS Signature V4 signing (for S3)
  _sign(method, url, headers, body = '') {
    const crypto = require('crypto');
    const now = new Date();
    const date = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15);
    const dateShort = date.slice(0, 8);

    const canonicalHeaders = Object.entries(headers)
      .map(([k, v]) => `${k.toLowerCase()}:${v}\n`)
      .sort()
      .join('');
    const signedHeaders = Object.keys(headers).map(k => k.toLowerCase()).sort().join(';');
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
    const urlObj = new URL(url);
    const canonicalRequest = [method, urlObj.pathname, urlObj.searchParams.toString(),
      canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const credentialScope = `${dateShort}/${this._region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', date, credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');

    const kDate = crypto.createHmac('sha256', `AWS4${this._secretAccessKey}`).update(dateShort).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this._region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    return `AWS4-HMAC-SHA256 Credential=${this._accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  async uploadToS3(key, data, contentType = 'application/octet-stream') {
    if (!this.isConfigured || !this._s3Bucket) throw new Error('AWS S3 not configured');
    const url = `https://${this._s3Bucket}.s3.${this._region}.amazonaws.com/${key}`;
    const now = new Date().toUTCString();
    const auth = this._sign('PUT', url, { host: `${this._s3Bucket}.s3.${this._region}.amazonaws.com`, 'x-amz-date': now }, data);
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType, 'x-amz-date': now, Authorization: auth },
      body: data
    });
    return response.ok;
  }
}

// ─── Slack ────────────────────────────────────────────────────────────────────
export class SlackConnector extends BaseConnector {
  constructor() {
    super('slack', 'SLACK');
    this._botToken = process.env.SLACK_BOT_TOKEN;
    this._defaultChannel = process.env.SLACK_DEFAULT_CHANNEL || '#general';
  }

  get isConfigured() { return !!this._botToken; }

  async sendMessage(channel, text, blocks = []) {
    if (!this.isConfigured) throw new Error('Slack not configured');
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this._botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channel: channel || this._defaultChannel, text, blocks })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(`Slack error: ${data.error}`);
    return data;
  }

  async sendAlert(title, message, severity = 'info') {
    const color = severity === 'critical' ? '#ff0000' : severity === 'warning' ? '#ff9900' : '#36a64f';
    const blocks = [{
      type: 'section',
      text: { type: 'mrkdwn', text: `*${title}*\n${message}` },
      accessory: { type: 'button', text: { type: 'plain_text', text: 'View' }, value: 'view' }
    }];
    return this.sendMessage(this._defaultChannel, title, blocks);
  }
}

// ─── Zoom ─────────────────────────────────────────────────────────────────────
export class ZoomConnector extends BaseConnector {
  constructor() {
    super('zoom', 'ZOOM');
    this._accountId = process.env.ZOOM_ACCOUNT_ID;
    this._clientId = process.env.ZOOM_CLIENT_ID;
    this._clientSecret = process.env.ZOOM_CLIENT_SECRET;
  }

  get isConfigured() { return !!(this._accountId && this._clientId && this._clientSecret); }

  async getAccessToken() {
    if (!this.isConfigured) throw new Error('Zoom not configured');
    const credentials = Buffer.from(`${this._clientId}:${this._clientSecret}`).toString('base64');
    const response = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this._accountId}`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    if (!response.ok) throw new Error('Zoom auth failed');
    return response.json();
  }

  async createMeeting(topic, startTime, duration = 60) {
    const { access_token } = await this.getAccessToken();
    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ topic, type: 2, start_time: startTime, duration, settings: { join_before_host: false } })
    });
    if (!response.ok) throw new Error('Failed to create Zoom meeting');
    return response.json();
  }
}

// ─── GitHub ───────────────────────────────────────────────────────────────────
export class GitHubConnector extends BaseConnector {
  constructor() {
    super('github', 'GITHUB');
    this._token = process.env.GITHUB_TOKEN;
    this._org = process.env.GITHUB_ORG;
  }

  get isConfigured() { return !!this._token; }

  async request(path, method = 'GET', body = null) {
    if (!this.isConfigured) throw new Error('GitHub not configured');
    const response = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this._token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    return response.json();
  }

  listRepos(org = this._org) { return this.request(`/orgs/${org}/repos?per_page=100`); }
  listIssues(owner, repo) { return this.request(`/repos/${owner}/${repo}/issues`); }
  listPRs(owner, repo) { return this.request(`/repos/${owner}/${repo}/pulls`); }
  getWorkflowRuns(owner, repo) { return this.request(`/repos/${owner}/${repo}/actions/runs`); }
}

// ─── Bitbucket ────────────────────────────────────────────────────────────────
export class BitbucketConnector extends BaseConnector {
  constructor() {
    super('bitbucket', 'BITBUCKET');
    this._workspace = process.env.BITBUCKET_WORKSPACE;
    this._username = process.env.BITBUCKET_USERNAME;
    this._appPassword = process.env.BITBUCKET_APP_PASSWORD;
  }

  get isConfigured() { return !!(this._username && this._appPassword); }

  async request(path, method = 'GET', body = null) {
    if (!this.isConfigured) throw new Error('Bitbucket not configured');
    const creds = Buffer.from(`${this._username}:${this._appPassword}`).toString('base64');
    const response = await fetch(`https://api.bitbucket.org/2.0${path}`, {
      method,
      headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) throw new Error(`Bitbucket API error: ${response.status}`);
    return response.json();
  }

  listRepos() { return this.request(`/repositories/${this._workspace}`); }
  listPipelines(repoSlug) { return this.request(`/repositories/${this._workspace}/${repoSlug}/pipelines`); }
}

// ─── Google Cloud (beyond Gemini) ────────────────────────────────────────────
export class GoogleCloudConnector extends BaseConnector {
  constructor() {
    super('google', 'GOOGLE');
    this._projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this._serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY; // base64-encoded JSON
  }

  get isConfigured() { return !!this._serviceAccountKey; }

  async uploadToGCS(bucketName, objectName, data, contentType = 'application/octet-stream') {
    if (!this.isConfigured) throw new Error('Google Cloud not configured');
    const token = await this._getAccessToken();
    const response = await fetch(
      `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${objectName}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
        body: data
      }
    );
    return response.ok;
  }

  async _getAccessToken() {
    const keyJson = JSON.parse(Buffer.from(this._serviceAccountKey, 'base64').toString());
    const jwt = this._buildServiceAccountJwt(keyJson);
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
    });
    const data = await response.json();
    return data.access_token;
  }

  _buildServiceAccountJwt(keyJson) {
    const crypto = require('crypto');
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: keyJson.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    })).toString('base64url');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const sig = sign.sign(keyJson.private_key, 'base64url');
    return `${header}.${payload}.${sig}`;
  }
}

// ─── Adobe ────────────────────────────────────────────────────────────────────
export class AdobeConnector extends BaseConnector {
  constructor() {
    super('adobe', 'ADOBE');
    this._clientId = process.env.ADOBE_CLIENT_ID;
    this._clientSecret = process.env.ADOBE_CLIENT_SECRET;
    this._orgId = process.env.ADOBE_ORG_ID;
  }

  get isConfigured() { return !!(this._clientId && this._clientSecret); }

  async getAccessToken() {
    if (!this.isConfigured) throw new Error('Adobe not configured');
    const response = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this._clientId,
        client_secret: this._clientSecret,
        scope: 'openid,AdobeID,read_organizations'
      }).toString()
    });
    if (!response.ok) throw new Error('Adobe auth failed');
    return response.json();
  }
}

// ─── Connector registry ───────────────────────────────────────────────────────
export class ConnectorRegistry {
  constructor() {
    this.azure = new AzureConnector();
    this.aws = new AWSConnector();
    this.slack = new SlackConnector();
    this.zoom = new ZoomConnector();
    this.github = new GitHubConnector();
    this.bitbucket = new BitbucketConnector();
    this.google = new GoogleCloudConnector();
    this.adobe = new AdobeConnector();
  }

  getStatus() {
    return Object.fromEntries(
      Object.entries(this).map(([name, c]) => [name, { configured: c.isConfigured }])
    );
  }

  get(name) {
    return this[name] || null;
  }
}

export const connectorRegistry = new ConnectorRegistry();
export default connectorRegistry;

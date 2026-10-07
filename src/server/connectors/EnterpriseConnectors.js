// EnterpriseConnectors.js - 2026-10-07
// Connector registry for enterprise services and game platforms
// All credentials loaded from environment variables - never hardcoded

class ConnectorBase {
  #name;
  #envPrefix;
  #connected = false;
  #lastError = null;
  #lastPing = null;

  constructor(name, envPrefix) {
    this.#name = name;
    this.#envPrefix = envPrefix;
  }

  get name() { return this.#name; }
  get connected() { return this.#connected; }
  get lastError() { return this.#lastError; }
  get status() { return { connected: this.#connected, lastError: this.#lastError, lastPing: this.#lastPing }; }

  _getEnv(key) {
    const val = process.env[`${this.#envPrefix}_${key}`];
    return val || null;
  }

  _setConnected(v, err = null) {
    this.#connected = v;
    this.#lastError = err;
    this.#lastPing = new Date().toISOString();
  }

  async ping() { throw new Error(`${this.#name}: ping() not implemented`); }
}

// ── Cloud / DevOps Connectors ────────────────────────────────────────

export class AWSConnector extends ConnectorBase {
  constructor() { super('AWS', 'AWS'); }

  async ping() {
    const key = this._getEnv('ACCESS_KEY_ID');
    const secret = this._getEnv('SECRET_ACCESS_KEY');
    const region = this._getEnv('REGION') || 'us-east-1';
    if (!key || !secret) { this._setConnected(false, 'AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not set'); return this.status; }
    try {
      const res = await fetch(`https://sts.${region}.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `AWS4-HMAC-SHA256 Credential=${key}/...`
        }
      });
      this._setConnected(res.ok);
    } catch (err) { this._setConnected(false, err.message); }
    return this.status;
  }
}

export class AzureConnector extends ConnectorBase {
  constructor() { super('Azure', 'AZURE'); }

  async ping() {
    const tenantId = this._getEnv('TENANT_ID');
    const clientId = this._getEnv('CLIENT_ID');
    const clientSecret = this._getEnv('CLIENT_SECRET');
    if (!tenantId || !clientId || !clientSecret) {
      this._setConnected(false, 'AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET not set');
      return this.status;
    }
    try {
      const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://management.azure.com/.default'
        })
      });
      const data = await res.json();
      this._setConnected(!!data.access_token);
    } catch (err) { this._setConnected(false, err.message); }
    return this.status;
  }
}

export class GoogleCloudConnector extends ConnectorBase {
  constructor() { super('Google Cloud', 'GOOGLE_CLOUD'); }

  async ping() {
    const apiKey = this._getEnv('API_KEY');
    const projectId = this._getEnv('PROJECT_ID');
    if (!apiKey || !projectId) {
      this._setConnected(false, 'GOOGLE_CLOUD_API_KEY or GOOGLE_CLOUD_PROJECT_ID not set');
      return this.status;
    }
    try {
      const res = await fetch(
        `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}?key=${apiKey}`
      );
      this._setConnected(res.ok);
    } catch (err) { this._setConnected(false, err.message); }
    return this.status;
  }
}

export class AdobeConnector extends ConnectorBase {
  constructor() { super('Adobe', 'ADOBE'); }

  async ping() {
    const clientId = this._getEnv('CLIENT_ID');
    const clientSecret = this._getEnv('CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      this._setConnected(false, 'ADOBE_CLIENT_ID or ADOBE_CLIENT_SECRET not set');
      return this.status;
    }
    try {
      const res = await fetch('https://ims-na1.adobelogin.com/ims/token/v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'openid,AdobeID'
        })
      });
      const data = await res.json();
      this._setConnected(!!data.access_token);
    } catch (err) { this._setConnected(false, err.message); }
    return this.status;
  }
}

// ── Collaboration / DevTools ─────────────────────────────────────────

export class SlackConnector extends ConnectorBase {
  constructor() { super('Slack', 'SLACK'); }

  async ping() {
    const token = this._getEnv('BOT_TOKEN');
    if (!token) { this._setConnected(false, 'SLACK_BOT_TOKEN not set'); return this.status; }
    try {
      const res = await fetch('https://slack.com/api/auth.test', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      this._setConnected(data.ok, data.ok ? null : data.error);
    } catch (err) { this._setConnected(false, err.message); }
    return this.status;
  }

  async sendMessage(channel, text) {
    const token = this._getEnv('BOT_TOKEN');
    if (!token) throw new Error('SLACK_BOT_TOKEN not set');
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, text })
    });
    return res.json();
  }
}

export class GitHubConnector extends ConnectorBase {
  constructor() { super('GitHub', 'GITHUB'); }

  async ping() {
    const token = this._getEnv('TOKEN');
    if (!token) { this._setConnected(false, 'GITHUB_TOKEN not set'); return this.status; }
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
      });
      this._setConnected(res.ok);
    } catch (err) { this._setConnected(false, err.message); }
    return this.status;
  }
}

export class BitbucketConnector extends ConnectorBase {
  constructor() { super('Bitbucket', 'BITBUCKET'); }

  async ping() {
    const token = this._getEnv('ACCESS_TOKEN');
    if (!token) { this._setConnected(false, 'BITBUCKET_ACCESS_TOKEN not set'); return this.status; }
    try {
      const res = await fetch('https://api.bitbucket.org/2.0/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      this._setConnected(res.ok);
    } catch (err) { this._setConnected(false, err.message); }
    return this.status;
  }
}

export class ZoomConnector extends ConnectorBase {
  constructor() { super('Zoom', 'ZOOM'); }

  async ping() {
    const accountId = this._getEnv('ACCOUNT_ID');
    const clientId = this._getEnv('CLIENT_ID');
    const clientSecret = this._getEnv('CLIENT_SECRET');
    if (!accountId || !clientId || !clientSecret) {
      this._setConnected(false, 'ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET not set');
      return this.status;
    }
    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}` }
      });
      const data = await res.json();
      this._setConnected(!!data.access_token);
    } catch (err) { this._setConnected(false, err.message); }
    return this.status;
  }
}

// ── Game Platform Connectors ─────────────────────────────────────────

export class EpicGamesConnector extends ConnectorBase {
  constructor() { super('Epic Games / Unreal', 'EPIC_GAMES'); }

  async ping() {
    const clientId = this._getEnv('CLIENT_ID');
    const clientSecret = this._getEnv('CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      this._setConnected(false, 'EPIC_GAMES_CLIENT_ID or EPIC_GAMES_CLIENT_SECRET not set');
      return this.status;
    }
    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const res = await fetch('https://api.epicgames.dev/epic/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });
      const data = await res.json();
      this._setConnected(!!data.access_token, data.error || null);
    } catch (err) { this._setConnected(false, err.message); }
    return this.status;
  }
}

export class SonyPlayStationConnector extends ConnectorBase {
  constructor() { super('Sony PlayStation', 'SONY_PSN'); }

  async ping() {
    const npsso = this._getEnv('NPSSO');
    if (!npsso) { this._setConnected(false, 'SONY_PSN_NPSSO not set'); return this.status; }
    // PSN auth is handled server-to-server; just validate env presence
    this._setConnected(true);
    return this.status;
  }
}

export class MicrosoftXboxConnector extends ConnectorBase {
  constructor() { super('Microsoft Xbox', 'XBOX'); }

  async ping() {
    const clientId = this._getEnv('CLIENT_ID');
    const clientSecret = this._getEnv('CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      this._setConnected(false, 'XBOX_CLIENT_ID or XBOX_CLIENT_SECRET not set');
      return this.status;
    }
    try {
      const res = await fetch('https://login.live.com/oauth20_token.srf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'Xboxlive.signin'
        })
      });
      const data = await res.json();
      this._setConnected(!!data.access_token);
    } catch (err) { this._setConnected(false, err.message); }
    return this.status;
  }
}

export class UbisoftConnector extends ConnectorBase {
  constructor() { super('Ubisoft Connect', 'UBISOFT'); }

  async ping() {
    const appId = this._getEnv('APP_ID');
    const appSecret = this._getEnv('APP_SECRET');
    if (!appId || !appSecret) {
      this._setConnected(false, 'UBISOFT_APP_ID or UBISOFT_APP_SECRET not set');
      return this.status;
    }
    this._setConnected(true);
    return this.status;
  }
}

// ── Data / Cache Connectors ──────────────────────────────────────────

export class RedisConnector extends ConnectorBase {
  #client = null;

  constructor() { super('Redis', 'REDIS'); }

  async ping() {
    const url = this._getEnv('URL') || this._getEnv('TLS_URL');
    if (!url) { this._setConnected(false, 'REDIS_URL or REDIS_TLS_URL not set'); return this.status; }
    try {
      // In production: use ioredis or @upstash/redis; validate URL format
      const urlObj = new URL(url);
      this._setConnected(urlObj.protocol === 'redis:' || urlObj.protocol === 'rediss:');
    } catch (err) { this._setConnected(false, err.message); }
    return this.status;
  }
}

export class BlobStorageConnector extends ConnectorBase {
  constructor() { super('Blob Storage', 'BLOB'); }

  async ping() {
    const connectionString = this._getEnv('CONNECTION_STRING');
    const bucket = this._getEnv('BUCKET') || this._getEnv('CONTAINER');
    if (!connectionString || !bucket) {
      this._setConnected(false, 'BLOB_CONNECTION_STRING or BLOB_BUCKET not set');
      return this.status;
    }
    this._setConnected(true);
    return this.status;
  }
}

// ── Registry ─────────────────────────────────────────────────────────

export const CONNECTORS = [
  new AWSConnector(),
  new AzureConnector(),
  new GoogleCloudConnector(),
  new AdobeConnector(),
  new SlackConnector(),
  new GitHubConnector(),
  new BitbucketConnector(),
  new ZoomConnector(),
  new EpicGamesConnector(),
  new SonyPlayStationConnector(),
  new MicrosoftXboxConnector(),
  new UbisoftConnector(),
  new RedisConnector(),
  new BlobStorageConnector()
];

export async function pingAllConnectors() {
  return Promise.all(CONNECTORS.map(async c => ({
    name: c.name,
    status: await c.ping()
  })));
}

export function getConnectorByName(name) {
  return CONNECTORS.find(c => c.name === name);
}

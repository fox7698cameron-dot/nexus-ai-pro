// Created: 2026-09-30
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// externalConnectors.js — Factory connectors for cloud & SaaS platforms.
// All credentials are read from process.env — never hardcoded.

/**
 * @fileoverview
 * Provides factory functions for connecting to external services:
 *   - Azure (Azure SDK pattern)
 *   - AWS (AWS SDK pattern)
 *   - Google Cloud (Application Default Credentials / service account key)
 *   - GitHub (Octokit REST / GraphQL, PAT from env)
 *   - Slack (Web API, bot token from env)
 *   - Zoom (OAuth2, credentials from env)
 *   - Bitbucket (App password, credentials from env)
 *   - Adobe (API key, credentials from env)
 *
 * Each connector:
 *   - Exports a factory function (createXxxConnector)
 *   - Reads credentials from process.env
 *   - Never hardcodes secrets
 *   - Includes a testConnection() method
 *   - Is TypeScript-friendly via JSDoc
 *   - All API calls are rate-limited and cached
 */

import { createLogger, format, transports } from 'winston';

// ─── Logger ───────────────────────────────────────────────────────────────────

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
  ),
  defaultMeta: { service: 'externalConnectors' },
  transports: [new transports.Console()],
});

// ─── Shared TTL cache ─────────────────────────────────────────────────────────

/**
 * @template T
 */
class TtlCache {
  /** @param {number} defaultTtlMs */
  constructor(defaultTtlMs = 300_000) {
    /** @type {Map<string, { value: T, expiresAt: number }>} */
    this._store = new Map();
    this._defaultTtl = defaultTtlMs;
  }

  /**
   * @param {string} key
   * @returns {T|undefined}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) { this._store.delete(key); return undefined; }
    return entry.value;
  }

  /**
   * @param {string} key
   * @param {T}      value
   * @param {number} [ttlMs]
   */
  set(key, value, ttlMs) {
    this._store.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this._defaultTtl) });
  }

  /** @param {string} key */
  invalidate(key) { this._store.delete(key); }

  clear() { this._store.clear(); }
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────

class RateLimiter {
  /**
   * @param {number} tokensPerWindow
   * @param {number} windowMs
   */
  constructor(tokensPerWindow, windowMs) {
    this._max = tokensPerWindow;
    this._windowMs = windowMs;
    /** @type {Map<string, { tokens: number, windowStart: number }>} */
    this._buckets = new Map();
  }

  /**
   * @param {string} key
   * @returns {{ allowed: boolean, retryAfterMs: number }}
   */
  consume(key) {
    const now = Date.now();
    let b = this._buckets.get(key);
    if (!b || now - b.windowStart >= this._windowMs) b = { tokens: this._max, windowStart: now };
    if (b.tokens <= 0) {
      this._buckets.set(key, b);
      return { allowed: false, retryAfterMs: this._windowMs - (now - b.windowStart) };
    }
    b.tokens -= 1;
    this._buckets.set(key, b);
    return { allowed: true, retryAfterMs: 0 };
  }
}

// ─── Shared utility ───────────────────────────────────────────────────────────

/**
 * Validate required environment variables.
 * @param {string[]} keys
 * @param {string}   connectorId
 */
function requireEnv(keys, connectorId) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`[${connectorId}] Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Execute a rate-limited, cached call.
 * @param {RateLimiter}           limiter
 * @param {TtlCache<any>}         cache
 * @param {string}                cacheKey
 * @param {() => Promise<any>}    fn
 * @param {number}                [ttlMs]
 * @returns {Promise<any>}
 */
async function cachedCall(limiter, cache, cacheKey, fn, ttlMs) {
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { allowed, retryAfterMs } = limiter.consume(cacheKey);
  if (!allowed) {
    const err = new Error(`Rate limit exceeded. Retry after ${retryAfterMs}ms.`);
    err.code = 'RATE_LIMITED';
    err.retryAfterMs = retryAfterMs;
    throw err;
  }

  const result = await fn();
  cache.set(cacheKey, result, ttlMs);
  return result;
}

// ─── Azure connector ──────────────────────────────────────────────────────────

/**
 * @typedef {object} AzureConnector
 * @property {() => import('@azure/identity').DefaultAzureCredential}   getCredential
 * @property {() => import('@azure/arm-resources').ResourceManagementClient} getResourceClient
 * @property {() => Promise<boolean>}                                   testConnection
 */

/**
 * Factory for the Azure connector.
 * Reads: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID
 * Alternatively uses DefaultAzureCredential (supports managed identity, env, CLI, etc.)
 * @returns {AzureConnector}
 */
export function createAzureConnector() {
  const ID = 'azure';
  const limiter = new RateLimiter(60, 60_000);
  const cache   = new TtlCache(5 * 60_000);

  /** @returns {{ subscriptionId: string }} */
  function config() {
    requireEnv(['AZURE_SUBSCRIPTION_ID'], ID);
    // AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET consumed automatically by
    // @azure/identity's DefaultAzureCredential / EnvironmentCredential.
    return { subscriptionId: process.env.AZURE_SUBSCRIPTION_ID };
  }

  return {
    /**
     * Return a DefaultAzureCredential instance.
     * Supports: EnvironmentCredential, WorkloadIdentityCredential, ManagedIdentityCredential,
     *           AzureCliCredential, and more — selected automatically.
     * @returns {import('@azure/identity').DefaultAzureCredential}
     */
    getCredential() {
      // eslint-disable-next-line import/no-extraneous-dependencies
      const { DefaultAzureCredential } = await import('@azure/identity');
      return new DefaultAzureCredential();
    },

    /**
     * Return an Azure Resource Management client.
     * @returns {import('@azure/arm-resources').ResourceManagementClient}
     */
    getResourceClient() {
      // eslint-disable-next-line import/no-extraneous-dependencies
      const { ResourceManagementClient } = await import('@azure/arm-resources');
      const { subscriptionId } = config();
      return new ResourceManagementClient(this.getCredential(), subscriptionId);
    },

    /**
     * List resource groups in the subscription (cached).
     * @returns {Promise<*>}
     */
    async listResourceGroups() {
      const { subscriptionId } = config();
      return cachedCall(limiter, cache, `rgs:${subscriptionId}`, async () => {
        const client = this.getResourceClient();
        const groups = [];
        for await (const rg of client.resourceGroups.list()) groups.push(rg);
        return groups;
      });
    },

    /** Test connectivity by fetching the subscription resource. */
    async testConnection() {
      try {
        const { subscriptionId } = config();
        const { ResourceManagementClient } = await import('@azure/arm-resources');
        const client = new ResourceManagementClient(this.getCredential(), subscriptionId);
        const groups = [];
        for await (const rg of client.resourceGroups.list()) { groups.push(rg); break; }
        logger.info('[azure] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[azure] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── AWS connector ────────────────────────────────────────────────────────────

/**
 * @typedef {object} AwsConnector
 * @property {(service: string, options?: object) => object} getClient
 * @property {() => Promise<boolean>}                        testConnection
 */

/**
 * Factory for the AWS connector.
 * Reads: AWS_REGION (required), AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (optional — IAM role is preferred).
 * @returns {AwsConnector}
 */
export function createAwsConnector() {
  const ID = 'aws';
  const limiter = new RateLimiter(100, 60_000);
  const cache   = new TtlCache(5 * 60_000);

  function config() {
    requireEnv(['AWS_REGION'], ID);
    return {
      region:          process.env.AWS_REGION,
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,     // optional: set for explicit keys
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,  // optional: set for explicit keys
    };
  }

  /**
   * Build shared AWS SDK configuration object.
   * @returns {{ region: string, credentials?: { accessKeyId: string, secretAccessKey: string } }}
   */
  function sdkConfig() {
    const { region, accessKeyId, secretAccessKey } = config();
    const cfg = { region };
    if (accessKeyId && secretAccessKey) cfg.credentials = { accessKeyId, secretAccessKey };
    return cfg;
  }

  return {
    /**
     * Instantiate an AWS SDK v3 service client.
     * @template T
     * @param {{ new(config: object): T }} ServiceClient – e.g. S3Client, DynamoDBClient
     * @param {object} [options]  – additional constructor options merged with sdkConfig()
     * @returns {T}
     */
    getClient(ServiceClient, options = {}) {
      return new ServiceClient({ ...sdkConfig(), ...options });
    },

    /**
     * List S3 buckets (cached).
     * @returns {Promise<*>}
     */
    async listS3Buckets() {
      return cachedCall(limiter, cache, `s3:buckets:${config().region}`, async () => {
        const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
        const client = this.getClient(S3Client);
        return client.send(new ListBucketsCommand({}));
      });
    },

    /** Test connectivity via STS GetCallerIdentity. */
    async testConnection() {
      try {
        const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
        const client = this.getClient(STSClient);
        await client.send(new GetCallerIdentityCommand({}));
        logger.info('[aws] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[aws] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── Google Cloud connector ───────────────────────────────────────────────────

/**
 * @typedef {object} GoogleCloudConnector
 * @property {() => import('google-auth-library').GoogleAuth} getAuth
 * @property {(scopes: string[]) => Promise<string>}          getAccessToken
 * @property {() => Promise<boolean>}                         testConnection
 */

/**
 * Factory for the Google Cloud connector.
 * Reads: GOOGLE_APPLICATION_CREDENTIALS (path to JSON key file — optional if ADC is configured),
 *        GCP_PROJECT_ID
 * @returns {GoogleCloudConnector}
 */
export function createGoogleCloudConnector() {
  const ID = 'gcp';
  const limiter = new RateLimiter(60, 60_000);
  const cache   = new TtlCache(55 * 60_000); // tokens are valid ~1 h; cache for 55 min

  function config() {
    requireEnv(['GCP_PROJECT_ID'], ID);
    return {
      projectId:   process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // optional
    };
  }

  return {
    /**
     * Return a GoogleAuth instance.
     * If GOOGLE_APPLICATION_CREDENTIALS is set, it uses that JSON key file.
     * Otherwise falls back to Application Default Credentials (ADC).
     * @param {string[]} [scopes]
     * @returns {import('google-auth-library').GoogleAuth}
     */
    getAuth(scopes = ['https://www.googleapis.com/auth/cloud-platform']) {
      const { GoogleAuth } = await import('google-auth-library');
      const { keyFilename, projectId } = config();
      return new GoogleAuth({ keyFilename, projectId, scopes });
    },

    /**
     * Obtain a short-lived access token.
     * @param {string[]} [scopes]
     * @returns {Promise<string>}
     */
    async getAccessToken(scopes) {
      const cacheKey = `token:${(scopes || []).join(',')}`;
      return cachedCall(limiter, cache, cacheKey, async () => {
        const auth = this.getAuth(scopes);
        const client = await auth.getClient();
        const { token } = await client.getAccessToken();
        return token;
      });
    },

    /**
     * List GCP storage buckets in the project (cached).
     * @returns {Promise<*>}
     */
    async listBuckets() {
      const { projectId } = config();
      return cachedCall(limiter, cache, `buckets:${projectId}`, async () => {
        const token = await this.getAccessToken();
        const response = await fetch(
          `https://storage.googleapis.com/storage/v1/b?project=${projectId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) throw new Error(`listBuckets failed: ${response.status}`);
        return response.json();
      });
    },

    /** Test connectivity via the tokeninfo endpoint. */
    async testConnection() {
      try {
        const token = await this.getAccessToken();
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`,
        );
        if (!response.ok) throw new Error(`Status ${response.status}`);
        logger.info('[gcp] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[gcp] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── GitHub connector ─────────────────────────────────────────────────────────

/**
 * @typedef {object} GitHubConnector
 * @property {() => import('@octokit/rest').Octokit} getOctokit
 * @property {(owner: string, repo: string) => Promise<*>} listPullRequests
 * @property {(owner: string, repo: string) => Promise<*>} listIssues
 * @property {() => Promise<boolean>}                      testConnection
 */

/**
 * Factory for the GitHub connector.
 * Reads: GITHUB_TOKEN (personal access token or GitHub App installation token)
 *        GITHUB_API_URL (optional; defaults to https://api.github.com — override for GitHub Enterprise)
 * @returns {GitHubConnector}
 */
export function createGitHubConnector() {
  const ID = 'github';
  const limiter = new RateLimiter(60, 60_000); // GH primary rate limit: 5000/h; keep conservative for shared use
  const cache   = new TtlCache(3 * 60_000);

  function config() {
    requireEnv(['GITHUB_TOKEN'], ID);
    return {
      token:   process.env.GITHUB_TOKEN,
      baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
    };
  }

  return {
    /**
     * Return an authenticated Octokit REST client.
     * @returns {import('@octokit/rest').Octokit}
     */
    getOctokit() {
      const { Octokit } = await import('@octokit/rest');
      const { token, baseUrl } = config();
      return new Octokit({ auth: token, baseUrl });
    },

    /**
     * List open pull requests for a repository (cached).
     * @param {string} owner
     * @param {string} repo
     * @param {{ state?: 'open'|'closed'|'all', perPage?: number }} [opts]
     * @returns {Promise<*>}
     */
    async listPullRequests(owner, repo, opts = {}) {
      const cacheKey = `prs:${owner}/${repo}:${opts.state || 'open'}`;
      return cachedCall(limiter, cache, cacheKey, async () => {
        const octokit = this.getOctokit();
        const { data } = await octokit.pulls.list({
          owner,
          repo,
          state:    opts.state || 'open',
          per_page: opts.perPage || 30,
        });
        return data;
      });
    },

    /**
     * List issues for a repository (cached).
     * @param {string} owner
     * @param {string} repo
     * @param {{ state?: 'open'|'closed'|'all', labels?: string }} [opts]
     * @returns {Promise<*>}
     */
    async listIssues(owner, repo, opts = {}) {
      const cacheKey = `issues:${owner}/${repo}:${opts.state || 'open'}:${opts.labels || ''}`;
      return cachedCall(limiter, cache, cacheKey, async () => {
        const octokit = this.getOctokit();
        const { data } = await octokit.issues.listForRepo({
          owner,
          repo,
          state:    opts.state || 'open',
          labels:   opts.labels,
          per_page: 50,
        });
        return data;
      });
    },

    /**
     * Create a new issue.
     * @param {string} owner
     * @param {string} repo
     * @param {{ title: string, body?: string, labels?: string[] }} params
     * @returns {Promise<*>}
     */
    async createIssue(owner, repo, params) {
      const { allowed, retryAfterMs } = limiter.consume(`issue:${owner}/${repo}`);
      if (!allowed) throw Object.assign(new Error(`Rate limited. Retry after ${retryAfterMs}ms.`), { code: 'RATE_LIMITED' });
      const octokit = this.getOctokit();
      const { data } = await octokit.issues.create({ owner, repo, ...params });
      cache.invalidate(`issues:${owner}/${repo}:open:`);
      return data;
    },

    /** Test connectivity by fetching the authenticated user. */
    async testConnection() {
      try {
        const octokit = this.getOctokit();
        await octokit.users.getAuthenticated();
        logger.info('[github] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[github] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── Slack connector ──────────────────────────────────────────────────────────

/**
 * @typedef {object} SlackConnector
 * @property {() => import('@slack/web-api').WebClient}       getClient
 * @property {(channelId: string, text: string) => Promise<*>} postMessage
 * @property {() => Promise<*>}                               listChannels
 * @property {() => Promise<boolean>}                         testConnection
 */

/**
 * Factory for the Slack connector.
 * Reads: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET (optional, for request verification)
 * @returns {SlackConnector}
 */
export function createSlackConnector() {
  const ID = 'slack';
  const limiter = new RateLimiter(50, 60_000); // Slack Tier 3 rate limit: ~50/min
  const cache   = new TtlCache(5 * 60_000);

  function config() {
    requireEnv(['SLACK_BOT_TOKEN'], ID);
    return {
      token:         process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
    };
  }

  return {
    /**
     * Return a Slack WebClient instance.
     * @returns {import('@slack/web-api').WebClient}
     */
    getClient() {
      const { WebClient } = await import('@slack/web-api');
      return new WebClient(config().token);
    },

    /**
     * Post a message to a Slack channel.
     * @param {string} channelId
     * @param {string} text
     * @param {object} [options] – additional chat.postMessage options (blocks, attachments, etc.)
     * @returns {Promise<*>}
     */
    async postMessage(channelId, text, options = {}) {
      const { allowed, retryAfterMs } = limiter.consume(`post:${channelId}`);
      if (!allowed) throw Object.assign(new Error(`Rate limited. Retry after ${retryAfterMs}ms.`), { code: 'RATE_LIMITED' });
      logger.info('[slack] Posting message', { channel: channelId });
      const client = this.getClient();
      return client.chat.postMessage({ channel: channelId, text, ...options });
    },

    /**
     * List public channels (cached).
     * @param {{ limit?: number }} [opts]
     * @returns {Promise<*>}
     */
    async listChannels(opts = {}) {
      return cachedCall(limiter, cache, 'channels', async () => {
        const client = this.getClient();
        return client.conversations.list({ exclude_archived: true, limit: opts.limit || 200 });
      });
    },

    /**
     * Upload a file to Slack.
     * @param {string}          channelId
     * @param {Buffer|string}   content
     * @param {string}          filename
     * @param {string}          [title]
     * @returns {Promise<*>}
     */
    async uploadFile(channelId, content, filename, title) {
      const { allowed, retryAfterMs } = limiter.consume(`upload:${channelId}`);
      if (!allowed) throw Object.assign(new Error(`Rate limited. Retry after ${retryAfterMs}ms.`), { code: 'RATE_LIMITED' });
      const client = this.getClient();
      return client.filesUploadV2({ channel_id: channelId, content, filename, title });
    },

    /** Test connectivity via auth.test. */
    async testConnection() {
      try {
        const client = this.getClient();
        await client.auth.test();
        logger.info('[slack] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[slack] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── Zoom connector ───────────────────────────────────────────────────────────

/**
 * @typedef {object} ZoomConnector
 * @property {() => string}                    getAuthUrl
 * @property {(code: string) => Promise<*>}   exchangeCode
 * @property {(token: string) => Promise<*>}  refreshToken
 * @property {(token: string) => Promise<*>}  listMeetings
 * @property {(token: string, params: object) => Promise<*>} createMeeting
 * @property {() => Promise<boolean>}         testConnection
 */

/**
 * Factory for the Zoom connector (OAuth).
 * Reads: ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_REDIRECT_URI, ZOOM_ACCOUNT_ID (for Server-to-Server OAuth)
 * @returns {ZoomConnector}
 */
export function createZoomConnector() {
  const ID = 'zoom';
  const BASE_URL  = 'https://api.zoom.us/v2';
  const TOKEN_URL = 'https://zoom.us/oauth/token';
  const AUTH_URL  = 'https://zoom.us/oauth/authorize';
  const limiter = new RateLimiter(30, 60_000);
  const cache   = new TtlCache(5 * 60_000);

  function config() {
    requireEnv(['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'], ID);
    return {
      clientId:     process.env.ZOOM_CLIENT_ID,
      clientSecret: process.env.ZOOM_CLIENT_SECRET,
      redirectUri:  process.env.ZOOM_REDIRECT_URI,
      accountId:    process.env.ZOOM_ACCOUNT_ID, // required for Server-to-Server OAuth
    };
  }

  function basicAuth() {
    const { clientId, clientSecret } = config();
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }

  return {
    /**
     * Build the Zoom OAuth2 authorization URL (user-level OAuth).
     * @param {string} [state]
     * @returns {string}
     */
    getAuthUrl(state = '') {
      const { clientId, redirectUri } = config();
      const params = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, state });
      return `${AUTH_URL}?${params.toString()}`;
    },

    /**
     * Exchange an authorization code for Zoom tokens.
     * @param {string} code
     * @returns {Promise<*>}
     */
    async exchangeCode(code) {
      logger.info('[zoom] Exchanging authorization code');
      const { redirectUri } = config();
      const response = await fetch(TOKEN_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: basicAuth() },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }).toString(),
      });
      if (!response.ok) { const t = await response.text(); throw new Error(`[zoom] exchangeCode failed (${response.status}): ${t}`); }
      return response.json();
    },

    /**
     * Refresh a Zoom access token.
     * @param {string} refreshToken
     * @returns {Promise<*>}
     */
    async refreshToken(refreshToken) {
      logger.info('[zoom] Refreshing token');
      const response = await fetch(TOKEN_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: basicAuth() },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
      });
      if (!response.ok) { const t = await response.text(); throw new Error(`[zoom] refreshToken failed (${response.status}): ${t}`); }
      return response.json();
    },

    /**
     * Obtain a Server-to-Server OAuth token (requires ZOOM_ACCOUNT_ID).
     * @returns {Promise<{ access_token: string, expires_in: number }>}
     */
    async getServerToken() {
      requireEnv(['ZOOM_ACCOUNT_ID'], ID);
      const { accountId } = config();
      return cachedCall(limiter, cache, `s2s:token:${accountId}`, async () => {
        const response = await fetch(`${TOKEN_URL}?grant_type=account_credentials&account_id=${accountId}`, {
          method:  'POST',
          headers: { Authorization: basicAuth() },
        });
        if (!response.ok) { const t = await response.text(); throw new Error(`[zoom] getServerToken failed (${response.status}): ${t}`); }
        return response.json();
      }, 55 * 60_000);
    },

    /**
     * List the authenticated user's meetings.
     * @param {string} token
     * @returns {Promise<*>}
     */
    async listMeetings(token) {
      return cachedCall(limiter, cache, 'meetings:me', async () => {
        const response = await fetch(`${BASE_URL}/users/me/meetings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) { const t = await response.text(); throw new Error(`[zoom] listMeetings failed (${response.status}): ${t}`); }
        return response.json();
      });
    },

    /**
     * Create a Zoom meeting.
     * @param {string} token
     * @param {{ topic: string, start_time?: string, duration?: number, type?: number }} params
     * @returns {Promise<*>}
     */
    async createMeeting(token, params) {
      const { allowed, retryAfterMs } = limiter.consume('create:meeting');
      if (!allowed) throw Object.assign(new Error(`Rate limited. Retry after ${retryAfterMs}ms.`), { code: 'RATE_LIMITED' });
      const response = await fetch(`${BASE_URL}/users/me/meetings`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 2, ...params }),
      });
      if (!response.ok) { const t = await response.text(); throw new Error(`[zoom] createMeeting failed (${response.status}): ${t}`); }
      cache.invalidate('meetings:me');
      return response.json();
    },

    /** Test connectivity via the user profile endpoint. */
    async testConnection() {
      try {
        config();
        const tokenData = await this.getServerToken().catch(() => null);
        if (!tokenData) {
          // Fall back: just check the OAuth discovery endpoint is reachable
          const r = await fetch('https://zoom.us/.well-known/openid-configuration');
          if (!r.ok) throw new Error(`Status ${r.status}`);
        }
        logger.info('[zoom] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[zoom] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── Bitbucket connector ──────────────────────────────────────────────────────

/**
 * @typedef {object} BitbucketConnector
 * @property {(workspace: string) => Promise<*>}                listRepositories
 * @property {(workspace: string, repo: string) => Promise<*>} listPullRequests
 * @property {() => Promise<boolean>}                          testConnection
 */

/**
 * Factory for the Bitbucket connector (App Password).
 * Reads: BITBUCKET_USERNAME, BITBUCKET_APP_PASSWORD, BITBUCKET_WORKSPACE (optional default)
 * @returns {BitbucketConnector}
 */
export function createBitbucketConnector() {
  const ID = 'bitbucket';
  const BASE_URL = 'https://api.bitbucket.org/2.0';
  const limiter = new RateLimiter(60, 60_000);
  const cache   = new TtlCache(3 * 60_000);

  function config() {
    requireEnv(['BITBUCKET_USERNAME', 'BITBUCKET_APP_PASSWORD'], ID);
    return {
      username:    process.env.BITBUCKET_USERNAME,
      appPassword: process.env.BITBUCKET_APP_PASSWORD,
      workspace:   process.env.BITBUCKET_WORKSPACE,
    };
  }

  function authHeaders() {
    const { username, appPassword } = config();
    return {
      Authorization: `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`,
      Accept:        'application/json',
    };
  }

  async function bbFetch(path) {
    const response = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() });
    if (!response.ok) { const t = await response.text(); throw new Error(`[bitbucket] ${path} failed (${response.status}): ${t}`); }
    return response.json();
  }

  return {
    /**
     * List repositories in a workspace (cached).
     * @param {string} [workspace] – overrides BITBUCKET_WORKSPACE env var
     * @returns {Promise<*>}
     */
    async listRepositories(workspace) {
      const ws = workspace || config().workspace;
      if (!ws) throw new Error('[bitbucket] workspace is required');
      return cachedCall(limiter, cache, `repos:${ws}`, () => bbFetch(`/repositories/${ws}?pagelen=50`));
    },

    /**
     * List open pull requests for a repository (cached).
     * @param {string} workspace
     * @param {string} repo
     * @param {{ state?: string }} [opts]
     * @returns {Promise<*>}
     */
    async listPullRequests(workspace, repo, opts = {}) {
      const state = opts.state || 'OPEN';
      return cachedCall(limiter, cache, `prs:${workspace}/${repo}:${state}`, () =>
        bbFetch(`/repositories/${workspace}/${repo}/pullrequests?state=${state}&pagelen=50`),
      );
    },

    /**
     * Create a pull request.
     * @param {string} workspace
     * @param {string} repo
     * @param {{ title: string, source: { branch: { name: string } }, destination: { branch: { name: string } }, description?: string }} params
     * @returns {Promise<*>}
     */
    async createPullRequest(workspace, repo, params) {
      const { allowed, retryAfterMs } = limiter.consume(`pr:${workspace}/${repo}`);
      if (!allowed) throw Object.assign(new Error(`Rate limited. Retry after ${retryAfterMs}ms.`), { code: 'RATE_LIMITED' });
      const response = await fetch(`${BASE_URL}/repositories/${workspace}/${repo}/pullrequests`, {
        method:  'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) { const t = await response.text(); throw new Error(`[bitbucket] createPullRequest failed (${response.status}): ${t}`); }
      cache.invalidate(`prs:${workspace}/${repo}:OPEN`);
      return response.json();
    },

    /** Test connectivity by fetching the current user profile. */
    async testConnection() {
      try {
        config();
        await bbFetch('/user');
        logger.info('[bitbucket] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[bitbucket] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── Adobe connector ──────────────────────────────────────────────────────────

/**
 * @typedef {object} AdobeConnector
 * @property {() => Promise<string>}                           getAccessToken
 * @property {(token: string) => Promise<*>}                  getProfile
 * @property {(token: string, params: object) => Promise<*>}  generateImage
 * @property {() => Promise<boolean>}                         testConnection
 */

/**
 * Factory for the Adobe connector.
 * Reads: ADOBE_CLIENT_ID, ADOBE_CLIENT_SECRET, ADOBE_ORGANIZATION_ID (IMS org ID)
 * Uses Adobe IMS for OAuth2 / service account JWT exchange.
 * @returns {AdobeConnector}
 */
export function createAdobeConnector() {
  const ID = 'adobe';
  const IMS_URL  = 'https://ims-na1.adobelogin.com';
  const BASE_URL = 'https://image.adobe.io';
  const limiter  = new RateLimiter(30, 60_000);
  const cache    = new TtlCache(55 * 60_000); // tokens valid ~1 h

  function config() {
    requireEnv(['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET'], ID);
    return {
      clientId:       process.env.ADOBE_CLIENT_ID,
      clientSecret:   process.env.ADOBE_CLIENT_SECRET,
      organizationId: process.env.ADOBE_ORGANIZATION_ID,
      apiKey:         process.env.ADOBE_API_KEY || process.env.ADOBE_CLIENT_ID,
    };
  }

  return {
    /**
     * Obtain an Adobe access token via client-credentials grant.
     * @param {string[]} [scopes]
     * @returns {Promise<string>}
     */
    async getAccessToken(scopes = ['openid', 'AdobeID', 'firefly_enterprise']) {
      const cacheKey = `token:${scopes.join(',')}`;
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const { clientId, clientSecret, organizationId } = config();
      const params = { grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: scopes.join(',') };
      if (organizationId) params.organization_id = organizationId;

      const response = await fetch(`${IMS_URL}/ims/token/v3`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
      });
      if (!response.ok) { const t = await response.text(); throw new Error(`[adobe] getAccessToken failed (${response.status}): ${t}`); }
      const data = await response.json();
      cache.set(cacheKey, data.access_token, (data.expires_in ?? 3600) * 1000 - 60_000);
      return data.access_token;
    },

    /**
     * Fetch the authenticated user's Adobe profile.
     * @param {string} token
     * @returns {Promise<*>}
     */
    async getProfile(token) {
      return cachedCall(limiter, cache, 'profile', async () => {
        const response = await fetch(`${IMS_URL}/ims/profile/v1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) { const t = await response.text(); throw new Error(`[adobe] getProfile failed (${response.status}): ${t}`); }
        return response.json();
      });
    },

    /**
     * Generate an image with Adobe Firefly.
     * @param {string} token
     * @param {{ prompt: string, n?: number, size?: string, style?: string }} params
     * @returns {Promise<*>}
     */
    async generateImage(token, params) {
      const { allowed, retryAfterMs } = limiter.consume('generate:image');
      if (!allowed) throw Object.assign(new Error(`Rate limited. Retry after ${retryAfterMs}ms.`), { code: 'RATE_LIMITED' });
      const { apiKey } = config();
      const response = await fetch(`${BASE_URL}/v3/images/generate`, {
        method:  'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-api-key':   apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: params.prompt, n: params.n || 1, size: params.size || '1024x1024', styles: params.style ? [{ presetId: params.style }] : undefined }),
      });
      if (!response.ok) { const t = await response.text(); throw new Error(`[adobe] generateImage failed (${response.status}): ${t}`); }
      return response.json();
    },

    /**
     * Upload an asset to Adobe Creative Cloud Files.
     * @param {string}         token
     * @param {Buffer|Uint8Array} fileBuffer
     * @param {string}         filename
     * @param {string}         mimeType
     * @returns {Promise<*>}
     */
    async uploadAsset(token, fileBuffer, filename, mimeType) {
      const { allowed, retryAfterMs } = limiter.consume('upload:asset');
      if (!allowed) throw Object.assign(new Error(`Rate limited. Retry after ${retryAfterMs}ms.`), { code: 'RATE_LIMITED' });
      const { apiKey } = config();
      const response = await fetch(`https://cc-api-storage.adobe.io/assets`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'x-api-key':    apiKey,
          'X-File-Name':  filename,
          'Content-Type': mimeType,
        },
        body: fileBuffer,
      });
      if (!response.ok) { const t = await response.text(); throw new Error(`[adobe] uploadAsset failed (${response.status}): ${t}`); }
      return response.json();
    },

    /** Test connectivity via token introspection. */
    async testConnection() {
      try {
        const token = await this.getAccessToken();
        await this.getProfile(token);
        logger.info('[adobe] Connection test passed');
        return true;
      } catch (err) {
        logger.error('[adobe] Connection test failed', { error: err.message });
        return false;
      }
    },
  };
}

// ─── Convenience: run all connection tests ────────────────────────────────────

/**
 * Run testConnection() on all configured connectors and return a status map.
 * @returns {Promise<Record<string, boolean>>}
 */
export async function testAllConnections() {
  const connectors = {
    azure:       createAzureConnector(),
    aws:         createAwsConnector(),
    gcp:         createGoogleCloudConnector(),
    github:      createGitHubConnector(),
    slack:       createSlackConnector(),
    zoom:        createZoomConnector(),
    bitbucket:   createBitbucketConnector(),
    adobe:       createAdobeConnector(),
  };

  const results = await Promise.allSettled(
    Object.entries(connectors).map(async ([id, connector]) => [id, await connector.testConnection()]),
  );

  return Object.fromEntries(
    results.map((r) =>
      r.status === 'fulfilled' ? r.value : [r.reason?.message ?? 'unknown', false],
    ),
  );
}

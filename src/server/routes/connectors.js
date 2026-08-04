/**
 * @file connectors.js
 * @description Express router for external service connector management.
 *   Supports Azure, Adobe, AWS, Google, Slack, Zoom, GitHub, Bitbucket, and
 *   Redis. Provides connect/disconnect lifecycle, status checks, connection
 *   tests, and service-specific action endpoints (Slack messaging, Zoom
 *   meeting creation, GitHub repo listing, GitHub webhook ingestion, AWS and
 *   Azure service status).
 * @created 2026-08-04
 * @copyright Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @license Apache-2.0
 *
 * SECURITY NOTE:
 *   All credentials are sourced exclusively from process.env.  No credentials
 *   are accepted in request bodies, stored in-process beyond the registry
 *   state object, or returned in API responses.  Required environment variable
 *   names are documented per-service below.
 *
 *   Required process.env keys:
 *     SLACK_WEBHOOK_URL       - Incoming Webhook URL for /slack/send
 *     SLACK_BOT_TOKEN         - Bearer token for Slack Web API calls
 *     ZOOM_API_KEY            - Zoom Server-to-Server OAuth client ID
 *     ZOOM_API_SECRET         - Zoom Server-to-Server OAuth client secret
 *     ZOOM_ACCOUNT_ID         - Zoom account ID for token endpoint
 *     GITHUB_TOKEN            - Personal Access Token or GitHub App token
 *     GITHUB_ORG              - Default organisation for repo listing
 *     BITBUCKET_TOKEN         - Bitbucket App Password or OAuth token
 *     BITBUCKET_WORKSPACE     - Default Bitbucket workspace slug
 *     AWS_ACCESS_KEY_ID       - AWS credential (standard SDK env var)
 *     AWS_SECRET_ACCESS_KEY   - AWS credential (standard SDK env var)
 *     AWS_REGION              - Default AWS region
 *     AZURE_CLIENT_ID         - Azure AD app client ID
 *     AZURE_CLIENT_SECRET     - Azure AD client secret
 *     AZURE_TENANT_ID         - Azure AD tenant ID
 *     AZURE_SUBSCRIPTION_ID   - Target Azure subscription
 *     ADOBE_CLIENT_ID         - Adobe I/O client ID
 *     ADOBE_CLIENT_SECRET     - Adobe I/O client secret
 *     GOOGLE_CLIENT_ID        - Google OAuth 2.0 client ID
 *     GOOGLE_CLIENT_SECRET    - Google OAuth 2.0 client secret
 *     REDIS_URL               - Redis connection URI (e.g. redis://...)
 *
 * STORAGE NOTE:
 *   ConnectorRegistry uses a Map for runtime state.  In production, persist
 *   connector state to a database and store tokens in a KMS-backed store.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Supported services
// ---------------------------------------------------------------------------

/** @type {string[]} All supported connector service identifiers (lowercase). */
export const SUPPORTED_SERVICES = Object.freeze([
  'azure',
  'adobe',
  'aws',
  'google',
  'slack',
  'zoom',
  'github',
  'bitbucket',
  'redis',
]);

// ---------------------------------------------------------------------------
// ConnectorRegistry class
// Centralises connector lifecycle management with typed state.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ConnectorState
 * @property {string}      service
 * @property {string}      label           - Human-readable display name
 * @property {boolean}     connected
 * @property {string}      status          - 'connected'|'disconnected'|'error'|'testing'
 * @property {string|null} lastConnectedAt - ISO timestamp
 * @property {string|null} lastTestedAt    - ISO timestamp
 * @property {string|null} lastError
 * @property {Object}      meta            - Service-specific metadata (no secrets)
 */

/**
 * Manages connector lifecycle state for all registered services.
 * No credentials are stored here; only connection metadata.
 */
export class ConnectorRegistry {
  constructor() {
    /** @type {Map<string, ConnectorState>} service -> state */
    this._registry = new Map(
      SUPPORTED_SERVICES.map((svc) => [
        svc,
        ConnectorRegistry._defaultState(svc),
      ])
    );

    /** @type {Function[]} onChange listeners */
    this._listeners = [];
  }

  /**
   * Builds a default (disconnected) state object for a service.
   * @param {string} service
   * @returns {ConnectorState}
   */
  static _defaultState(service) {
    const labels = {
      azure: 'Microsoft Azure',
      adobe: 'Adobe Creative Cloud',
      aws: 'Amazon Web Services',
      google: 'Google Cloud / Workspace',
      slack: 'Slack',
      zoom: 'Zoom',
      github: 'GitHub',
      bitbucket: 'Bitbucket',
      redis: 'Redis',
    };
    return {
      service,
      label: labels[service] ?? service,
      connected: false,
      status: 'disconnected',
      lastConnectedAt: null,
      lastTestedAt: null,
      lastError: null,
      meta: {},
    };
  }

  /**
   * Returns all connector states (no secrets).
   * @returns {ConnectorState[]}
   */
  list() {
    return [...this._registry.values()];
  }

  /**
   * Returns the state for a single service.
   * @param {string} service
   * @returns {ConnectorState|null}
   */
  get(service) {
    return this._registry.get(service) ?? null;
  }

  /**
   * Transitions a service to the connected state.
   * @param {string} service
   * @param {Object} [meta={}] - Non-secret metadata (e.g. accountId, region)
   */
  connect(service, meta = {}) {
    this._update(service, {
      connected: true,
      status: 'connected',
      lastConnectedAt: new Date().toISOString(),
      lastError: null,
      meta,
    });
  }

  /**
   * Transitions a service to the disconnected state.
   * @param {string} service
   */
  disconnect(service) {
    this._update(service, {
      connected: false,
      status: 'disconnected',
      meta: {},
    });
  }

  /**
   * Records a connection test result.
   * @param {string}  service
   * @param {boolean} success
   * @param {string}  [errorMsg]
   */
  recordTest(service, success, errorMsg) {
    this._update(service, {
      status: success ? 'connected' : 'error',
      lastTestedAt: new Date().toISOString(),
      lastError: success ? null : (errorMsg ?? 'Connection test failed.'),
    });
  }

  /**
   * Registers an onChange listener.
   * @param {function(string, ConnectorState): void} fn
   */
  onChange(fn) {
    this._listeners.push(fn);
  }

  /**
   * Merges updates into a connector's state and notifies listeners.
   * @param {string} service
   * @param {Partial<ConnectorState>} updates
   */
  _update(service, updates) {
    const state = this._registry.get(service);
    if (!state) return;
    Object.assign(state, updates);
    this._registry.set(service, state);
    for (const fn of this._listeners) {
      try { fn(service, { ...state }); } catch { /* listener errors must not crash the registry */ }
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton registry
// ---------------------------------------------------------------------------

/** @type {ConnectorRegistry} */
const registry = new ConnectorRegistry();

// ---------------------------------------------------------------------------
// Credential presence helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if all listed env vars are set to non-empty strings.
 * @param {...string} vars
 * @returns {boolean}
 */
function hasEnvVars(...vars) {
  return vars.every((v) => typeof process.env[v] === 'string' && process.env[v].length > 0);
}

/**
 * Returns the missing env var names from a list.
 * @param {...string} vars
 * @returns {string[]}
 */
function missingEnvVars(...vars) {
  return vars.filter((v) => !process.env[v]);
}

/**
 * Service-specific credential requirement map.
 * Values are arrays of required process.env key names.
 * @type {Record<string, string[]>}
 */
const SERVICE_ENV_VARS = {
  azure:     ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID', 'AZURE_SUBSCRIPTION_ID'],
  adobe:     ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET'],
  aws:       ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
  google:    ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  slack:     ['SLACK_WEBHOOK_URL', 'SLACK_BOT_TOKEN'],
  zoom:      ['ZOOM_API_KEY', 'ZOOM_API_SECRET', 'ZOOM_ACCOUNT_ID'],
  github:    ['GITHUB_TOKEN'],
  bitbucket: ['BITBUCKET_TOKEN', 'BITBUCKET_WORKSPACE'],
  redis:     ['REDIS_URL'],
};

// ---------------------------------------------------------------------------
// Socket.io emitter helper
// ---------------------------------------------------------------------------

/**
 * Emits a socket.io event if the io instance is attached to the router.
 * @param {Router} router
 * @param {string} event
 * @param {object} payload
 */
function emitSocketEvent(router, event, payload) {
  if (router.io) {
    router.io.emit(event, payload);
  }
}

// ---------------------------------------------------------------------------
// Simulate connection test (stub)
// In production, replace each case with a real health-check call.
// ---------------------------------------------------------------------------

/**
 * Simulates a connectivity check for a given service.
 * Returns a result object rather than throwing on failure.
 *
 * @param {string} service
 * @returns {Promise<{ success: boolean, latencyMs: number, detail: string }>}
 */
async function testServiceConnection(service) {
  const start = Date.now();

  // Verify env vars are present before "connecting"
  const required = SERVICE_ENV_VARS[service] ?? [];
  const missing = missingEnvVars(...required);
  if (missing.length > 0) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      detail: `Missing required environment variables: ${missing.join(', ')}`,
    };
  }

  // In production each case would make a lightweight API call (e.g. HEAD request).
  await new Promise((r) => setTimeout(r, 20)); // simulate network latency

  return {
    success: true,
    latencyMs: Date.now() - start,
    detail: `${service} connection verified (stub).`,
  };
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

/**
 * Creates and returns the connectors Express router.
 * @returns {Router}
 */
export function createConnectorsRouter() {
  const router = Router();

  // Wire up change events to socket.io
  registry.onChange((service, state) => {
    emitSocketEvent(router, 'connector:status', { service, status: state.status, connected: state.connected });
  });

  // =========================================================================
  // GET /list - list all available connectors
  // =========================================================================
  router.get('/list', (_req, res) => {
    const data = registry.list().map((s) => ({
      ...s,
      credentialsConfigured: hasEnvVars(...(SERVICE_ENV_VARS[s.service] ?? [])),
    }));
    res.json({ ok: true, data });
  });

  // =========================================================================
  // POST /:service/connect - connect a service
  // =========================================================================
  router.post('/:service/connect', async (req, res) => {
    const service = req.params.service.toLowerCase();
    if (!SUPPORTED_SERVICES.includes(service)) {
      return res.status(404).json({ ok: false, error: `Unknown service: ${service}` });
    }

    const required = SERVICE_ENV_VARS[service] ?? [];
    const missing = missingEnvVars(...required);
    if (missing.length > 0) {
      return res.status(503).json({
        ok: false,
        error: `Service "${service}" cannot connect: missing environment variables.`,
        missing,
      });
    }

    // Non-secret metadata that may accompany the connect request
    const { region, workspace, org } = req.body ?? {};
    const meta = { ...(region && { region }), ...(workspace && { workspace }), ...(org && { org }) };

    registry.connect(service, meta);

    emitSocketEvent(router, 'connector:connected', { service, connectedAt: new Date().toISOString() });

    res.json({
      ok: true,
      data: registry.get(service),
    });
  });

  // =========================================================================
  // DELETE /:service/disconnect
  // =========================================================================
  router.delete('/:service/disconnect', (req, res) => {
    const service = req.params.service.toLowerCase();
    if (!SUPPORTED_SERVICES.includes(service)) {
      return res.status(404).json({ ok: false, error: `Unknown service: ${service}` });
    }

    registry.disconnect(service);
    emitSocketEvent(router, 'connector:disconnected', { service });

    res.json({ ok: true, data: { service, status: 'disconnected' } });
  });

  // =========================================================================
  // GET /:service/status
  // =========================================================================
  router.get('/:service/status', (req, res) => {
    const service = req.params.service.toLowerCase();
    if (!SUPPORTED_SERVICES.includes(service)) {
      return res.status(404).json({ ok: false, error: `Unknown service: ${service}` });
    }

    const state = registry.get(service);
    res.json({
      ok: true,
      data: {
        ...state,
        credentialsConfigured: hasEnvVars(...(SERVICE_ENV_VARS[service] ?? [])),
      },
    });
  });

  // =========================================================================
  // POST /:service/test - test connection
  // =========================================================================
  router.post('/:service/test', async (req, res) => {
    const service = req.params.service.toLowerCase();
    if (!SUPPORTED_SERVICES.includes(service)) {
      return res.status(404).json({ ok: false, error: `Unknown service: ${service}` });
    }

    const result = await testServiceConnection(service);
    registry.recordTest(service, result.success, result.detail);

    emitSocketEvent(router, 'connector:status', {
      service,
      testResult: result,
      status: registry.get(service)?.status,
    });

    res.json({ ok: true, data: { service, ...result } });
  });

  // =========================================================================
  // POST /slack/send - send a Slack message via Incoming Webhook
  // =========================================================================
  router.post('/slack/send', async (req, res) => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(503).json({
        ok: false,
        error: 'SLACK_WEBHOOK_URL is not configured in process.env.',
      });
    }

    const { text, blocks, channel, username } = req.body ?? {};
    if (!text && !blocks) {
      return res.status(400).json({ ok: false, error: 'Either text or blocks is required.' });
    }

    // Build the payload – channel/username override only works with Bot Token calls;
    // Incoming Webhooks ignore them but we include for forward-compat.
    const payload = {
      ...(text && { text }),
      ...(blocks && { blocks }),
      ...(channel && { channel }),
      ...(username && { username }),
    };

    // In production, use node-fetch / undici to POST to webhookUrl.
    // Stub response here to avoid external calls in dev:
    console.log(`[connectors/slack] Would POST to webhook: ${JSON.stringify(payload)}`);

    res.json({
      ok: true,
      data: {
        messageId: uuidv4(),
        channel: channel ?? '#general',
        timestamp: new Date().toISOString(),
        stub: 'Real POST to SLACK_WEBHOOK_URL required in production.',
      },
    });
  });

  // =========================================================================
  // POST /zoom/meeting - create a Zoom meeting
  // =========================================================================
  router.post('/zoom/meeting', async (req, res) => {
    const missing = missingEnvVars('ZOOM_API_KEY', 'ZOOM_API_SECRET', 'ZOOM_ACCOUNT_ID');
    if (missing.length > 0) {
      return res.status(503).json({
        ok: false,
        error: 'Zoom credentials are not configured in process.env.',
        missing,
      });
    }

    const {
      topic = 'Nexus AI Pro Meeting',
      type = 2,            // 2 = scheduled, 1 = instant
      startTime,           // ISO 8601 string
      duration = 60,       // minutes
      timezone = 'UTC',
      agenda = '',
      password,
    } = req.body ?? {};

    // In production: exchange ZOOM_API_KEY + ZOOM_API_SECRET for an access token,
    // then POST to https://api.zoom.us/v2/users/me/meetings.
    // Stub meeting data here:
    const meeting = {
      id: Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000,
      uuid: uuidv4(),
      topic,
      type,
      start_time: startTime ?? new Date(Date.now() + 3600 * 1000).toISOString(),
      duration,
      timezone,
      agenda,
      join_url: `https://zoom.us/j/stub-meeting-id`,
      host_url: `https://zoom.us/s/stub-meeting-id`,
      password: password ?? Math.random().toString(36).slice(2, 8),
      stub: 'Real Zoom API call required in production.',
    };

    res.status(201).json({ ok: true, data: meeting });
  });

  // =========================================================================
  // GET /github/repos - list GitHub repositories
  // =========================================================================
  router.get('/github/repos', async (req, res) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(503).json({
        ok: false,
        error: 'GITHUB_TOKEN is not configured in process.env.',
      });
    }

    const org = req.query.org ?? process.env.GITHUB_ORG;
    const per_page = Math.min(Number(req.query.per_page ?? 30), 100);
    const page = Number(req.query.page ?? 1);

    // In production: fetch from https://api.github.com/orgs/:org/repos or
    // https://api.github.com/user/repos using the token as a Bearer header.
    // Stub response:
    res.json({
      ok: true,
      data: {
        org: org ?? 'authenticated-user',
        per_page,
        page,
        repos: [],
        stub: 'Real GitHub API call required in production.',
      },
    });
  });

  // =========================================================================
  // POST /github/webhook - receive GitHub webhooks
  // =========================================================================
  router.post('/github/webhook', (req, res) => {
    const event = req.headers['x-github-event'];
    const delivery = req.headers['x-github-delivery'];
    const signature = req.headers['x-hub-signature-256'];

    // NOTE: In production, verify the webhook signature using HMAC-SHA256 with
    // a shared secret stored in process.env.GITHUB_WEBHOOK_SECRET before
    // processing any payload to prevent spoofed events.
    if (!event) {
      return res.status(400).json({ ok: false, error: 'Missing X-GitHub-Event header.' });
    }

    const payload = req.body ?? {};
    console.log(`[connectors/github] Webhook received: event=${event} delivery=${delivery}`);

    // Emit socket.io event for real-time dashboard updates
    emitSocketEvent(router, 'connector:github_webhook', {
      event,
      delivery,
      action: payload.action ?? null,
      repository: payload.repository?.full_name ?? null,
      sender: payload.sender?.login ?? null,
    });

    res.json({ ok: true, data: { received: true, event, delivery } });
  });

  // =========================================================================
  // GET /aws/status - AWS service status (stub)
  // =========================================================================
  router.get('/aws/status', async (req, res) => {
    const missing = missingEnvVars('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY');
    if (missing.length > 0) {
      return res.status(503).json({
        ok: false,
        error: 'AWS credentials are not configured in process.env.',
        missing,
      });
    }

    // In production: use @aws-sdk/client-health or check the AWS Health API.
    const region = process.env.AWS_REGION ?? 'us-east-1';

    res.json({
      ok: true,
      data: {
        region,
        services: [
          { name: 'EC2', status: 'operational' },
          { name: 'S3', status: 'operational' },
          { name: 'RDS', status: 'operational' },
          { name: 'Lambda', status: 'operational' },
          { name: 'CloudFront', status: 'operational' },
        ],
        checkedAt: new Date().toISOString(),
        stub: 'Real AWS Health API call required in production.',
      },
    });
  });

  // =========================================================================
  // GET /azure/status - Azure service status (stub)
  // =========================================================================
  router.get('/azure/status', async (req, res) => {
    const missing = missingEnvVars('AZURE_CLIENT_ID', 'AZURE_TENANT_ID');
    if (missing.length > 0) {
      return res.status(503).json({
        ok: false,
        error: 'Azure credentials are not configured in process.env.',
        missing,
      });
    }

    // In production: use @azure/arm-resourcehealth or call the Azure Resource
    // Health REST API with a token obtained via AZURE_CLIENT_ID/SECRET/TENANT_ID.
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID ?? 'not-set';

    res.json({
      ok: true,
      data: {
        subscriptionId,
        services: [
          { name: 'Virtual Machines', status: 'operational' },
          { name: 'Azure Blob Storage', status: 'operational' },
          { name: 'Azure SQL', status: 'operational' },
          { name: 'Azure Functions', status: 'operational' },
          { name: 'Azure CDN', status: 'operational' },
        ],
        checkedAt: new Date().toISOString(),
        stub: 'Real Azure Resource Health API call required in production.',
      },
    });
  });

  return router;
}

export default createConnectorsRouter();

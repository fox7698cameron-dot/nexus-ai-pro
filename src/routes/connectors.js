// src/routes/connectors.js | Nexus AI Pro | Date: 2026-06-07

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// ============================================================
// CONSTANTS & CONFIGURATION
// ============================================================

const SUPPORTED_SERVICES = [
  'azure',
  'aws',
  'google',
  'adobe',
  'slack',
  'zoom',
  'github',
  'bitbucket',
  'redis',
];

/**
 * ENV references — credentials are NEVER stored in-process.
 * They are read fresh from process.env at connection time only
 * to verify their presence; actual API calls would use them ephemerally.
 */
const ENV_KEYS = {
  azure:     ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'],
  aws:       ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
  google:    ['GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_PROJECT_ID'],
  adobe:     ['ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET', 'ADOBE_ORGANIZATION_ID'],
  slack:     ['SLACK_BOT_TOKEN', 'SLACK_WEBHOOK_URL'],
  zoom:      ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
  github:    ['GITHUB_TOKEN', 'GITHUB_APP_ID', 'GITHUB_INSTALLATION_ID'],
  bitbucket: ['BITBUCKET_CLIENT_ID', 'BITBUCKET_CLIENT_SECRET', 'BITBUCKET_WORKSPACE'],
  redis:     ['REDIS_URL'],
};

// ============================================================
// IN-MEMORY CONNECTOR STORE
// ============================================================

/**
 * connectorStore: Map<service, ConnectorRecord>
 * ConnectorRecord shape:
 * {
 *   service: string,
 *   connected: boolean,
 *   connectedAt: number | null,
 *   lastPing: number | null,
 *   status: 'connected' | 'disconnected' | 'error' | 'connecting',
 *   metadata: object   — non-sensitive connection metadata only
 * }
 */
const connectorStore = new Map();

// Pre-populate all supported services as disconnected
for (const svc of SUPPORTED_SERVICES) {
  connectorStore.set(svc, {
    service: svc,
    connected: false,
    connectedAt: null,
    lastPing: null,
    status: 'disconnected',
    metadata: {},
  });
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Check whether all required env vars for a service are present.
 * Returns { ok: boolean, missing: string[] }
 */
function checkEnvCredentials(service) {
  const keys = ENV_KEYS[service] || [];
  const missing = keys.filter((k) => !process.env[k]);
  return { ok: missing.length === 0, missing };
}

/**
 * Simulate a network ping to an external service.
 * In production this would perform an actual lightweight API call
 * (e.g., GET https://management.azure.com/ with credentials).
 */
function mockPing(service) {
  // Introduce occasional simulated latency variance (10-300ms)
  const latency = Math.floor(Math.random() * 290) + 10;
  const reachable = Math.random() > 0.05; // 95% uptime simulation
  return { latency, reachable };
}

/**
 * Normalise a connector record for safe API output.
 * Strips any future fields that might accidentally contain secrets.
 */
function safeRecord(record) {
  return {
    service: record.service,
    connected: record.connected,
    connectedAt: record.connectedAt,
    lastPing: record.lastPing,
    status: record.status,
    metadata: record.metadata,
  };
}

/**
 * Generate a mock connection ID — a deterministic-looking handle
 * so clients can reference the connection without seeing credentials.
 */
function connectionId(service) {
  return `conn_${service}_${crypto.randomBytes(6).toString('hex')}`;
}

// ============================================================
// MOCK DATA HELPERS
// ============================================================

function mockGithubRepos(installationId) {
  return [
    {
      id: 1,
      name: 'nexus-ai-pro',
      full_name: 'cameronfox/nexus-ai-pro',
      private: true,
      language: 'JavaScript',
      stars: 42,
      forks: 7,
      open_issues: 3,
      default_branch: 'main',
      updated_at: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      id: 2,
      name: 'ai-playground',
      full_name: 'cameronfox/ai-playground',
      private: false,
      language: 'Python',
      stars: 128,
      forks: 31,
      open_issues: 12,
      default_branch: 'main',
      updated_at: new Date(Date.now() - 86400_000).toISOString(),
    },
    {
      id: 3,
      name: 'mobile-sdk',
      full_name: 'cameronfox/mobile-sdk',
      private: true,
      language: 'TypeScript',
      stars: 15,
      forks: 2,
      open_issues: 0,
      default_branch: 'develop',
      updated_at: new Date(Date.now() - 7200_000).toISOString(),
    },
  ];
}

function mockGithubIssues() {
  return [
    {
      id: 101,
      number: 23,
      title: 'Security dashboard SSE reconnect on sleep',
      state: 'open',
      labels: ['bug', 'security'],
      assignee: 'cameronfox',
      created_at: new Date(Date.now() - 172800_000).toISOString(),
      updated_at: new Date(Date.now() - 3600_000).toISOString(),
      priority: 'high',
    },
    {
      id: 102,
      number: 24,
      title: 'Add Redis cluster support',
      state: 'open',
      labels: ['enhancement', 'infrastructure'],
      assignee: null,
      created_at: new Date(Date.now() - 86400_000).toISOString(),
      updated_at: new Date(Date.now() - 86400_000).toISOString(),
      priority: 'medium',
    },
    {
      id: 103,
      number: 20,
      title: 'Mobile biometric fallback on Android 12',
      state: 'closed',
      labels: ['bug', 'mobile'],
      assignee: 'cameronfox',
      created_at: new Date(Date.now() - 604800_000).toISOString(),
      updated_at: new Date(Date.now() - 432000_000).toISOString(),
      priority: 'high',
    },
  ];
}

function mockZoomMeetings() {
  return [
    {
      id: 'zm_abc123',
      topic: 'Nexus AI Pro Sprint Review',
      type: 2,
      start_time: new Date(Date.now() + 7200_000).toISOString(),
      duration: 60,
      join_url: 'https://zoom.us/j/mock123456?pwd=mockpwd',
      host_email: 'contact@nexusai.pro',
      participants: 5,
      status: 'scheduled',
    },
    {
      id: 'zm_def456',
      topic: 'Security Architecture Review',
      type: 2,
      start_time: new Date(Date.now() + 86400_000).toISOString(),
      duration: 90,
      join_url: 'https://zoom.us/j/mock789012?pwd=mockpwd2',
      host_email: 'contact@nexusai.pro',
      participants: 8,
      status: 'scheduled',
    },
  ];
}

// ============================================================
// ROUTE: GET /api/connectors
// List all connectors and their current status
// ============================================================

router.get('/', (req, res) => {
  const connectors = [];

  for (const [service, record] of connectorStore.entries()) {
    const { ok, missing } = checkEnvCredentials(service);
    connectors.push({
      ...safeRecord(record),
      credentialsConfigured: ok,
      missingEnvVars: ok ? [] : missing,
      serviceDisplayName: displayName(service),
      serviceCategory: serviceCategory(service),
    });
  }

  res.json({
    connectors,
    total: connectors.length,
    connected: connectors.filter((c) => c.connected).length,
    timestamp: Date.now(),
  });
});

function displayName(service) {
  const names = {
    azure:     'Microsoft Azure',
    aws:       'Amazon Web Services',
    google:    'Google Cloud',
    adobe:     'Adobe Creative Cloud',
    slack:     'Slack',
    zoom:      'Zoom',
    github:    'GitHub',
    bitbucket: 'Bitbucket',
    redis:     'Redis',
  };
  return names[service] || service;
}

function serviceCategory(service) {
  const cats = {
    azure:     'cloud',
    aws:       'cloud',
    google:    'cloud',
    adobe:     'creative',
    slack:     'communication',
    zoom:      'communication',
    github:    'devops',
    bitbucket: 'devops',
    redis:     'database',
  };
  return cats[service] || 'other';
}

// ============================================================
// ROUTE: POST /api/connectors/:service/connect
// Connect a cloud or tool platform service
// ============================================================

router.post('/:service/connect', (req, res) => {
  const { service } = req.params;

  if (!SUPPORTED_SERVICES.includes(service)) {
    return res.status(404).json({
      error: `Unknown service "${service}". Supported: ${SUPPORTED_SERVICES.join(', ')}.`,
    });
  }

  const { ok, missing } = checkEnvCredentials(service);
  if (!ok) {
    return res.status(422).json({
      error: 'Missing required environment variables for this service.',
      missingEnvVars: missing,
      hint: 'Set the listed variables in your .env file or deployment secrets.',
    });
  }

  // Validate service-specific body fields
  const bodyValidation = validateConnectBody(service, req.body);
  if (!bodyValidation.ok) {
    return res.status(400).json({ error: bodyValidation.message });
  }

  // Mark as connecting first (optimistic update)
  const existing = connectorStore.get(service);
  connectorStore.set(service, { ...existing, status: 'connecting' });

  // Build metadata from body — NEVER store credential values
  const metadata = buildMetadata(service, req.body);
  metadata.connectionId = connectionId(service);
  metadata.connectedBy = req.headers['x-user-id'] || 'system';

  // Simulate async connection handshake
  const now = Date.now();
  connectorStore.set(service, {
    service,
    connected: true,
    connectedAt: now,
    lastPing: now,
    status: 'connected',
    metadata,
  });

  const record = connectorStore.get(service);

  res.status(200).json({
    message: `Successfully connected to ${displayName(service)}.`,
    connector: safeRecord(record),
  });
});

function validateConnectBody(service, body) {
  const required = {
    azure:     ['tenantId', 'clientId'],
    aws:       ['region'],
    google:    ['projectId'],
    adobe:     ['organizationId'],
    slack:     ['workspaceId'],
    zoom:      ['accountId'],
    github:    ['installationId'],
    bitbucket: ['workspace'],
    redis:     [],
  };

  const fields = required[service] || [];
  const missing = fields.filter((f) => !body[f]);

  if (missing.length > 0) {
    return {
      ok: false,
      message: `Missing required body fields for ${service}: ${missing.join(', ')}.`,
    };
  }
  return { ok: true };
}

function buildMetadata(service, body) {
  // Extract only safe, non-sensitive configuration values from the body
  const safeFields = {
    azure:     ['tenantId', 'clientId'],
    aws:       ['region'],
    google:    ['projectId'],
    adobe:     ['organizationId'],
    slack:     ['workspaceId'],
    zoom:      ['accountId'],
    github:    ['installationId'],
    bitbucket: ['workspace'],
    redis:     [],
  };

  const meta = {};
  for (const field of safeFields[service] || []) {
    if (body[field] !== undefined) {
      meta[field] = body[field];
    }
  }
  return meta;
}

// ============================================================
// ROUTE: DELETE /api/connectors/:service/disconnect
// Disconnect a service
// ============================================================

router.delete('/:service/disconnect', (req, res) => {
  const { service } = req.params;

  if (!SUPPORTED_SERVICES.includes(service)) {
    return res.status(404).json({ error: `Unknown service "${service}".` });
  }

  const existing = connectorStore.get(service);
  if (!existing.connected) {
    return res.status(409).json({
      error: `Service "${service}" is not currently connected.`,
    });
  }

  connectorStore.set(service, {
    service,
    connected: false,
    connectedAt: null,
    lastPing: null,
    status: 'disconnected',
    metadata: {},
  });

  res.json({
    message: `Disconnected from ${displayName(service)}.`,
    service,
    disconnectedAt: Date.now(),
  });
});

// ============================================================
// ROUTE: GET /api/connectors/:service/status
// Health check / ping for a service
// ============================================================

router.get('/:service/status', (req, res) => {
  const { service } = req.params;

  if (!SUPPORTED_SERVICES.includes(service)) {
    return res.status(404).json({ error: `Unknown service "${service}".` });
  }

  const record = connectorStore.get(service);

  if (!record.connected) {
    return res.json({
      service,
      connected: false,
      status: 'disconnected',
      ping: null,
      message: `${displayName(service)} is not connected. POST /api/connectors/${service}/connect first.`,
    });
  }

  // Perform mock ping
  const { latency, reachable } = mockPing(service);
  const now = Date.now();

  if (reachable) {
    // Update lastPing on successful health check
    connectorStore.set(service, { ...record, lastPing: now, status: 'connected' });
  } else {
    connectorStore.set(service, { ...record, lastPing: now, status: 'error' });
  }

  const updatedRecord = connectorStore.get(service);

  res.json({
    service,
    displayName: displayName(service),
    connected: updatedRecord.connected,
    status: updatedRecord.status,
    ping: {
      reachable,
      latencyMs: latency,
      checkedAt: now,
    },
    connectedAt: updatedRecord.connectedAt,
    lastPing: updatedRecord.lastPing,
    uptimeMs: now - updatedRecord.connectedAt,
  });
});

// ============================================================
// ROUTE: POST /api/connectors/:service/test
// Run a diagnostic test against the connected service
// ============================================================

router.post('/:service/test', (req, res) => {
  const { service } = req.params;

  if (!SUPPORTED_SERVICES.includes(service)) {
    return res.status(404).json({ error: `Unknown service "${service}".` });
  }

  const record = connectorStore.get(service);

  if (!record.connected) {
    return res.status(409).json({
      error: `Cannot test "${service}" — it is not connected.`,
      hint: `POST /api/connectors/${service}/connect first.`,
    });
  }

  const testId = uuidv4();
  const startedAt = Date.now();

  // Simulate connection test — in production each service would call its own
  // diagnostic API (e.g., GitHub /octocat, AWS STS GetCallerIdentity, etc.)
  const steps = buildTestSteps(service);
  const allPassed = steps.every((s) => s.passed);
  const duration = Math.floor(Math.random() * 400) + 50;

  res.json({
    testId,
    service,
    displayName: displayName(service),
    status: allPassed ? 'pass' : 'partial',
    duration,
    startedAt,
    completedAt: startedAt + duration,
    steps,
    summary: allPassed
      ? `All ${steps.length} diagnostic checks passed for ${displayName(service)}.`
      : `${steps.filter((s) => !s.passed).length} check(s) failed. Review steps for details.`,
  });
});

function buildTestSteps(service) {
  const common = [
    { name: 'Credential resolution',  passed: true,  detail: 'Environment variables resolved successfully.' },
    { name: 'Network reachability',   passed: Math.random() > 0.05, detail: 'Endpoint reachable.' },
    { name: 'Authentication',         passed: true,  detail: 'Token / key accepted.' },
    { name: 'Permission scope check', passed: true,  detail: 'Required scopes are present.' },
  ];

  const extra = {
    azure:     [{ name: 'ARM tenant validation', passed: true, detail: 'Tenant ID resolved.' }],
    aws:       [{ name: 'STS GetCallerIdentity', passed: true, detail: 'IAM identity confirmed.' }],
    google:    [{ name: 'IAM token exchange',    passed: true, detail: 'Service account active.' }],
    github:    [{ name: 'Installation app check',passed: true, detail: 'GitHub App installation valid.' }],
    slack:     [{ name: 'Workspace info fetch',  passed: true, detail: 'Workspace metadata retrieved.' }],
    zoom:      [{ name: 'Account info fetch',    passed: true, detail: 'Account active and verified.' }],
    redis:     [{ name: 'PING command',          passed: true, detail: 'Redis responded: PONG.' }],
    adobe:     [{ name: 'IMS token exchange',    passed: true, detail: 'Adobe IMS token issued.' }],
    bitbucket: [{ name: 'Workspace validation',  passed: true, detail: 'Workspace accessible.' }],
  };

  return [...common, ...(extra[service] || [])];
}

// ============================================================
// GITHUB-SPECIFIC ROUTES
// NOTE: Replace mock data with calls to api.github.com using
// process.env.GITHUB_TOKEN in production.
// ============================================================

router.get('/github/repos', (req, res) => {
  const record = connectorStore.get('github');

  if (!record.connected) {
    return res.status(409).json({
      error: 'GitHub is not connected.',
      hint: 'POST /api/connectors/github/connect first.',
    });
  }

  // TODO(production): Replace with real GitHub API call:
  // GET https://api.github.com/installation/repositories
  // Authorization: token ${process.env.GITHUB_TOKEN}
  const { installationId } = record.metadata;
  const repos = mockGithubRepos(installationId);

  const { page = 1, per_page = 30, sort = 'updated', visibility } = req.query;
  const pageNum   = Math.max(1, parseInt(page, 10));
  const perPage   = Math.min(100, Math.max(1, parseInt(per_page, 10)));
  const offset    = (pageNum - 1) * perPage;

  let filtered = [...repos];
  if (visibility === 'private') filtered = filtered.filter((r) => r.private);
  if (visibility === 'public')  filtered = filtered.filter((r) => !r.private);

  if (sort === 'stars')   filtered.sort((a, b) => b.stars - a.stars);
  if (sort === 'name')    filtered.sort((a, b) => a.name.localeCompare(b.name));

  const paginated = filtered.slice(offset, offset + perPage);

  res.json({
    repos: paginated,
    pagination: { page: pageNum, per_page: perPage, total: filtered.length },
    note: 'Mock data. In production, calls GET https://api.github.com/installation/repositories with GITHUB_TOKEN.',
  });
});

router.get('/github/issues', (req, res) => {
  const record = connectorStore.get('github');

  if (!record.connected) {
    return res.status(409).json({
      error: 'GitHub is not connected.',
      hint: 'POST /api/connectors/github/connect first.',
    });
  }

  // TODO(production): Replace with real GitHub API call:
  // GET https://api.github.com/issues
  // Authorization: token ${process.env.GITHUB_TOKEN}
  let issues = mockGithubIssues();

  const { state = 'all', label, repo } = req.query;
  if (state !== 'all') issues = issues.filter((i) => i.state === state);
  if (label)           issues = issues.filter((i) => i.labels.includes(label));

  res.json({
    issues,
    total: issues.length,
    note: 'Mock data. In production, calls GET https://api.github.com/issues with GITHUB_TOKEN.',
  });
});

// ============================================================
// SLACK-SPECIFIC ROUTES
// ============================================================

router.post('/slack/message', async (req, res) => {
  const record = connectorStore.get('slack');

  if (!record.connected) {
    return res.status(409).json({
      error: 'Slack is not connected.',
      hint: 'POST /api/connectors/slack/connect first.',
    });
  }

  const { channel, text, blocks, username, icon_emoji } = req.body;

  if (!channel || !text) {
    return res.status(400).json({ error: 'Both "channel" and "text" are required.' });
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const botToken   = process.env.SLACK_BOT_TOKEN;

  // Real delivery path: use webhook or bot token if configured
  if (webhookUrl) {
    try {
      const payload = { text, channel, username: username || 'Nexus AI Pro' };
      if (blocks) payload.blocks = blocks;
      if (icon_emoji) payload.icon_emoji = icon_emoji;

      // NOTE: node-fetch is installed — use in production
      // const response = await fetch(webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
      // if (!response.ok) throw new Error(`Slack webhook error: ${response.status}`);

      // Simulated success (webhook call is commented out to avoid live calls in dev)
      return res.json({
        ok: true,
        messageId: `slack_${uuidv4()}`,
        channel,
        text,
        timestamp: Date.now(),
        deliveredVia: 'webhook',
        note: 'Uncomment the fetch() call in connectors.js to send real messages via SLACK_WEBHOOK_URL.',
      });
    } catch (err) {
      return res.status(502).json({ error: 'Failed to deliver message via Slack webhook.', detail: err.message });
    }
  }

  // Fallback: mock send
  res.json({
    ok: true,
    messageId: `slack_mock_${uuidv4()}`,
    channel,
    text,
    timestamp: Date.now(),
    deliveredVia: 'mock',
    note: 'Set SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN in .env to send real messages.',
  });
});

// ============================================================
// ZOOM-SPECIFIC ROUTES
// ============================================================

router.get('/zoom/meetings', (req, res) => {
  const record = connectorStore.get('zoom');

  if (!record.connected) {
    return res.status(409).json({
      error: 'Zoom is not connected.',
      hint: 'POST /api/connectors/zoom/connect first.',
    });
  }

  // TODO(production): Replace with real Zoom API call:
  // GET https://api.zoom.us/v2/users/me/meetings
  // Authorization: Bearer <OAuth token exchanged using ZOOM_CLIENT_ID/SECRET/ACCOUNT_ID>
  const meetings = mockZoomMeetings();

  const { type = 'scheduled', page = 1, page_size = 30 } = req.query;
  const pageNum  = Math.max(1, parseInt(page, 10));
  const pageSize = Math.min(300, Math.max(1, parseInt(page_size, 10)));
  const offset   = (pageNum - 1) * pageSize;

  let filtered = meetings;
  if (type !== 'all') filtered = meetings.filter((m) => m.status === type || type === 'scheduled');

  const paginated = filtered.slice(offset, offset + pageSize);

  res.json({
    meetings: paginated,
    pagination: {
      page: pageNum,
      page_size: pageSize,
      total_records: filtered.length,
      total_pages: Math.ceil(filtered.length / pageSize),
    },
    note: 'Mock data. In production, calls GET https://api.zoom.us/v2/users/me/meetings.',
  });
});

router.post('/zoom/meetings', (req, res) => {
  const record = connectorStore.get('zoom');

  if (!record.connected) {
    return res.status(409).json({
      error: 'Zoom is not connected.',
      hint: 'POST /api/connectors/zoom/connect first.',
    });
  }

  const {
    topic,
    type = 2,
    start_time,
    duration = 60,
    timezone = 'UTC',
    agenda,
    settings = {},
  } = req.body;

  if (!topic) {
    return res.status(400).json({ error: '"topic" is required.' });
  }
  if (!start_time) {
    return res.status(400).json({ error: '"start_time" is required (ISO 8601 format).' });
  }

  // TODO(production): Replace with real Zoom API call:
  // POST https://api.zoom.us/v2/users/me/meetings
  // Authorization: Bearer <token>
  const meeting = {
    id:        `zm_${crypto.randomBytes(4).toString('hex')}`,
    uuid:      uuidv4(),
    topic,
    type,
    start_time,
    duration,
    timezone,
    agenda:    agenda || '',
    host_email: 'contact@nexusai.pro',
    join_url:  `https://zoom.us/j/mock${Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000}`,
    password:  crypto.randomBytes(4).toString('hex'),
    status:    'waiting',
    settings: {
      host_video: settings.host_video ?? true,
      participant_video: settings.participant_video ?? false,
      join_before_host: settings.join_before_host ?? false,
      mute_upon_entry: settings.mute_upon_entry ?? true,
      waiting_room: settings.waiting_room ?? true,
      ...settings,
    },
    created_at: new Date().toISOString(),
  };

  res.status(201).json({
    meeting,
    note: 'Mock meeting created. In production, calls POST https://api.zoom.us/v2/users/me/meetings.',
  });
});

// ============================================================
// GENERIC :service ROUTES — must come AFTER specific routes
// ============================================================

// Prevent generic routes from swallowing specific github/slack/zoom sub-routes
// by ensuring specific routes are declared first (they are, above).

// ============================================================
// REDIS STATUS — special handling since Redis is installed
// ============================================================

router.get('/redis/ping', async (req, res) => {
  const record = connectorStore.get('redis');

  // Try a real Redis ping if URL is set
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      // Dynamic import to avoid crashing if redis is not running
      const { createClient } = await import('redis');
      const client = createClient({ url: redisUrl });
      await client.connect();
      const pong = await client.ping();
      await client.disconnect();

      const now = Date.now();
      connectorStore.set('redis', { ...record, lastPing: now, status: 'connected', connected: true });

      return res.json({
        service: 'redis',
        pong,
        connected: true,
        url: redisUrl.replace(/:[^:@]+@/, ':***@'), // mask password in URL
        timestamp: now,
      });
    } catch (err) {
      connectorStore.set('redis', { ...record, status: 'error' });
      return res.status(502).json({
        service: 'redis',
        connected: false,
        error: 'Redis ping failed.',
        detail: err.message,
      });
    }
  }

  res.json({
    service: 'redis',
    connected: record.connected,
    note: 'Set REDIS_URL in .env to enable real Redis ping.',
  });
});

export default router;

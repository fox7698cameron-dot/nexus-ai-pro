// src/routes/dev.js | Nexus AI Pro | Date: 2026-06-07

/**
 * Developer Dashboard API Router
 *
 * Provides API key management, usage statistics, webhook management,
 * model/integration health, build history, code coverage, feature flags,
 * and live system info for developer and admin users.
 *
 * Auth: checks `x-user-role` header for 'developer' or 'admin'.
 * Storage: in-memory Maps (MVP — swap for DB layer before production).
 */

import { Router } from 'express';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_ROLES = new Set(['developer', 'admin']);
const KEY_PREFIX = 'nxp_';
const KEY_BYTE_LENGTH = 32;

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

/**
 * apiKeysStore: Map<id, apiKeyRecord>
 *
 * apiKeyRecord shape:
 * {
 *   id: string,
 *   name: string,
 *   prefix: string,       // first 8 chars of raw key (safe to expose)
 *   keyHash: string,      // SHA-256 of raw key — never exposed
 *   scopes: string[],
 *   createdAt: string,    // ISO-8601
 *   lastUsed: string|null,
 *   usageCount: number,
 *   revoked: boolean,
 * }
 */
const apiKeysStore = new Map();

/**
 * webhooksStore: Map<id, webhookRecord>
 *
 * webhookRecord shape:
 * {
 *   id: string,
 *   url: string,
 *   events: string[],
 *   secretHash: string,   // SHA-256 of the caller-supplied secret
 *   createdAt: string,
 *   active: boolean,
 * }
 */
const webhooksStore = new Map();

/**
 * featureFlagsStore: Map<flagName, { enabled: boolean, updatedAt: string }>
 */
const featureFlagsStore = new Map([
  ['dark-mode-v2',          { enabled: true,  updatedAt: new Date().toISOString() }],
  ['streaming-responses',   { enabled: true,  updatedAt: new Date().toISOString() }],
  ['multi-agent-collab',    { enabled: false, updatedAt: new Date().toISOString() }],
  ['semantic-cache',        { enabled: true,  updatedAt: new Date().toISOString() }],
  ['cost-guardrails',       { enabled: false, updatedAt: new Date().toISOString() }],
  ['image-gen-v3',          { enabled: false, updatedAt: new Date().toISOString() }],
  ['rag-hybrid-search',     { enabled: true,  updatedAt: new Date().toISOString() }],
  ['realtime-collab',       { enabled: false, updatedAt: new Date().toISOString() }],
  ['fine-tune-ui',          { enabled: false, updatedAt: new Date().toISOString() }],
  ['model-benchmarking',    { enabled: true,  updatedAt: new Date().toISOString() }],
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Middleware: enforce developer or admin role via x-user-role header.
 */
function requireDevRole(req, res, next) {
  const role = (req.headers['x-user-role'] || '').trim().toLowerCase();
  if (!ALLOWED_ROLES.has(role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'This endpoint requires the developer or admin role.',
      requiredRoles: ['developer', 'admin'],
    });
  }
  next();
}

/**
 * Generate a short UUID-ish ID (safe for IDs, not a full UUID).
 */
function newId() {
  return crypto.randomBytes(10).toString('hex');
}

/**
 * SHA-256 hash, returned as a hex string.
 */
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Clamp a float to [0, 100] and round to 2 decimal places.
 */
function pct(value) {
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

/**
 * Random integer in [min, max] inclusive.
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random float in [min, max) rounded to `decimals` places.
 */
function randFloat(min, max, decimals = 2) {
  const v = Math.random() * (max - min) + min;
  return parseFloat(v.toFixed(decimals));
}

/**
 * ISO timestamp offset by `offsetMs` from now.
 */
function isoOffset(offsetMs) {
  return new Date(Date.now() + offsetMs).toISOString();
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// Apply role guard to all routes in this router.
router.use(requireDevRole);

// ===========================================================================
// 1–3. API KEY MANAGEMENT
// ===========================================================================

/**
 * GET /api/dev/api-keys
 * List API key metadata — raw keys are never returned.
 */
router.get('/api-keys', (req, res) => {
  const keys = [];
  for (const record of apiKeysStore.values()) {
    if (record.revoked) continue;
    keys.push({
      id:         record.id,
      name:       record.name,
      prefix:     record.prefix,
      scopes:     record.scopes,
      createdAt:  record.createdAt,
      lastUsed:   record.lastUsed,
      usageCount: record.usageCount,
    });
  }
  return res.json({ apiKeys: keys, total: keys.length });
});

/**
 * POST /api/dev/api-keys
 * Create a new API key.
 * Body: { name: string, scopes: string[] }
 * Returns the raw key ONCE — it is not stored.
 */
router.post('/api-keys', (req, res) => {
  const { name, scopes } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Validation', message: '`name` is required.' });
  }
  if (scopes !== undefined && !Array.isArray(scopes)) {
    return res.status(400).json({ error: 'Validation', message: '`scopes` must be an array.' });
  }

  // Generate raw key — shown to the caller exactly once.
  const rawKey  = KEY_PREFIX + crypto.randomBytes(KEY_BYTE_LENGTH).toString('hex');
  const keyHash = sha256(rawKey);
  const prefix  = rawKey.slice(0, KEY_PREFIX.length + 8); // "nxp_" + 8 hex chars

  const id = newId();
  const record = {
    id,
    name:       name.trim(),
    prefix,
    keyHash,
    scopes:     Array.isArray(scopes) ? scopes.map(String) : [],
    createdAt:  new Date().toISOString(),
    lastUsed:   null,
    usageCount: 0,
    revoked:    false,
  };

  apiKeysStore.set(id, record);

  return res.status(201).json({
    message: 'API key created. Copy the key now — it will not be shown again.',
    key:     rawKey,   // raw key returned ONCE only
    id:      record.id,
    name:    record.name,
    prefix:  record.prefix,
    scopes:  record.scopes,
    createdAt: record.createdAt,
  });
});

/**
 * DELETE /api/dev/api-keys/:id
 * Revoke an API key by ID.
 */
router.delete('/api-keys/:id', (req, res) => {
  const record = apiKeysStore.get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Not Found', message: 'API key not found.' });
  }
  if (record.revoked) {
    return res.status(409).json({ error: 'Conflict', message: 'API key is already revoked.' });
  }
  record.revoked = true;
  return res.json({ message: 'API key revoked.', id: record.id });
});

// ===========================================================================
// 4. USAGE STATISTICS
// ===========================================================================

/**
 * GET /api/dev/usage
 * Returns API usage statistics with realistic mock data.
 */
router.get('/usage', (req, res) => {
  const requestsToday    = randInt(1_200, 8_500);
  const requestsThisWeek = randInt(requestsToday * 5, requestsToday * 7);
  const avgLatencyMs     = randFloat(45, 320, 1);
  const errorRate        = randFloat(0.2, 3.8, 2);       // percent

  const byModel = {
    'claude-sonnet-4-5':  { requests: randInt(400, 2000), avgLatencyMs: randFloat(80, 200, 1) },
    'claude-opus-4':      { requests: randInt(100,  800), avgLatencyMs: randFloat(200, 500, 1) },
    'gpt-4o':             { requests: randInt(200, 1500), avgLatencyMs: randFloat(60, 180, 1) },
    'gpt-4o-mini':        { requests: randInt(300, 2500), avgLatencyMs: randFloat(30,  90, 1) },
    'gemini-2.0-flash':   { requests: randInt(150, 1200), avgLatencyMs: randFloat(40, 150, 1) },
    'llama-3.3-70b':      { requests: randInt(50,   600), avgLatencyMs: randFloat(70, 250, 1) },
  };

  const byEndpoint = [
    { endpoint: '/api/chat/completions',     requests: randInt(500, 3000), p99Ms: randFloat(150, 600, 1) },
    { endpoint: '/api/embeddings',           requests: randInt(200, 1000), p99Ms: randFloat(30,  120, 1) },
    { endpoint: '/api/images/generate',      requests: randInt(50,   400), p99Ms: randFloat(800, 4000, 1) },
    { endpoint: '/api/audio/transcriptions', requests: randInt(30,   300), p99Ms: randFloat(200, 900, 1) },
    { endpoint: '/api/files/upload',         requests: randInt(20,   200), p99Ms: randFloat(100, 500, 1) },
    { endpoint: '/api/assistants',           requests: randInt(100,  800), p99Ms: randFloat(80,  250, 1) },
  ];

  // Hourly request distribution (last 24 h)
  const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
    hour:     i,
    requests: randInt(20, requestsToday / 18),
  }));

  return res.json({
    requestsToday,
    requestsThisWeek,
    avgLatencyMs,
    errorRate,
    byModel,
    byEndpoint,
    hourlyDistribution,
    generatedAt: new Date().toISOString(),
  });
});

// ===========================================================================
// 5–8. WEBHOOK MANAGEMENT
// ===========================================================================

const VALID_WEBHOOK_EVENTS = [
  'request.completed',
  'request.failed',
  'model.switched',
  'quota.exceeded',
  'key.revoked',
  'build.completed',
  'build.failed',
  'integration.degraded',
];

/**
 * GET /api/dev/webhooks
 * List all registered webhooks.
 */
router.get('/webhooks', (req, res) => {
  const hooks = [];
  for (const record of webhooksStore.values()) {
    hooks.push({
      id:        record.id,
      url:       record.url,
      events:    record.events,
      createdAt: record.createdAt,
      active:    record.active,
    });
  }
  return res.json({ webhooks: hooks, total: hooks.length });
});

/**
 * POST /api/dev/webhooks
 * Register a new webhook.
 * Body: { url: string, events: string[], secret: string }
 */
router.post('/webhooks', (req, res) => {
  const { url, events, secret } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Validation', message: '`url` is required.' });
  }
  if (!url.startsWith('https://')) {
    return res.status(400).json({
      error: 'Validation',
      message: 'Webhook `url` must use HTTPS.',
    });
  }
  // Basic URL parse validation
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Validation', message: '`url` is not a valid URL.' });
  }
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Validation', message: '`events` must be a non-empty array.' });
  }
  const invalidEvents = events.filter(e => !VALID_WEBHOOK_EVENTS.includes(e));
  if (invalidEvents.length > 0) {
    return res.status(400).json({
      error:         'Validation',
      message:       `Unknown event type(s): ${invalidEvents.join(', ')}`,
      validEvents:   VALID_WEBHOOK_EVENTS,
    });
  }
  if (!secret || typeof secret !== 'string' || secret.length < 16) {
    return res.status(400).json({
      error:   'Validation',
      message: '`secret` is required and must be at least 16 characters.',
    });
  }

  const id = newId();
  const record = {
    id,
    url,
    events,
    secretHash: sha256(secret), // store hash only — never store or log the raw secret
    createdAt:  new Date().toISOString(),
    active:     true,
  };
  webhooksStore.set(id, record);

  return res.status(201).json({
    message:   'Webhook registered.',
    id:        record.id,
    url:       record.url,
    events:    record.events,
    createdAt: record.createdAt,
    active:    record.active,
  });
});

/**
 * DELETE /api/dev/webhooks/:id
 * Remove a webhook.
 */
router.delete('/webhooks/:id', (req, res) => {
  if (!webhooksStore.has(req.params.id)) {
    return res.status(404).json({ error: 'Not Found', message: 'Webhook not found.' });
  }
  webhooksStore.delete(req.params.id);
  return res.json({ message: 'Webhook deleted.', id: req.params.id });
});

/**
 * POST /api/dev/webhooks/:id/test
 * Deliver a test payload to the webhook URL using fetch.
 */
router.post('/webhooks/:id/test', async (req, res) => {
  const record = webhooksStore.get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Not Found', message: 'Webhook not found.' });
  }

  const payload = {
    event:       'webhook.test',
    webhookId:   record.id,
    timestamp:   new Date().toISOString(),
    description: 'Test delivery from Nexus AI Pro developer dashboard.',
    data:        { ok: true },
  };

  // Sign the payload so the receiver can verify authenticity.
  // We re-derive from the hash we stored by including it in the header —
  // real implementations would store the secret in a vault, not as a hash.
  const bodyStr  = JSON.stringify(payload);
  const hmacSig  = crypto
    .createHmac('sha256', record.secretHash)  // MVP: use stored hash as HMAC key
    .update(bodyStr)
    .digest('hex');

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 10_000); // 10 s timeout

  try {
    const response = await fetch(record.url, {
      method:  'POST',
      headers: {
        'Content-Type':           'application/json',
        'X-Nexus-Signature-256':  `sha256=${hmacSig}`,
        'X-Nexus-Delivery-Id':    newId(),
        'X-Nexus-Event':          payload.event,
        'User-Agent':             'NexusAIPro-Webhooks/2.0',
      },
      body:    bodyStr,
      signal:  controller.signal,
    });

    clearTimeout(timeoutId);

    return res.json({
      message:         'Test payload delivered.',
      webhookId:       record.id,
      url:             record.url,
      responseStatus:  response.status,
      responseOk:      response.ok,
      deliveredAt:     new Date().toISOString(),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const timedOut = err.name === 'AbortError';
    return res.status(502).json({
      error:     timedOut ? 'Timeout' : 'DeliveryFailed',
      message:   timedOut
        ? 'Webhook delivery timed out after 10 seconds.'
        : `Failed to deliver test payload: ${err.message}`,
      webhookId: record.id,
      url:       record.url,
    });
  }
});

// ===========================================================================
// 9. AI MODEL CATALOG
// ===========================================================================

/**
 * GET /api/dev/models
 * List all AI models with configuration status and usage metrics.
 */
router.get('/models', (req, res) => {
  const models = [
    {
      id:          'claude-sonnet-4-5',
      provider:    'anthropic',
      family:      'claude',
      displayName: 'Claude Sonnet 4.5',
      contextWindow: 200_000,
      supportsVision: true,
      supportsTools:  true,
      active:      true,
      configured:  true,
      usageThisMonth: randInt(5_000, 50_000),
      avgLatencyMs:   randFloat(80, 200, 1),
      costPer1kTokens: 0.003,
    },
    {
      id:          'claude-opus-4',
      provider:    'anthropic',
      family:      'claude',
      displayName: 'Claude Opus 4',
      contextWindow: 200_000,
      supportsVision: true,
      supportsTools:  true,
      active:      true,
      configured:  true,
      usageThisMonth: randInt(1_000, 15_000),
      avgLatencyMs:   randFloat(200, 500, 1),
      costPer1kTokens: 0.015,
    },
    {
      id:          'claude-haiku-3-5',
      provider:    'anthropic',
      family:      'claude',
      displayName: 'Claude Haiku 3.5',
      contextWindow: 200_000,
      supportsVision: true,
      supportsTools:  true,
      active:      true,
      configured:  true,
      usageThisMonth: randInt(10_000, 100_000),
      avgLatencyMs:   randFloat(20, 70, 1),
      costPer1kTokens: 0.00025,
    },
    {
      id:          'gpt-4o',
      provider:    'openai',
      family:      'gpt',
      displayName: 'GPT-4o',
      contextWindow: 128_000,
      supportsVision: true,
      supportsTools:  true,
      active:      true,
      configured:  true,
      usageThisMonth: randInt(3_000, 30_000),
      avgLatencyMs:   randFloat(60, 180, 1),
      costPer1kTokens: 0.005,
    },
    {
      id:          'gpt-4o-mini',
      provider:    'openai',
      family:      'gpt',
      displayName: 'GPT-4o mini',
      contextWindow: 128_000,
      supportsVision: true,
      supportsTools:  true,
      active:      true,
      configured:  true,
      usageThisMonth: randInt(8_000, 80_000),
      avgLatencyMs:   randFloat(25, 80, 1),
      costPer1kTokens: 0.00015,
    },
    {
      id:          'o3',
      provider:    'openai',
      family:      'o-series',
      displayName: 'o3',
      contextWindow: 200_000,
      supportsVision: false,
      supportsTools:  true,
      active:      false,
      configured:  false,
      usageThisMonth: 0,
      avgLatencyMs:   null,
      costPer1kTokens: 0.06,
    },
    {
      id:          'gemini-2.0-flash',
      provider:    'google',
      family:      'gemini',
      displayName: 'Gemini 2.0 Flash',
      contextWindow: 1_000_000,
      supportsVision: true,
      supportsTools:  true,
      active:      true,
      configured:  true,
      usageThisMonth: randInt(2_000, 20_000),
      avgLatencyMs:   randFloat(40, 150, 1),
      costPer1kTokens: 0.000075,
    },
    {
      id:          'gemini-2.5-pro',
      provider:    'google',
      family:      'gemini',
      displayName: 'Gemini 2.5 Pro',
      contextWindow: 1_000_000,
      supportsVision: true,
      supportsTools:  true,
      active:      false,
      configured:  false,
      usageThisMonth: 0,
      avgLatencyMs:   null,
      costPer1kTokens: 0.00125,
    },
    {
      id:          'llama-3.3-70b',
      provider:    'meta',
      family:      'llama',
      displayName: 'Llama 3.3 70B',
      contextWindow: 128_000,
      supportsVision: false,
      supportsTools:  true,
      active:      true,
      configured:  true,
      usageThisMonth: randInt(500, 8_000),
      avgLatencyMs:   randFloat(70, 250, 1),
      costPer1kTokens: 0.00072,
    },
    {
      id:          'mistral-large-2',
      provider:    'mistral',
      family:      'mistral',
      displayName: 'Mistral Large 2',
      contextWindow: 128_000,
      supportsVision: false,
      supportsTools:  true,
      active:      false,
      configured:  false,
      usageThisMonth: 0,
      avgLatencyMs:   null,
      costPer1kTokens: 0.003,
    },
  ];

  const activeCount     = models.filter(m => m.active).length;
  const configuredCount = models.filter(m => m.configured).length;

  return res.json({ models, total: models.length, activeCount, configuredCount });
});

// ===========================================================================
// 10. INTEGRATIONS HEALTH
// ===========================================================================

/**
 * GET /api/dev/integrations
 * Return health status for all external integrations.
 */
router.get('/integrations', (req, res) => {
  function healthStatus() {
    const roll = Math.random();
    if (roll < 0.75) return 'healthy';
    if (roll < 0.92) return 'degraded';
    return 'offline';
  }

  function buildIntegration(name, { latencyBase = 30, latencyRange = 80 } = {}) {
    const status  = healthStatus();
    const latency = status === 'offline' ? null : randFloat(latencyBase, latencyBase + latencyRange, 1);
    return {
      name,
      status,
      latency,
      lastCheck: isoOffset(-randInt(5_000, 60_000)),  // within the last minute
      uptime7d:  status === 'offline' ? randFloat(80, 95, 2) : randFloat(97, 100, 2),
    };
  }

  return res.json({
    github:    buildIntegration('GitHub',          { latencyBase: 40,  latencyRange: 120 }),
    azure:     buildIntegration('Azure',           { latencyBase: 20,  latencyRange: 80  }),
    aws:       buildIntegration('AWS',             { latencyBase: 15,  latencyRange: 60  }),
    google:    buildIntegration('Google Cloud',    { latencyBase: 25,  latencyRange: 90  }),
    slack:     buildIntegration('Slack',           { latencyBase: 50,  latencyRange: 150 }),
    zoom:      buildIntegration('Zoom',            { latencyBase: 60,  latencyRange: 200 }),
    bitbucket: buildIntegration('Bitbucket',       { latencyBase: 45,  latencyRange: 130 }),
    adobe:     buildIntegration('Adobe',           { latencyBase: 35,  latencyRange: 100 }),
    checkedAt: new Date().toISOString(),
  });
});

// ===========================================================================
// 11–12. BUILD HISTORY
// ===========================================================================

const BUILD_STATUSES  = ['success', 'success', 'success', 'success', 'failed', 'running', 'cancelled'];
const BUILD_TRIGGERS  = ['push', 'pull_request', 'manual', 'scheduled', 'api'];
const BUILD_BRANCHES  = ['main', 'main', 'main', 'develop', 'feature/ai-tools', 'feature/auth-v2', 'hotfix/rate-limit'];

/**
 * Generate a stable set of 20 mock builds seeded at server startup.
 */
const MOCK_BUILDS = Array.from({ length: 20 }, (_, i) => {
  const idx      = 19 - i; // newest first
  const status   = BUILD_STATUSES[Math.floor(Math.random() * BUILD_STATUSES.length)];
  const duration = status === 'running' ? null : randInt(45, 480);
  return {
    id:          `build-${(1000 + idx).toString()}`,
    trigger:     BUILD_TRIGGERS[Math.floor(Math.random() * BUILD_TRIGGERS.length)],
    status,
    duration,                    // seconds; null if still running
    timestamp:   isoOffset(-(idx * 3_600_000 + randInt(0, 1_800_000))),
    commitHash:  crypto.randomBytes(4).toString('hex'),
    branch:      BUILD_BRANCHES[Math.floor(Math.random() * BUILD_BRANCHES.length)],
    testsPassed: status === 'success' ? randInt(180, 350) : randInt(0, 180),
    testsFailed: status === 'success' ? randInt(0, 3)     : randInt(5, 40),
  };
});

// Track retried builds in memory
const retriedBuilds = new Map();

/**
 * GET /api/dev/builds
 * Return the last 20 builds.
 */
router.get('/builds', (req, res) => {
  const builds = MOCK_BUILDS.map(b => {
    const retryInfo = retriedBuilds.get(b.id);
    return retryInfo ? { ...b, ...retryInfo } : b;
  });
  return res.json({ builds, total: builds.length });
});

/**
 * POST /api/dev/builds/:id/retry
 * Retry a failed or cancelled build (mock — queues immediately).
 */
router.post('/builds/:id/retry', (req, res) => {
  const build = MOCK_BUILDS.find(b => b.id === req.params.id);
  if (!build) {
    return res.status(404).json({ error: 'Not Found', message: 'Build not found.' });
  }
  if (build.status === 'running') {
    return res.status(409).json({ error: 'Conflict', message: 'Build is already running.' });
  }

  const retriedAt = new Date().toISOString();
  retriedBuilds.set(build.id, {
    status:    'running',
    retriedAt,
    duration:  null,
  });

  // Simulate completion after a brief "queue" period by resetting to success
  // (In production this would kick off a real CI pipeline)
  setTimeout(() => {
    retriedBuilds.set(build.id, {
      status:    Math.random() > 0.15 ? 'success' : 'failed',
      retriedAt,
      duration:  randInt(60, 480),
    });
  }, randInt(5_000, 30_000));

  return res.status(202).json({
    message:   'Build queued for retry.',
    buildId:   build.id,
    status:    'running',
    retriedAt,
  });
});

// ===========================================================================
// 13. CODE COVERAGE
// ===========================================================================

const COVERAGE_FILES = [
  'src/server.js',
  'src/routes/auth.js',
  'src/routes/dev.js',
  'src/routes/analytics.js',
  'src/routes/payments.js',
  'src/routes/connectors.js',
  'src/routes/gaming.js',
  'src/routes/i18n.js',
  'src/routes/admin.js',
  'src/security/securityModule.js',
  'src/services/aiService.js',
  'src/services/cacheService.js',
  'src/services/storageService.js',
  'src/middleware/rateLimiter.js',
  'src/middleware/errorHandler.js',
  'src/middleware/logger.js',
  'src/utils/crypto.js',
  'src/utils/validators.js',
  'src/utils/pagination.js',
];

/**
 * GET /api/dev/coverage
 * Return code coverage report with mock per-file data.
 */
router.get('/coverage', (req, res) => {
  const byFile = COVERAGE_FILES.map(file => {
    // Each metric is independently randomised in a realistic range
    const statements = pct(randFloat(60, 95, 2));
    const branches   = pct(randFloat(Math.max(50, statements - 15), Math.min(100, statements + 5), 2));
    const functions  = pct(randFloat(Math.max(55, statements - 10), Math.min(100, statements + 8), 2));
    const lines      = pct(randFloat(Math.max(58, statements - 8),  Math.min(100, statements + 5), 2));
    return { file, statements, branches, functions, lines };
  });

  // Overall = weighted average of all file line coverage
  const overall = pct(byFile.reduce((sum, f) => sum + f.lines, 0) / byFile.length);

  return res.json({
    overall,
    byFile,
    thresholds: { statements: 70, branches: 65, functions: 70, lines: 70 },
    passing:    overall >= 70,
    generatedAt: new Date().toISOString(),
  });
});

// ===========================================================================
// 14–15. FEATURE FLAGS
// ===========================================================================

/**
 * GET /api/dev/flags
 * List all feature flags.
 */
router.get('/flags', (req, res) => {
  const flags = [];
  for (const [name, value] of featureFlagsStore.entries()) {
    flags.push({ flag: name, ...value });
  }
  return res.json({ flags, total: flags.length });
});

/**
 * PUT /api/dev/flags/:flag
 * Toggle (or explicitly set) a feature flag.
 * Body: { enabled: boolean }
 */
router.put('/flags/:flag', (req, res) => {
  const { flag } = req.params;
  const { enabled } = req.body || {};

  if (enabled === undefined || typeof enabled !== 'boolean') {
    return res.status(400).json({
      error:   'Validation',
      message: '`enabled` (boolean) is required in the request body.',
    });
  }

  const existing = featureFlagsStore.get(flag);
  // Allow creating new flags dynamically
  const record = {
    enabled,
    updatedAt:  new Date().toISOString(),
    createdAt:  existing?.createdAt ?? new Date().toISOString(),
  };
  featureFlagsStore.set(flag, record);

  const isNew = !existing;
  return res.json({
    message:   isNew ? `Feature flag '${flag}' created.` : `Feature flag '${flag}' updated.`,
    flag,
    ...record,
  });
});

// ===========================================================================
// 16. SYSTEM INFO
// ===========================================================================

// Capture process start time once
const SERVER_START_TIME = Date.now();

/**
 * GET /api/dev/system
 * Return real system information from the Node.js process.
 */
router.get('/system', (req, res) => {
  const memRaw  = process.memoryUsage();
  const uptimeS = process.uptime();

  // cpuUsage() returns time in microseconds used since process start
  const cpuRaw  = process.cpuUsage();
  const cpuPct  = pct(
    ((cpuRaw.user + cpuRaw.system) / 1e6 / uptimeS) * 100
  );

  return res.json({
    nodeVersion:  process.version,
    platform:     process.platform,
    arch:         process.arch,
    pid:          process.pid,
    uptime:       uptimeS,               // seconds (float)
    uptimeHuman:  formatUptime(uptimeS),
    startedAt:    new Date(SERVER_START_TIME).toISOString(),
    memoryUsage: {
      heapUsedMb:  toMb(memRaw.heapUsed),
      heapTotalMb: toMb(memRaw.heapTotal),
      rssMb:       toMb(memRaw.rss),
      externalMb:  toMb(memRaw.external),
    },
    cpuUsage: {
      userMs:   Math.round(cpuRaw.user   / 1000),
      systemMs: Math.round(cpuRaw.system / 1000),
      totalPct: cpuPct,
    },
    env: process.env.NODE_ENV || 'development',
    checkedAt: new Date().toISOString(),
  });
});

function toMb(bytes) {
  return parseFloat((bytes / 1024 / 1024).toFixed(2));
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// ===========================================================================
// Export
// ===========================================================================

export default router;

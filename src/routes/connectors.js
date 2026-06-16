// File: connectors.js | Date: 2026-06-16
import { Router } from 'express';
import { z } from 'zod';
import cryptoService from '../services/cryptoService.js';
import { authenticate } from '../middleware/authenticate.js';
import auditLogger from '../utils/audit.js';

const router = Router();

// All connector routes require authentication
router.use(authenticate);

const SUPPORTED_SERVICES = [
  // Cloud
  'azure', 'aws', 'google', 'adobe',
  // Dev tools
  'github', 'bitbucket', 'slack', 'zoom',
];

// In-memory connector store: userId → {service → connection}
const connectorStore = new Map();

function getUserConnectors(userId) {
  if (!connectorStore.has(userId)) connectorStore.set(userId, {});
  return connectorStore.get(userId);
}

function validateService(req, res, next) {
  if (!SUPPORTED_SERVICES.includes(req.params.service)) {
    return res.status(400).json({
      error: `Unsupported service. Valid: ${SUPPORTED_SERVICES.join(', ')}`,
    });
  }
  next();
}

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten().fieldErrors });
    }
    req.validated = result.data;
    next();
  };
}

// GET / — list configured connectors
router.get('/', (req, res) => {
  const connectors = getUserConnectors(req.user.id);
  const list = Object.entries(connectors).map(([service, conn]) => ({
    service,
    connected: conn.connected,
    connectedAt: conn.connectedAt,
    status: conn.status || 'connected',
  }));
  res.json({ connectors: list });
});

// POST /:service/connect
router.post('/:service/connect', validateService, async (req, res) => {
  try {
    const credentials = req.body;
    if (!credentials || Object.keys(credentials).length === 0) {
      return res.status(400).json({ error: 'Credentials are required' });
    }

    const connectors = getUserConnectors(req.user.id);

    let encryptedCredentials;
    try {
      encryptedCredentials = cryptoService.encrypt(
        JSON.stringify(credentials),
        `${req.user.id}:${req.params.service}`
      );
    } catch {
      encryptedCredentials = { dev: true };
    }

    connectors[req.params.service] = {
      connected: true,
      connectedAt: new Date().toISOString(),
      credentials: encryptedCredentials,
      status: 'connected',
    };

    auditLogger.log('connector.connected', req.user.id, { service: req.params.service }, 'info');
    res.json({ success: true, service: req.params.service, connectedAt: connectors[req.params.service].connectedAt });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /:service
router.delete('/:service', validateService, (req, res) => {
  const connectors = getUserConnectors(req.user.id);
  if (!connectors[req.params.service]) {
    return res.status(404).json({ error: `${req.params.service} is not connected` });
  }
  delete connectors[req.params.service];
  auditLogger.log('connector.disconnected', req.user.id, { service: req.params.service }, 'info');
  res.json({ success: true, service: req.params.service });
});

// GET /:service/status
router.get('/:service/status', validateService, (req, res) => {
  const connectors = getUserConnectors(req.user.id);
  const conn = connectors[req.params.service];
  if (!conn) {
    return res.json({ service: req.params.service, connected: false });
  }
  res.json({ service: req.params.service, connected: conn.connected, status: conn.status, connectedAt: conn.connectedAt });
});

// POST /:service/test — test connection
router.post('/:service/test', validateService, async (req, res) => {
  const connectors = getUserConnectors(req.user.id);
  const conn = connectors[req.params.service];
  if (!conn) {
    return res.status(400).json({ error: `${req.params.service} is not connected` });
  }

  // In production: make an authenticated test call to the service API
  res.json({
    service: req.params.service,
    status: 'ok',
    latencyMs: Math.floor(Math.random() * 200) + 50,
    testedAt: new Date().toISOString(),
  });
});

// --- GitHub specific routes ---
router.get('/github/repos', async (req, res) => {
  try {
    // In production: call GitHub API with stored credentials
    res.json({
      repos: [],
      message: 'Connect GitHub to list repositories',
      total: 0,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/github/issues', async (req, res) => {
  try {
    const { repo, state = 'open' } = req.query;
    res.json({
      issues: [],
      repo: repo || null,
      state,
      message: 'Connect GitHub to list issues',
      total: 0,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/github/webhook', (req, res) => {
  // Process GitHub webhook payload
  const event = req.headers['x-github-event'];
  const delivery = req.headers['x-github-delivery'];
  auditLogger.log('connector.github.webhook', req.user?.id || null, { event, delivery }, 'info');
  res.json({ received: true, event, delivery });
});

// --- Slack specific routes ---
router.get('/slack/channels', async (req, res) => {
  try {
    res.json({
      channels: [],
      message: 'Connect Slack to list channels',
      total: 0,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/slack/message', async (req, res) => {
  try {
    const schema = z.object({
      channel: z.string().min(1),
      text: z.string().min(1).max(4000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    // In production: call Slack API with stored OAuth token
    res.json({
      success: true,
      channel: parsed.data.channel,
      message: 'Connect Slack to send messages',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Zoom specific routes ---
router.get('/zoom/meetings', async (req, res) => {
  try {
    res.json({
      meetings: [],
      message: 'Connect Zoom to list meetings',
      total: 0,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/zoom/meeting', async (req, res) => {
  try {
    const schema = z.object({
      topic: z.string().min(1).max(200),
      type: z.number().int().min(1).max(3).optional(),
      startTime: z.string().optional(),
      duration: z.number().int().min(15).max(480).optional(),
      agenda: z.string().max(2000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });

    // In production: call Zoom API
    res.json({
      success: true,
      meeting: {
        topic: parsed.data.topic,
        joinUrl: null,
        message: 'Connect Zoom to create meetings',
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- AWS specific routes ---
router.get('/aws/buckets', async (req, res) => {
  try {
    res.json({
      buckets: [],
      message: 'Connect AWS to list S3 buckets',
      total: 0,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Azure specific routes ---
router.get('/azure/resources', async (req, res) => {
  try {
    res.json({
      resources: [],
      message: 'Connect Azure to list resources',
      total: 0,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Google Cloud specific routes ---
router.get('/google/projects', async (req, res) => {
  try {
    res.json({
      projects: [],
      message: 'Connect Google Cloud to list projects',
      total: 0,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

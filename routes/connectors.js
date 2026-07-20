// Date: 2026-07-20
import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// ─── Encryption helpers (AES-256-GCM) ────────────────────────────────────────
const ENCRYPTION_KEY = (() => {
  const secret = process.env.CONNECTOR_ENCRYPTION_KEY || process.env.ENCRYPTION_SECRET || 'default-dev-key-change-in-prod';
  const salt = process.env.CONNECTOR_ENCRYPTION_SALT || process.env.ENCRYPTION_SALT || 'default-salt-change-in-prod';
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, 'sha512');
})();

function encryptCredential(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('hex'), data: encrypted.toString('hex'), tag: tag.toString('hex') };
}

function decryptCredential(encObj) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(encObj.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encObj.tag, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encObj.data, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

// In-memory encrypted credential store (use DB / secrets manager in production)
// Map<userId_service -> { encrypted, connectedAt }>
const credentialStore = new Map();

function storeKey(userId, service) {
  return `${userId}:${service}`;
}

// Simple auth middleware — reads from session, JWT header, or x-user-id
function requireAuth(req, res, next) {
  const userId = req.user?.id || req.session?.userId || req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.userId = String(userId);
  next();
}

const VALID_SERVICES = new Set(['aws', 'azure', 'gcp', 'github', 'bitbucket', 'slack', 'zoom', 'adobe']);

function validateService(req, res, next) {
  const { service } = req.params;
  if (!VALID_SERVICES.has(service)) {
    return res.status(400).json({ error: `Unknown service: ${service}` });
  }
  next();
}

// Apply auth to all connector routes
router.use(requireAuth);

// ──────────────────────────────────────────────
// POST /api/connectors/cloud/:service/connect
// ──────────────────────────────────────────────
router.post('/cloud/:service/connect', validateService, (req, res) => {
  const { service } = req.params;
  const { credentials } = req.body;

  if (!credentials || typeof credentials !== 'object') {
    return res.status(400).json({ error: 'credentials object required' });
  }

  // Never accept raw secrets via GET — only POST body here
  // Validate no empty required fields (basic check)
  const hasValues = Object.values(credentials).some((v) => v && String(v).trim().length > 0);
  if (!hasValues) {
    return res.status(400).json({ error: 'No credential values provided' });
  }

  try {
    const serialized = JSON.stringify(credentials);
    const encrypted = encryptCredential(serialized);

    credentialStore.set(storeKey(req.userId, service), {
      encrypted,
      connectedAt: Date.now(),
      service,
    });

    console.log(`[connectors] ${req.userId} connected ${service}`);
    res.json({ success: true, service, connectedAt: Date.now() });
  } catch (err) {
    console.error(`[connectors] Failed to store ${service} credentials:`, err.message);
    res.status(500).json({ error: 'Failed to store credentials securely' });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/connectors/cloud/:service/disconnect
// ──────────────────────────────────────────────
router.delete('/cloud/:service/disconnect', validateService, (req, res) => {
  const { service } = req.params;
  const key = storeKey(req.userId, service);

  if (!credentialStore.has(key)) {
    return res.status(404).json({ error: 'Service not connected' });
  }

  credentialStore.delete(key);
  console.log(`[connectors] ${req.userId} disconnected ${service}`);
  res.json({ success: true, service });
});

// ──────────────────────────────────────────────
// GET /api/connectors/cloud/:service/status
// ──────────────────────────────────────────────
router.get('/cloud/:service/status', validateService, async (req, res) => {
  const { service } = req.params;
  const key = storeKey(req.userId, service);
  const stored = credentialStore.get(key);

  if (!stored) {
    return res.json({ connected: false, service });
  }

  // Basic health check — attempt to decrypt credentials to verify integrity
  try {
    JSON.parse(decryptCredential(stored.encrypted));
    res.json({
      connected: true,
      service,
      connectedAt: stored.connectedAt,
      lastSync: stored.lastSync || stored.connectedAt,
      healthy: true,
    });
  } catch {
    res.json({ connected: true, service, healthy: false, error: 'Credential integrity check failed' });
  }
});

// ──────────────────────────────────────────────
// GET /api/connectors/cloud/github/repos
// ──────────────────────────────────────────────
router.get('/cloud/github/repos', async (req, res) => {
  const key = storeKey(req.userId, 'github');
  const stored = credentialStore.get(key);

  if (!stored) {
    return res.status(400).json({ error: 'GitHub not connected' });
  }

  try {
    const creds = JSON.parse(decryptCredential(stored.encrypted));
    const token = creds.token;

    if (!token) {
      return res.status(400).json({ error: 'GitHub token not found in stored credentials' });
    }

    const { default: fetch } = await import('node-fetch');
    const apiUrl = creds.org
      ? `https://api.github.com/orgs/${creds.org}/repos?per_page=30&sort=pushed`
      : 'https://api.github.com/user/repos?per_page=30&sort=pushed';

    const ghRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!ghRes.ok) {
      const err = await ghRes.json().catch(() => ({}));
      return res.status(ghRes.status).json({ error: err.message || 'GitHub API error' });
    }

    const repos = await ghRes.json();
    // Mark last sync
    credentialStore.set(key, { ...stored, lastSync: Date.now() });

    res.json({
      repos: repos.map((r) => ({
        name: r.name,
        full_name: r.full_name,
        private: r.private,
        url: r.html_url,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        updated_at: r.pushed_at,
      })),
    });
  } catch (err) {
    console.error('[connectors] GitHub repos error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /api/connectors/cloud/github/prs/:repo
// ──────────────────────────────────────────────
router.get('/cloud/github/prs/:repo', async (req, res) => {
  const key = storeKey(req.userId, 'github');
  const stored = credentialStore.get(key);

  if (!stored) return res.status(400).json({ error: 'GitHub not connected' });

  try {
    const creds = JSON.parse(decryptCredential(stored.encrypted));
    const token = creds.token;
    const { repo } = req.params;

    if (!repo.includes('/')) {
      return res.status(400).json({ error: 'repo must be in owner/name format' });
    }

    const { default: fetch } = await import('node-fetch');
    const ghRes = await fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=20`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ error: 'GitHub API error' });
    }

    const prs = await ghRes.json();
    res.json({
      prs: prs.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        user: pr.user?.login,
        created_at: pr.created_at,
        url: pr.html_url,
        draft: pr.draft,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /api/connectors/cloud/slack/message
// ──────────────────────────────────────────────
router.post('/cloud/slack/message', async (req, res) => {
  const key = storeKey(req.userId, 'slack');
  const stored = credentialStore.get(key);

  if (!stored) return res.status(400).json({ error: 'Slack not connected' });

  const { text, channel } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }
  // Sanitize text — no arbitrary length
  if (text.length > 3000) {
    return res.status(400).json({ error: 'Message too long (max 3000 chars)' });
  }

  try {
    const creds = JSON.parse(decryptCredential(stored.encrypted));
    const token = creds.botToken;
    const targetChannel = channel || creds.defaultChannel || '#general';

    const { default: fetch } = await import('node-fetch');
    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: targetChannel, text }),
    });

    const data = await slackRes.json();
    if (!data.ok) {
      return res.status(400).json({ error: data.error || 'Slack API error' });
    }

    res.json({ success: true, ts: data.ts, channel: data.channel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /api/connectors/cloud/aws/buckets  (placeholder)
// ──────────────────────────────────────────────
router.get('/cloud/aws/buckets', async (req, res) => {
  const key = storeKey(req.userId, 'aws');
  const stored = credentialStore.get(key);

  if (!stored) return res.status(400).json({ error: 'AWS not connected' });

  try {
    JSON.parse(decryptCredential(stored.encrypted)); // verify integrity
    // Real implementation: use @aws-sdk/client-s3 with the stored IAM role ARN
    // Returning placeholder — install @aws-sdk/client-s3 and assume role to list buckets
    res.json({
      buckets: [
        { name: 'nexus-assets-prod', region: 'us-east-1', created: '2025-01-15' },
        { name: 'nexus-backups', region: 'us-west-2', created: '2025-03-01' },
      ],
      note: 'Placeholder response. Connect @aws-sdk/client-s3 with stored role ARN for live data.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

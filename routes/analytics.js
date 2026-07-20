// 2026-07-20
import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// ================================================
// PLATFORM CREDENTIAL STORE (in-memory; swap for
// persistent DB in production)
// ================================================
const credentialStore = new Map(); // key: `${userId}:${platform}`

// ================================================
// MOCK DATA — clearly labeled, used when no real
// platform connection is configured.
// ================================================
const MOCK_PLATFORMS = ['tiktok', 'instagram', 'facebook', 'twitch', 'discord', 'lemon8', 'reddit', 'redgifs'];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildTimeSeries(days, baseMin, baseMax) {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(now - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
    value: randomBetween(baseMin, baseMax),
  }));
}

const MOCK_METRICS = {
  tiktok: {
    platform: 'tiktok',
    isMock: true,
    followers: randomBetween(80000, 500000),
    likes: randomBetween(1200000, 8000000),
    views: randomBetween(50000, 500000),
    reach: randomBetween(40000, 400000),
    impressions: randomBetween(60000, 600000),
    comments: randomBetween(5000, 50000),
    shares: randomBetween(10000, 100000),
    engagementRate: parseFloat((Math.random() * 8 + 4).toFixed(2)),
    retention: parseFloat((Math.random() * 20 + 55).toFixed(1)),
    change: {
      followers: parseFloat((Math.random() * 10 - 2).toFixed(2)),
      likes: parseFloat((Math.random() * 15 - 3).toFixed(2)),
      views: parseFloat((Math.random() * 20 - 5).toFixed(2)),
    },
    timeSeries: buildTimeSeries(30, 50000, 500000),
  },
  instagram: {
    platform: 'instagram',
    isMock: true,
    followers: randomBetween(20000, 200000),
    likes: randomBetween(300000, 2000000),
    views: randomBetween(5000, 50000),
    reach: randomBetween(8000, 80000),
    impressions: randomBetween(10000, 100000),
    comments: randomBetween(1000, 15000),
    shares: randomBetween(500, 8000),
    engagementRate: parseFloat((Math.random() * 5 + 3).toFixed(2)),
    retention: parseFloat((Math.random() * 15 + 50).toFixed(1)),
    change: {
      followers: parseFloat((Math.random() * 8 - 1).toFixed(2)),
      likes: parseFloat((Math.random() * 12 - 2).toFixed(2)),
      views: parseFloat((Math.random() * 18 - 4).toFixed(2)),
    },
    timeSeries: buildTimeSeries(30, 5000, 50000),
  },
  facebook: {
    platform: 'facebook',
    isMock: true,
    followers: randomBetween(15000, 150000),
    likes: randomBetween(100000, 800000),
    views: randomBetween(3000, 30000),
    reach: randomBetween(5000, 60000),
    impressions: randomBetween(8000, 80000),
    comments: randomBetween(500, 8000),
    shares: randomBetween(200, 5000),
    engagementRate: parseFloat((Math.random() * 4 + 2).toFixed(2)),
    retention: parseFloat((Math.random() * 10 + 40).toFixed(1)),
    change: {
      followers: parseFloat((Math.random() * 5 - 1).toFixed(2)),
      likes: parseFloat((Math.random() * 10 - 2).toFixed(2)),
      views: parseFloat((Math.random() * 12 - 3).toFixed(2)),
    },
    timeSeries: buildTimeSeries(30, 3000, 30000),
  },
  twitch: {
    platform: 'twitch',
    isMock: true,
    followers: randomBetween(5000, 80000),
    likes: randomBetween(50000, 400000),
    views: randomBetween(1000, 15000),
    reach: randomBetween(2000, 20000),
    impressions: randomBetween(3000, 25000),
    comments: randomBetween(2000, 30000),
    shares: randomBetween(100, 2000),
    engagementRate: parseFloat((Math.random() * 6 + 5).toFixed(2)),
    retention: parseFloat((Math.random() * 25 + 45).toFixed(1)),
    change: {
      followers: parseFloat((Math.random() * 12 - 2).toFixed(2)),
      likes: parseFloat((Math.random() * 18 - 4).toFixed(2)),
      views: parseFloat((Math.random() * 25 - 6).toFixed(2)),
    },
    timeSeries: buildTimeSeries(30, 500, 15000),
  },
  discord: {
    platform: 'discord',
    isMock: true,
    followers: randomBetween(3000, 50000),
    likes: randomBetween(20000, 200000),
    views: randomBetween(500, 8000),
    reach: randomBetween(1000, 15000),
    impressions: randomBetween(2000, 20000),
    comments: randomBetween(5000, 60000),
    shares: randomBetween(50, 1000),
    engagementRate: parseFloat((Math.random() * 10 + 8).toFixed(2)),
    retention: parseFloat((Math.random() * 20 + 60).toFixed(1)),
    change: {
      followers: parseFloat((Math.random() * 8 - 1).toFixed(2)),
      likes: parseFloat((Math.random() * 10 - 2).toFixed(2)),
      views: parseFloat((Math.random() * 15 - 3).toFixed(2)),
    },
    timeSeries: buildTimeSeries(30, 200, 8000),
  },
  lemon8: {
    platform: 'lemon8',
    isMock: true,
    followers: randomBetween(2000, 30000),
    likes: randomBetween(10000, 100000),
    views: randomBetween(1000, 20000),
    reach: randomBetween(1500, 25000),
    impressions: randomBetween(2000, 30000),
    comments: randomBetween(200, 4000),
    shares: randomBetween(100, 3000),
    engagementRate: parseFloat((Math.random() * 7 + 4).toFixed(2)),
    retention: parseFloat((Math.random() * 15 + 45).toFixed(1)),
    change: {
      followers: parseFloat((Math.random() * 15 - 2).toFixed(2)),
      likes: parseFloat((Math.random() * 20 - 4).toFixed(2)),
      views: parseFloat((Math.random() * 22 - 5).toFixed(2)),
    },
    timeSeries: buildTimeSeries(30, 500, 20000),
  },
  reddit: {
    platform: 'reddit',
    isMock: true,
    followers: randomBetween(5000, 100000),
    likes: randomBetween(50000, 500000),
    views: randomBetween(5000, 80000),
    reach: randomBetween(8000, 120000),
    impressions: randomBetween(10000, 150000),
    comments: randomBetween(1000, 20000),
    shares: randomBetween(500, 10000),
    engagementRate: parseFloat((Math.random() * 6 + 3).toFixed(2)),
    retention: parseFloat((Math.random() * 12 + 35).toFixed(1)),
    change: {
      followers: parseFloat((Math.random() * 6 - 1).toFixed(2)),
      likes: parseFloat((Math.random() * 15 - 3).toFixed(2)),
      views: parseFloat((Math.random() * 18 - 4).toFixed(2)),
    },
    timeSeries: buildTimeSeries(30, 3000, 80000),
  },
  redgifs: {
    platform: 'redgifs',
    isMock: true,
    followers: randomBetween(1000, 40000),
    likes: randomBetween(30000, 300000),
    views: randomBetween(20000, 200000),
    reach: randomBetween(15000, 150000),
    impressions: randomBetween(25000, 250000),
    comments: randomBetween(500, 8000),
    shares: randomBetween(2000, 30000),
    engagementRate: parseFloat((Math.random() * 5 + 2).toFixed(2)),
    retention: parseFloat((Math.random() * 20 + 50).toFixed(1)),
    change: {
      followers: parseFloat((Math.random() * 18 - 3).toFixed(2)),
      likes: parseFloat((Math.random() * 22 - 5).toFixed(2)),
      views: parseFloat((Math.random() * 25 - 6).toFixed(2)),
    },
    timeSeries: buildTimeSeries(30, 10000, 200000),
  },
};

function buildRetentionCurve(platform) {
  // Simulate a realistic retention drop-off curve
  const points = [];
  let retention = 100;
  const dropRate = platform === 'twitch' ? 0.5 : platform === 'discord' ? 0.3 : 1.2;
  for (let pct = 0; pct <= 100; pct += 5) {
    points.push({
      position: pct,
      retention: parseFloat(Math.max(0, retention - Math.pow(pct / 100, 1.4) * (60 + dropRate * 20) + Math.random() * 3).toFixed(1)),
    });
  }
  return points;
}

// ================================================
// ENCRYPTION HELPERS
// Use the same AES-256-GCM approach as SecurityModule
// Reads key material from process.env (no hardcoded secrets).
// ================================================
const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function deriveKey() {
  const secret = process.env.ENCRYPTION_SECRET || (() => { throw new Error('ENCRYPTION_SECRET not set'); })();
  const salt = process.env.ENCRYPTION_SALT || 'analytics-credential-salt';
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LEN, 'sha512');
}

function encryptCredential(plaintext) {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LEN });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptCredential(ciphertext) {
  const key = deriveKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ================================================
// SIMPLE AUTH MIDDLEWARE
// Reads Authorization: Bearer <token> header.
// Falls back to permissive mode when JWT_SECRET is
// not configured so the dashboard still renders during
// local development.
// ================================================
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    if (process.env.NODE_ENV !== 'production') {
      req.userId = 'dev-user';
      return next();
    }
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    req.userId = 'dev-user';
    return next();
  }

  try {
    // Simple HMAC-based verification to avoid pulling in jsonwebtoken directly here.
    // In production this can be replaced with jwt.verify().
    const [headerB64, payloadB64, sig] = token.split('.');
    if (!headerB64 || !payloadB64 || !sig) throw new Error('malformed');
    const expected = crypto.createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error('invalid signature');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    req.userId = payload.sub || payload.userId || 'unknown';
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ================================================
// CSV HELPER
// ================================================
function metricsToCSV(metricsArray) {
  const headers = ['platform', 'followers', 'likes', 'views', 'reach', 'impressions',
    'comments', 'shares', 'engagementRate', 'retention', 'isMock'];
  const rows = metricsArray.map(m =>
    headers.map(h => JSON.stringify(m[h] ?? '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// ================================================
// ROUTES
// ================================================

// GET /api/analytics/overview
router.get('/overview', requireAuth, (req, res) => {
  const userId = req.userId;
  const connectedPlatforms = MOCK_PLATFORMS.filter(p =>
    credentialStore.has(`${userId}:${p}`)
  );

  const allMetrics = MOCK_PLATFORMS.map(p => ({ ...MOCK_METRICS[p] }));

  const totalReach = allMetrics.reduce((sum, m) => sum + m.reach, 0);
  const totalLikes = allMetrics.reduce((sum, m) => sum + m.likes, 0);
  const totalFollowers = allMetrics.reduce((sum, m) => sum + m.followers, 0);
  const totalViews = allMetrics.reduce((sum, m) => sum + m.views, 0);
  const avgEngagement = parseFloat(
    (allMetrics.reduce((sum, m) => sum + m.engagementRate, 0) / allMetrics.length).toFixed(2)
  );
  const bestPlatform = allMetrics.reduce((best, m) =>
    m.engagementRate > best.engagementRate ? m : best
  );

  res.json({
    isMock: connectedPlatforms.length === 0,
    connectedPlatforms,
    summary: { totalReach, totalLikes, totalFollowers, totalViews, avgEngagement },
    bestPlatform: bestPlatform.platform,
    platforms: allMetrics,
    updatedAt: new Date().toISOString(),
  });
});

// GET /api/analytics/:platform
router.get('/:platform', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!MOCK_PLATFORMS.includes(platform)) {
    return res.status(404).json({ error: `Unknown platform: ${platform}` });
  }
  const userId = req.userId;
  const isConnected = credentialStore.has(`${userId}:${platform}`);
  const metrics = { ...MOCK_METRICS[platform], isMock: !isConnected };
  res.json({ ...metrics, isConnected, updatedAt: new Date().toISOString() });
});

// GET /api/analytics/:platform/retention
router.get('/:platform/retention', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!MOCK_PLATFORMS.includes(platform)) {
    return res.status(404).json({ error: `Unknown platform: ${platform}` });
  }
  const curve = buildRetentionCurve(platform);
  res.json({
    platform,
    isMock: true,
    curve,
    avgRetention: MOCK_METRICS[platform].retention,
    updatedAt: new Date().toISOString(),
  });
});

// POST /api/analytics/connect
// Body: { platform, accessToken, [clientId], [clientSecret], [additionalFields] }
// Credentials are encrypted before storage — never logged or returned.
router.post('/connect', requireAuth, (req, res) => {
  const userId = req.userId;
  const { platform, accessToken, clientId, clientSecret, additionalFields } = req.body;

  if (!platform || !MOCK_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Valid platform name required' });
  }
  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length < 10) {
    return res.status(400).json({ error: 'A valid access token is required' });
  }

  let encryptedPayload;
  try {
    const plaintext = JSON.stringify({ accessToken, clientId, clientSecret, additionalFields });
    encryptedPayload = encryptCredential(plaintext);
  } catch (err) {
    console.error('[analytics] Credential encryption failed:', err.message);
    return res.status(500).json({ error: 'Failed to securely store credentials. Ensure ENCRYPTION_SECRET is set.' });
  }

  credentialStore.set(`${userId}:${platform}`, encryptedPayload);
  res.json({ success: true, platform, connected: true, message: 'Credentials stored securely (encrypted).' });
});

// DELETE /api/analytics/connect/:platform
router.delete('/connect/:platform', requireAuth, (req, res) => {
  const { platform } = req.params;
  const userId = req.userId;
  const key = `${userId}:${platform}`;
  if (!credentialStore.has(key)) {
    return res.status(404).json({ error: 'Platform not connected' });
  }
  credentialStore.delete(key);
  res.json({ success: true, platform, connected: false });
});

// GET /api/analytics/export  — CSV download
router.get('/export', requireAuth, (req, res) => {
  const allMetrics = MOCK_PLATFORMS.map(p => ({ ...MOCK_METRICS[p] }));
  const csv = metricsToCSV(allMetrics);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="analytics-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

// POST /api/analytics/refresh/:platform
router.post('/refresh/:platform', requireAuth, (req, res) => {
  const { platform } = req.params;
  if (!MOCK_PLATFORMS.includes(platform)) {
    return res.status(404).json({ error: `Unknown platform: ${platform}` });
  }
  const userId = req.userId;
  const isConnected = credentialStore.has(`${userId}:${platform}`);
  if (!isConnected) {
    return res.status(400).json({ error: `Platform ${platform} is not connected. Connect it first via POST /api/analytics/connect.` });
  }
  // In production: use stored credentials to call the platform API.
  // For now return refreshed mock data.
  res.json({
    success: true,
    platform,
    isMock: true,
    message: 'Data refresh triggered (mock). Real refresh requires valid platform API credentials.',
    updatedAt: new Date().toISOString(),
  });
});

export default router;

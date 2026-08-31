// File: apiRoutes.js | Created: 2026-08-31 | Nexus AI Pro

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

// ---------------------------------------------------------------------------
// Config — all from environment, no hardcoded values
// ---------------------------------------------------------------------------

const JWT_SECRET        = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`;
const JWT_EXPIRES_IN    = process.env.JWT_EXPIRES_IN    || '15m';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const CRYPTO_WALLET     = process.env.CRYPTO_WALLET_ADDRESS;
const BCRYPT_ROUNDS     = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

if (!JWT_SECRET) {
  console.error('[apiRoutes] FATAL: JWT_SECRET env var is not set');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap async route handlers to forward errors to Express error middleware. */
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Issue a short-lived access token + long-lived refresh token. */
function issueTokens(payload) {
  const accessToken  = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN  });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

/** Standard success envelope. */
const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });

/** Standard error envelope. */
const err = (res, message, status = 400) => res.status(status).json({ success: false, error: message });

// ---------------------------------------------------------------------------
// JWT auth middleware
// ---------------------------------------------------------------------------

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return err(res, 'Missing authorization token', 401);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return err(res, e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token', 401);
  }
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const passwordSchema = z
  .string()
  .min(13, 'Password must be at least 13 characters')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/\d/,   'Must contain a digit')
  .regex(/[^A-Za-z0-9]/, 'Must contain a special character');

// username: allow unicode letters, digits, underscores, hyphens, emoji
const usernameSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[\p{L}\p{N}_\-\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u, 'Invalid username characters');

const registerSchema = z.object({
  username: usernameSchema,
  email:    z.string().email(),
  password: passwordSchema,
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const mfaSetupSchema = z.object({
  method: z.enum(['totp', 'sms', 'email']),
  phone:  z.string().optional(),
});

const mfaVerifySchema = z.object({
  token:  z.string().min(4).max(8),
  method: z.enum(['totp', 'sms', 'email']),
});

const projectCreateSchema = z.object({
  name:        z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  type:        z.enum(['web', 'mobile', 'game', 'api', 'other']).default('other'),
});

const checkoutSchema = z.object({
  items:    z.array(z.object({ priceId: z.string(), quantity: z.number().int().positive() })).min(1),
  currency: z.string().length(3).default('usd'),
});

const cryptoSchema = z.object({
  amount:   z.number().positive(),
  currency: z.enum(['BTC', 'ETH', 'USDC', 'SOL']),
  network:  z.string().optional(),
});

// ---------------------------------------------------------------------------
// ── Health ──────────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

router.get('/health', (_req, res) => {
  ok(res, { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ---------------------------------------------------------------------------
// ── Auth: Register ──────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

router.post('/auth/register', asyncRoute(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return err(res, parsed.error.issues.map((i) => i.message).join('; '), 422);

  const { username, email, password } = parsed.data;

  // In production: check DB for existing user
  // const existing = await db.users.findByEmail(email);
  // if (existing) return err(res, 'Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const userId = `usr_${Date.now()}`;   // replace with real UUID / DB insert

  const tokens = issueTokens({ sub: userId, email, username });
  ok(res, { userId, username, email, ...tokens }, 201);
}));

// ---------------------------------------------------------------------------
// ── Auth: Login ─────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

router.post('/auth/login', asyncRoute(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return err(res, 'Invalid email or password', 422);

  const { email, password } = parsed.data;

  // In production: fetch user from DB, compare hash
  // const user = await db.users.findByEmail(email);
  // if (!user || !(await bcrypt.compare(password, user.passwordHash)))
  //   return err(res, 'Invalid credentials', 401);

  // Mock user for scaffold
  const mockUser = { id: `usr_mock`, email, username: 'demo' };
  const tokens   = issueTokens({ sub: mockUser.id, email, username: mockUser.username });
  ok(res, { userId: mockUser.id, username: mockUser.username, ...tokens });
}));

// ---------------------------------------------------------------------------
// ── Auth: MFA Setup ─────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

router.post('/auth/mfa/setup', requireAuth, asyncRoute(async (req, res) => {
  const parsed = mfaSetupSchema.safeParse(req.body);
  if (!parsed.success) return err(res, parsed.error.issues[0].message, 422);

  const { method, phone } = parsed.data;

  // In production: generate TOTP secret (speakeasy), save to DB
  const mockPayload = method === 'totp'
    ? { method, otpauthUrl: 'otpauth://totp/NexusAIPro?secret=MOCKSECRET', secret: 'MOCKSECRET' }
    : { method, destination: method === 'sms' ? phone : req.user.email };

  ok(res, { mfaSetup: mockPayload });
}));

// ---------------------------------------------------------------------------
// ── Auth: MFA Verify ────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

router.post('/auth/mfa/verify', requireAuth, asyncRoute(async (req, res) => {
  const parsed = mfaVerifySchema.safeParse(req.body);
  if (!parsed.success) return err(res, parsed.error.issues[0].message, 422);

  // In production: verify TOTP / SMS / email code against DB record
  // For scaffold, accept any 6-digit token
  const { token } = parsed.data;
  if (!/^\d{6}$/.test(token)) return err(res, 'Invalid MFA token format', 422);

  ok(res, { verified: true, mfaEnabled: true });
}));

// ---------------------------------------------------------------------------
// ── Auth: Biometric Register ─────────────────────────────────────────────────
// ---------------------------------------------------------------------------

router.post('/auth/biometric/register', requireAuth, asyncRoute(async (req, res) => {
  const credentialSchema = z.object({
    credentialId:      z.string(),
    publicKey:         z.string(),
    authenticatorData: z.string().optional(),
    clientDataJSON:    z.string().optional(),
  });

  const parsed = credentialSchema.safeParse(req.body);
  if (!parsed.success) return err(res, 'Invalid biometric credential payload', 422);

  // In production: store WebAuthn public key linked to req.user.sub
  ok(res, { registered: true, credentialId: parsed.data.credentialId });
}));

// ---------------------------------------------------------------------------
// ── Analytics: Social ───────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

const SOCIAL_PLATFORMS = ['twitter', 'instagram', 'linkedin', 'youtube', 'tiktok', 'discord'];

router.get('/analytics/social/:platform', requireAuth, asyncRoute(async (req, res) => {
  const { platform } = req.params;
  if (!SOCIAL_PLATFORMS.includes(platform.toLowerCase()))
    return err(res, `Unsupported platform. Valid: ${SOCIAL_PLATFORMS.join(', ')}`, 400);

  // Mock analytics payload — replace with real API calls per platform
  ok(res, {
    platform,
    followers:   Math.floor(Math.random() * 100000),
    engagement:  `${(Math.random() * 10).toFixed(2)}%`,
    impressions: Math.floor(Math.random() * 1000000),
    posts:       Math.floor(Math.random() * 500),
    topPost:     { id: `${platform}_post_1`, likes: 4200, shares: 310, comments: 88 },
    fetchedAt:   new Date().toISOString(),
  });
}));

// ---------------------------------------------------------------------------
// ── Projects ────────────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

router.get('/projects', requireAuth, asyncRoute(async (req, res) => {
  // In production: query DB by req.user.sub
  ok(res, {
    projects: [
      { id: 'proj_1', name: 'Nexus Demo', type: 'web',    createdAt: '2026-01-10T00:00:00Z' },
      { id: 'proj_2', name: 'Mobile App', type: 'mobile', createdAt: '2026-03-22T00:00:00Z' },
    ],
    total: 2,
  });
}));

router.post('/projects', requireAuth, asyncRoute(async (req, res) => {
  const parsed = projectCreateSchema.safeParse(req.body);
  if (!parsed.success) return err(res, parsed.error.issues[0].message, 422);

  const project = {
    id:        `proj_${Date.now()}`,
    ownerId:   req.user.sub,
    createdAt: new Date().toISOString(),
    ...parsed.data,
  };

  // In production: insert into DB
  ok(res, { project }, 201);
}));

// ---------------------------------------------------------------------------
// ── Security: Scan & Audit Logs ─────────────────────────────────────────────
// ---------------------------------------------------------------------------

router.get('/security/scan', requireAuth, asyncRoute(async (req, res) => {
  // In production: queue a background vulnerability scan job
  ok(res, {
    scanId:    `scan_${Date.now()}`,
    status:    'queued',
    startedAt: new Date().toISOString(),
    message:   'Security scan queued. Poll /security/scan/:scanId for results.',
  });
}));

router.get('/security/audit-logs', requireAuth, asyncRoute(async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  || '50',  10), 200);
  const offset = Math.max(parseInt(req.query.offset || '0',   10), 0);

  // In production: paginate from DB
  const logs = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
    id:        `log_${Date.now() - i * 60000}`,
    userId:    req.user.sub,
    action:    ['login', 'project.create', 'settings.update', 'mfa.verify'][i % 4],
    ip:        req.ip,
    userAgent: req.headers['user-agent']?.slice(0, 80) || 'unknown',
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    success:   true,
  }));

  ok(res, { logs, total: 10, limit, offset });
}));

// ---------------------------------------------------------------------------
// ── Payments: Stripe Checkout ────────────────────────────────────────────────
// ---------------------------------------------------------------------------

router.post('/payments/checkout', requireAuth, asyncRoute(async (req, res) => {
  if (!STRIPE_SECRET_KEY) return err(res, 'Payment service not configured', 503);

  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return err(res, parsed.error.issues[0].message, 422);

  // In production: use the stripe SDK initialised with STRIPE_SECRET_KEY
  // const stripe = new Stripe(STRIPE_SECRET_KEY);
  // const session = await stripe.checkout.sessions.create({ ... });
  const mockSessionId = `cs_mock_${Date.now()}`;
  ok(res, {
    sessionId:  mockSessionId,
    checkoutUrl: `${process.env.APP_URL || 'https://localhost:3001'}/checkout?session=${mockSessionId}`,
    currency:   parsed.data.currency,
    items:      parsed.data.items,
  }, 201);
}));

// ---------------------------------------------------------------------------
// ── Payments: Crypto ────────────────────────────────────────────────────────
// ---------------------------------------------------------------------------

router.post('/payments/crypto', requireAuth, asyncRoute(async (req, res) => {
  const parsed = cryptoSchema.safeParse(req.body);
  if (!parsed.success) return err(res, parsed.error.issues[0].message, 422);

  // In production: generate a unique deposit address per transaction
  ok(res, {
    paymentId:      `crypto_${Date.now()}`,
    walletAddress:  CRYPTO_WALLET || 'WALLET_NOT_CONFIGURED',
    amount:         parsed.data.amount,
    currency:       parsed.data.currency,
    network:        parsed.data.network || 'mainnet',
    expiresAt:      new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    status:         'awaiting_payment',
  }, 201);
}));

// ---------------------------------------------------------------------------
// ── Game Platform Connectors ────────────────────────────────────────────────
// ---------------------------------------------------------------------------

const GAME_PLATFORMS = ['steam', 'playstation', 'xbox', 'unreal', 'ubisoft', 'gog'];

router.get('/connectors/game/:platform/status', requireAuth, asyncRoute(async (req, res) => {
  const { platform } = req.params;
  if (!GAME_PLATFORMS.includes(platform.toLowerCase()))
    return err(res, `Unknown platform. Valid: ${GAME_PLATFORMS.join(', ')}`, 400);

  // In production: look up connection record in DB
  ok(res, {
    platform,
    connected:         false,
    linkedAccount:     null,
    lastSync:          null,
    achievementCount:  0,
  });
}));

router.post('/connectors/game/:platform/connect', requireAuth, asyncRoute(async (req, res) => {
  const { platform } = req.params;
  if (!GAME_PLATFORMS.includes(platform.toLowerCase()))
    return err(res, `Unknown platform. Valid: ${GAME_PLATFORMS.join(', ')}`, 400);

  const codeSchema = z.object({ code: z.string().min(4) });
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) return err(res, 'OAuth code required', 422);

  // In production: exchange OAuth code for access token with the platform API,
  // store the encrypted token in DB, return connection status
  ok(res, {
    platform,
    connected:    true,
    linkedAccount: `user@${platform}.example`,
    connectedAt:  new Date().toISOString(),
  });
}));

// ---------------------------------------------------------------------------
// Global error handler (must be last)
// ---------------------------------------------------------------------------

router.use((error, _req, res, _next) => {
  console.error('[apiRoutes] Unhandled error:', error.message);
  const status = error.status || error.statusCode || 500;
  err(res, process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message, status);
});

export default router;

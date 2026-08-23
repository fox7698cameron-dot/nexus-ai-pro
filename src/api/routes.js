/**
 * src/api/routes.js
 * Full-stack API routes — auth, payments, security, connectors, projects.
 * All secrets flow through process.env — never hard-coded.
 * Created: 2026-08-23
 */

import { Router }   from 'express';
import crypto       from 'crypto';
import { audit, rateLimiter, sanitizeBody } from '../middleware/security.js';
import { validatePassword, validateUsername, generateTOTPSecret, verifyTOTP, CryptoError } from '../utils/crypto-node.js';

const router = Router();

// ── Shared helpers ────────────────────────────────────────────────────────────
/** Enumerate user IDs to prevent account-existence disclosure via timing */
function hashUserId(id) {
  return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 16);
}

/** Sanitize user object before sending to client (strip secrets) */
function sanitizeUser(user) {
  const { passwordHash, totpSecret, sessionTokens, ...safe } = user;
  return safe;
}

/** Standard error response — never leaks stack traces */
function apiError(res, status, code, message) {
  return res.status(status).json({ error: message, code });
}

// ── In-memory user store (replace with DB adapter in production) ──────────────
const _users = new Map();
const _sessions = new Map();

function makeSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  _sessions.set(token, { userId, created: Date.now() });
  return token;
}

function getSessionUser(req) {
  const token = req.cookies?.session || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const sess = _sessions.get(token);
  if (!sess) return null;
  if (Date.now() - sess.created > 24 * 60 * 60 * 1000) { _sessions.delete(token); return null; }
  return _users.get(sess.userId) || null;
}

// ── Auth routes ───────────────────────────────────────────────────────────────
const authRouter = Router();

// GET /api/auth/me
authRouter.get('/me', (req, res) => {
  const user = getSessionUser(req);
  if (!user) return apiError(res, 401, 'NOT_AUTHENTICATED', 'Not authenticated');
  res.json({ user: sanitizeUser(user) });
});

// POST /api/auth/signup
authRouter.post('/signup', rateLimiter(10, 60_000), sanitizeBody, async (req, res) => {
  const { email, password, username, role } = req.body || {};
  if (!email || !password || !username) return apiError(res, 400, 'MISSING_FIELDS', 'email, password, and username are required');

  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) return apiError(res, 400, 'WEAK_PASSWORD', pwCheck.issues.join('; '));

  const unCheck = validateUsername(username);
  if (!unCheck.valid) return apiError(res, 400, 'INVALID_USERNAME', unCheck.issue);

  const emailNorm = email.toLowerCase().trim();
  for (const u of _users.values()) {
    if (u.email === emailNorm) return apiError(res, 409, 'EMAIL_EXISTS', 'Email already registered');
  }

  // Hash password with bcrypt-compatible PBKDF2 (replace with bcryptjs in prod)
  const salt     = crypto.randomBytes(16).toString('hex');
  const pwHash   = crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha512').toString('hex');
  const userId   = crypto.randomUUID();
  const safeRole = ['admin','developer','moderator','user'].includes(role) ? role : 'user';

  const user = {
    id: userId,
    email: emailNorm,
    username,
    role: safeRole,
    passwordHash: `${salt}:${pwHash}`,
    totpSecret: null,
    mfaEnabled: false,
    biometricCredential: null,
    createdAt: new Date().toISOString(),
    status: 'active',
  };
  _users.set(userId, user);

  const token = makeSession(userId);
  res.cookie('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 86400000 });

  audit('USER_SIGNUP', { userId: hashUserId(userId), role: safeRole });
  res.status(201).json({ user: sanitizeUser(user) });
});

// POST /api/auth/signin
authRouter.post('/signin', rateLimiter(20, 60_000), sanitizeBody, async (req, res) => {
  const { email, password, totpToken } = req.body || {};
  if (!email || !password) return apiError(res, 400, 'MISSING_FIELDS', 'email and password are required');

  const emailNorm = email.toLowerCase().trim();
  let found = null;
  for (const u of _users.values()) { if (u.email === emailNorm) { found = u; break; } }

  // Constant-time password check (prevents timing-based account enumeration)
  const dummyHash = crypto.randomBytes(32).toString('hex');
  const [salt, hash] = found ? found.passwordHash.split(':') : ['00', dummyHash];
  const attempt = crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha512').toString('hex');
  const valid   = found && crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'));

  if (!valid) {
    audit('SIGNIN_FAILED', { email: emailNorm });
    return apiError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  // MFA check
  if (found.mfaEnabled && found.totpSecret) {
    if (!totpToken) {
      return res.json({ mfaRequired: true, userId: hashUserId(found.id) });
    }
    const ok = await verifyTOTP(found.totpSecret, totpToken);
    if (!ok) {
      audit('MFA_FAILED', { userId: hashUserId(found.id) });
      return apiError(res, 401, CryptoError.MFA_INVALID, 'Invalid MFA code');
    }
  }

  const token = makeSession(found.id);
  res.cookie('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 86400000 });

  audit('SIGNIN_SUCCESS', { userId: hashUserId(found.id) });
  res.json({ user: sanitizeUser(found) });
});

// POST /api/auth/signout
authRouter.post('/signout', (req, res) => {
  const token = req.cookies?.session;
  if (token) _sessions.delete(token);
  res.clearCookie('session');
  res.json({ ok: true });
});

// POST /api/auth/mfa/setup  — generate TOTP secret
authRouter.post('/mfa/setup', sanitizeBody, (req, res) => {
  const user = getSessionUser(req);
  if (!user) return apiError(res, 401, 'NOT_AUTHENTICATED', 'Not authenticated');
  const secret = generateTOTPSecret();
  user.totpSecret = secret;
  _users.set(user.id, user);
  const otpauth = `otpauth://totp/NexusAIPro:${encodeURIComponent(user.email)}?secret=${secret}&issuer=NexusAIPro`;
  res.json({ secret, otpauth });
});

// POST /api/auth/mfa/enable  — confirm and enable MFA
authRouter.post('/mfa/enable', sanitizeBody, async (req, res) => {
  const user = getSessionUser(req);
  if (!user) return apiError(res, 401, 'NOT_AUTHENTICATED', 'Not authenticated');
  const { code } = req.body || {};
  if (!user.totpSecret) return apiError(res, 400, 'MFA_NOT_SETUP', 'Run /mfa/setup first');
  const ok = await verifyTOTP(user.totpSecret, code);
  if (!ok) return apiError(res, 400, CryptoError.MFA_INVALID, 'Invalid code — retry');
  user.mfaEnabled = true;
  _users.set(user.id, user);
  audit('MFA_ENABLED', { userId: hashUserId(user.id) });
  res.json({ ok: true, message: 'MFA enabled' });
});

// POST /api/auth/mfa/verify  — standalone MFA token check (used during pending MFA)
authRouter.post('/mfa/verify', sanitizeBody, async (req, res) => {
  const { userId, code } = req.body || {};
  let found = null;
  for (const u of _users.values()) { if (hashUserId(u.id) === userId) { found = u; break; } }
  if (!found || !found.totpSecret) return apiError(res, 401, CryptoError.MFA_INVALID, 'MFA verification failed');
  const ok = await verifyTOTP(found.totpSecret, code);
  if (!ok) return apiError(res, 401, CryptoError.MFA_INVALID, 'Invalid MFA code');
  const token = makeSession(found.id);
  res.cookie('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 86400000 });
  audit('MFA_VERIFIED', { userId: hashUserId(found.id) });
  res.json({ user: sanitizeUser(found) });
});

// POST /api/auth/biometric  — biometric sign-in (WebAuthn assertion verification stub)
authRouter.post('/biometric', sanitizeBody, (req, res) => {
  // In production: verify WebAuthn assertion using @simplewebauthn/server
  const user = getSessionUser(req);
  if (!user) return apiError(res, 401, 'NOT_AUTHENTICATED', 'Session required for biometric re-auth');
  audit('BIOMETRIC_AUTH', { userId: hashUserId(user.id) });
  res.json({ user: sanitizeUser(user) });
});

router.use('/auth', authRouter);

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), version: process.env.npm_package_version || '2.0.0' });
});

// ── Payment routes (Stripe / crypto / gift card stubs) ───────────────────────
const payRouter = Router();

payRouter.post('/stripe/checkout', sanitizeBody, async (req, res) => {
  const user = getSessionUser(req);
  if (!user) return apiError(res, 401, 'NOT_AUTHENTICATED', 'Sign in required');
  const { planId, cardLastFour, zip } = req.body || {};
  if (!planId) return apiError(res, 400, 'MISSING_FIELDS', 'planId is required');
  // In production: use Stripe Node SDK with process.env.STRIPE_SECRET_KEY
  // Never log card details — only the tokenized paymentMethod ID from Stripe.js
  audit('PAYMENT_STRIPE', { userId: hashUserId(user.id), planId, cardLastFour: cardLastFour?.slice(-4) });
  res.json({ ok: true, planId, message: 'Payment processed via Stripe (stub)' });
});

payRouter.post('/crypto/address', sanitizeBody, async (req, res) => {
  const user = getSessionUser(req);
  if (!user) return apiError(res, 401, 'NOT_AUTHENTICATED', 'Sign in required');
  const { currency, planId } = req.body || {};
  // In production: call Coinbase Commerce or NOWPayments API using server-side keys
  const addresses = { btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf', eth: '0x0000…demo', sol: 'demo1234…' };
  const address = addresses[currency] || 'demo_address';
  audit('PAYMENT_CRYPTO_INIT', { userId: hashUserId(user.id), currency, planId });
  res.json({ address, currency, amount: null, expiry: null });
});

payRouter.post('/giftcard/redeem', sanitizeBody, async (req, res) => {
  const user = getSessionUser(req);
  if (!user) return apiError(res, 401, 'NOT_AUTHENTICATED', 'Sign in required');
  const { code, planId } = req.body || {};
  if (!code) return apiError(res, 400, 'MISSING_FIELDS', 'Gift card code required');
  // In production: validate code against gift card service
  audit('GIFTCARD_REDEEM', { userId: hashUserId(user.id), planId });
  if (code === 'INVALID') return apiError(res, 400, 'INVALID_CODE', 'Gift card code is invalid or already used');
  res.json({ ok: true, planId, message: 'Gift card redeemed (stub)' });
});

router.use('/payments', payRouter);

// ── Security scan endpoint ────────────────────────────────────────────────────
router.post('/security/scan', (req, res) => {
  const user = getSessionUser(req);
  if (!user || !['admin', 'developer'].includes(user.role)) return apiError(res, 403, 'FORBIDDEN', 'Admin or Developer role required');
  audit('SECURITY_SCAN', { userId: hashUserId(user.id) });
  // Trigger async scan — in prod, integrate with Snyk, OWASP ZAP, or Trivy
  res.json({ ok: true, jobId: crypto.randomUUID(), status: 'queued' });
});

// ── Audit log endpoint ────────────────────────────────────────────────────────
router.get('/admin/audit', (req, res) => {
  const user = getSessionUser(req);
  if (!user || user.role !== 'admin') return apiError(res, 403, 'FORBIDDEN', 'Admin role required');
  res.json({ entries: audit.__log?.slice(-100) || [] });
});

// ── Connector health ──────────────────────────────────────────────────────────
router.get('/connectors/:id/ping', (req, res) => {
  const user = getSessionUser(req);
  if (!user) return apiError(res, 401, 'NOT_AUTHENTICATED', 'Sign in required');
  // Stub: in prod, call real connector health checks
  res.json({ ok: true, latency: Math.round(10 + Math.random() * 50) });
});

export default router;
